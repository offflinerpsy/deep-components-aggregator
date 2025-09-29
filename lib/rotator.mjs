// lib/rotator.mjs
const COOLDOWN_MS = 15 * 60 * 1000;

export function makeRotator(providers) {
  // providers: [{ name, fn }] в порядке приоритета
  const state = providers.map((p) => ({ ...p, lastFailAt: 0, ok: 0, fail: 0 }));

  function nextUsable() {
    const now = Date.now();
    return state.filter((p) => now - p.lastFailAt >= COOLDOWN_MS);
  }

  function markFail(name) {
    const p = state.find((x) => x.name === name);
    if (p) {
      p.fail += 1;
      p.lastFailAt = Date.now();
    }
  }

  function markOk(name) {
    const p = state.find((x) => x.name === name);
    if (p) p.ok += 1;
  }

  return { nextUsable, markFail, markOk, snapshot: () => state.map(({ lastFailAt, ...r }) => r) };
}
