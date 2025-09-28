import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { chromium } from "playwright";

// --- Configuration ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "..", "src", "scout");

const TEST_QUERIES = [
  "LM317", "1N4148", "2N7002", "BC547", "IRLZ44N", 
  "ATmega328P", "TL431", "L7805", "NE555", "AMS1117"
];

const CONCURRENCY = 2;
const DELAY_MIN_MS = 1200;
const DELAY_MAX_MS = 2500;

// --- Helper Functions ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value;
    }
  });
  return {
    queries: args.q ? args.q.split(',') : TEST_QUERIES,
    linkPath: args.out // The --out argument now specifies a path for a symlink
  };
};

// --- Main Runner ---
async function main() {
  const { queries, linkPath } = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join("_scout", timestamp); // Always write to a unique, timestamped directory
  const rawDir = path.join(outDir, "raw");
  const jsonDir = path.join(outDir, "json");

  console.log(`🚀 Starting SCOUT-V1 reconnaissance...`);
  console.log(`   - Outputting artifacts to: ${outDir}`);
  console.log(`   - Test queries: ${queries.length}`);

  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(jsonDir, { recursive: true });
  
  // If a link path is provided (e.g., --out=_scout/last), create/update it
  if (linkPath) {
    const resolvedLinkPath = path.resolve(linkPath);
    await fs.mkdir(path.dirname(resolvedLinkPath), { recursive: true });
    // More robust cleanup for Windows symlinks/junctions
    await fs.rm(resolvedLinkPath, { recursive: true, force: true }).catch(() => {});
    
    try {
      await fs.symlink(outDir, resolvedLinkPath, 'dir');
      console.log(`   - Symlink created at: ${resolvedLinkPath}`);
    } catch(e) {
      console.warn("Could not create symlink. Will not create a copy for 'last' run to avoid duplication.");
    }
  }

  const candidates = JSON.parse(await fs.readFile(path.join(SRC_DIR, "candidates.json"), "utf-8"));
  const reportData = [];
  let browser;

  for (const candidate of candidates) {
    console.log(`\n🔎 Processing candidate: ${candidate.name}`);
    
    // --- Playwright setup for JS-required sites ---
    if (candidate.js) {
      if (!browser) {
        console.log("   - Initializing headless browser for JS-based scraping...");
        const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY ? { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } : undefined;
        browser = await chromium.launch({ headless: true, proxy });
      }
    }
    
    const providerPath = path.join(SRC_DIR, "providers", `${candidate.name}.mjs`);
    const provider = await import(pathToFileURL(providerPath));
    const candidateRawDir = path.join(rawDir, candidate.name);
    await fs.mkdir(candidateRawDir, { recursive: true });

    const results = {
        name: candidate.name,
        totalItems: 0,
        totalPdfs: 0,
        successfulQueries: 0,
        blocked: false,
        fieldStats: { mpn: 0, brand: 0, title: 0, price: 0 }
    };

    for (const q of queries) {
      await delay(randomDelay());
      console.log(`   - Searching for "${q}"...`);
      
      const searchRes = await provider.search(q, candidate.js ? browser : null);
      const searchHtmlPath = path.join(candidateRawDir, `search_${q.replace(/[\\/]/g, '_')}.html`);
      await fs.writeFile(searchHtmlPath, searchRes.html || "");

      if (!searchRes.ok) {
        console.error(`     - Search failed for "${q}": ${searchRes.reason}`);
        if(searchRes.raw?.status === 403) results.blocked = true;
        continue;
      }
      
      let finalItems = [];
      // Aggregator path
      if (candidate.type === 'aggregator') {
        finalItems = searchRes.items;
      } 
      // Shop/Distributor path
      else {
        for (const [i, productUrl] of searchRes.items.entries()) {
          await delay(randomDelay());
          const productRes = await provider.product(productUrl, candidate.js ? browser : null);
          const productHtmlPath = path.join(candidateRawDir, `product_${q.replace(/[\\/]/g, '_')}_${i}.html`);
          await fs.writeFile(productHtmlPath, productRes.html || "");
          if (productRes.ok && productRes.item) {
            finalItems.push(productRes.item);
          }
        }
      }

      if (finalItems.length > 0) {
        results.successfulQueries++;
      }

      results.totalItems += finalItems.length;
      finalItems.forEach(item => {
        if(item.mpn) results.fieldStats.mpn++;
        if(item.brand) results.fieldStats.brand++;
        if(item.title) results.fieldStats.title++;
        if(item.pdfs.length > 0) results.totalPdfs += item.pdfs.length;
        if(item.offers.some(o => o.price > 0)) results.fieldStats.price++;
      });
      
      const jsonPath = path.join(jsonDir, `${candidate.name}_${q.replace(/[\\/]/g, '_')}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(finalItems, null, 2));
    }
    reportData.push(results);
  }

  if (browser) {
    await browser.close();
  }

  await generateReport(outDir, reportData, queries.length);
  console.log(`\n✅ Reconnaissance complete. Report generated at ${path.join(outDir, "REPORT.md")}`);
}

async function generateReport(outDir, reportData, totalQueries) {
    let md = `# SCOUT-V1 Reconnaissance Report\n\n`;
    md += `**Timestamp:** ${new Date().toISOString()}\n`;
    md += `**Total Queries:** ${totalQueries}\n\n`;

    md += `| Donor | Status | Success Rate | Items Found | PDFs | MPN | Brand | Title | Price |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;

    reportData.sort((a,b) => b.successfulQueries - a.successfulQueries);

    for (const data of reportData) {
        const successRate = `${Math.round((data.successfulQueries / totalQueries) * 100)}%`;
        md += `| **${data.name}** | ${data.blocked ? 'BLOCKED' : 'OK'} | ${successRate} | ${data.totalItems} | ${data.totalPdfs} | ${data.fieldStats.mpn}/${data.totalItems} | ${data.fieldStats.brand}/${data.totalItems} | ${data.fieldStats.title}/${data.totalItems} | ${data.fieldStats.price}/${data.totalItems} |\n`;
    }
    
    md += `\n## Summary\n`;
    const bestForItems = reportData.reduce((prev, curr) => (prev.totalItems > curr.totalItems) ? prev : curr);
    const bestForSuccess = reportData.reduce((prev, curr) => (prev.successfulQueries > curr.successfulQueries) ? prev : curr);
    
    md += `- **Best overall success rate:** ${bestForSuccess.name} (${Math.round((bestForSuccess.successfulQueries / totalQueries) * 100)}%)\n`;
    md += `- **Most items found:** ${bestForItems.name} (${bestForItems.totalItems} items)\n`;

    const reportPath = path.join(outDir, "REPORT.md");
    await fs.writeFile(reportPath, md);
}


main().catch(err => {
  console.error("\n\nFATAL ERROR:", err);
  const failDir = path.join("_scout", `FAIL-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdir(failDir, { recursive: true }).finally(() => {
    fs.writeFile(path.join(failDir, "FAIL.txt"), err.stack);
  });
  process.exit(1);
});
