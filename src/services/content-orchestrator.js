import { RU_SOURCES, RU_LIMIT, HEADERS } from '../adapters/ru/registry.js';
import { parsersConfig } from '../config/parsers.config.js';
import { loadHtml, absUrl, delayJitter, withTimeout } from '../utils/net-html.js';
import fs from 'fs';
import path from 'path';

// PartialCanon type removed for JS compatibility

function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function isPriceLike(text) {
  const t = normalizeText(text).toLowerCase();
  // признаки прайс-строки: много чисел/диапазоны/шт/руб/коп/процент
  const manyNumbers = (t.match(/\d+/g) || []).length >= 6;
  return (
    manyNumbers ||
    /\b(руб|р\.|коп|шт|упак|кратно|100%|предоплата)\b/.test(t) ||
    /\d+\s*[-–]\s*\d+/.test(t)
  );
}

function normalizeSpecs(specs) {
  if (!specs || typeof specs !== 'object') return null;
  const result = {};
  for (const [rawK, rawV] of Object.entries(specs)) {
    const k = normalizeText(rawK);
    const v = normalizeText(rawV);
    if (!k || !v) continue;
    if (k.length > 50 || v.length > 80) continue;
    if (isPriceLike(v) || isPriceLike(k)) continue;
    // убрать повторяющиеся технические блоки
    if (result[k]) continue;
    result[k] = v;
  }
  const keys = Object.keys(result);
  return keys.length ? result : null;
}

export async function enrichFromRuSources(mpn) {
  const acc = {};
  let inFlight = 0;
  let idx = 0;

  // Создаем директории для сохранения HTML
  const reportsDir = 'reports/sources';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  async function runOne(source) {
    const cfg = parsersConfig[source];
    const searchUrl = cfg.searchUrl ? cfg.searchUrl(mpn) : `${cfg.baseUrl}/search/?q=${encodeURIComponent(mpn)}`;
    
    console.log(`🔍 ${source}: поиск ${mpn} в ${searchUrl}`);
    
    const html = await withTimeout(loadHtml(searchUrl, HEADERS), RU_LIMIT.timeoutMs);
    if (!html) {
      console.log(`❌ ${source}: не удалось загрузить страницу поиска`);
      return;
    }

    // Сохраняем HTML поиска
    const searchDir = path.join(reportsDir, source);
    if (!fs.existsSync(searchDir)) {
      fs.mkdirSync(searchDir, { recursive: true });
    }
    // Сохраняем HTML поиска (пока без cheerio)
    // fs.writeFileSync(path.join(searchDir, `${mpn}.html`), html.$.html());

    // 1) найти первую подходящую карточку
    const productLink = html.firstHref(cfg.selectors.searchLink);
    if (!productLink) {
      console.log(`❌ ${source}: не найдена ссылка на товар`);
      return;
    }
    
    // Фильтруем только HTTP/HTTPS ссылки
    if (!productLink.startsWith('http') && !productLink.startsWith('/')) {
      console.log(`❌ ${source}: неверная ссылка на товар: ${productLink}`);
      return;
    }
    
    const productUrl = absUrl(productLink, cfg.baseUrl);
    if (!productUrl) {
      console.log(`❌ ${source}: неверная ссылка на товар: ${productLink}`);
      return;
    }

    console.log(`📄 ${source}: загружаем карточку ${productUrl}`);
    const ph = await withTimeout(loadHtml(productUrl, HEADERS), RU_LIMIT.timeoutMs);
    if (!ph) {
      console.log(`❌ ${source}: не удалось загрузить карточку товара`);
      return;
    }

    // Сохраняем HTML карточки
    const productDir = path.join(reportsDir, `${source}-product`);
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    // Сохраняем HTML карточки (пока без cheerio)
    // fs.writeFileSync(path.join(productDir, `${mpn}.html`), ph.$.html());

    // 2) собрать поля
    const title = ph.firstText(cfg.selectors.title);
    const desc = ph.firstHtml(cfg.selectors.description);
    const img = absUrl(ph.firstAttr(cfg.selectors.images, 'src'), cfg.baseUrl);
    
    // PDF документы
    const docs = ph.allHrefs(cfg.selectors.datasheets)
      .slice(0, 6).map(href => absUrl(href, cfg.baseUrl)).filter(Boolean);
    
    // Технические характеристики
    const specsRaw = ph.tablePairs(cfg.selectors.specsRows);
    const specs = normalizeSpecs(specsRaw);

    console.log(`✅ ${source}: найдено - title: ${!!title}, desc: ${!!desc}, img: ${!!img}, docs: ${docs.length}, specs: ${Object.keys(specs || {}).length}`);

    // Мержим только непустые поля
    if (!acc.description && desc && normalizeText(desc).length > 16) {
      acc.description = normalizeText(desc);
    }
    if (!acc.image && img) {
      acc.image = img;
      acc.images = [img];
    }
    if (!acc.datasheets && docs.length) {
      acc.datasheets = Array.from(new Set(docs));
    }
    if (!acc.technical_specs && specs && Object.keys(specs).length >= 3) {
      acc.technical_specs = specs;
    }
  }

  const runNext = async () => {
    if (idx >= RU_SOURCES.length) return;
    const s = RU_SOURCES[idx++]; 
    inFlight++;
    await runOne(s); 
    inFlight--;
    await delayJitter(RU_LIMIT.minDelayMs, RU_LIMIT.maxDelayMs);
    if (idx < RU_SOURCES.length) await runNext();
  };

  // Запускаем параллельно с ограничением concurrency
  while (inFlight < RU_LIMIT.concurrency && idx < RU_SOURCES.length) { 
    await runNext(); 
  }

  console.log(`🎯 RU-обогащение завершено для ${mpn}:`, {
    description: !!acc.description,
    image: !!acc.image,
    datasheets: acc.datasheets?.length || 0,
    specs: Object.keys(acc.technical_specs || {}).length
  });

  return acc;
}
