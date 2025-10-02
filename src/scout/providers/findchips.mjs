// src/scout/providers/findchips.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "findchips", base: "https://www.findchips.com" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

