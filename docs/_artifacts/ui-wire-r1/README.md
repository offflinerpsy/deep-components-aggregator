Artifacts for UI⇆API Wiring R1:

- api-captures/* — raw curls with headers+body for public endpoints
- sse-proof/* — SSE headers (canonical) and first 100 lines of stream
- rewrites-proof.md — side-by-side direct backend vs via Next rewrites
- ui-smoke-results.md — checklist and screenshots (3 breakpoints)

Notes:
- Next rewrites proxy keeps the URL stable for the user while forwarding to backend.
- All frontend requests must go through /api/* and be proxied to Express.
- Backend standard: Undici ProxyAgent + setGlobalDispatcher unify outbound HTTP (including global fetch). Keep `NO_PROXY=127.0.0.1,localhost` in env to bypass proxy for local services.
