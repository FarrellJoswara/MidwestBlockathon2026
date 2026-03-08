# No API calls for steps 3a and 3b (direct function calls only)

## Goal

- In `app/wills/create/page.tsx`, steps 3a and 3b must **not** use any `fetch` or API calls to your app.
- Step 3a: already a direct call to `generateContractFromParserDataClient(parserOutput)` (that function calls Gemini from the browser; no change needed).
- Step 3b: today it does `fetch("/api/contract/compile", ...)`. Replace with a **direct function call** that compiles in the browser using the same logical behavior as the server's `compileContract`, so the page only does `const compiled = await compileContractClient(generated)`.

Exposing API keys is acceptable; the only constraint is "no API calls" from the page for 3a/3b.

---

## Why step 3b needs a browser compiler

The server compile in `lib/modules/contract-generator/pipeline/compile.ts` uses Node's `solc` package, which cannot run in the browser. To avoid calling `/api/contract/compile`, we need a **browser-safe** Solidity compiler. This plan uses **web-solc**, which runs the compiler in the browser via Web Workers/WASM and exposes a similar `compile(input)` API. We wrap it in a small client module that matches the existing `GeneratedContract` → `CompiledContract` interface so the page sees a single function call.

---

## Step 1: Add a browser Solidity compiler dependency

- **Action:** Add a package that can compile Solidity in the browser (e.g. **web-solc**).
- **Command:** `npm install web-solc`
- **Reason:** The existing `solc` dependency is Node-only. We need a second dependency that works in the browser so we can implement `compileContractClient` without calling the server.

---

## Step 2: Client-side compile module (same interface as server compile)

**New file:** `lib/modules/contract-generator/client-compile.ts`

- **Purpose:** Expose `compileContractClient(generated: GeneratedContract): Promise<CompiledContract>` that runs entirely in the browser. No `fetch`, no server.
- **Behavior:**
  - Accept `{ source, contractName }` (`GeneratedContract` from `lib/modules/contract-generator/types.ts`).
  - Use the browser compiler (web-solc) to compile the single source file with the same compiler options as the server: Solidity, no optimizer, `outputSelection` for `abi` and `evm.bytecode`. Use a virtual path like `"GeneratedContract.sol"` for the source key.
  - Parse the compiler output: resolve the contract by `contractName` (or first contract), read `evm.bytecode.object` and `abi`, normalize bytecode to `0x`-prefixed string.
  - On compiler errors (severity `"error"`), throw with a message similar to the server (e.g. `Compilation failed:\n...`). On empty contracts or missing bytecode, throw with clear messages matching the server's behavior where possible.
- **Return:** `{ bytecode, abi, contractName }` (`CompiledContract`) so the create page can pass it straight to `deployContractAsync`.
- **Imports:** Only the browser compiler package, `../types` for `GeneratedContract` and `CompiledContract`, and any shared constants. Do not import server-only code (e.g. `solc`, `compile.ts`).

---

## Step 3: Create page — remove compile fetch, call compile function

**Edit:** `app/wills/create/page.tsx`

- **Import:** Add `compileContractClient` from `@/lib/modules/contract-generator/client-compile`.
- **Step 3b (current ~lines 232–253):**
  - Remove the entire `fetch("/api/contract/compile", ...)` block and the associated `if (!compileRes.ok)` and `compileRes.json()`.
  - Replace with a single call: `const compiled = await compileContractClient(generated);`
  - Keep the type of `compiled` so the existing `deployContractAsync({ abi: compiled.abi, bytecode: compiled.bytecode })` and later steps (4–7) stay unchanged.
- **Logging:** Update the Step 3b log to something like "Step 3b: Compiling (client)…".
- **Error handling:** Keep the existing `try/catch`; `compileContractClient` will throw on compile errors.

Step 3a stays as-is: `const generated = await generateContractFromParserDataClient(parserOutput);`.

---

## Files summary

| Action | File |
|--------|------|
| Add dependency | `package.json` — add `web-solc` |
| Add | `lib/modules/contract-generator/client-compile.ts` — `compileContractClient(generated)` |
| Edit | `app/wills/create/page.tsx` — replace compile fetch with `compileContractClient(generated)` |

No changes to `lib/modules/contract-generator/pipeline/compile.ts` or `app/api/contract/compile/route.ts`; they remain for other callers.

---

## Result

- **Step 3a:** `generateContractFromParserDataClient(parserOutput)` — no fetch to your API.
- **Step 3b:** `compileContractClient(generated)` — no fetch; compile runs in the browser.
- The page uses only direct function calls for 3a and 3b.
