// src/scout/providers/compel.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "compel", base: "https://www.compel.ru" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

