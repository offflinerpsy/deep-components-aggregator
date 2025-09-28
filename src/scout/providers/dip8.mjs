// src/scout/providers/dip8.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "dip8", base: "https://dip8.ru" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

