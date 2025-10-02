// Test Mouser API full response
import 'dotenv/config';
import { fetch } from 'undici';

const apiKey = process.env.MOUSER_API_KEY;
const mpn = 'M83513/19-E01NW';

async function testMouserAPI() {
  console.log('\n🧪 Testing Mouser API...\n');
  
  // Test 1: Search by keyword
  console.log('=== TEST 1: Search by Keyword ===');
  const keywordUrl = `https://api.mouser.com/api/v1/search/keyword?apiKey=${apiKey}`;
  const keywordResponse = await fetch(keywordUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      SearchByKeywordRequest: {
        keyword: mpn,
        records: 1,
        startingRecord: 0
      }
    })
  });
  
  const keywordData = await keywordResponse.json();
  const part = keywordData?.SearchResults?.Parts?.[0];
  
  if (part) {
    console.log('\n📦 Part found:');
    console.log('  MPN:', part.ManufacturerPartNumber);
    console.log('  Manufacturer:', part.Manufacturer);
    console.log('  Description:', part.Description);
    console.log('  Image:', part.ImagePath);
    console.log('\n📋 ProductAttributes:', JSON.stringify(part.ProductAttributes, null, 2));
    console.log('\n📄 ALL FIELDS:', Object.keys(part));
    console.log('\n🔍 FULL PART DATA:', JSON.stringify(part, null, 2));
  } else {
    console.log('❌ No part found');
  }
  
  // Test 2: Search by part number
  console.log('\n\n=== TEST 2: Search by Part Number ===');
  const partUrl = `https://api.mouser.com/api/v1/search/partnumber?apiKey=${apiKey}`;
  const partResponse = await fetch(partUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      SearchByPartnumberRequest: {
        mouserPartNumber: mpn
      }
    })
  });
  
  const partData = await partResponse.json();
  const part2 = partData?.SearchResults?.Parts?.[0];
  
  if (part2) {
    console.log('\n📦 Part found via PartNumber:');
    console.log('  MPN:', part2.ManufacturerPartNumber);
    console.log('\n📋 ProductAttributes:', JSON.stringify(part2.ProductAttributes, null, 2));
    console.log('\n📄 ALL FIELDS:', Object.keys(part2));
    console.log('\n🔍 FULL PART DATA:', JSON.stringify(part2, null, 2));
  } else {
    console.log('❌ No part found');
  }
}

testMouserAPI().catch(console.error);
