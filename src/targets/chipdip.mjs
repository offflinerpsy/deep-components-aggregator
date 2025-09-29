// src/targets/chipdip.mjs
const host = "https://www.chipdip.ru";

const isMPNish = (q) => /^[a-z0-9][a-z0-9\-\._]{2,}$/i.test(q.trim());
const slugFrom = (q) => q.trim().toLowerCase().replace(/\s+/g, "-");

export function buildTargets(q) {
  const s = q.trim();
  const targets = [];
  if (isMPNish(s)) {
    targets.push(`${host}/product/${slugFrom(s)}`);
    targets.push(`${host}/search?searchtext=${encodeURIComponent(s)}`);
  } else {
    targets.push(`${host}/search?searchtext=${encodeURIComponent(s)}`);
    targets.push(`${host}/catalog/popular/${encodeURIComponent(s)}`);
  }
  return targets;
}
