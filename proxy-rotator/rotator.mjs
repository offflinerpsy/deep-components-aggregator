import { Server } from 'proxy-chain';
import { startPool, pickOne } from './pool.mjs';

const PORT = Number(process.env.LOCAL_PROXY_PORT || 18080);

function upstreamFor(){ const p = pickOne(); if(!p) return null; const schema = (p.proto==='https'?'http':p.proto); return `${schema}://${p.host}:${p.port}`; }

const srv = new Server({
  port: PORT,
  prepareRequestFunction: () => {
    const up = upstreamFor();
    if(!up) return { requestAuthentication: false };
    return { upstreamProxyUrl: up };
  }
});

startPool().then(()=>{ srv.listen(()=>process.stdout.write(`local proxy on :${PORT}\n`)); }, _=>{});


