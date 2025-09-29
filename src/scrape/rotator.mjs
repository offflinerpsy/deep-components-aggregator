import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

const stateFilePath = path.resolve('data/state/usage.json');
let state = {};

// Загружаем состояние из файла или создаем новое
try {
  if (fs.existsSync(stateFilePath)) {
    state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  } else {
    fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  }
} catch (error) {
  console.error(`Error loading rotator state: ${error.message}`);
}

// Сохраняем состояние в файл
const saveState = () => {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving rotator state: ${error.message}`);
  }
};

// Загружаем ключи API из файлов
export const load = (name) => {
  try {
    const p = path.resolve(`secrets/apis/${name}.txt`);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
    }

    // Заглушки для локальной разработки
    if (name === 'scraperapi') {
      return ['a91efbc32580c3e8ab8b06ce9b6dc509'];
    } else if (name === 'scrapingbee') {
      return ['ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ', '1KYSOE...e4346'];
    } else if (name === 'scrapingbot') {
      return ['YObdDv4IEG9tXWW5Fd614JLNZ'];
    }

    return [];
  } catch (error) {
    console.error(`Error loading keys for ${name}: ${error.message}`);
    return [];
  }
};

// Загружаем ключи для всех провайдеров
const providers = {
  scraperapi: load('scraperapi'),
  scrapingbee: load('scrapingbee'),
  scrapingbot: load('scrapingbot'),
};

// Инициализация состояния для новых ключей
for (const providerName in providers) {
  if (!state[providerName]) {
    state[providerName] = {};
  }
  for (const key of providers[providerName]) {
    if (!state[providerName][key]) {
      state[providerName][key] = {
        lastUsed: 0,
        errors: 0,
        totalUses: 0,
        disabled: false,
        disabledUntil: 0,
        errorCodes: {},
        successCount: 0
      };
    }
  }
}
saveState();

// Выбор ключа по стратегии LRU (Least Recently Used)
export const pick = (providerName) => {
  const keys = providers[providerName];
  if (!keys || keys.length === 0) {
    return null;
  }

  const now = Date.now();
  let bestKey = null;
  let minLastUsed = Infinity;

  for (const key of keys) {
    const keyState = state[providerName][key];

    // Пропускаем отключенные ключи
    if (keyState.disabled && now < keyState.disabledUntil) {
      continue;
    }

    // Если ключ был отключен, но время истекло - сбрасываем флаг
    if (keyState.disabled && now >= keyState.disabledUntil) {
      keyState.disabled = false;
      keyState.errors = 0; // Сбрасываем счетчик ошибок
    }

    // Пропускаем ключи с большим количеством ошибок (более 5 подряд)
    if (keyState.errors > 5) {
      continue;
    }

    if (keyState.lastUsed < minLastUsed) {
      minLastUsed = keyState.lastUsed;
      bestKey = key;
    }
  }

  if (bestKey) {
    state[providerName][bestKey].lastUsed = now;
    state[providerName][bestKey].totalUses++;
    saveState();
  } else {
    // Если все ключи отключены или с ошибками, берем любой (с наименьшим временем блокировки)
    let minDisabledUntil = Infinity;
    for (const key of keys) {
      const keyState = state[providerName][key];
      if (keyState.disabledUntil < minDisabledUntil) {
        minDisabledUntil = keyState.disabledUntil;
        bestKey = key;
      }
    }

    if (bestKey) {
      state[providerName][bestKey].lastUsed = now;
      state[providerName][bestKey].totalUses++;
      saveState();
    }
  }

  return bestKey;
};

// Запись ошибки для ключа
export const recordError = (providerName, key, errorCode = 'unknown') => {
  if (!state[providerName] || !state[providerName][key]) {
    return;
  }

  const keyState = state[providerName][key];
  keyState.errors++;

  // Отслеживаем типы ошибок
  if (!keyState.errorCodes[errorCode]) {
    keyState.errorCodes[errorCode] = 0;
  }
  keyState.errorCodes[errorCode]++;

  // Если ошибка связана с лимитами или платежами, отключаем ключ на 15 минут
  if (errorCode === '429' || errorCode === '402' || errorCode === 'usage-limit') {
    keyState.disabled = true;
    keyState.disabledUntil = Date.now() + 15 * 60 * 1000; // 15 минут
    console.warn(`[ROTATOR] Key ${key.slice(0, 8)}... for ${providerName} disabled for 15 minutes due to ${errorCode}`);
  }

  // Если 5 ошибок подряд, отключаем на 5 минут
  if (keyState.errors >= 5) {
    keyState.disabled = true;
    keyState.disabledUntil = Date.now() + 5 * 60 * 1000; // 5 минут
    console.warn(`[ROTATOR] Key ${key.slice(0, 8)}... for ${providerName} disabled for 5 minutes due to repeated errors`);
  }

  saveState();
};

// Запись успешного использования ключа
export const recordSuccess = (providerName, key) => {
  if (!state[providerName] || !state[providerName][key]) {
    return;
  }

  const keyState = state[providerName][key];
  keyState.errors = 0; // Сбрасываем счетчик ошибок при успешном использовании
  keyState.successCount++;
  saveState();
};

// Получение статистики использования ключей
export const getUsageStats = () => {
  const now = Date.now();
  const stats = {};

  for (const providerName in state) {
    stats[providerName] = {
      totalKeys: providers[providerName].length,
      availableKeys: 0,
      disabledKeys: 0,
      totalUses: 0,
      totalErrors: 0,
      errorRates: {}
    };

    for (const key in state[providerName]) {
      const keyState = state[providerName][key];
      stats[providerName].totalUses += keyState.totalUses;

      if (keyState.disabled && now < keyState.disabledUntil) {
        stats[providerName].disabledKeys++;
      } else {
        stats[providerName].availableKeys++;
      }

      // Собираем статистику по ошибкам
      for (const errorCode in keyState.errorCodes) {
        if (!stats[providerName].errorRates[errorCode]) {
          stats[providerName].errorRates[errorCode] = 0;
        }
        stats[providerName].errorRates[errorCode] += keyState.errorCodes[errorCode];
        stats[providerName].totalErrors += keyState.errorCodes[errorCode];
      }
    }
  }

  return stats;
};

// Выбор наилучшего провайдера на основе статистики успехов/ошибок
export const pickBestProvider = () => {
  const stats = getUsageStats();
  const providers = Object.keys(stats);

  if (providers.length === 0) {
    return null;
  }

  // Простой алгоритм: выбираем провайдера с наибольшим количеством доступных ключей
  let bestProvider = providers[0];
  let maxAvailable = stats[providers[0]].availableKeys;

  for (let i = 1; i < providers.length; i++) {
    if (stats[providers[i]].availableKeys > maxAvailable) {
      maxAvailable = stats[providers[i]].availableKeys;
      bestProvider = providers[i];
    }
  }

  return bestProvider;
};

export default {
  load,
  pick,
  recordError,
  recordSuccess,
  getUsageStats,
  pickBestProvider
};
