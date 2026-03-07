/**
 * ─────────────────────────────────────────────────────────────────────
 *  Will Parser — Integration Test Script
 * ─────────────────────────────────────────────────────────────────────
 *
 *  HOW TO RUN:
 *    1. Set GEMINI_API_KEY in your .env.local
 *    2. Run:   npx tsx scripts/test-will-parser.ts
 *       or:    bun run scripts/test-will-parser.ts
 *
 *  WHAT IT DOES:
 *    • Test 1 — Validates typed schema (no API call)
 *    • Test 2 — Creates a mock PDF, extracts text with pdf-parse
 *    • Test 3 — If GEMINI_API_KEY is set AND you provide a real CID,
 *               runs the full pipeline: IPFS → PDF → Gemini → ParsedWill
 *
 *  To test the full pipeline with a real CID:
 *    npx tsx scripts/test-will-parser.ts QmYOUR_CID_HERE
 * ─────────────────────────────────────────────────────────────────────
 */

// Load .env.local so GEMINI_API_KEY is available
import { config } from "dotenv";
config({ path: ".env.local" });

import type { ParsedWill, Beneficiary } from "../lib/modules/contract-parser/types/will";

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

// ── Test 1: Type validation (offline, no API) ────────────────────────────────

function testTypedSchema() {
  console.log("\n═══ Test 1: Type Validation (offline) ═══");

  const mockWill: ParsedWill = {
    testator_name: "John Doe",
    testator_address: "0x1234567890abcdef1234567890abcdef12345678",
    executor_name: "Jane Smith",
    executor_address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    beneficiaries: [
      {
        name: "Alice Johnson",
        walletAddress: "0x1111111111111111111111111111111111111111",
        assetDescription: "50% of ETH holdings",
        assetType: "ETH",
        amount: "5.0",
      },
      {
        name: "Bob Williams",
        assetDescription: "Family house",
        assetType: "OTHER",
      },
    ],
    conditions: ["Must be 18 or older"],
    additionalInstructions: "Distribute within 30 days of death declaration.",
  };

  assert(mockWill.testator_name === "John Doe", "testator_name is set");
  assert(mockWill.beneficiaries.length === 2, "2 beneficiaries");
  assert(mockWill.beneficiaries[0].assetType === "ETH", "first beneficiary assetType = ETH");
  assert(mockWill.beneficiaries[1].walletAddress === undefined, "second beneficiary has no wallet");
  assert(mockWill.conditions!.length === 1, "1 condition");

  // Verify JSON round-trip
  const json = JSON.stringify(mockWill);
  const parsed: ParsedWill = JSON.parse(json);
  assert(parsed.beneficiaries[0].name === "Alice Johnson", "JSON round-trip preserves data");
}

// ── Test 2: PDF text extraction (no API key needed) ──────────────────────────

async function testPdfExtraction() {
  console.log("\n═══ Test 2: PDF Text Extraction (pdf-parse) ═══");

  try {
    const { PDFParse } = await import("pdf-parse");

    // pdf-parse needs a valid PDF — let's create a minimal one
    // This is the simplest valid PDF possible
    const minimalPdf = Buffer.from(
      "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF",
      "ascii"
    );

    const parser = new PDFParse({ data: new Uint8Array(minimalPdf) });
    const result = await parser.getText();
    await parser.destroy();

    // A minimal PDF with no text content may return empty string — that's expected
    assert(typeof result.text === "string", "getText() returns a string");
    console.log(`  ℹ️  Extracted text length: ${result.text.length} chars`);
    console.log("  ✅ pdf-parse loaded and working correctly");
    passed++;
  } catch (err) {
    console.log(`  ❌ pdf-parse failed: ${(err as Error).message}`);
    failed++;
  }
}

// ── Test 3: IPFS fetch (no API key needed, needs internet) ───────────────────

async function testIpfsFetch(cid: string) {
  console.log("\n═══ Test 3: IPFS Fetch ═══");

  try {
    const { fetchPdfFromIPFS } = await import(
      "../lib/modules/contract-parser/services/ipfsFetcher"
    );

    const buffer = await fetchPdfFromIPFS(cid);
    assert(buffer.length > 0, `Fetched ${buffer.length} bytes from IPFS`);
    assert(buffer[0] === 0x25, "Starts with '%' (valid PDF header)"); // '%' = 0x25
  } catch (err) {
    console.log(`  ❌ IPFS fetch failed: ${(err as Error).message}`);
    failed++;
  }
}

// ── Test 4: Full pipeline (needs API key + real CID) ─────────────────────────

async function testFullPipeline(cid: string) {
  console.log("\n═══ Test 4: Full Pipeline (CID → IPFS → Gemini → ParsedWill) ═══");

  if (!process.env.GEMINI_API_KEY) {
    console.log("  ⏭️  Skipped — GEMINI_API_KEY not set in .env.local");
    return;
  }

  try {
    const { parseWillFromCID } = await import(
      "../lib/modules/contract-parser/pipeline/parseWillFromCID"
    );

    const result = await parseWillFromCID(cid);

    assert(Array.isArray(result.beneficiaries), "beneficiaries is an array");
    assert(
      result.beneficiaries.length > 0,
      `Found ${result.beneficiaries.length} beneficiaries`
    );

    if (result.testator_name) {
      console.log(`  ℹ️  Testator: ${result.testator_name}`);
    }
    if (result.executor_name) {
      console.log(`  ℹ️  Executor: ${result.executor_name}`);
    }
    for (const b of result.beneficiaries) {
      console.log(
        `  ℹ️  Beneficiary: ${b.name} — ${b.assetType} — ${b.assetDescription}`
      );
    }

    console.log("\n  📋 Full parsed output:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(`  ❌ Pipeline failed: ${(err as Error).message}`);
    failed++;
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Will Parser — Integration Tests      ║");
  console.log("╚══════════════════════════════════════════╝");

  const cid = process.argv[2]; // optional CID from command line

  // Always run
  testTypedSchema();
  await testPdfExtraction();

  // Run only if a CID was provided
  if (cid) {
    await testIpfsFetch(cid);
    await testFullPipeline(cid);
  } else {
    console.log("\n═══ Tests 3 & 4: Skipped ═══");
    console.log("  ⏭️  No CID provided. To run IPFS + Gemini tests:");
    console.log("     npx tsx scripts/test-will-parser.ts QmYOUR_CID_HERE");
  }

  // Summary
  console.log("\n────────────────────────────────────────────");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("────────────────────────────────────────────\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
