import express from 'express';
import {liveSearchRoute} from '../live/handler.mjs';
import {searchQuick} from '../db/sqlite.mjs';
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { spawn } from 'node:child_process';

const api = express.Router();
const pendingTasks = new Map(); // taskId -> {status, q, ts, ...}

function countCacheEntries() {
  const root = 'data/cache/html';
  let count = 0;
  if (!existsSync(root)) return 0;
  const level1 = readdirSync(root, { withFileTypes: true }).filter(d=>d.isDirectory());
  for (const d1 of level1) {
    const p1 = path.join(root, d1.name);
    const level2 = readdirSync(p1, { withFileTypes: true }).filter(d=>d.isDirectory());
    for (const d2 of level2) {
      const p2 = path.join(p1, d2.name);
      const files = readdirSync(p2).filter(f=>f.endsWith('.html'));
      count += files.length;
    }
  }
  return count;
}

api.get('/health', (_,res)=> {
  const counters = { 
    cacheEntries: countCacheEntries(), 
    pendingTasks: pendingTasks.size 
  };
  res.json({
    status: 'ok', 
    uptime: process.uptime(), 
    ts: Date.now(), 
    counters
  });
});

api.get('/search', (req,res)=> {
  const q = String(req.query.q||'').trim();
  if (!q) { 
    res.status(400).json({ error: 'Q_REQUIRED' }); 
    return; 
  }
  
  const items = searchQuick(q);
  
  if (items.length === 0) {
    // Создаем фоновую задачу инжеста для поиска по этому запросу
    const taskId = nanoid(8);
    const task = { id: taskId, q, ts: Date.now(), status: 'pending' };
    pendingTasks.set(taskId, task);

    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const dir = path.join('_diag', ts);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'trace.txt'), `q=${q}\nphase=search\nresult=empty\ntaskId=${taskId}\n`);

    // Запускаем фоновую задачу инжеста через оркестратор
    // Здесь будет вызов оркестратора для фонового поиска

    res.json({ status: 'pending', count: 0, items: [], taskId });
    return;
  }
  
  res.json({ count: items.length, items });
});

api.get('/task/:id', (req,res)=> {
  const id = req.params.id;
  const task = pendingTasks.get(id);
  if (!task) {
    res.status(404).json({ error: 'TASK_NOT_FOUND' });
    return;
  }
  res.json(task);
});

api.get('/live/search', liveSearchRoute);

// /api/order (MVP)
api.use(express.json());
api.post('/order', (req,res)=>{
  const { mpn, qty, fio, email, messenger } = req.body||{};
  if (!mpn || !qty || !email) { res.status(400).json({ error: 'BAD_FORM' }); return; }
  const id = Date.now().toString(36);
  const pathFs = `data/orders/${id}.json`;
  import('node:fs').then(fs=>{
    fs.mkdirSync('data/orders', { recursive: true });
    fs.writeFileSync(pathFs, JSON.stringify({ id, ts: Date.now(), mpn, qty, fio, email, messenger }, null, 2));
    res.json({ ok: true, id });
  });
});

export default api;