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

- [rule] **Tech Lead mode is PERMANENT for this project** — all tasks follow PLAN → CHANGES → RUN → VERIFY → ARTIFACTS → GIT structure
- [rule] Primary communication language is Russian by default; switch only on explicit user request or when preserving exact technical meaning is critical
- [rule] Vitest conflicts with Playwright tests when both use `*.spec.ts` pattern — exclude Playwright files via `vitest.config.js`
- [rule] ESLint flat config (v9+) requires `globals` package for browser/node environments; separate config blocks for frontend vs backend code
- [gotcha] Many legacy files have unused vars and escape warnings — scope linting to new code only to avoid blocking PRs
- [arch] Health endpoint already exists at `/api/health` with probe mode — no need to recreate, just test the pattern
- [rule] All work produces artifacts in `docs/_artifacts/<date>/` — JSON responses, curl outputs, verification reports
- [rule] No try/catch in new code — use guard clauses and explicit error returns (Result/Either pattern)
- [rule] **Product card redesign completed 2025-10-13**: Updated v0-components-aggregator-page with reference design — two-column specs layout, enhanced purchase sidebar, white card surfaces with shadows
- [rule] **Mailcow email system configured**: 3 accounts (alex@, adp@, zapros@ + prosnab.tech) with password 123asd; IMAP 993/SSL, SMTP 587/STARTTLS; admin at mail.prosnab.tech/admin
- [gotcha] Email client setup requires FULL email address as username, not just local part — common user mistake
- [perf] Mailcow anti-loop protection essential — connection rate limiting and queue management prevent server overload
- [arch] Email infrastructure decision: Mailcow Docker stack chosen over alternatives for integrated webmail, admin interface, and security features

