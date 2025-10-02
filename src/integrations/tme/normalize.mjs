/**
 * Normalize TME product data to common format
 */

export function normTME(product) {
  return {
    _src: 'tme',
    _id: product.Symbol,
    mpn: product.OriginalSymbol || product.Symbol,
    manufacturer: product.Producer || '',
    title: product.Description || product.Symbol,
    description: product.Description || '',
    photo: product.Photo ? `https://www.tme.eu${product.Photo}` : '',
    stock: product.InStock || 0,
    package: '',
    packaging: '',
    minRub: null, // TME uses different pricing structure
    regions: ['EU', 'PL']
  };
}
