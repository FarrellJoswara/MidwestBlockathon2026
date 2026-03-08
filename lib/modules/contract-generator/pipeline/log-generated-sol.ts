/**
 * Logs generated Solidity source and (optionally) the input ParserOutput to disk
 * so you can verify that form inputs were passed into contract generation.
 * Writes to pipeline/logs/ with timestamped filenames.
 */

import fs from "fs";
import path from "path";
import type { GeneratedContract, ParserOutput } from "../types";

/** Directory under project root for generated .sol logs. */
const LOGS_PATH = "lib/modules/contract-generator/pipeline/logs";

/**
 * Resolve the logs directory: <project>/lib/modules/contract-generator/pipeline/logs
 */
function getLogsDir(): string {
  return path.join(process.cwd(), LOGS_PATH);
}

/**
 * Generate a shared timestamp and safe contract name for a run.
 */
function runBasename(generated: GeneratedContract): { timestamp: string; safeName: string } {
  const safeName = generated.contractName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return { timestamp, safeName };
}

/**
 * Write generated contract source to a .sol file and optionally the input ParserOutput to a .json file.
 * Filenames: generated-<ContractName>-<timestamp>.sol and generated-<ContractName>-<timestamp>-input.json.
 * Safe to call from API routes; creates the directory if needed.
 */
export function logGeneratedSol(
  generated: GeneratedContract,
  parserOutput?: ParserOutput | null
): string {
  const dir = getLogsDir();
  const { timestamp, safeName } = runBasename(generated);
  const base = `generated-${safeName}-${timestamp}`;
  const solPath = path.join(dir, `${base}.sol`);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(solPath, generated.source, "utf8");
    console.log(`[pipeline] Logged generated .sol: ${solPath}`);

    if (parserOutput != null) {
      const jsonPath = path.join(dir, `${base}-input.json`);
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(parserOutput, null, 2),
        "utf8"
      );
      console.log(`[pipeline] Logged input (form → pipeline): ${jsonPath}`);
    }
    return solPath;
  } catch (e) {
    console.warn("[pipeline] Failed to write .sol log:", e instanceof Error ? e.message : e);
    return "";
  }
}
