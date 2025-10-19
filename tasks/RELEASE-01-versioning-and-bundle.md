# RELEASE-01: Versioning and Bundle Strategy

Goal
- Establish clear versioning for the server and the injected snapshot bundle, avoid presenting "1.0.0" prematurely, and document release steps.

Decisions
- Server semantic version stays in the 0.x range until API stabilizes. Proposed next: `0.2.0`.
- Injected snapshot bundle gets its own internal version string (e.g., `snapshotBundleVersion: 0.2.0`) printed in logs when loading `dist/snapshot.injected.global.js`.
- Node.js runtime: require `>=20` (align with `package.json engines`).

Scope
- Do not change behavior. Only align version declarations and add bundle version stamping + release checklist.

Tasks
1) Align runtime requirement
   - src/index.ts: change Node guard to `>=20` to match `package.json`.

2) Snapshot bundle version stamping
   - Add a constant (string) to the injected bundle at build time (tsup banner or small header variable) so `src/firefox/snapshot/manager.ts` can log:
     `Loaded snapshot bundle vX.Y.Z from: <path>`.
   - Minimal approach: prepend `// SNAPSHOT_BUNDLE_VERSION: 0.2.0` at top of `dist/snapshot.injected.global.js` during build.

3) Version fields
   - Keep `src/config/constants.ts` at `0.2.0` for the next release.
   - Ensure server advertises that version via MCP `Server` name/version.

4) Release checklist (manual for now)
   - Update `CHANGELOG.md` with highlights (network always‑on, tool prompt cleanups, snapshot UX guidance).
   - `npm run check:all` (lint, typecheck, tests, build).
   - Tag and publish (`prepublishOnly` already builds).

5) Future (optional)
   - Add `--version` CLI flag output to include both server and snapshot bundle versions.

Acceptance Criteria
- MCP Inspector shows server version `0.2.x` (not `1.x`).
- Logs show snapshot bundle version upon first load.
- Node guard enforces `>=20`.

