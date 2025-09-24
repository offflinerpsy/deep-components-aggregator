// src/currency.js — курсы ЦБ РФ (TTL 12ч), без try/catch
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DATA_DIR   = path.join(__dirname, "..", "data");
const RATES_FP   = path.join(DATA_DIR, "rates.json");
const TTL_MS     = 12 * 60 * 60 * 1000; // 12 часов

function ensureDir(dir){ 
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); 
}

function now(){ 
  return Date.now(); 
}

function parseCbrXml(xml){
  if (!xml || xml.length < 1000) return { ok: false };
  
  const getRate = code => {
    const re = new RegExp(`<CharCode>${code}</CharCode>[\\s\\S]*?<Value>([\\d,]+)</Value>`, "i");
    const match = re.exec(xml);
    if (!match) return 0;
    const num = Number(match[1].replace(",", "."));
    return Number.isFinite(num) ? num : 0;
  };
  
  const USD = getRate("USD");
  const EUR = getRate("EUR");
  
  if (USD <= 0 && EUR <= 0) return { ok: false };
  
  return { 
    ok: true, 
    ts: now(), 
    USD, 
    EUR 
  };
}

function fetchCbr(){
  const url = "https://www.cbr.ru/scripts/XML_daily.asp";
  return fetch(url, { 
    headers: { 
      "Accept": "application/xml",
      "User-Agent": "Mozilla/5.0 (compatible; DEEP-aggregator/1.0)"
    } 
  })
  .then(r => r.ok ? r.text().then(t => ({ ok: true, text: t })) : ({ ok: false }))
  .then(x => x.ok ? parseCbrXml(x.text) : ({ ok: false }))
  .catch(() => ({ ok: false }));
}

export function getRates(){
  ensureDir(DATA_DIR);
  
  // Проверяем кеш
  if (fs.existsSync(RATES_FP)) {
    const txt = fs.readFileSync(RATES_FP, "utf-8");
    if (txt && txt.trim().length > 2) {
      const cached = JSON.parse(txt);
      if (cached && cached.ts && (now() - cached.ts) < TTL_MS) {
        return Promise.resolve({ 
          ok: true, 
          USD: cached.USD || 0, 
          EUR: cached.EUR || 0, 
          ts: cached.ts, 
          cached: true 
        });
      }
    }
  }
  
  // Получаем свежие данные
  return fetchCbr().then(result => {
    if (!result.ok) return { ok: false };
    
    const rates = { 
      ts: result.ts, 
      USD: result.USD, 
      EUR: result.EUR 
    };
    
    fs.writeFileSync(RATES_FP, JSON.stringify(rates, null, 2));
    
    return { 
      ok: true, 
      USD: result.USD, 
      EUR: result.EUR, 
      ts: result.ts, 
      cached: false 
    };
  });
}
