/**
 * DigiKey data normalizer
 * Converts DigiKey API response to unified format
 */

/**
 * Normalize DigiKey product to unified format
 * @param {Object} product - DigiKey product object
 * @returns {Object} - Normalized product
 */
export function normDigiKey(product) {
  if (!product) return null;

  const clean = (s) => {
    if (!s || typeof s !== 'string') return null;
    s = s.trim();
    if (!s || s === '-' || s === 'N/A') return null;
    return s;
  };

  // Extract technical specifications from Parameters
  const technical_specs = {};
  
  if (product.Parameters && Array.isArray(product.Parameters)) {
    product.Parameters.forEach(param => {
      const name = clean(param.Parameter);
      const value = clean(param.Value);
      if (name && value) {
        technical_specs[name] = value;
      }
    });
  }

  // Add main product fields as specs
  const mainFields = {
    'Manufacturer': product.Manufacturer?.Name,
    'Product Category': product.Category?.Name,
    'Description': product.Description,
    'Detailed Description': product.DetailedDescription,
    'DigiKey Part Number': product.DigiKeyPartNumber,
    'Manufacturer Part Number': product.ManufacturerPartNumber,
    'Packaging': product.Packaging?.Name,
    'Series': product.Series?.Name,
    'Lead Status': product.LeadStatus,
    'RoHS Status': product.RoHSStatus,
    'Part Status': product.PartStatus,
    'Minimum Order Quantity': product.MinimumOrderQuantity,
    'Standard Packaging': product.StandardPackage,
    'Product URL': product.ProductUrl
  };

  for (const [key, value] of Object.entries(mainFields)) {
    const val = clean(value);
    if (val && !technical_specs[key]) {
      technical_specs[key] = val;
    }
  }

  // Extract images
  const images = [];
  if (product.PrimaryPhoto) {
    images.push(product.PrimaryPhoto);
  }
  if (product.MediaLinks && Array.isArray(product.MediaLinks)) {
    product.MediaLinks.forEach(media => {
      if (media.MediaType === 'Image' && media.Url) {
        images.push(media.Url);
      }
    });
  }

  // Extract datasheets
  const datasheets = [];
  if (product.PrimaryDatasheet) {
    datasheets.push(product.PrimaryDatasheet);
  }
  if (product.MediaLinks && Array.isArray(product.MediaLinks)) {
    product.MediaLinks.forEach(media => {
      if (media.MediaType === 'Datasheet' && media.Url) {
        datasheets.push(media.Url);
      }
    });
  }

  // Extract pricing
  const pricing = [];
  if (product.StandardPricing && Array.isArray(product.StandardPricing)) {
    product.StandardPricing.forEach(price => {
      pricing.push({
        qty: price.BreakQuantity || 1,
        price: price.UnitPrice,
        currency: price.Currency || 'USD',
        price_rub: null // Will be calculated later
      });
    });
  }

  return {
    mpn: clean(product.ManufacturerPartNumber),
    manufacturer: clean(product.Manufacturer?.Name),
    title: clean(product.Description),
    description: clean(product.DetailedDescription) || clean(product.Description),
    photo: images[0] || null,
    images: images.filter(Boolean),
    datasheets: [...new Set(datasheets)],
    technical_specs,
    pricing,
    availability: {
      inStock: product.QuantityAvailable || 0,
      leadTime: clean(product.ManufacturerLeadWeeks)
    },
    regions: ['US', 'Global'],
    package: clean(product.Packaging?.Name),
    packaging: clean(product.StandardPackage),
    vendorUrl: clean(product.ProductUrl),
    source: 'digikey'
  };
}
