/**
 * DigiKey data normalizer
 * Converts DigiKey API response to unified format
 */

import { toRub } from '../../currency/cbr.mjs';

const clean = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value).trim();
  if (!text || text === '-' || text === 'N/A') {
    return '';
  }
  return text;
};

const truncate = (value, limit = 200) => {
  const text = clean(value);
  if (!text) {
    return '';
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

const pickBestPricing = (priceTiers) => {
  const tiers = priceTiers.filter((tier) => Number.isFinite(tier.price));
  if (tiers.length === 0) {
    return null;
  }
  const sorted = tiers.slice().sort((a, b) => {
    const priceA = Number.isFinite(a.price_rub) ? a.price_rub : a.price;
    const priceB = Number.isFinite(b.price_rub) ? b.price_rub : b.price;
    return priceA - priceB;
  });
  return sorted[0];
};

/**
 * Normalize DigiKey product to unified format
 * @param {Object} product - DigiKey product object
 * @returns {Object} - Normalized product
 */
export function normDigiKey(product) {
  if (!product) return null;

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
    'Description': product.Description?.ProductDescription || product.Description,
    'Detailed Description': product.Description?.DetailedDescription || product.DetailedDescription,
    'DigiKey Part Number': product.DigiKeyPartNumber || product.ProductVariations?.[0]?.DigiKeyProductNumber,
    'Manufacturer Part Number': product.ManufacturerProductNumber,
    'Packaging': product.Packaging?.Name || product.ProductVariations?.[0]?.PackageType?.Name,
    'Series': product.Series?.Name,
    'Lead Status': product.LeadStatus,
    'RoHS Status': product.RoHSStatus || product.Classifications?.RohsStatus,
    'Part Status': product.ProductStatus?.Status,
    'Minimum Order Quantity': product.MinimumOrderQuantity || product.ProductVariations?.[0]?.MinimumOrderQuantity,
    'Standard Packaging': product.StandardPackage || product.ProductVariations?.[0]?.StandardPackage,
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
  if (product.PrimaryPhoto || product.PhotoUrl) {
    images.push(product.PrimaryPhoto || product.PhotoUrl);
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
  if (product.PrimaryDatasheet || product.DatasheetUrl) {
    datasheets.push(product.PrimaryDatasheet || product.DatasheetUrl);
  }
  if (product.MediaLinks && Array.isArray(product.MediaLinks)) {
    product.MediaLinks.forEach(media => {
      if (media.MediaType === 'Datasheet' && media.Url) {
        datasheets.push(media.Url);
      }
    });
  }

  // Extract pricing - DigiKey API v4 has pricing in ProductVariations[].StandardPricing
  const pricing = [];

  // Try ProductVariations first (Product Information V4 search response)
  if (product.ProductVariations && Array.isArray(product.ProductVariations)) {
    const firstVariation = product.ProductVariations[0];
    if (firstVariation && firstVariation.StandardPricing && Array.isArray(firstVariation.StandardPricing)) {
      firstVariation.StandardPricing.forEach(price => {
        const currency = price.Currency || 'USD';
        const unitPrice = price.UnitPrice;
        pricing.push({
          qty: price.BreakQuantity || 1,
          price: unitPrice,
          currency: currency,
          price_rub: toRub(unitPrice, currency)
        });
      });
    }
  }

  // Fallback: try root-level StandardPricing (older API or different endpoint)
  if (pricing.length === 0 && product.StandardPricing && Array.isArray(product.StandardPricing)) {
    product.StandardPricing.forEach(price => {
      const currency = price.Currency || 'USD';
      const unitPrice = price.UnitPrice;
      pricing.push({
        qty: price.BreakQuantity || 1,
        price: unitPrice,
        currency: currency,
        price_rub: toRub(unitPrice, currency)
      });
    });
  }

  const resolvedId = product.DigiKeyProductNumber
    || product.DigiKeyPartNumber
    || product.ProductVariations?.[0]?.DigiKeyProductNumber
    || product.ProductVariations?.[0]?.DigiKeyPartNumber
    || product.ProductVariations?.[0]?.ProductNumber
    || null;

  const resolvedStock = Number(product.QuantityAvailable ??
    product.ProductVariations?.[0]?.QuantityAvailable ??
    product.QuantityOnOrder ??
    0);

  const bestPrice = pickBestPricing(pricing);

  return {
    source: 'digikey',
    mpn: clean(product.ManufacturerProductNumber),
    manufacturer: clean(product.Manufacturer?.Name),
    title: clean(product.Description?.ProductDescription || product.Description) || clean(product.ProductDescription) || clean(product.Description?.DetailedDescription) || clean(product.DetailedDescription) || clean(product.ManufacturerProductNumber),
    description_short: truncate(product.Description?.DetailedDescription || product.DetailedDescription || product.Description?.ProductDescription || product.ProductDescription),
    package: clean(product.Packaging?.Name || product.ProductVariations?.[0]?.PackageType?.Name),
    packaging: clean(product.StandardPackage || product.ProductVariations?.[0]?.StandardPackage),
    regions: ['US', 'GLOBAL'],
    stock: Number.isFinite(resolvedStock) ? resolvedStock : null,
    min_price: bestPrice ? bestPrice.price : null,
    min_currency: bestPrice ? bestPrice.currency : null,
    min_price_rub: bestPrice && Number.isFinite(bestPrice.price_rub) ? bestPrice.price_rub : null,
    image_url: images[0] || null,
    datasheet_url: datasheets[0] || product?.PrimaryDatasheet || null,
    product_url: clean(product?.ProductUrl || ''),
    price_breaks: pricing,
    raw_id: resolvedId || null,
    images: images.filter(Boolean),
    datasheets: [...new Set(datasheets.filter(Boolean))],
    technical_specs,
    pricing,
    availability: {
      inStock: Number.isFinite(resolvedStock) && resolvedStock > 0 ? resolvedStock : 0,
      leadTime: clean(product.ManufacturerLeadWeeks)
    }
  };
}
