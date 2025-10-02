#!/usr/bin/env node
/**
 * Extract JSON data from Octopart Next.js page
 */

import * as fs from 'fs';

const html = fs.readFileSync('octopart_debug.html', 'utf-8');

console.log('🔍 Searching for JSON data in HTML...');
console.log('');

// Next.js embeds data in <script id="__NEXT_DATA__">
const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

if (nextDataMatch) {
  console.log('✅ Found __NEXT_DATA__');
  
  try {
    const jsonData = JSON.parse(nextDataMatch[1]);
    
    // Save full JSON
    fs.writeFileSync('octopart_data.json', JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log('✅ Saved full data to octopart_data.json');
    
    // Look for product data
    const jsonStr = JSON.stringify(jsonData);
    
    if (jsonStr.includes('M83513')) {
      console.log('✅ Found part number in JSON!');
    }
    
    if (jsonStr.includes('results')) {
      console.log('✅ Found "results" in JSON!');
    }
    
    if (jsonStr.includes('specs') || jsonStr.includes('specifications')) {
      console.log('✅ Found specifications in JSON!');
    }
    
    // Try to extract products
    function findProducts(obj, path = '') {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          findProducts(obj[i], `${path}[${i}]`);
        }
      } else if (obj && typeof obj === 'object') {
        // Check if this looks like a product
        if ((obj.mpn || obj.part_number || obj.manufacturer) && !obj.__typename) {
          console.log('');
          console.log('📦 Found potential product at:', path);
          console.log('  MPN:', obj.mpn || obj.part_number || obj.sku);
          console.log('  Manufacturer:', obj.manufacturer || obj.brand);
          console.log('  Keys:', Object.keys(obj).slice(0, 10).join(', '));
        }
        
        // Recurse
        for (const key in obj) {
          findProducts(obj[key], path ? `${path}.${key}` : key);
        }
      }
    }
    
    findProducts(jsonData);
    
  } catch (e) {
    console.error('❌ Failed to parse JSON:', e.message);
  }
} else {
  console.log('❌ __NEXT_DATA__ not found');
  
  // Look for other JSON structures
  const jsonMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
  console.log(`Found ${jsonMatches?.length || 0} script tags`);
  
  // Check for API calls in HTML
  if (html.includes('api.octopart.com')) {
    console.log('✅ Found api.octopart.com references');
  }
}

// Check for GraphQL
if (html.includes('graphql') || html.includes('__APOLLO_STATE__')) {
  console.log('✅ Found GraphQL/Apollo references');
}

// Look for product URLs
const partUrls = [...html.matchAll(/\/part\/([^"\/\s]+)\/([^"\/\s]+)/g)];
if (partUrls.length > 0) {
  console.log('');
  console.log('📎 Found part URLs:');
  partUrls.slice(0, 5).forEach(match => {
    console.log(`  https://octopart.com/part/${match[1]}/${match[2]}`);
  });
}
