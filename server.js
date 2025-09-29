import express from 'express';
import mountSearch from './src/api/search.mjs';

const app = express();
app.use(express.static('public', { extensions: ['html'] }));
app.get('/api/health', (_,res)=>res.json({status:'ok',ts:Date.now()}));

const keys = {
  mouser: process.env.MOUSER_API_KEY || '',
  farnell: process.env.FARNELL_API_KEY || '',
  farnellRegion: process.env.FARNELL_REGION || 'uk.farnell.com'
};
mountSearch(app, { keys });

const PORT = Number(process.env.PORT || 9201);
app.listen(PORT, ()=>console.log('API :'+PORT));