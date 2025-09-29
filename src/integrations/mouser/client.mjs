import { fetch } from 'undici';
const BASE='https://api.mouser.com/api/v1';
const json = r => r.text().then(t => Promise.resolve().then(()=>t?JSON.parse(t):{}).catch(()=>({})));
const post = (path,{apiKey,body})=>{
  const u=new URL(BASE+path); u.searchParams.set('apiKey',apiKey);
  return fetch(u.toString(),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)})
    .then(r=>json(r).then(data=>({ok:r.ok,status:r.status,data})))
    .catch(()=>({ok:false,status:0,data:{}}));
};
export const mouserSearchByKeyword = ({apiKey,q,records=50,startingRecord=0}) =>
  post('/search/keyword',{apiKey,body:{SearchByKeywordRequest:{keyword:q,records,startingRecord}}});
export const mouserSearchByPartNumber = ({apiKey,mpn})=>{
  const v1 = post('/search/partnumber',{apiKey,body:{SearchByPartnumberRequest:{MouserPartNumber:mpn}}});
  return v1.then(r=>(r&&r.ok&&r.data&&r.data.SearchResults)?r
    : post('/search/partnumber',{apiKey,body:{SearchByPartRequest:{MouserPartNumber:mpn}}}));
};