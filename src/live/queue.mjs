const PENDING = new Map(); // id -> { status, items:[], started, done }
let COUNTER = 1;
const CONCURRENCY = Number(process.env.LIVE_SNAP_CONC || 2);

const WORK = [];
let running = 0;

export function newJob(fn){
  const id = String(COUNTER++); const slot = { status:'queued', items:[], started:Date.now(), done:0 };
  PENDING.set(id, slot);
  WORK.push(async()=>{ slot.status='running'; await fn((it)=>slot.items.push(it)); slot.status='done'; slot.done=Date.now(); });
  tick();
  return id;
}
function tick(){
  while(running<CONCURRENCY && WORK.length){
    const task = WORK.shift(); running++;
    task().then(()=>{ running--; tick(); }, _=>{ running--; tick(); });
  }
}
export function jobState(id){ return PENDING.get(id) || null; }
