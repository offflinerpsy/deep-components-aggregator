// src/scout/providers/dessy.mjs
import { canonItem } from "../schema.js";
export const meta = { name: "dessy", base: "https://www.dessy.ru" };
export async function search(q) { return { ok: false, reason: "not implemented", items: [] }; }
export async function product(url) { return { ok: false, reason: "not implemented", item: null }; }

