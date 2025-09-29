import express from 'express';
const app = express();
app.get('/api/health', (_,res)=>res.json({status:'ok',ts:Date.now()}));
app.get('/api/search', (req,res)=>{
  const q = req.query.q || '';
  res.json({ok:true, q, rows:[{mpn:q, title:q, manufacturer:'Test', description:'Test', regions:['US'], stock:1000, minRub:100}], meta:{source:'test', total:1}});
});
const PORT = 9201;
app.listen(PORT, ()=>console.log('API :'+PORT));
