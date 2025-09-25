import fs from "node:fs";
import path from "node:path";

const FP = path.join(process.cwd(), "data", "rates.json");
const TTL = 12 * 3600 * 1000;

function parseCbr(xml){
  if (!xml || xml.length < 1000) return { ok:false };
  const read = code => {
    const re = new RegExp(`<CharCode>${code}</CharCode>[\\s\\S]*?<Value>([\\d,]+)</Value>`,"i");
    const m = re.exec(xml); if (!m) return 0;
    const n = Number(m[1].replace(",", ".")); return Number.isFinite(n) ? n : 0;
  };
  const USD = read("USD"), EUR = read("EUR");
  return (USD>0 || EUR>0) ? { ok:true, USD, EUR, ts:Date.now() } : { ok:false };
}

export async function getRates(){
  const exists = fs.existsSync(FP);
  if (exists) {
    const j = JSON.parse(fs.readFileSync(FP,"utf8"));
    if (j && j.ts && (Date.now()-j.ts) < TTL) return { ok:true, USD:j.USD||0, EUR:j.EUR||0, cached:true };
  }
  const r = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", { headers:{ "Accept":"application/xml" } })
    .then(x => x.ok ? x.text().then(t=>({ok:true,t})) : ({ok:false}))
    .catch(()=>({ok:false}));
  if (!r.ok) return { ok:false };

  const p = parseCbr(r.t); if (!p.ok) return { ok:false };
  fs.mkdirSync(path.dirname(FP), { recursive:true });
  fs.writeFileSync(FP, JSON.stringify({ ts:p.ts, USD:p.USD, EUR:p.EUR }, null, 2));
  return { ok:true, USD:p.USD, EUR:p.EUR, cached:false };
}

export function applyRub(price, cur, rates){
  const k = cur==="USD" ? rates.USD : (cur==="EUR" ? rates.EUR : 0);
  return (price>0 && k>0) ? Math.round(price * k * 100)/100 : 0;
}
