import express from 'express';
import mountSearch from './src/api/search.mjs';

const app = express();
const keys = { mouser: process.env.MOUSER_API_KEY || '' };

mountSearch(app, { keys });

app.listen(9201, () => console.log('API on :9201'));
