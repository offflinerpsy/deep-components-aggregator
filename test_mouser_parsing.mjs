/**
 * Тест текущего Mouser parsing - сколько specs получается?
 */

import { mouserSearchByKeyword } from './src/integrations/mouser/client.mjs';
import dotenv from 'dotenv';

dotenv.config();

const MOUSER_KEY = process.env.MOUSER_API_KEY;

function clean(s) {
  if (!s || typeof s !== 'string') return null;
  s = s.trim();
  if (!s || s === '-' || s === 'N/A' || s === 'n/a') return null;
  return s;
}

async function testMouserParsing(mpn) {
  console.log(`\n📦 Тест: ${mpn}`);
  console.log('─'.repeat(60));
  
  try {
    const result = await mouserSearchByKeyword({
      apiKey: MOUSER_KEY,
      keyword: mpn
    });
    
    if (!result.ok || !result.data?.SearchResults?.Parts?.length) {
      console.log('❌ Товар не найден');
      return;
    }
    
    const p = result.data.SearchResults.Parts[0];
    console.log(`✅ Найден: ${p.ManufacturerPartNumber} (${p.Manufacturer})`);
    console.log(`   Description: ${p.Description}`);
    
    // Парсим specs как в server.js
    const technical_specs = {};
    
    // 1. ProductAttributes
    (p.ProductAttributes || []).forEach(a => {
      const k = clean(a.AttributeName);
      const v = clean(a.AttributeValue);
      if (k && v) technical_specs[k] = v;
    });
    
    console.log(`\n   📋 ProductAttributes: ${Object.keys(technical_specs).length} specs`);
    if (Object.keys(technical_specs).length > 0) {
      Object.entries(technical_specs).slice(0, 5).forEach(([k, v]) => {
        console.log(`      • ${k}: ${v}`);
      });
      if (Object.keys(technical_specs).length > 5) {
        console.log(`      ... (еще ${Object.keys(technical_specs).length - 5})`);
      }
    }
    
    // 2. Main fields
    const mainFieldsCount = Object.keys(technical_specs).length;
    const allFields = {
      'Manufacturer': p.Manufacturer,
      'Product Category': p.Category,
      'Description': p.Description,
      'Mouser Part Number': p.MouserPartNumber,
      'Manufacturer Part Number': p.ManufacturerPartNumber,
      'RoHS Status': p.ROHSStatus,
      'Lifecycle Status': p.LifecycleStatus,
      'Availability': p.Availability,
      'In Stock': p.AvailabilityInStock,
      'Factory Stock': p.FactoryStock,
      'Lead Time': p.LeadTime,
      'Minimum Order Quantity': p.Min,
      'Order Multiple': p.Mult,
      'Standard Pack Qty': p.StandardCost,
      'Package': p.Package,
      'Packaging': p.Packaging,
      'Series': p.Series,
      'Weight': p.Weight,
      'Package Dimensions': p.PackageDimensions
    };
    
    for (const [key, value] of Object.entries(allFields)) {
      const val = clean(value);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && val !== 'No' && val !== 'false' && !technical_specs[key]) {
        technical_specs[key] = val;
      }
    }
    
    console.log(`   📋 После добавления main fields: ${Object.keys(technical_specs).length} specs (+${Object.keys(technical_specs).length - mainFieldsCount})`);
    
    // 3. ProductCompliance
    const complianceCount = Object.keys(technical_specs).length;
    (p.ProductCompliance || []).forEach(c => {
      const k = clean(c.ComplianceName);
      const v = clean(c.ComplianceValue);
      if (k && v) technical_specs[k] = v;
    });
    
    if (Object.keys(technical_specs).length > complianceCount) {
      console.log(`   📋 После ProductCompliance: ${Object.keys(technical_specs).length} specs (+${Object.keys(technical_specs).length - complianceCount})`);
    }
    
    // 4. Extra fields
    if (p.AlternatePackagings?.length > 0) {
      technical_specs['Alternate Packaging Available'] = 'Yes';
    }
    if (p.SuggestedReplacement) {
      technical_specs['Suggested Replacement'] = clean(p.SuggestedReplacement);
    }
    if (p.UnitWeightKg) {
      technical_specs['Unit Weight'] = `${p.UnitWeightKg} kg`;
    }
    
    console.log(`\n   🎯 ИТОГО: ${Object.keys(technical_specs).length} specifications`);
    
    // Покажем все specs
    console.log(`\n   📋 Все спецификации:`);
    Object.entries(technical_specs).forEach(([k, v], i) => {
      console.log(`      ${i+1}. ${k}: ${v}`);
    });
    
    // Images
    const images = [];
    if (clean(p.ImagePath)) images.push(clean(p.ImagePath));
    if (clean(p.ImageURL) && clean(p.ImageURL) !== clean(p.ImagePath)) images.push(clean(p.ImageURL));
    
    console.log(`\n   🖼️  Images: ${images.length}`);
    images.forEach(img => console.log(`      ${img}`));
    
    // Datasheets
    const datasheets = [];
    if (clean(p.DataSheetUrl)) datasheets.push(clean(p.DataSheetUrl));
    (p.ProductDocuments || []).forEach(doc => {
      if (clean(doc.DocumentUrl)) datasheets.push(clean(doc.DocumentUrl));
    });
    
    console.log(`\n   📄 Datasheets: ${datasheets.length}`);
    
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

async function main() {
  console.log('🔵 Тест Mouser API Parsing');
  console.log('='.repeat(60));
  
  // Тестируем проблемные товары
  await testMouserParsing('M83513/19-E01NW'); // Должен быть 10 specs
  await testMouserParsing('STM32F407VGT6');    // Должен быть 17 specs
  await testMouserParsing('ATMEGA328P-PU');    // Посмотрим сколько
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
