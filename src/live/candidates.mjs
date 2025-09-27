import fs from 'node:fs';
const MAN_FILE = 'data/manifests/chipdip-urls.txt';

function norm(s){ return String(s||'').trim().toLowerCase(); }

export function suggestCandidates(q, limit=10){
  const s = norm(q);
  if(!fs.existsSync(MAN_FILE)) return [];
  const lines = fs.readFileSync(MAN_FILE,'utf8').split(/\r?\n/).filter(Boolean);
  const hits = []; let i=0;
  while(i<lines.length && hits.length<limit){
    const u = lines[i];
    if(u.toLowerCase().includes(s)) hits.push(u);
    i++;
  }
  return hits;
}
