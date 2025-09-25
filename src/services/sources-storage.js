// src/services/sources-storage.js - Сохранение HTML источников для анализа
import fs from 'node:fs';
import path from 'node:path';

// Создание директории если не существует
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return { ok: true };
  }
  return { ok: true };
};

// Нормализация имени файла
const normalizeFilename = (str) => {
  return str
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Заменяем спецсимволы на _
    .replace(/_{2,}/g, '_') // Убираем множественные _
    .substring(0, 100); // Ограничиваем длину
};

// Сохранение HTML источника
export const saveSourceHtml = (site, mpn, html, metadata = {}) => {
  if (!site || !mpn || !html) {
    return { ok: false, error: 'Missing required parameters' };
  }
  
  const reportsDir = path.join(process.cwd(), 'reports', 'sources');
  const siteDir = path.join(reportsDir, site);
  
  const dirResult = ensureDir(siteDir);
  if (!dirResult.ok) {
    return { ok: false, error: 'Failed to create directory' };
  }
  
  const filename = `${normalizeFilename(mpn)}.html`;
  const filepath = path.join(siteDir, filename);
  
  // Создаем полный HTML с метаданными
  const timestamp = new Date().toISOString();
  const fullHtml = `<!-- 
Saved: ${timestamp}
Site: ${site}
MPN: ${mpn}
URL: ${metadata.url || 'unknown'}
Status: ${metadata.status || 'unknown'}
Duration: ${metadata.duration || 'unknown'}ms
-->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Source: ${site} - ${mpn}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .source-meta { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
        .source-meta h3 { margin: 0 0 10px 0; }
        .source-content { border: 1px solid #ddd; padding: 10px; }
    </style>
</head>
<body>
    <div class="source-meta">
        <h3>Source Metadata</h3>
        <p><strong>Site:</strong> ${site}</p>
        <p><strong>MPN:</strong> ${mpn}</p>
        <p><strong>URL:</strong> ${metadata.url || 'unknown'}</p>
        <p><strong>Saved:</strong> ${timestamp}</p>
        <p><strong>Status:</strong> ${metadata.status || 'unknown'}</p>
        <p><strong>Duration:</strong> ${metadata.duration || 'unknown'}ms</p>
    </div>
    <div class="source-content">
        ${html}
    </div>
</body>
</html>`;
  
  const writeResult = (() => {
    fs.writeFileSync(filepath, fullHtml, 'utf8');
    return { ok: true };
  })();
  
  if (!writeResult.ok) {
    return { ok: false, error: 'Failed to write file' };
  }
  
  return { 
    ok: true, 
    filepath, 
    size: Buffer.byteLength(fullHtml, 'utf8'),
    filename 
  };
};

// Чтение сохраненного HTML источника
export const loadSourceHtml = (site, mpn) => {
  if (!site || !mpn) {
    return { ok: false, error: 'Missing required parameters' };
  }
  
  const filename = `${normalizeFilename(mpn)}.html`;
  const filepath = path.join(process.cwd(), 'reports', 'sources', site, filename);
  
  if (!fs.existsSync(filepath)) {
    return { ok: false, error: 'File not found', filepath };
  }
  
  const readResult = (() => {
    const content = fs.readFileSync(filepath, 'utf8');
    return { ok: true, content };
  })();
  
  if (!readResult.ok) {
    return { ok: false, error: 'Failed to read file', filepath };
  }
  
  const stats = fs.statSync(filepath);
  
  return {
    ok: true,
    html: readResult.content,
    filepath,
    size: stats.size,
    modified: stats.mtime
  };
};

// Получение списка сохраненных источников
export const listSavedSources = (site = null) => {
  const reportsDir = path.join(process.cwd(), 'reports', 'sources');
  
  if (!fs.existsSync(reportsDir)) {
    return { ok: true, sources: [] };
  }
  
  const sources = [];
  
  if (site) {
    // Список для конкретного сайта
    const siteDir = path.join(reportsDir, site);
    if (fs.existsSync(siteDir)) {
      const files = fs.readdirSync(siteDir);
      files.forEach(file => {
        if (file.endsWith('.html')) {
          const filepath = path.join(siteDir, file);
          const stats = fs.statSync(filepath);
          sources.push({
            site,
            mpn: file.replace('.html', ''),
            filename: file,
            size: stats.size,
            modified: stats.mtime
          });
        }
      });
    }
  } else {
    // Список для всех сайтов
    const sites = fs.readdirSync(reportsDir);
    sites.forEach(siteName => {
      const siteDir = path.join(reportsDir, siteName);
      if (fs.statSync(siteDir).isDirectory()) {
        const files = fs.readdirSync(siteDir);
        files.forEach(file => {
          if (file.endsWith('.html')) {
            const filepath = path.join(siteDir, file);
            const stats = fs.statSync(filepath);
            sources.push({
              site: siteName,
              mpn: file.replace('.html', ''),
              filename: file,
              size: stats.size,
              modified: stats.mtime
            });
          }
        });
      }
    });
  }
  
  return { ok: true, sources };
};

// Очистка старых источников
export const cleanOldSources = (maxAgeHours = 72) => {
  const reportsDir = path.join(process.cwd(), 'reports', 'sources');
  
  if (!fs.existsSync(reportsDir)) {
    return { ok: true, cleaned: 0 };
  }
  
  const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  let cleaned = 0;
  
  const sites = fs.readdirSync(reportsDir);
  sites.forEach(siteName => {
    const siteDir = path.join(reportsDir, siteName);
    if (fs.statSync(siteDir).isDirectory()) {
      const files = fs.readdirSync(siteDir);
      files.forEach(file => {
        if (file.endsWith('.html')) {
          const filepath = path.join(siteDir, file);
          const stats = fs.statSync(filepath);
          
          if (stats.mtime.getTime() < maxAge) {
            fs.unlinkSync(filepath);
            cleaned++;
          }
        }
      });
    }
  });
  
  return { ok: true, cleaned };
};
