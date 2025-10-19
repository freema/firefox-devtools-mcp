# Code Review – PERFORMANCE-01: Remove performance tools

Date: 2025-10-19

## What Was Done

Removed all performance tools from the public MCP tool set as they provide little to no value:

- Removed exports in `src/tools/index.ts` (performanceGetMetricsTool, performanceStartTraceTool, performanceStopTraceTool and their handlers)
- Removed registrations in `src/index.ts` (both toolHandlers map and allTools array)
- Kept `src/tools/performance.ts` in the repo for reference (documents BiDi limitations); not exported nor registered

## Decisions and Impact

### Reasons for removal

1) performance_start_trace / performance_stop_trace
- Only return “not supported” error
- BiDi does not support performance tracing (unlike Chrome DevTools Protocol)
- Misleading to users/agents (appears functional, does nothing)

2) performance_get_metrics
- Only basic Navigation Timing API
- Low value for common MCP scenarios
- Prefer Firefox DevTools UI or Firefox Profiler for real profiling

### API surface reduction
Before:
- 3 performance tools (non-functional or low-value)
- ~27 tools total

After:
- 0 performance tools
- ~24 tools total
- Cleaner API for MCP agents

### Breaking change
- API break: clients using `performance_*` will fail
- Justification: deprecated/non-functional; minimal impact
- Migration: remove calls to performance tools; use Firefox DevTools UI for profiling

### Alternatives
1) Firefox DevTools Performance panel (F12 → Performance)
2) Firefox Profiler (https://profiler.firefox.com/)
3) Navigation Timing API (via `evaluate_script` if needed)

## References

### Touched files
- `src/tools/index.ts` – removed exports
- `src/index.ts` – removed registrations
- `src/tools/performance.ts` – kept for reference (not exported)

### Related
- SCHEMA-01: performance.ts had Zod in inputSchema; corrected before removal
- API simplification per tools-analysis.md

## Next Steps

- Document the breaking change in CHANGELOG
- Consider moving performance notes into `docs/future-features.md`
- Document performance alternatives in README
- If BiDi later supports profiling, reintroduce tools
