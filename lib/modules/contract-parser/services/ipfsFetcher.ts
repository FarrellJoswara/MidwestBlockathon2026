/**
 * IPFS Fetcher — downloads a PDF from IPFS via the Pinata public gateway.
 *
 * Usage:
 *   import { fetchPdfFromIPFS } from "@/lib/modules/contract-parser/services/ipfsFetcher";
 *   const pdfBuffer = await fetchPdfFromIPFS("QmSomeCID...");
 */

/** Default Pinata public gateway base URL */
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Fetch a PDF stored on IPFS and return its raw bytes as a Buffer.
 *
 * @param cid - The IPFS content identifier (CID) returned by Pinata after upload.
 * @returns A Buffer containing the raw PDF bytes.
 * @throws If the fetch fails or the response is not OK.
 */
export async function fetchPdfFromIPFS(cid: string): Promise<Buffer> {
  if (!cid || cid.trim().length === 0) {
    throw new Error("[ipfsFetcher] CID must be a non-empty string.");
  }

  const url = `${PINATA_GATEWAY}/${cid.trim()}`;
  console.log(`[ipfsFetcher] Fetching PDF from ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `[ipfsFetcher] Failed to fetch CID ${cid}: ${response.status} ${response.statusText}`
    );
  }

  // Read the response as an ArrayBuffer and convert to Node Buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error(`[ipfsFetcher] Received empty response for CID ${cid}.`);
  }

  console.log(`[ipfsFetcher] Downloaded ${buffer.length} bytes.`);
  return buffer;
}
