export const canonItem = (seed={}) => ({
  mpn: "",
  brand: "",
  title: "",
  description_short: "",
  image: "",
  pdfs: [],
  url: "",
  offers: [], // [{ dealer, url, price, currency, availability, region }]
  ...seed
});

