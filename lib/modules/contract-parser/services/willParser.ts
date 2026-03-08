/**
 * Will Parser — converts a PDF buffer into structured will data using Google Gemini.
 *
 * Pipeline:
 *   1. Extract text from the PDF (pdf-parse)
 *   2. Build a structured prompt
 *   3. Send to Gemini (gemini-1.5-flash)
 *   4. Parse and validate the JSON response
 *   5. Return a typed ParsedWill object
 *
 * Usage:
 *   import { parseWillWithGemini } from "@/lib/modules/contract-parser/services/willParser";
 *   const parsed = await parseWillWithGemini(pdfBuffer);
 */

import { GoogleGenAI } from "@google/genai";
import type { ParsedWill, Beneficiary, AssetType } from "../types/will";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a full name to a stable, snake_case placeholder ID.
 * e.g. "Alice Johnson" → "alice_johnson"
 * The address-resolution pipeline stage replaces these with real 0x addresses.
 */
function toPlaceholderId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ── Gemini setup ──────────────────────────────────────────────────────────────

/**
 * Initialise the Gemini client.
 * Reads `GEMINI_API_KEY` from the environment (server-side only).
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[willParser] Missing GEMINI_API_KEY environment variable. " +
        "Set it in your .env.local file."
    );
  }
  return new GoogleGenAI({ apiKey });
}

// ── Prompt ────────────────────────────────────────────────────────────────────

/**
 * System-level prompt that instructs Gemini to extract structured will data.
 * The model is told to output **only** valid JSON matching our ParsedWill schema.
 */
const WILL_ANALYSIS_PROMPT = `
You are a legal document analysis assistant specialising in last will and testament documents.

Analyse the following will text and extract structured information.
Return ONLY valid JSON — no markdown, no explanation, no code fences.

IMPORTANT: The PDF will NOT contain wallet addresses. Do NOT fabricate any.
Instead, for every person (testator, executor, beneficiary), generate a
"placeholderId" — a lowercase, underscore-separated version of their full name
(e.g. "Alice Johnson" → "alice_johnson"). A later pipeline stage will resolve
these placeholders into real wallet addresses.

The JSON must match this exact schema:

{
  "testator_name": "string or null",
  "testator_placeholderId": "string or null — lowercase_underscored name",
  "executor_name": "string or null",
  "executor_placeholderId": "string or null — lowercase_underscored name",
  "beneficiaries": [
    {
      "name": "string — full legal name of the beneficiary",
      "placeholderId": "string — lowercase_underscored version of name",
      "assetDescription": "string — description of the bequeathed asset",
      "assetType": "one of: CASH, PROPERTY, VEHICLE, PERSONAL_ITEM, OTHER",
      "amount": "string or null — dollar amount, percentage, or descriptive quantity"
    }
  ],
  "conditions": ["string — any conditions for distribution"],
  "additionalInstructions": "string or null — any supplementary instructions"
}

Rules:
- If a field is not found in the document, set it to null or omit it.
- For assetType, classify as:
    • CASH — money, bank accounts, dollar amounts, savings, financial accounts
    • PROPERTY — real estate, houses, land, buildings
    • VEHICLE — cars, trucks, boats, motorcycles
    • PERSONAL_ITEM — jewelry, art, furniture, electronics, heirlooms, collectibles
    • OTHER — anything that does not fit the above categories
- Extract ALL beneficiaries mentioned.
- Do NOT include any wallet addresses — they will be resolved later.
- Ignore boilerplate legal language unrelated to asset distribution.

Will text:
`;

// ── PDF → Text ────────────────────────────────────────────────────────────────

/**
 * Extract plain text from a PDF buffer using pdf-parse (v4 class API).
 * Dynamic import avoids webpack bundling the worker ("expression too dynamic" error).
 */
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const result = await parser.getText();
  const text = result.text?.trim();

  if (!text || text.length === 0) {
    throw new Error(
      "[willParser] Could not extract any text from the PDF. " +
        "The file may be image-based or empty."
    );
  }

  console.log(
    `[willParser] Extracted ${text.length} characters from PDF.`
  );

  // Clean up parser resources
  await parser.destroy();

  return text;
}

// ── JSON validation helpers ──────────────────────────────────────────────────

const VALID_ASSET_TYPES: AssetType[] = ["CASH", "PROPERTY", "VEHICLE", "PERSONAL_ITEM", "OTHER"];

/**
 * Validate and coerce the raw JSON object into a well-typed ParsedWill.
 * Throws if the data is fundamentally invalid.
 */
function validateParsedWill(raw: Record<string, unknown>): ParsedWill {
  // Ensure beneficiaries is always an array
  const rawBeneficiaries = Array.isArray(raw.beneficiaries)
    ? raw.beneficiaries
    : [];

  const beneficiaries: Beneficiary[] = rawBeneficiaries.map(
    (b: Record<string, unknown>, i: number) => {
      if (!b.name || typeof b.name !== "string") {
        throw new Error(
          `[willParser] Beneficiary at index ${i} is missing a valid "name".`
        );
      }
      if (!b.assetDescription || typeof b.assetDescription !== "string") {
        throw new Error(
          `[willParser] Beneficiary "${b.name}" is missing "assetDescription".`
        );
      }

      const assetType: AssetType = VALID_ASSET_TYPES.includes(
        b.assetType as AssetType
      )
        ? (b.assetType as AssetType)
        : "OTHER";

      // Build placeholder from name: "Alice Johnson" → "alice_johnson"
      const placeholderId: string =
        typeof b.placeholderId === "string" && b.placeholderId.length > 0
          ? b.placeholderId
          : toPlaceholderId(b.name as string);

      return {
        name: b.name as string,
        placeholderId,
        assetDescription: b.assetDescription as string,
        assetType,
        amount: typeof b.amount === "string" ? b.amount : undefined,
      };
    }
  );

  const parsed: ParsedWill = {
    testator_name:
      typeof raw.testator_name === "string" ? raw.testator_name : undefined,
    testator_placeholderId:
      typeof raw.testator_placeholderId === "string"
        ? raw.testator_placeholderId
        : typeof raw.testator_name === "string"
          ? toPlaceholderId(raw.testator_name as string)
          : undefined,
    executor_name:
      typeof raw.executor_name === "string" ? raw.executor_name : undefined,
    executor_placeholderId:
      typeof raw.executor_placeholderId === "string"
        ? raw.executor_placeholderId
        : typeof raw.executor_name === "string"
          ? toPlaceholderId(raw.executor_name as string)
          : undefined,
    beneficiaries,
    conditions: Array.isArray(raw.conditions)
      ? raw.conditions.filter((c: unknown) => typeof c === "string")
      : undefined,
    additionalInstructions:
      typeof raw.additionalInstructions === "string"
        ? raw.additionalInstructions
        : undefined,
  };

  return parsed;
}

// ── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a will PDF into structured data using the Google Gemini API.
 *
 * @param pdfBuffer - Raw PDF bytes (e.g. from IPFS fetch).
 * @returns A fully typed ParsedWill object.
 */
export async function parseWillWithGemini(
  pdfBuffer: Buffer
): Promise<ParsedWill> {
  // Step 1: PDF → text
  const willText = await extractTextFromPdf(pdfBuffer);

  // Step 2: Build prompt
  const fullPrompt = WILL_ANALYSIS_PROMPT + willText;

  // Step 3: Call Gemini
  console.log("[willParser] Sending will text to Gemini for analysis...");
  const ai = getGeminiClient();
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });
  let responseText = result.text?.trim() ?? "";

  if (!responseText) {
    throw new Error("[willParser] Gemini returned an empty response.");
  }

  // Step 4: Clean and parse JSON
  // Strip markdown code fences if Gemini wraps the output
  responseText = responseText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let rawJson: Record<string, unknown>;
  try {
    rawJson = JSON.parse(responseText);
  } catch {
    throw new Error(
      "[willParser] Failed to parse Gemini response as JSON.\n" +
        `Raw response:\n${responseText.slice(0, 500)}`
    );
  }

  // Step 5: Validate and return typed result
  const parsedWill = validateParsedWill(rawJson);

  console.log(
    `[willParser] Successfully parsed will: ${parsedWill.beneficiaries.length} beneficiaries found.`
  );
  return parsedWill;
}
