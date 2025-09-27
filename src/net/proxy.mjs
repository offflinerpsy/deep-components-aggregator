import { setGlobalDispatcher, ProxyAgent } from 'undici';

export function currentProxy(){
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if(!raw) return null;
  const u = new URL(raw);
  return {
    server: u.protocol + '//' + u.host,
    username: u.username || undefined,
    password: u.password || undefined,
    uri: u.toString()
  };
}

export function armUndici(){
  const p = currentProxy();
  if(!p) return 'no-proxy';
  setGlobalDispatcher(new ProxyAgent({ uri: p.uri }));
  return p.uri;
}
