# Copilot Memory — Lessons Learned

Append 1–5 short bullets after each significant task or bug fix.

## Format
```
- [rule] Brief lesson or pattern discovered
- [gotcha] Edge case or common mistake to avoid
- [perf] Performance insight
- [arch] Architecture decision context
```

---

## Lessons

- [rule] Vitest conflicts with Playwright tests when both use `*.spec.ts` pattern — exclude Playwright files via `vitest.config.js`
- [rule] ESLint flat config (v9+) requires `globals` package for browser/node environments; separate config blocks for frontend vs backend code
- [gotcha] Many legacy files have unused vars and escape warnings — scope linting to new code only to avoid blocking PRs
- [arch] Health endpoint already exists at `/api/health` with probe mode — no need to recreate, just test the pattern

