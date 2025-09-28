import {plan} from './orchestrator.mjs';
import crypto from 'node:crypto';

const headers = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no'  // важно для nginx
};

const send = (res, ev, data) => {
  res.write(`event: ${ev}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const liveSearchRoute = (req, res) => {
  res.writeHead(200, headers);
  const q = String(req.query.q||'');
  const id = crypto.randomUUID();

  send(res, 'start', {id, q});
  const emit = (msg) => send(res, msg.type, msg);

  const t = setTimeout(()=> { send(res,'done',{id}); res.end(); }, 13000);

  plan(q, emit, 12000).then(() => {
    clearTimeout(t); send(res,'done',{id}); res.end();
  });
};
