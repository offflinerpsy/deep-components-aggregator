import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { canonItem } from "../src/scout/schema.js"; // Re-use the schema

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DATA_DIR = path.join(__dirname, "..", "data", "raw-promelec");
const CORPUS_PATH = path.join(__dirname, "..", "data", "corpus.json");

async function main() {
    console.log("🚀 Building corpus from raw promelec data...");

    const allItems = [];
    const files = await fs.readdir(RAW_DATA_DIR);

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        console.log(`   - Processing ${file}...`);
        const content = await fs.readFile(path.join(RAW_DATA_DIR, file), 'utf-8');
        const data = JSON.parse(content);

        if (!data.result || !data.result.products) {
            console.warn(`     ⚠️ Invalid structure in ${file}`);
            continue;
        }

        const items = data.result.products.map(p => canonItem({
            mpn: p.partnumber,
            brand: p.vendor,
            title: p.name,
            image: p.photo_url_medium,
            url: `https://www.promelec.ru/product/${p.id}/`,
            offers: [{
                dealer: "promelec",
                url: `https://www.promelec.ru/product/${p.id}/`,
                price: { value: p.price_val, currency: "RUB" },
                availability: p.in_stock_int > 0 ? `${p.in_stock_int} in stock` : "0",
                region: "RU"
            }]
        }));

        allItems.push(...items);
    }

    // Simple deduplication
    const uniqueItems = Array.from(new Map(allItems.map(item => [item.mpn, item])).values());

    await fs.writeFile(CORPUS_PATH, JSON.stringify(uniqueItems, null, 2));
    console.log(`✅ Corpus built successfully with ${uniqueItems.length} items at ${CORPUS_PATH}`);
}

main().catch(console.error);
