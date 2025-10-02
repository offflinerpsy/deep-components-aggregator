// Cloudflare Worker - API Proxy для обхода блокировок
// Деплой: https://workers.cloudflare.com

const ALLOWED_PREFIXES = {
  '/mouser': 'https://api.mouser.com',
  '/tme': 'https://api.tme.eu',
  '/farnell': 'https://api.element14.com',
  '/digikey': 'https://api.digikey.com'
};

async function proxyRequest(request, prefix, targetOrigin) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(targetOrigin);

  const strippedPath = incomingUrl.pathname.replace(prefix, '') || '/';
  const upstreamPath = `${targetUrl.pathname.replace(/\/$/, '')}${strippedPath}`;
  targetUrl.pathname = upstreamPath;
  targetUrl.search = incomingUrl.search;

  const init = {
    method: request.method,
    headers: new Headers(request.headers),
    redirect: 'follow'
  };

  init.headers.delete('host');

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const cloned = request.clone();
    init.body = await cloned.arrayBuffer();
  }

  return fetch(targetUrl.toString(), init);
}

// MAIN HANDLER
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    let response;
    
    const matched = Object.keys(ALLOWED_PREFIXES).find(prefix => url.pathname.startsWith(prefix + '/') || url.pathname === prefix);
    if (matched) {
      response = await proxyRequest(request, matched, ALLOWED_PREFIXES[matched]);
    } else {
      return new Response('Use /mouser/, /tme/, /farnell/, or /digikey/ endpoints', { 
        status: 404,
        headers: corsHeaders 
      });
    }
    
    // Copy response with CORS
    const newResponse = new Response(response.body, response);
    Object.keys(corsHeaders).forEach(key => {
      newResponse.headers.set(key, corsHeaders[key]);
    });
    
    return newResponse;
  }
};

/* 
ИНСТРУКЦИЯ ПО ДЕПЛОЮ:

1. Регистрируемся: https://dash.cloudflare.com/sign-up
2. Идём в Workers & Pages: https://dash.cloudflare.com/workers
3. Жмём "Create Worker"
4. Копируем код выше
5. Deploy
6. Получаем URL типа: https://your-worker.your-subdomain.workers.dev

ИСПОЛЬЗОВАНИЕ В КОДЕ:

Заменяем базовые URL:
- https://api.mouser.com → https://your-worker.workers.dev/mouser
- https://api.tme.eu → https://your-worker.workers.dev/tme
- https://api.element14.com → https://your-worker.workers.dev/farnell

*/
