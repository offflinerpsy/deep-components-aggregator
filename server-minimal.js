import express from 'express';

const app = express();
app.get('/api/health', (_,res)=>res.json({status:'ok',ts:Date.now()}));

const PORT = Number(process.env.PORT || 9201);
app.listen(PORT, ()=>console.log('API :'+PORT));
