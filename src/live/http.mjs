import express from 'express';
import { suggestCandidates } from './candidates.mjs';
import { snapAndParse } from './snapshot.mjs';
import { newJob, jobState } from './queue.mjs';

export const live = express.Router();

// POST /api/live-search { q } → { job }
live.post('/live-search', express.json(), (req, res)=>{
  const q = String(req.body?.q||'').trim();
  if(!q){ res.status(400).json({ error:'empty q' }); return; }

  const job = newJob(async emit=>{
    const urls = suggestCandidates(q, Number(process.env.LIVE_CANDIDATES||6));
    let i=0;
    while(i<urls.length){
      const u = urls[i];
      await snapAndParse(u)
        .then(({canon, ms})=>emit({ type:'item', prod: canon, ms }))
        .catch(()=>{}); // не ставим try/catch в коде; промис-ветвление ок
      i++;
    }
    emit({ type:'end' });
  });

  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify({ job, eta: 3000 }));
});

// SSE: /api/live-stream?job=ID
live.get('/live-stream', (req, res)=>{
  const id = String(req.query.job||'');
  const st = jobState(id);
  if(!st){ res.status(404).end('no job'); return; }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',   // важно для SSE
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write(`event: hello\ndata: ${JSON.stringify({id})}\n\n`);

  let cursor = 0;
  let lastActivity = Date.now();

  const t = setInterval(()=>{
    const s = jobState(id);
    if(!s){ clearInterval(t); return; }

    // Keep-alive каждые 30 секунд
    if(Date.now() - lastActivity > 30000){
      res.write(`: keep-alive\n\n`);
      lastActivity = Date.now();
    }

    while(cursor < s.items.length){
      const it = s.items[cursor++];
      res.write(`event: item\ndata: ${JSON.stringify(it)}\n\n`);
      lastActivity = Date.now();
    }
    if(s.status==='done'){ res.write(`event: end\ndata: {}\n\n`); clearInterval(t); }
  }, 250);

  req.on('close', ()=>clearInterval(t));
});
