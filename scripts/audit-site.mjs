import { writeFile, mkdir } from 'node:fs/promises';
import { request } from 'undici';
import { dirname, join } from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:9201';
const OUT  = process.env.OUT  || `./_diag/audit-${Date.now()}`;
const QS   = [
  '2N2222','1N4148','transistor','op amp','резистор','транзистор','микросхема'
];

function j(url){ return request(url).then(r=>r.body.json()); }
function h(url){ return request(url, { method:'HEAD' }).then(r=>r.statusCode).catch(()=>0); }
function enc(s){ return encodeURIComponent(s); }

function oneSearch(q){
  const u = `${BASE}/api/search?q=${enc(q)}`;
  const t0 = Date.now();
  return j(u).then(d=>{
    const dt = Date.now()-t0;
    const meta = d && d.meta || {};
    const rows = Array.isArray(d.rows)? d.rows : [];
    const head = rows[0] || null;
    return { q, dt, meta, total: rows.length, head };
  }).catch(()=>({ q, dt:-1, meta:{}, total:0, head:null }));
}

function oneProduct(src,id){
  const u = `${BASE}/api/product?src=${enc(src)}&id=${enc(id)}`;
  const t0 = Date.now();
  return j(u).then(d=>{
    const dt = Date.now()-t0;
    const p = d && d.product || {};
    return { ok:true, dt, p };
  }).catch(()=>({ ok:false, dt:-1, p:{} }));
}

const mdEscape = s => String(s||'').replace(/\|/g,'\\|');

const run = ()=>{
  return mkdir(OUT, { recursive:true }).then(()=>j(`${BASE}/api/health`)).then(health=>{
    const tasks = QS.map(q=>oneSearch(q));
    return Promise.all(tasks).then(async results=>{
      // детальная проверка карточек (первые строки)
      const prods = [];
      for(const r of results){
        if(r.head && r.head._src && (r.head._id||r.head.mpn)){
          const src = r.head._src;
          const id  = r.head._id || r.head.mpn;
          const pr  = await oneProduct(src,id);
          const photo = pr && pr.p && pr.p.photo || '';
          const code  = photo ? await h(photo) : 0;
          prods.push({ q:r.q, src, id, minRub: pr.p.minRub, photo, photoCode: code, vendorUrl: pr.p.vendorUrl });
        } else {
          prods.push({ q:r.q, note:'no-head-row' });
        }
      }

      const json = { base:BASE, ts:Date.now(), health, results, prods };
      await writeFile(join(OUT,'audit.json'), JSON.stringify(json,null,2), 'utf8');

      // markdown-отчёт
      let md = `# Audit for ${BASE}\n\n`;
      md += `Health: \`${JSON.stringify(health)}\`\n\n`;
      md += `## Searches\n\n| q | total | cached | source | ms |\n|---|---:|:---:|:---|---:|\n`;
      for(const r of results){
        md += `| ${mdEscape(r.q)} | ${r.total} | ${r.meta.cached? 'yes':'no'} | ${mdEscape(r.meta.source||'')} | ${r.dt} |\n`;
      }
      md += `\n## Products (first row)\n\n| q | src | id | minRub | photo HEAD |\n|---|---|---|---:|---|\n`;
      for(const p of prods){
        md += `| ${mdEscape(p.q)} | ${mdEscape(p.src||'')} | ${mdEscape(p.id||'')} | ${p.minRub??''} | ${p.photoCode||''} |\n`;
      }
      await writeFile(join(OUT,'audit.md'), md, 'utf8');

      return `OK → ${OUT}`;
    });
  });
};

run().then(msg=>console.log(msg)).catch(()=>console.log('audit:fail'));
