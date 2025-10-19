# TASKS-01: Tasks Folder – English Migration

Goal
- Standardize all task specifications and CR notes in English (titles, body, and checklists). Keep filenames and anchors stable for linking.

Approach
- Do not delete existing files yet. Create English versions (or translate in place) and update `tasks/README.md` to reference the English versions.
- Keep IDs (NETWORK-01/02/03, SNAPSHOT-01, etc.) the same; only change prose.

Work Items
- Translate the following files to English (content, headers, bullet lists):
  - `tasks/README.md` (overview and checklist)
  - `tasks/99-specification.md` (specification sections and notes)
  - `tasks/tools-analysis.md` (tool analysis narrative)
  - `tasks/CR-*.md` code reviews (CR-NETWORK-01..03, CR-PERFORMANCE-01, CR-SNAPSHOT-01, CR-PAGES, CR-SCHEMA-01, CR-TOOLS-PROMPTS-01, CR-CODE-COMMENTS-01)
- Ensure terminology is consistent across files (MCP, BiDi, snapshot/UID, selected tab vs all tabs).
- Remove diacritics and Czech sentences from task bodies.

Acceptance Criteria
- `tasks/README.md` and `tasks/99-specification.md` are fully English.
- All linked task docs read naturally in English and accurately describe the current implementation.
- File references remain valid; no broken links in README/spec.

