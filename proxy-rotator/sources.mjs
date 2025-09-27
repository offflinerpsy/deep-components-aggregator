import { setTimeout as delay } from 'node:timers/promises';
import { request } from 'undici';

const SRC = [
  // ProxyScrape API (фильтруем по протоколам)
  'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=http&proxy_format=ipport',
  'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=https&proxy_format=ipport',
  'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=socks4&proxy_format=ipport',
  'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=socks5&proxy_format=ipport',
  // TheSpeedX raw
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/https.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  // roosterkid (HTTPS_RAW)
  'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt'
];

function parseLines(s, proto, source){
  const out = []; const lines = s.split(/\r?\n/);
  let i=0; while(i<lines.length){
    const line = lines[i].trim();
    if(line && /^[0-9.:\[\]a-fA-F]+:[0-9]+$/.test(line)){
      const [host, port] = line.split(':');
      out.push({ host, port: Number(port), proto, source });
    }
    i++;
  }
  return out;
}

async function fetchTxt(url, protoHint){
  const res = await request(url, { maxRedirections: 2, headers: { 'User-Agent':'deep-proxy-rotator/1.0' } }).then(r=>r, _=>null);
  if(!res || res.statusCode>399) return [];
  const buf = await res.body.text();
  const proto = /socks5/i.test(url) ? 'socks5' : /socks4/i.test(url) ? 'socks4' : /https/i.test(url) ? 'https' : (protoHint||'http');
  return parseLines(buf, proto, url);
}

export async function collectRaw(){
  const tasks = []; let i=0;
  while(i<SRC.length){ tasks.push(fetchTxt(SRC[i])); i++; }
  const chunks = await Promise.all(tasks);
  const flat = []; let j=0; while(j<chunks.length){ const a=chunks[j]; let k=0; while(k<a.length){ flat.push(a[k]); k++; } j++; }
  // дедуп по host:port:proto
  const seen = new Set(); const out = []; let z=0;
  while(z<flat.length){ const p=flat[z]; const key=p.proto+'|'+p.host+'|'+p.port; if(!seen.has(key)){ seen.add(key); out.push(p); } z++; }
  return out;
}

export async function loopCollect(notify){
  for(;;){
    const list = await collectRaw();
    if(notify) notify(list);
    await delay(60_000); // раз в минуту
  }
}


