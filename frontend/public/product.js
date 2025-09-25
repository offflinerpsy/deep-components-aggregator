const qs = new URLSearchParams(location.search);
const mpn = (qs.get("mpn")||"").trim();

const el = (id)=>document.getElementById(id);
const h1 = el("h1");
const imgMain = el("img-main");
const thumbs = el("thumbs");
const pdfsTop = el("pdfs-top");
const pdfs = el("pdfs");
const metaKv = el("meta-kv");
const desc = el("description");
const specsBody = el("specs-body");
const inStock = el("inStock");
const minRub = el("minRub");
const regions = document.getElementById("regions");

function setHidden(node, cond){ if(node){ if(cond) node.classList.add("hidden"); else node.classList.remove("hidden"); } }
function addMeta(k,v){ if(!k || !v) return; const dt=document.createElement("dt"); dt.textContent=k;
  const dd=document.createElement("dd"); dd.textContent=String(v); metaKv.append(dt,dd); }
function badge(txt){ const s=document.createElement("span"); s.className="badge"; s.textContent=txt; return s; }
function minPriceRub(pr){ if(!Array.isArray(pr)||!pr.length) return 0; const p = pr[0]; return Number.isFinite(p.price_rub)?p.price_rub:0; }

async function main(){
  if (!mpn){ h1.textContent="MPN не указан"; return; }
  const r = await fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`, {headers:{Accept:"application/json"}});
  const ok = r.ok && r.headers.get("content-type")?.includes("application/json");
  if (!ok){ h1.textContent = `${mpn} — нет данных`; return; }
  const j = await r.json();
  if (!j.ok || !j.product){ h1.textContent = `${mpn} — нет данных`; return; }
  const p = j.product;

  // Заголовок
  h1.textContent = [p.mpn, p.title].filter(Boolean).join(" — ");

  // META («вот эта вся хуйня»)
  addMeta("Номенклатурный номер", p.mpn||"");
  addMeta("Производитель", p.manufacturer||"");
  addMeta("Корпус", p.package||"");
  addMeta("Упаковка", p.packaging||"");
  // при наличии можем подсосать из ТТХ ещё 2–3 строки
  const ts = p.technical_specs||{};
  if (ts["Страна происхождения"]) addMeta("Страна происхождения", ts["Страна происхождения"]);
  if (ts["Тип"]) addMeta("Тип", ts["Тип"]);

  // ОПИСАНИЕ
  setHidden(desc.parentElement, !(p.description && p.description.trim()));
  if (!desc.parentElement.classList.contains("hidden")) desc.textContent = p.description.trim();

  // ГАЛЕРЕЯ
  const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (imgs.length){ imgMain.src = imgs[0]; imgs.slice(1).forEach(u=>{ const t=document.createElement("img"); t.src=u; t.loading="lazy"; thumbs.appendChild(t); t.onclick=()=>{ imgMain.src=u; }; }); }
  // PDF сверху под галереей
  const pdfArr = Array.isArray(p.datasheets) ? p.datasheets.filter(Boolean) : [];
  pdfArr.forEach((u,i)=>{ const a=document.createElement("a"); a.href=u; a.target="_blank"; a.rel="noopener"; a.textContent=`PDF ${i+1}`; (i===0?pdfsTop:pdfs).appendChild(a); });
  // если нет ни img ни pdf — прячем галерею
  setHidden(document.querySelector('.gallery'), imgs.length===0 && pdfArr.length===0);

  // ДОКУМЕНТАЦИЯ (боковой блок)
  setHidden(document.querySelector('.docs'), pdfArr.length===0);

  // ТЕХПАРАМЕТРЫ
  const keys = Object.keys(ts);
  setHidden(document.querySelector('.specs'), keys.length===0);
  keys.forEach(k=>{ const tr=document.createElement("tr");
    const td1=document.createElement("td"); td1.textContent=k;
    const td2=document.createElement("td"); td2.textContent=String(ts[k]);
    tr.append(td1,td2); specsBody.appendChild(tr);
  });

  // ЗАКАЗ (правый столбец)
  const min = minPriceRub(p.pricing);
  inStock.textContent = (p.availability && Number.isFinite(p.availability.inStock)) ? String(p.availability.inStock) : "0";
  minRub.textContent = Number.isFinite(min) ? min.toFixed(2) : "0.00";
  regions.innerHTML = "";
  const rs = Array.isArray(p.regions) ? p.regions : [];
  rs.forEach(rg=>regions.appendChild(badge(rg)));
}
main();
