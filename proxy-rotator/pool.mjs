import { loopCollect } from './sources.mjs';
import { checkMany } from './checker.mjs';

let STATE = { lastUpdate: 0, raw: [], tested: [], best: [] };

function topN(arr, n){
  const a = arr.slice(0); a.sort((x,y)=>y.score - x.score);
  return a.slice(0, n);
}

export async function startPool(){
  // первичный сбор
  const raw0 = await (async()=>{ let r=[]; await new Promise(res=>loopCollect(list=>{ r=list; res(); })); return r; })();
  STATE.raw = raw0;
  const tested0 = await checkMany(raw0);
  STATE.tested = tested0.filter(x=>x.alive);
  STATE.best = topN(STATE.tested, Number(process.env.PROXY_POOL_TOP || 200));
  STATE.lastUpdate = Date.now();

  // циклы обновления
  loopCollect(async list=>{
    STATE.raw = list;
    const tested = await checkMany(list);
    STATE.tested = tested.filter(x=>x.alive);
    STATE.best = topN(STATE.tested, Number(process.env.PROXY_POOL_TOP || 200));
    STATE.lastUpdate = Date.now();
  });
}

export function pickOne(){
  if(!STATE.best.length) return null;
  const i = Math.floor(Math.random()*STATE.best.length);
  return STATE.best[i];
}

export function snapshot(){
  return {
    lastUpdate: STATE.lastUpdate,
    counts: { raw: STATE.raw.length, tested: STATE.tested.length, best: STATE.best.length },
    best: STATE.best.slice(0, 50)
  };
}


