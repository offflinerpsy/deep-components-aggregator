import { toRUB as cbrToRUB } from './cbr.mjs';

export const toRUB = (amount, currency) => {
  if (!amount || !currency) return null;
  return cbrToRUB({ amount, currency });
};