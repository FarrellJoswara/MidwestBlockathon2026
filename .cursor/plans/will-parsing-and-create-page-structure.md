# Will Parsing and Create Page: Structure + Safe Prompt Improvements

## 1. Recommended page structure (create flow)

The create page should present **two distinct sections** so names never appear twice and assets are clear:

| Section | Purpose | Data source after parse |
|--------|---------|--------------------------|
| **Beneficiaries & allocation** | One row **per person**: name, wallet (user fills), percentage. Total = 100%. | Aggregate parser output by **placeholderId**: unique people, combined percentages. |
| **Assets from the will** | One row **per bequest**: asset description, "Assign to" (person), optional NFT. | One row per parser `beneficiaries` entry; "Assign to" = dropdown of unique beneficiaries, pre-filled by bequest's person. |

- **Names:** Shown once per person in the first section. No duplicate "Alice" / "Alice" / "Bob" — only "Alice" and "Bob" with one wallet and one % each.
- **Assets:** Each bequest from the document is one row; "Assign to" links to the correct person (and is pre-filled from the parse). User can fix misattribution or add NFTs.

This matches the contract model (one row per beneficiary + separate assets) and is what the **will_creation_ui_improvements** plan implements (aggregation by `placeholderId`, then unique beneficiaries + asset rows with `beneficiaryIndex`). Implement that plan so the page structure is correct regardless of parser quirks.

---

## 2. Why names or assets look wrong today

- **Names appearing twice (or more):**  
  Parser correctly returns **one row per bequest**. The same person can appear in multiple rows (e.g. "Alice – 50%", "Alice – House"). The **current** create page maps parser output 1:1 to the form, so you see one beneficiary row per bequest → duplicate names.  
  **Fix:** Use aggregation (see §1). Do not rely on the parser to return one row per person; the schema is one row per bequest.

- **Weird or duplicate assets:**  
  Can come from:
  - **Prompt ambiguity:** Model sometimes duplicates the same asset, uses long legal phrasing in `assetDescription`, or uses slightly different names for the same person.
  - **No explicit "one row per distinct bequest" / "same person = same placeholderId"** in the prompt, so the model may repeat rows or vary spelling.

Improving the **parser prompt** (and optionally a light **post-parse normalization**) reduces these issues without changing the JSON schema or breaking the pipeline.

---

## 3. Safe parser prompt improvements (willParser.ts)

**Principle:** Change only the **instructions** in `WILL_ANALYSIS_PROMPT`. Do **not** change the JSON schema, field names, or types. Validation and downstream code stay the same.

### 3.1 — Same person, same identifier

**Add to Rules:**

- For the **same person**, use the **exact same** full name and the **exact same** `placeholderId` in every row where they appear. Example: every row for Alice Johnson must have `"name": "Alice Johnson"` and `"placeholderId": "alice_johnson"`. Do not vary spelling or add extra words (e.g. avoid "Alice M. Johnson" in one row and "Alice Johnson" in another — pick one and use it everywhere).

**Why:** Reduces duplicate-looking names and ensures aggregation by `placeholderId` groups one person correctly.

**Exact text to add (in Rules, after existing bullets):**  
`- **Consistency:** For the same person in multiple bequests, use the exact same "name" and "placeholderId" in every row. Do not vary spelling — choose one form and use it everywhere for that person.`

### 3.2 — One row per distinct bequest only

**Add to Rules:**

- Output **exactly one row per distinct bequest**. Do not create two rows for the same gift (e.g. one row for "50% of residue to Alice" is enough; do not add a second row for "the rest of my estate to Alice" if it is the same share). For **specific items** (house, car, painting), one row per item; do not duplicate the same item under different wording (e.g. "the house" and "my residence at [address]" for the same property — use one row with a short label).

**Why:** Cuts duplicate assets and redundant rows that make the list look "weird."

**Exact text to add:**  
`- **One row per bequest:** Output exactly one row per distinct bequest. Do not duplicate the same gift (e.g. one row for "50% to X" is enough). For specific items (house, car, jewelry), one row per item — do not list the same item twice under different wording.`

### 3.3 — Keep assetDescription short and consistent

**Tighten existing assetDescription rules:**

- **Maximum 2–6 words** for each `assetDescription`. No street addresses, no city names, no long legal phrases. If the will uses a long clause, summarize in a few words (e.g. "Residuary share", "Home", "Vehicle: 2016 Honda Accord", "$10,000 from bank").
- Do not use the **exact same** `assetDescription` for two different bequests unless the document actually lists the same thing twice (e.g. two different cash gifts can both say "$5,000" if the will specifies two separate $5k gifts).

**Why:** Reduces "weird" long or duplicated labels; keeps the UI readable.

**Exact text to add (merge with existing assetDescription rule):**  
`- **assetDescription:** Maximum 2–6 words. No addresses, no long legal clauses. Summarize (e.g. "Residuary share", "Home", "Vehicle: 2016 Honda Accord"). Do not duplicate the same description for two different bequests unless the will explicitly lists the same item twice.`

### 3.4 — Optional: reminder at end of prompt

**Add one line before "Will text:":**

- Remember: one row per bequest; same person → same name and placeholderId everywhere; short asset descriptions only.

**Why:** Reinforces the rules without changing structure.

**Exact text to add (immediately before "Will text:"):**  
`Remember: one row per distinct bequest; same person → same name and placeholderId everywhere; short asset descriptions only.`

---

## 4. Optional: light post-parse normalization (willParser.ts)

Keep schema and types unchanged. In `validateParsedWill`, after building each beneficiary entry:

- **Trim** `assetDescription`: `assetDescription.trim()` (and optionally collapse internal spaces).
- **Cap length** (e.g. first 80 characters) so a single long phrase doesn't break the UI: `assetDescription.slice(0, 80).trim()`.
- **placeholderId:** Already derived from `name` when missing; ensure you use `toPlaceholderId(name)` when the model returns an empty or inconsistent `placeholderId` so the same name always yields the same id.

This is **defensive only**; the main fix is the prompt. Do not merge or drop rows in post-processing (that could remove valid bequests).

---

## 5. Contract-generation prompt (prompt-and-parse.ts)

**Recommendation:** Do **not** change the contract-generation prompt unless you see concrete failures (wrong contract, missing fields). The generator expects one row per beneficiary and separate assets; once the create page uses aggregation (§1), the **input** to the generator is already correct. Changing the prompt there is higher risk for little gain.

If you later see issues (e.g. generator ignoring assets or percentages), add one short instruction at a time and re-test contract generation.

---

## 6. Rollout and how to confirm nothing is broken

1. **Implement page structure first** (aggregation + two sections as in will_creation_ui_improvements). That fixes duplicate names and wrong "Assign to" regardless of parser output.
2. **Snapshot current behavior (optional):** Run the parser on 2–3 sample PDFs or pasted will texts; save the JSON outputs as "before" examples.
3. **Apply prompt changes** (§3) in one go or in small steps (e.g. §3.1 first, then §3.2, then §3.3). After each step:
   - Run the parser on the same samples.
   - Confirm the response is still valid JSON and passes `validateParsedWill`.
   - Confirm you did not remove or rename any schema fields.
4. **Add optional normalization** (§4) if you want a safety net; run the same samples again and confirm output still validates.
5. **Smoke test:** Create flow end-to-end (upload PDF → Analyze → check one row per person, one row per bequest → add wallets → Create Will). No schema or API changes, so existing tests and flows should keep working.

---

## 7. Summary

| Area | Action |
|------|--------|
| **Page structure** | Use two sections: unique beneficiaries (aggregate by placeholderId) + one row per bequest for assets. Implement via will_creation_ui_improvements plan. |
| **Parser prompt** | Add rules: same person → same name/placeholderId; one row per distinct bequest; short assetDescription (2–6 words, no addresses). Do not change schema. |
| **Post-parse** | Optional: trim and cap assetDescription, ensure placeholderId from name when missing. No row merging or deletion. |
| **Contract prompt** | Leave unchanged unless you see specific generator failures. |

This keeps the system stable (same schema, same API, same validation) while reducing duplicate names and weird assets through clearer instructions and, if you want, light normalization.
