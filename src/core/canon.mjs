export function normCanon(o){
  return {
    mpn: o.mpn || '',
    brand: o.brand || '',
    title: o.title || '',
    sku: o.sku || '',
    url: o.url || '',
    image: o.image || null,
    desc_short: o.desc_short || '',
    regions: Array.from(new Set((o.offers||[]).map(x=>x.region))).filter(Boolean),
    offers: o.offers || [],
    docs: o.docs || [],
    source: o.source || '',
    price_min_rub: computeMinRub(o.offers||[])
  };
}
function computeMinRub(offers){
  const rubs = offers.filter(x=>x.currency==='RUB').map(x=>x.price).filter(Number.isFinite);
  return rubs.length ? Math.min(...rubs) : null;
}
