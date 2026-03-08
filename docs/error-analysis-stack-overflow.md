# Error analysis: "Maximum call stack size exceeded" when creating a will

## What the call stack means

The crash happens in this order:

1. **`ensurePage`** – Next.js (Turbopack) compiles the route that was requested: `/api/contract/generate-and-deploy`.
2. **`handleRouteType`** → **`processIssues`** – Something in that pipeline **fails** (real error). Turbopack then tries to report it.
3. **`formatIssue`** – Turbopack’s dev server tries to format the error with a code snippet.
4. **`codeFrameColumns`** (Babel) – Builds a “code frame” (file excerpt with line numbers).
5. **`highlight`** → **`highlightTokens`** – Babel’s JS syntax highlighter tokenizes the source with regex.
6. **`RegExp.exec`** – The highlighter recurses until the stack overflows.

So: **the stack overflow is inside Next’s error formatter**, not in your app. A real error occurred first (the 500 from `POST /api/contract/generate-and-deploy`); when Turbopack tried to print it, the formatter crashed and you saw “Maximum call stack size exceeded” instead of the original message.

## What actually failed

From your terminal:

- `POST /api/contract/generate-and-deploy 500 in 3346ms` – the **generate-and-deploy** API returned 500.
- That API runs: **generate (Gemini)** → **compile (solc)** → **deploy (viem)**.

Typical causes of the 500:

- **Missing env**: `DEPLOYER_PRIVATE_KEY` or `GOOGLE_API_KEY` / `GEMINI_API_KEY`.
- **Deploy error**: “Deploy requires deployerPrivateKey (options or DEPLOYER_PRIVATE_KEY env).”
- **Gemini**: empty/invalid response, or wrong model name.
- **Compile error**: generated Solidity doesn’t compile or fails validation (e.g. missing `declareDeath`).

The API route already returns that error in the response body: `{ error: "…" }`. The create-will page reads it and calls `setError(...)`, so the **real message should appear in the form** (red error box). The stack overflow only affects what gets printed in the **server** terminal.

## What to do

1. **See the real error in the UI**  
   After clicking “Create Will”, check the red error message on the Create Will page. That’s the message from the 500 response (e.g. missing `DEPLOYER_PRIVATE_KEY`).

2. **See the real error in the terminal**  
   Run dev without Turbopack so the formatter doesn’t crash and the server logs the real error:

   ```bash
   npm run dev:webpack
   ```

   Then trigger Create Will again; the terminal should show the actual error (e.g. from the pipeline or env).

3. **Fix the underlying issue**  
   Usually one of:
   - Add `DEPLOYER_PRIVATE_KEY` (and optionally `RPC_URL` / `WILL_REGISTRY_RPC_URL`) to `.env.local` for deploy.
   - Ensure `GOOGLE_API_KEY` or `GEMINI_API_KEY` is set for contract generation.
   - If the error is about generated Solidity (e.g. “missing declareDeath”), that’s a pipeline/validation issue to fix in code or prompt.

## Summary

| What you see            | What it is                                                                 |
|-------------------------|----------------------------------------------------------------------------|
| “Maximum call stack…”   | Turbopack’s error formatter crashing (Babel `highlightTokens` + regex).  |
| `POST .../generate-and-deploy 500` | The real failure: something in generate/compile/deploy or env.     |
| Red error on Create Will page | The same real error, from the API response body.                  |

The bug is in **Next.js/Turbopack’s error display**, not in your will-creation logic. Use `npm run dev:webpack` when you need clear server-side error messages.
