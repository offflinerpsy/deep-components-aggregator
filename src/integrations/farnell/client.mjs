import { fetch, ProxyAgent } from 'undici';

const BASE = 'https://api.element14.com/catalog/products';

// Proxy setup (same as DigiKey/TME)
let proxyDispatcherCached = undefined;
async function getProxyDispatcher() {
  if (proxyDispatcherCached !== undefined) return proxyDispatcherCached;
  const proxyUrl = process.env.DIGIKEY_OUTBOUND_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if (!proxyUrl) {
    proxyDispatcherCached = null;
    return null;
  }
  try {
    proxyDispatcherCached = new ProxyAgent(proxyUrl);
    console.log(`[Farnell] ✅ Using outbound proxy: ${proxyUrl}`);
    return proxyDispatcherCached;
  } catch (e) {
    console.error(`[Farnell] ⚠️ Proxy setup failed:`, e.message);
    proxyDispatcherCached = null;
    return null;
  }
}

const json = r => r.text().then(t => Promise.resolve().then(()=>t?JSON.parse(t):{}).catch(()=>({})));
async function get(params){
  const u=new URL(BASE);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  
  // Use proxy if configured
  const dispatcher = await getProxyDispatcher();
  const fetchOptions = {
    method:'GET',
    headers:{'Accept':'application/json'}
  };
  if (dispatcher) {
    fetchOptions.dispatcher = dispatcher;
  }
  
  return fetch(u.toString(), fetchOptions)
    .then(r=>json(r).then(data=>({ok:r.ok,status:r.status,data})))
    .catch(()=>({ok:false,status:0,data:{}}));
}
export const farnellByMPN = ({ apiKey, region, q, limit=25, offset=0 }) =>
  get({'callInfo.responseDataFormat':'JSON','term':`manuPartNum:${q}`,'storeInfo.id':region,'resultsSettings.offset':offset,'resultsSettings.numberOfResults':limit,'resultsSettings.responseGroup':'large,Prices,Inventory','callInfo.apiKey':apiKey});
export const farnellByKeyword = ({ apiKey, region, q, limit=25, offset=0 }) =>
  get({'callInfo.responseDataFormat':'JSON','term':`any:${q}`,'storeInfo.id':region,'resultsSettings.offset':offset,'resultsSettings.numberOfResults':limit,'resultsSettings.responseGroup':'large,Prices,Inventory','callInfo.apiKey':apiKey});