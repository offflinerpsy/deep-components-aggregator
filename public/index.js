const qs = s => new URLSearchParams(location.search).get(s) || '';
const fmtK = n => (n>=1000?((Math.round(n/100)/10).toFixed(1)+'k'):(n??''));
const cell = v => (v==null||v==='')?'':v;
const toHref = r => `/product.html?src=${encodeURIComponent(r._src)}&id=${encodeURIComponent(r._id||r.mpn||'')}`;

function rowHtml(r){
  return `<tr>
    <td>${r.photo?`<img class="thumb" src="${r.photo}" alt="">`:''}</td>
    <td>${r.mpn || r.title}</td>
    <td>${cell(r.manufacturer)}</td>
    <td title="${r.description||''}">${cell((r.description||'').slice(0,120))}</td>
    <td>${cell(r.package)}</td>
    <td>${cell(r.packaging)}</td>
    <td>${(r.regions||[]).join(', ')}</td>
    <td>${r.stock!=null?fmtK(r.stock):''}</td>
    <td>${typeof r.minRub==='number'?r.minRub.toFixed(2):'—'}</td>
    <td><a href="${toHref(r)}">Open</a></td>
  </tr>`;
}
function render(rows, meta){
  console.log('Rendering:', rows.length, 'rows, meta:', meta);
  document.querySelector('#oems tbody').innerHTML = rows.map(rowHtml).join('');
  document.querySelector('#meta').textContent = `source: ${meta.source}, total: ${meta.total}`;
}
function search(q){
  console.log('Searching for:', q);
  const u = new URL('/api/search', location.origin); 
  u.searchParams.set('q', q);
  console.log('Fetching:', u.toString());
  
  fetch(u)
    .then(r => {
      console.log('Response status:', r.status);
      return r.json();
    })
    .then(j => {
      console.log('API response:', j);
      render(j.rows||[], j.meta||{source:'',total:0});
    })
    .catch(e => {
      console.error('Search error:', e);
      document.querySelector('#meta').textContent = 'Error: ' + e.message;
    });
}
document.getElementById('form').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('q').value.trim();
  if(q){ history.replaceState({},'',`/?q=${encodeURIComponent(q)}`); search(q); }
});
const q0 = qs('q'); if(q0){ document.getElementById('q').value=q0; search(q0); }