// src/scout/providers/trustedparts.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "trustedparts", base: "https://www.trustedparts.com" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

