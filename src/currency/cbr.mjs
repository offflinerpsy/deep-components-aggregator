import { fetch } from 'undici';
import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const RATES = 'data/rates.json';
const URL = 'https://www.cbr.ru/scripts/XML_daily.asp';

export async function refreshRates() {
  const r = await fetch(URL);
  if (!r.ok) throw new Error(`CBR ${r.status}`);
  const xml = await r.text();
  const data = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const map = {};
  for (const v of (data.ValCurs.Valute || [])) {
    const code = v.CharCode;
    const nom = Number(v.Nominal);
    const val = Number(String(v.Value).replace(',', '.'));
    if (code && nom && val) map[code] = val / nom;
  }
  writeFileSync(RATES, JSON.stringify({ ts: Date.now(), RUB: 1, ...map }, null, 2));
  return map;
}

export function getRates() {
  if (!existsSync(RATES)) return { RUB: 1 };
  return JSON.parse(readFileSync(RATES, 'utf8'));
}

export function toRUB({ amount, currency }) {
  const r = getRates();
  const rate = r[currency?.toUpperCase() || 'RUB'];
  if (!rate) return null;
  return amount * rate;
}
