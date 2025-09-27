import { request } from 'undici';
import { armUndici, currentProxy } from '../net/proxy.mjs';

export async function proxyHealth(_req, res){
  const armed = armUndici();
  const r = await request('https://api.ipify.org?format=json', { maxRedirections:1, headers:{'User-Agent':'deep/ops'} })
    .then(x=>x, _=>null);
  if(!r || r.statusCode>399){
    res.statusCode = 503;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(JSON.stringify({ ok:false, armed }));
    return;
  }
  const ip = await r.body.json().then(x=>x.ip, _=>'');
  const p = currentProxy();
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify({ ok:true, ip, proxy: p ? p.server : null }));
}
