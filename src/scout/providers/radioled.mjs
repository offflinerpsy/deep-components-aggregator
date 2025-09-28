// src/scout/providers/radioled.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "radioled", base: "https://www.radioled.com" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

