/**
 * Parse a will PDF and output structured JSON.
 *
 * Usage:
 *   npx tsx scripts/parse-will.ts <path-to-pdf>
 *   npx tsx scripts/parse-will.ts scripts/test_will.pdf
 *   npx tsx scripts/parse-will.ts scripts/test_will.pdf --out results.json
 *
 * Requires GEMINI_API_KEY in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import { resolve, basename } from "path";
import { parseWillFromBuffer } from "../lib/modules/contract-parser/pipeline/parseWillFromCID";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx tsx scripts/parse-will.ts <path-to-pdf> [--out output.json]");
    process.exit(1);
  }

  // Optional --out flag
  const outIdx = process.argv.indexOf("--out");
  const outPath = outIdx !== -1 ? process.argv[outIdx + 1] : null;

  const fullPath = resolve(pdfPath);
  console.log(`📄 Reading: ${fullPath}`);

  const pdfBuffer = readFileSync(fullPath);
  console.log(`   ${pdfBuffer.length} bytes\n`);

  const result = await parseWillFromBuffer(pdfBuffer);
  const json = JSON.stringify(result, null, 2);

  // Always print to stdout
  console.log(json);

  // Write to file if --out was provided
  if (outPath) {
    const outputFullPath = resolve(outPath);
    writeFileSync(outputFullPath, json, "utf-8");
    console.log(`\n✅ Written to ${outputFullPath}`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
