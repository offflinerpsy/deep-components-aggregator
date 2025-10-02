// lib/result.mjs
export const ok = (data) => ({ ok: true, data });
export const err = (code, reason, extra = {}) => ({ ok: false, code, reason, ...extra });
export const isOk = (r) => r && r.ok === true;
export const isErr = (r) => !isOk(r);
