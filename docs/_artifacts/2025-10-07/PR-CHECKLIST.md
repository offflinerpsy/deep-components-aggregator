# PR Checklist — prod-sync-2025-10-07

- [ ] **api/health** responds — snapshot captured in `health.json` (offline: local port 3000 unreachable; see note).
- [x] **api/metrics** responds — see `metrics.txt` (generated via local registry import).
- [ ] **WARP proxy** active with distinct direct/proxy IPs — current status shows `Disconnected`; captured outputs in `proxy/` folder.
- [ ] **Search returns price breaks** — not validated today; follow-up needed with live API (requires credentials).
- [x] **No secrets in diff** — `.gitignore` updated, deploy key replaced with template, `docs/configs/` audited.

## References
- `docs/_artifacts/2025-10-07/health.json`
- `docs/_artifacts/2025-10-07/metrics.txt`
- `docs/_artifacts/2025-10-07/proxy/`
- `docs/_artifacts/2025-10-07/runtime-status.md`
- `.gitignore` changes
- `docs/configs/deploy_key.template`
