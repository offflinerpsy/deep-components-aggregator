import express from 'express';
import apiRouter from './src/api/http.mjs';

const app = express();
app.use('/files', express.static('data/files'));
app.use(express.static('public'));
app.use('/api', apiRouter);

app.listen(9201, ()=>console.log('HTTP 9201'));
