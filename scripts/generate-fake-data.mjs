import fs from "fs/promises";
import path from "path";

const FAKE_DATA = {
  "jsonrpc": "2.0",
  "result": {
    "total": 2,
    "products": [
      {
        "id": "12345",
        "partnumber": "LM317T-FAKE",
        "vendor": "Texas Instruments",
        "name": "Стабилизатор напряжения, 1.2-37В, 1.5А [TO-220]",
        "photo_url_medium": "https://static.chipdip.ru/lib/229/DOC000229215.jpg",
        "price_val": 50.00,
        "in_stock_int": 100
      },
      {
        "id": "67890",
        "partnumber": "NE555P-FAKE",
        "vendor": "STMicroelectronics",
        "name": "Таймер универсальный, 2-18В [DIP-8]",
        "photo_url_medium": "https://static.chipdip.ru/lib/218/DOC000218671.jpg",
        "price_val": 25.50,
        "in_stock_int": 250
      }
    ]
  },
  "id": "1"
};

const DATA_DIR = path.resolve("data", "raw-promelec");
const FILE_PATH = path.join(DATA_DIR, "FAKE_DATA.json");

async function main() {
    console.log("🚀 Generating fake raw data...");
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(FAKE_DATA, null, 2));
    console.log(`✅ Fake data saved to ${FILE_PATH}`);
}

main();

