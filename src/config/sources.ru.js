import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let configCache = null;

export function loadConfig(source) {
  if (!configCache) {
    const configPath = path.join(__dirname, 'sources.ru.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    configCache = JSON.parse(configData);
  }
  
  return configCache[source];
}

export function getAllSources() {
  if (!configCache) {
    const configPath = path.join(__dirname, 'sources.ru.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    configCache = JSON.parse(configData);
  }
  
  return Object.keys(configCache);
}
