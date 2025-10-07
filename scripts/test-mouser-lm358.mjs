#!/usr/bin/env node
import 'dotenv/config';
import { mouserSearchByKeyword } from './src/integrations/mouser/client.mjs';

const result = await mouserSearchByKeyword({
  apiKey: process.env.MOUSER_SEARCH_API_KEY,
  q: 'LM358',
  records: 3
});

console.log(JSON.stringify({
  status: result?.status,
  hasData: !!result?.data,
  searchResults: !!result?.data?.SearchResults,
  partsCount: result?.data?.SearchResults?.Parts?.length || 0,
  errors: result?.data?.Errors || [],
  firstPart: result?.data?.SearchResults?.Parts?.[0]
}, null, 2));
