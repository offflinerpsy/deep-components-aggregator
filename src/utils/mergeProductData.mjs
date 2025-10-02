// Merge product data from multiple API sources
// Priority: TME (specs) > Farnell (specs) > Mouser (pricing)

import { toRUB } from '../currency/toRUB.mjs';

const clean = s => (s || '').toString().trim();

/**
 * Merge technical specifications from all sources
 * Priority: DigiKey > TME > Farnell > Mouser
 */
function mergeSpecs(mouser = {}, tme = {}, farnell = {}, digikey = {}) {
  const specs = {};
  
  // 1. Start with Mouser (lowest priority)
  if (mouser && mouser.technical_specs) {
    Object.assign(specs, mouser.technical_specs);
  }
  
  // 2. Override with Farnell (medium priority)
  if (farnell && farnell.technical_specs) {
    Object.assign(specs, farnell.technical_specs);
  }
  
  // 3. Override with TME (high priority)
  if (tme && tme.technical_specs) {
    Object.assign(specs, tme.technical_specs);
  }
  
  // 4. Override with DigiKey (highest priority)
  if (digikey && digikey.technical_specs) {
    Object.assign(specs, digikey.technical_specs);
  }
  
  return specs;
}

/**
 * Merge images from all sources (unique URLs only)
 */
function mergeImages(mouser = {}, tme = {}, farnell = {}, digikey = {}) {
  const images = new Set();
  
  [
    ...((mouser && mouser.images) || []),
    ...((tme && tme.images) || []),
    ...((farnell && farnell.images) || []),
    ...((digikey && digikey.images) || [])
  ].forEach(img => {
    if (img && clean(img)) images.add(clean(img));
  });
  
  return Array.from(images);
}

/**
 * Merge datasheets from all sources (unique URLs only)
 */
function mergeDatasheets(mouser = {}, tme = {}, farnell = {}, digikey = {}) {
  const datasheets = new Set();
  
  [
    ...((mouser && mouser.datasheets) || []),
    ...((tme && tme.datasheets) || []),
    ...((farnell && farnell.datasheets) || []),
    ...((digikey && digikey.datasheets) || [])
  ].forEach(ds => {
    if (ds && clean(ds)) datasheets.add(clean(ds));
  });
  
  return Array.from(datasheets);
}

/**
 * Get best price in RUB from all sources
 */
function getBestPrice(mouser = {}, tme = {}, farnell = {}, digikey = {}) {
  const prices = [];
  
  // Collect all pricing data
  const allPricing = [
    ...((mouser && mouser.pricing) || []),
    ...((tme && tme.pricing) || []),
    ...((farnell && farnell.pricing) || []),
    ...((digikey && digikey.pricing) || [])
  ];
  
  // Find minimum price_rub
  allPricing.forEach(p => {
    if (p.price_rub && Number.isFinite(p.price_rub)) {
      prices.push(p.price_rub);
    }
  });
  
  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * Get maximum stock from all sources
 */
function getMaxStock(mouser = {}, tme = {}, farnell = {}, digikey = {}) {
  const stocks = [
    (mouser && mouser.availability && mouser.availability.inStock) || 0,
    (tme && tme.availability && tme.availability.inStock) || 0,
    (farnell && farnell.availability && farnell.availability.inStock) || 0,
    (digikey && digikey.availability && digikey.availability.inStock) || 0
  ].filter(s => Number.isFinite(s) && s > 0);
  
  return stocks.length > 0 ? Math.max(...stocks) : 0;
}

/**
 * Merge product data from multiple sources
 * @param {Object} mouser - Mouser API data
 * @param {Object} tme - TME API data
 * @param {Object} farnell - Farnell API data
 * @param {Object} digikey - DigiKey API data
 * @returns {Object} Merged product data
 */
export function mergeProductData(mouser, tme, farnell, digikey) {
  // Check if we have at least one source
  if (!mouser && !tme && !farnell && !digikey) return null;
  
  // Use first available source for basic fields
  const primary = mouser || tme || farnell || digikey;
  
  // Merge all data
  const merged = {
    mpn: primary.mpn,
    manufacturer: primary.manufacturer || mouser?.manufacturer || tme?.manufacturer || farnell?.manufacturer || digikey?.manufacturer,
    title: primary.title || mouser?.title || tme?.title || farnell?.title || digikey?.title,
    description: primary.description || mouser?.description || tme?.description || farnell?.description || digikey?.description,
    
    // Photo: prefer highest resolution (DigiKey > Farnell > TME > Mouser)
    photo: digikey?.photo || farnell?.photo || tme?.photo || mouser?.photo || '',
    
    // Merge arrays
    images: mergeImages(mouser, tme, farnell, digikey),
    datasheets: mergeDatasheets(mouser, tme, farnell, digikey),
    
    // Merge technical specs (DigiKey priority)
    technical_specs: mergeSpecs(mouser, tme, farnell, digikey),
    
    // Combine all pricing with source labels
    pricing: [
      ...(mouser?.pricing || []).map(p => ({ ...p, source: 'mouser' })),
      ...(tme?.pricing || []).map(p => ({ ...p, source: 'tme' })),
      ...(farnell?.pricing || []).map(p => ({ ...p, source: 'farnell' })),
      ...(digikey?.pricing || []).map(p => ({ ...p, source: 'digikey' }))
    ],
    
    // Best price across all sources
    price_rub: getBestPrice(mouser, tme, farnell, digikey),
    
    // Maximum stock
    availability: {
      inStock: getMaxStock(mouser, tme, farnell, digikey),
      sources: {
        mouser: mouser?.availability?.inStock || 0,
        tme: tme?.availability?.inStock || 0,
        farnell: farnell?.availability?.inStock || 0,
        digikey: digikey?.availability?.inStock || 0
      },
      leadTimes: {
        mouser: mouser?.availability?.leadTime || null,
        tme: tme?.availability?.leadTime || null,
        farnell: farnell?.availability?.leadTime || null,
        digikey: digikey?.availability?.leadTime || null
      }
    },
    
    // Combined regions
    regions: Array.from(new Set([
      ...(mouser?.regions || []),
      ...(tme?.regions || []),
      ...(farnell?.regions || []),
      ...(digikey?.regions || [])
    ])),
    
    // Package info (first available)
    package: mouser?.package || tme?.package || farnell?.package || digikey?.package || '',
    packaging: mouser?.packaging || tme?.packaging || farnell?.packaging || digikey?.packaging || '',
    
    // Vendor URLs
    vendorUrls: {
      mouser: mouser?.vendorUrl || null,
      tme: tme?.vendorUrl || null,
      farnell: farnell?.vendorUrl || null,
      digikey: digikey?.vendorUrl || null
    },
    
    // Source info
    sources: {
      mouser: !!mouser,
      tme: !!tme,
      farnell: !!farnell,
      digikey: !!digikey
    }
  };
  
  return merged;
}
