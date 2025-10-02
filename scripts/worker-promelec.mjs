import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as promelec from "../src/scout/providers/promelec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "raw-promelec");

const MPN_LIST = [
  "LM317T", "STM32F103C8T6", "AD8065ARZ", "BSS138", "GRM155R71H104KE14D",
  "ESP32-WROOM-32E", "ATMEGA328P-PU", "DS18B20", "PC817", "AMS1117-3.3",
  "1N4007", "MAX232CPE", "LTC6905IS5-100#TRMPBF", "ATTINY85-20SU"
];

const DELAY_MS = 1500;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Starting background worker for promelec...");
  await fs.mkdir(DATA_DIR, { recursive: true });

  for (const [index, mpn] of MPN_LIST.entries()) {
    console.log(`[${index + 1}/${MPN_LIST.length}] Fetching data for ${mpn}...`);

    const result = await promelec.search(mpn);

    if (result.ok && result.items.length > 0) {
      const filePath = path.join(DATA_DIR, `${mpn.replace(/\\W/g, '_')}.json`);
      await fs.writeFile(filePath, JSON.stringify(result.items, null, 2));
      console.log(`   ✅ Saved ${result.items.length} items to ${filePath}`);
    } else {
      console.warn(`   ⚠️ No items found or error for ${mpn}. Reason: ${result.reason || 'No items'}`);
    }

    await delay(DELAY_MS);
  }

  console.log("✅ Worker finished.");
}

main().catch(console.error);
