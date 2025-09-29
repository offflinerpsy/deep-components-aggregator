import cbr from './cbr.mjs';

export const toRUB = (amount, currency) => {
  if (!amount || !currency) return null;
  return cbr.toRub(amount, currency);
};