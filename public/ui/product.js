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
  const p = j && j.ok && j.product ? j.product : null;
  
  if (!p) { 
    console.error("bad canon/product", j); 
    return; 
  }

  // meta
  const titleText = p.title ? `${p.mpn} — ${p.title}` : p.mpn;
  const okTitle = set(qs('[data-testid="title"]'), titleText);
  if (!okTitle) hide(qs('[data-testid="meta"]'));

  // Скрываем пустые поля в мета-секции
  if (!set(qs('#manufacturer'), p.manufacturer || '')) {
    qs('#manufacturer').parentElement.style.display = 'none';
  }
  if (!set(qs('#pkg'), p.meta?.package || '')) {
    qs('#pkg').parentElement.style.display = 'none';
  }
  if (!set(qs('#packaging'), p.meta?.packaging || '')) {
    qs('#packaging').parentElement.style.display = 'none';
  }
  if (!set(qs('#origin'), p.origin || '')) {
    qs('#origin').parentElement.style.display = 'none';
  }

  // order
  const stock = p.order?.stock ? String(p.order.stock) : (p.order?.stock === 0 ? '0' : 'Нет данных');
  const minRUB = p.order?.min_price_rub ? `${p.order.min_price_rub} ₽` : '—';
  
  set(qs('#stock'), stock);
  set(qs('#minPrice'), minRUB);
  
  const regions = Array.isArray(p.order?.regions) ? p.order.regions : [];
  qs('#regions').innerHTML = regions.map(r => `<span class="badge">${r}</span>`).join('');

  // desc
  if (!set(qs('.desc'), p.description_html || '')) hide(qs('.desc'));

  // docs
  const pdfs = Array.isArray(p.docs) ? p.docs : [];
  if (pdfs.length) { 
    qs('#pdfList').innerHTML = pdfs.map((doc, i) => `<li><a href="${doc.doc_url || doc.url}" target="_blank" rel="noopener">${doc.title || doc.label || `PDF ${i + 1}`}</a></li>`).join(''); 
  } else {
    qs('#pdfList').innerHTML = '<li style="color: #666;">Документы не найдены</li>';
  }

  // specs
  const t = qs('#specTable');
  if (p.specs && Array.isArray(p.specs) && p.specs.length > 0) {
    t.innerHTML = p.specs.map(spec => `<tr><td>${spec.key || spec.name}</td><td>${spec.value}</td></tr>`).join('');
  } else {
    t.innerHTML = '<tr><td colspan="2" style="color: #666; text-align: center;">Технические характеристики не найдены</td></tr>';
  }

  // gallery - используем gallery[0] или плейсхолдер
  const g = qs('[data-testid="gallery"]');
  const gallery = Array.isArray(p.gallery) ? p.gallery : [];
  const mainImage = gallery.length > 0 ? gallery[0].image_url : null;
  
  if (mainImage) {
    g.innerHTML = `<img src="${mainImage}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.src='/ui/placeholder.svg';">`;
  } else {
    g.innerHTML = `<img src="/ui/placeholder.svg" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;">`;
  }
})();
