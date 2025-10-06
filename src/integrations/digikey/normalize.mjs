/**
 * DigiKey data normalizer
 * Converts DigiKey API response to unified format
 */

import { writeFileSync } from 'fs';
import { toRub } from '../../currency/cbr.mjs';

/**
 * Normalize DigiKey product to unified format
 * @param {Object} product - DigiKey product object
 * @returns {Object} - Normalized product
 */
export function normDigiKey(product) {
  if (!product) return null;

  // DEBUG: Save raw product structure to file (always save first product)
  try {
    writeFileSync(
      '/opt/deep-agg/docs/_artifacts/2025-10-06/providers/dk-raw-product.json',
      JSON.stringify(product, null, 2)
    );
    console.log('[DEBUG] Saved raw product to dk-raw-product.json');
  } catch (e) {
    console.error('[DEBUG] Failed to write debug file:', e.message);
  }

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

  return {
    mpn: clean(product.ManufacturerProductNumber),
    manufacturer: clean(product.Manufacturer?.Name),
    title: clean(product.Description?.ProductDescription || product.Description),
    description: clean(product.Description?.DetailedDescription || product.DetailedDescription || product.Description?.ProductDescription),
    photo: images[0] || null,
    images: images.filter(Boolean),
    datasheets: [...new Set(datasheets.filter(Boolean))],
    technical_specs,
    pricing,
    availability: {
      inStock: product.QuantityAvailable || 0,
      leadTime: clean(product.ManufacturerLeadWeeks)
    },
    regions: ['US', 'Global'],
    package: clean(product.Packaging?.Name || product.ProductVariations?.[0]?.PackageType?.Name),
    packaging: clean(product.StandardPackage || product.ProductVariations?.[0]?.StandardPackage),
    vendorUrl: clean(product.ProductUrl),
    source: 'digikey'
  };
}
