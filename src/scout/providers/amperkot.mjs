// src/scout/providers/amperkot.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "amperkot", base: "https://amperkot.ru" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

