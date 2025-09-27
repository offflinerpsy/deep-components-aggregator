import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { startPool, pickOne, snapshot } from './pool.mjs';

const app = express();
app.use(compression());
app.use(cors());

app.get('/proxies/best', (_req, res)=>{ const p = pickOne(); res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify({ proxy: p })); });
app.get('/proxies/list', (_req, res)=>{ res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(snapshot())); });
app.get('/metrics', (_req, res)=>{ const s=snapshot(); res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify({ t: s.lastUpdate, ...s.counts })); });

const PORT = Number(process.env.PROXY_API_PORT || 9125);
startPool().then(()=>{ app.listen(PORT, ()=>process.stdout.write(`proxy-rotator API :${PORT}\n`)); }, _=>{});


