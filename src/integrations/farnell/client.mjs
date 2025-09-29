import { fetch } from 'undici';

const BASE='https://api.element14.com/catalog/products';
const json = r => r.text().then(t => Promise.resolve().then(()=>t?JSON.parse(t):{}).catch(()=>({})));

function get(params){
  const u=new URL(BASE);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  return fetch(u.toString(),{method:'GET',headers:{'Accept':'application/json'}})
    .then(r=>json(r).then(data=>({ok:r.ok,status:r.status,data})))
    .catch(()=>({ok:false,status:0,data:{}}));
}

export function farnellByMPN({ apiKey, region, q, limit=25, offset=0 }){
  return get({
    'callInfo.responseDataFormat':'JSON',
    'term': `manuPartNum:${q}`,
    'storeInfo.id': region,
    'resultsSettings.offset': offset,
    'resultsSettings.numberOfResults': limit,
    'resultsSettings.responseGroup': 'large,Prices,Inventory',
    'callInfo.apiKey': apiKey
  });
}

export function farnellByKeyword({ apiKey, region, q, limit=25, offset=0 }){
  return get({
    'callInfo.responseDataFormat':'JSON',
    'term': `any:${q}`,
    'storeInfo.id': region,
    'resultsSettings.offset': offset,
    'resultsSettings.numberOfResults': limit,
    'resultsSettings.responseGroup': 'large,Prices,Inventory',
    'callInfo.apiKey': apiKey
  });
}
