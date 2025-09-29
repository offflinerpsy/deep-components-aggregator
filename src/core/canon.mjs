export function toCanonRow(x){
  return {
    _src: x._src, _id: x._id,
    photo: x.photo||'',
    mpn: x.mpn||'',
    title: x.title||'',
    manufacturer: x.manufacturer||'',
    description: x.description||'',
    package: x.package||'',
    packaging: x.packaging||'',
    regions: x.regions||['US'],
    stock: Number.isFinite(x.stock)?x.stock:null,
    minRub: Number.isFinite(x.minRub)?x.minRub:null,
    openUrl: x.openUrl||''
  };
}