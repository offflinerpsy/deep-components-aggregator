import express from 'express';
import mountSearch from './src/api/search.mjs';

const app = express();
const keys = { mouser: process.env.MOUSER_API_KEY || '' };

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));
mountSearch(app, { keys });

const PORT = process.env.PORT ? Number(process.env.PORT) : 9201;
app.listen(PORT, () => console.log(`API :${PORT}`));
