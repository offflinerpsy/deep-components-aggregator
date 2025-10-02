// src/qa/runner.js — "живой" прогон браузером + анализ (без try/catch)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, "..", "..");
const REPORT_DIR = path.join(ROOT, "reports", "qa");
const FIX_FP     = path.join(__dirname, "mpn-fixtures.json");
const SCHEMA_FP  = path.join(ROOT, "src", "schema", "canon.search-row.json");

function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(fp) {
  if (!fs.existsSync(fp)) return null;
  const txt = fs.readFileSync(fp, "utf-8");
  return txt ? JSON.parse(txt) : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nz(s) {
  return (s === undefined || s === null) ? "" : String(s);
}

async function fetchJson(url) {
  return fetch(url)
    .then(r => r.ok ? r.json() : { ok: false })
    .then(j => j || { ok: false })
    .catch(() => ({ ok: false }));
}

function analyzeRows(rows, validate) {
  const analysis = {
    total: rows.length,
    invalid: 0,
    issues: []
  };

  for (const row of rows) {
    const isValid = validate(row);
    if (!isValid) {
      analysis.invalid++;
      analysis.issues.push({
        mpn: row.mpn,
        reason: "schema_validation_failed",
        regions: row.regions
      });
    }

    // Эвристики для проверки маппинга полей
    const desc = nz(row.description);
    const pkg = nz(row.package);

    if (/\b(EU|US|ASIA)\b/i.test(desc)) {
      analysis.issues.push({
        mpn: row.mpn,
        reason: "regions_leaked_to_description"
      });
    }

    if (/[€$]/.test(pkg)) {
      analysis.issues.push({
        mpn: row.mpn,
        reason: "currency_leaked_to_package"
      });
    }

    if (row.price_min_rub === 0 && row.price_min > 0 && row.price_min_currency) {
      analysis.issues.push({
        mpn: row.mpn,
        reason: "currency_conversion_failed"
      });
    }
  }

  return analysis;
}

async function runQA() {
  ensure(REPORT_DIR);

  const fixtures = readJSON(FIX_FP) || [];
  const schema = readJSON(SCHEMA_FP);
  const ajv = new Ajv({ allErrors: false, strict: false });
  const validate = ajv.compile(schema);

  const isHeadless = process.argv.includes("--headless");
  const browser = await chromium.launch({ headless: isHeadless });
  const context = await browser.newContext();
  const page = await context.newPage();

  const summary = {
    timestamp: new Date().toISOString(),
    total_queries: fixtures.length,
    pass: 0,
    fail: 0,
    queries: []
  };

  console.log(`🚀 Starting QA run with ${fixtures.length} fixtures (headless: ${isHeadless})`);

  for (const mpn of fixtures) {
    console.log(`Testing: ${mpn}`);

    // Тестируем UI
    await page.goto("http://127.0.0.1:9201/");
    await page.fill("#q", mpn);
    await Promise.all([
      page.click("button[type=submit], button:has-text('Поиск')"),
      page.waitForSelector("#rows tr, .no-results", { timeout: 10000 })
    ]);

    const rowsInDOM = await page.locator("#rows tr").count();

    // Тестируем API
    const apiUrl = `http://127.0.0.1:9201/api/search?q=${encodeURIComponent(mpn)}`;
    const apiResponse = await fetchJson(apiUrl);
    const rows = (apiResponse && apiResponse.ok) ? (apiResponse.items || []) : [];

    // Анализируем результаты
    const analysis = analyzeRows(rows, validate);
    const hasEnoughResults = rows.length >= 3; // минимум 3 позиции
    const hasValidData = analysis.invalid === 0;
    const isPass = hasEnoughResults && hasValidData;

    const queryResult = {
      mpn,
      rows_in_dom: rowsInDOM,
      rows_in_api: rows.length,
      invalid_rows: analysis.invalid,
      issues: analysis.issues.slice(0, 5), // первые 5 проблем
      currency_rates_cached: apiResponse.rates_cached || false,
      pass: isPass
    };

    summary.queries.push(queryResult);

    if (isPass) {
      summary.pass++;
      console.log(`  ✅ ${mpn}: ${rows.length} items, ${analysis.invalid} invalid`);
    } else {
      summary.fail++;
      console.log(`  ❌ ${mpn}: ${rows.length} items, ${analysis.invalid} invalid, ${analysis.issues.length} issues`);
    }

    await sleep(500); // не перегружаем UI
  }

  // Записываем отчет
  const reportPath = path.join(REPORT_DIR, "summary.json");
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  await browser.close();

  console.log(`\n📊 QA Summary:`);
  console.log(`  Total: ${summary.total_queries}`);
  console.log(`  Pass: ${summary.pass}`);
  console.log(`  Fail: ${summary.fail}`);
  console.log(`  Report: ${reportPath}`);

  const exitCode = summary.fail > 0 ? 1 : 0;
  process.exit(exitCode);
}

runQA();
