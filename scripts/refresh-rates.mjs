import { refreshRates } from '../src/currency/cbr.mjs';
const m = await refreshRates();
console.log('RATES', Object.keys(m).length);
