import { toRub as cbrToRub } from './cbr.mjs';

export const toRUB = (amount, currency) => {
  if (!amount || !currency) return null;
  return cbrToRub(amount, currency);
};