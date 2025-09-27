import { request, ProxyAgent } from 'undici';
import { SocksProxyAgent } from 'socks-proxy-agent';

const TIMEOUT_MS = Number(process.env.PROXY_TEST_TIMEOUT_MS || 3500);
const CONCURRENCY = Number(process.env.PROXY_TEST_CONCURRENCY || 50);
const TARGETS = (process.env.PROXY_TEST_TARGETS || 'https://api.ipify.org?format=json').split(',');

function agentFor(p){
  if(p.proto === 'socks4' || p.proto === 'socks5') return new SocksProxyAgent(`${p.proto}://${p.host}:${p.port}`);
  // http/https
  return new ProxyAgent(`http://${p.host}:${p.port}`);
}

function now(){ return Date.now(); }

async function pingOnce(p, url){
  const a = agentFor(p);
  const t0 = now();
  const r = await request(url, { dispatcher: a, method: 'GET', maxRedirections: 1, headers: { 'User-Agent':'deep-proxy-rotator/1.0' }, bodyTimeout: TIMEOUT_MS, headersTimeout: TIMEOUT_MS })
    .then(x=>x, _=>null);
  if(!r) return { ok:false, ms: TIMEOUT_MS+1, code: 0, url };
  const ms = Math.max(1, now()-t0);
  const ok = r.statusCode>=200 && r.statusCode<400;
  return { ok, ms, code:r.statusCode, url };
}

export async function checkProxy(p){
  let score = 0; let worst = 0; let best = 999999; let okCount = 0;
  const res = [];
  let i=0; while(i<TARGETS.length){
    const r = await pingOnce(p, TARGETS[i]);
    if(r.ok){ okCount++; score += 10; if(r.ms<best) best=r.ms; if(r.ms>worst) worst=r.ms; score -= Math.floor(r.ms/50); }
    res.push(r); i++;
  }
  const alive = okCount>0;
  return { ...p, alive, score, best, worst, checks: res };
}

export async function checkMany(list){
  const out = []; let i=0; let active=0; let idx=0;
  return await new Promise(resolve=>{
    function kick(){
      while(active<CONCURRENCY && idx<list.length){
        const p = list[idx++]; active++;
        checkProxy(p).then(r=>{ out.push(r); active--; kick(); }, _=>{ active--; kick(); });
      }
      if(active===0 && idx>=list.length) resolve(out);
    }
    kick();
  });
}


