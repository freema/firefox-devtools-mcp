# CODE-COMMENTS-01: Code Comments Review and Cleanup

Goal
- Audit all comments in `src/` for clarity, accuracy, and consistency (English only), and prepare precise edits to remove outdated/internal references and align comments with actual behavior.

Scope
- Entire `src/` tree: CLI, config, utils, types, Firefox client (core/events/dom/pages/snapshot/*), MCP tools, and server entry.

Global Findings
- Language: Comments are predominantly in English. Keep it that way; remove any non‑English wording if found.
- Internal task references: Many files mention “Full implementation in task XX” or inline “Task NN” markers. These are internal project breadcrumbs and should be removed or converted to neutral, durable descriptions.
- MCP tool descriptions vs code comments: Several tool descriptions include user‑facing disclaimers (e.g., “BiDi MVP limitations”). These belong in docs, not tool descriptions that agents read. Keep descriptions actionable and concise.
- Accuracy: One notable mismatch exists in DOM drag‑and‑drop (see below). A few comments will need updates after the network “always‑on” change.
- Emojis: Present in some comments and user‑visible messages. While acceptable, ensure they don’t replace essential wording and remain optional flavor.

Per‑File Review and Required Changes

1) src/index.ts (MCP server)
- Issue: Inline comments label groups by “task NN”. Replace with neutral section headers (Pages, Console, Network, Snapshot, Input, Screenshot, Utilities) without task numbers.
- Issue: Tool descriptions in code comments should not repeat docs; keep concise (what the mapping does, not why).
- Action: Remove “task NN” markers; keep categories only.

2) src/tools/pages.ts
- Issue: File header “Full implementation in task 06” is an internal note.
- Action: Replace header with “Page navigation and management tools for MCP.”
- Note: If `refresh_pages` is removed later, also prune its comments and references.

3) src/tools/console.ts
- Issue: File header “Full implementation in task 08”.
- Action: Replace with “Console tools for MCP.” Keep brief rationale of filters; avoid process notes.

4) src/tools/network.ts
- Issues:
  - User‑facing descriptions contain disclaimers (“Current BiDi MVP …”). Move such caveats to docs, not tool `description`.
  - `inputSchema` comments align with Zod usage, but we will migrate to pure JSON Schema (SCHEMA‑01). Update accompanying comments accordingly.
  - After NETWORK‑03 (always‑on), comments about “must start monitoring first” become incorrect.
- Actions:
  - Strip disclaimers from tool `description` strings.
  - Replace “must start monitoring” hints with filter guidance (limit/since/sortBy) once always‑on lands.
  - Update any internal commentary to reflect the new model (always‑on, stable ids, `get_network_request` pairs with list).

5) src/tools/performance.ts
- Issue: Comments describe unsupported features and mark tools as deprecated. We plan to remove these tools from MCP.
- Action: If file remains for future reference, replace header comment with a single line pointing to docs/future‑features.md, or remove file entirely per PERFORMANCE‑01.

6) src/tools/script.ts
- Issue: Header “Full implementation in task 08” and long in‑code guidance while the tool is disabled by default.
- Actions:
  - Update header to: “JavaScript evaluation tool (currently disabled; see docs/future‑features.md).”
  - Keep the safety guidance but ensure it’s concise and present in docs rather than comments.

7) src/tools/screenshot.ts, src/tools/snapshot.ts, src/tools/utilities.ts, src/tools/input.ts
- Snapshot: Comments are clear. Consider adding a brief “What to do next” hint to user‑facing output instead of comments (addressed by SNAPSHOT‑01). Code comments remain concise.
- Input: Good guidance, but ensure all UID staleness messaging is consistent; comments should reflect this standard.
- Screenshot: Comments OK; no change beyond keeping them focused.
- Utilities: Fine.

8) src/firefox/dom.ts
- Issue: In `dragByUidToUid`, the comment says “Use Actions API first, then dispatch JS events as fallback”, but the code only dispatches JS drag events via executeScript.
- Action: Fix the comment to accurately reflect behavior: “Use JS drag events fallback for compatibility (Actions DnD not used).” Optionally add a TODO if Actions API is considered future work.
- Other comments are accurate and concise.

9) src/firefox/events/network.ts
- Issue: Comments assume “enabled” flag controls capture (start/stop model). After NETWORK‑03 (always‑on), comments should reflect continuous capture and filter‑based listing.
- Action: Update comments to: “Subscribes globally; capture is continuously enabled. Lifecycle hooks clear buffer on navigation (configurable).”
- Keep the cautionary notes minimal (no long disclaimers).

10) src/firefox/events/console.ts
- Comments are accurate; minimal changes. Keep “autoClearOnNavigate default” rationale.

11) src/firefox/pages.ts, src/firefox/core.ts
- Comments are accurate and focused; no structural changes required.

12) src/firefox/snapshot/* (formatter, manager, resolver, injected/*)
- Comments are accurate and English. Consider a single high‑level note in `snapshot.injected.ts` clarifying that the function is idempotent and avoids DOM mutations (already implied). No further changes required.

13) src/utils/* and src/types/*
- Comments are concise and in English; no changes required.

Acceptance Criteria
- All comments are in English and accurately describe current behavior.
- No “Task NN”/internal roadmap markers remain in code comments.
- No user‑facing disclaimers about limitations inside tool `description` strings; move such context to docs.
- DOM drag‑and‑drop comment corrected to match implementation.
- Network comments updated to reflect the always‑on model (post NETWORK‑03) and the new list/get pairing with stable `id`.

Implementation Plan
1) Strip internal task references and replace with durable headings across src/index.ts and src/tools/* headers.
2) Update network tool comments/descriptions: remove MVP disclaimers, remove “start monitoring first”, add list/get pairing note (stable IDs).
3) Adjust dom.ts DnD comment to reflect JS‑events fallback only; add TODO if Actions DnD will be considered later.
4) If performance tools are removed, purge related comments; else: point to future‑features doc and mark disabled.
5) Quick pass over snapshot/input/utilities/screenshot for consistency and brevity; ensure UID staleness guidance in comments is uniform.

Verification
- Run `rg -n "Task [0-9]|Full implementation|MVP|start monitoring" src` to ensure removals/updates landed.
- Sanity‑check that MCP tool descriptions remain helpful and concise when rendered in MCP clients.
- Confirm no Czech/other non‑English wording remains in comments.

References
- NETWORK-01/02/03, PERFORMANCE-01, SNAPSHOT-01, SCHEMA-01 tasks in `tasks/`.
