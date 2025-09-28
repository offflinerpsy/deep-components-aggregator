const $ = sel => document.querySelector(sel);
const tbody = $('#results tbody');
$('#go').onclick = run; $('#q').addEventListener('keydown', e=>{ if(e.key==='Enter') run(); });

async function run(){
  tbody.innerHTML = '<tr><td colspan="7">Ищем…</td></tr>';
  const q = $('#q').value.trim();
  const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r=>r.json());
  render(r.items||[]);
}

function render(items){
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="7">Ничего не найдено</td></tr>'; return; }
  tbody.innerHTML = items.map(it=>`
    <tr>
      <td><img class="thumb" src="${it.image||''}" alt=""></td>
      <td>${it.mpn}</td>
      <td>${it.brand||''}</td>
      <td>${it.desc||''}</td>
      <td>${(it.regions||[]).slice(0,4).map(r=>`<span class="badge">${r}</span>`).join('')}</td>
      <td>${it.price_rub? Math.round(it.price_rub).toLocaleString('ru-RU'): '—'}</td>
      <td><button data-mpn="${it.mpn}" class="buy">Купить</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('button.buy').forEach(b=>b.onclick=openModal);
}

async function openModal(e){
  const mpn = e.currentTarget.dataset.mpn;
  showModal(`<div class="loader">Загружаем ${mpn}…</div>`);
  const r = await fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`);
  if (!r.ok) return showModal(`<div class="loader">Карточка не найдена</div>`);
  const p = await r.json();
  showModal(`
    <div class="card">
      <div class="imgbox"><img src="${p.image||''}" alt=""></div>
      <div class="specs">
        <h2>${p.mpn} <small style="color:#6b7280">${p.brand||''}</small></h2>
        <p>${p.desc_short||''}</p>
        <h3>Регионы поставки</h3>
        <div>${(p.regions||[]).map(r=>`<span class="badge">${r}</span>`).join('')}</div>
        <h3 style="margin-top:12px;">Документы</h3>
        <ul>${(p.docs||[]).map(d=>`<li><a href="${d.url}" target="_blank" rel="noreferrer">PDF</a></li>`).join('')||'<li>—</li>'}</ul>
      </div>
      <div class="buy">
        <div style="font-size:28px; font-weight:700; margin-bottom:12px;">
          ${p.price_min_rub? Math.round(p.price_min_rub).toLocaleString('ru-RU') + ' ₽' : 'Цена по запросу'}
        </div>
        <label>Количество</label>
        <input id="qty" type="number" min="1" value="1" style="width:100%;padding:8px;margin:6px 0 12px 0;border:1px solid #e5e7eb;border-radius:8px;">
        <button id="order">Оформить заказ</button>
      </div>
    </div>
  `);
  $('#order').onclick = async ()=>{
    const qty = Number($('#qty').value||1);
    const email = prompt('E-mail для связи');
    if (!email) return;
    const r = await fetch('/api/order',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mpn, qty, email })}).then(r=>r.json());
    alert(r.ok? 'Заявка принята' : 'Ошибка');
    hideModal();
  };
}

function showModal(html){ const m = $('#modal'); $('#modal-content').innerHTML = html; m.classList.remove('hidden'); $('#modal-close').onclick=hideModal; }
function hideModal(){ $('#modal').classList.add('hidden'); }
