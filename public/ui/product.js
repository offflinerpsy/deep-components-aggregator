// product.js — жёсткие маппинги из канона в DOM (без try/catch; guard-ветки)
const qs = (s) => document.querySelector(s);
const set = (el, txt) => { 
  if (el && txt && String(txt).trim() !== "") { 
    el.textContent = txt; 
    return true; 
  } 
  return false; 
};
const hide = (el) => { 
  if (el) el.hidden = true; 
};

(async function main() {
  const url = new URL(location.href);
  const mpn = url.searchParams.get('mpn');
  if (!mpn) { 
    console.error("no mpn"); 
    return; 
  }

  const r = await fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`, {
    headers: {'Accept': 'application/json'}
  });
  
  if (!r.ok) { 
    console.error("api error", r.status); 
    return; 
  }
  
  const j = await r.json();
  const p = j && j.product ? j.product : null;
  
  if (!p) { 
    console.error("bad canon/product"); 
    return; 
  }

  // meta
  const titleText = p.title ? `${p.mpn} — ${p.title}` : p.mpn;
  const okTitle = set(qs('[data-testid="title"]'), titleText);
  if (!okTitle) hide(qs('[data-testid="meta"]'));

  set(qs('#manufacturer'), p.manufacturer || '');
  set(qs('#pkg'), p.package || '');
  set(qs('#packaging'), p.packaging || '');
  set(qs('#origin'), p.origin || '');

  // order
  const stock = (p.availability && p.availability.inStock) ? String(p.availability.inStock) : '';
  const min = Array.isArray(p.pricing) && p.pricing.length ? p.pricing[0] : null;
  const minRUB = min && min.price_rub ? `${min.price_rub.toFixed(2)} ₽` : '';
  
  if (!set(qs('#stock'), stock)) hide(qs('.stock'));
  if (!set(qs('#minPrice'), minRUB)) hide(qs('.price'));
  
  const regions = Array.isArray(p.suppliers) ? [...new Set(p.suppliers.map(s => s.region).filter(Boolean))] : [];
  qs('#regions').innerHTML = regions.map(r => `<span class="badge">${r}</span>`).join('');

  // desc
  if (!set(qs('.desc'), p.description || '')) hide(qs('.desc'));

  // docs
  const pdfs = Array.isArray(p.datasheets) ? p.datasheets : [];
  if (pdfs.length) { 
    qs('#pdfList').innerHTML = pdfs.map((u, i) => `<li><a href="${u}" target="_blank" rel="noopener">PDF ${i + 1}</a></li>`).join(''); 
  } else {
    hide(qs('[data-testid="docs"]'));
  }

  // specs
  const t = qs('#specTable');
  if (p.technical_specs && typeof p.technical_specs === 'object' && Object.keys(p.technical_specs).length) {
    t.innerHTML = Object.entries(p.technical_specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  } else {
    hide(qs('[data-testid="specs"]'));
  }

  // gallery (плейсхолдер если нет картинок)
  const g = qs('[data-testid="gallery"]');
  const imgs = Array.isArray(p.images) ? p.images : [];
  g.innerHTML = imgs.length ? 
    `<img src="${imgs[0]}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;">` :
    `<div style="width:100%;height:100%;display:grid;place-items:center;color:#9ca3af;">IMAGE</div>`;
})();
