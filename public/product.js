const qs = s => new URLSearchParams(location.search).get(s) || '';
const src = qs('src'); const id = qs('id');
const url = new URL('/api/product', location.origin); url.searchParams.set('src', src); url.searchParams.set('id', id);

fetch(url).then(r=>r.json()).then(j=>{
  const p = j.product || {};
  document.getElementById('img').src = p.photo || '';
  document.getElementById('title').textContent = [p.mpn, p.manufacturer].filter(Boolean).join(' — ');
  document.getElementById('meta').textContent = p.description || '';
  document.getElementById('buy').textContent = (typeof p.minRub==='number') ? `от ${p.minRub.toFixed(2)} ₽` : 'цена по запросу';
  const a = document.getElementById('vendor'); a.href = p.vendorUrl || '#';

  const docs = p.datasheets || [];
  document.getElementById('docs').innerHTML = docs.map(d=>`<li><a href="${d}" target="_blank" rel="noopener">${d.split('/').pop()}</a></li>`).join('') || '<li>—</li>';

  const specs = p.specs || {};
  document.getElementById('specs').innerHTML = Object.keys(specs).map(k=>{
    const v = Array.isArray(specs[k]) ? specs[k].join(', ') : specs[k];
    return `<tr><th>${k}</th><td>${v}</td></tr>`;
  }).join('') || '<tr><td>—</td></tr>';
});
