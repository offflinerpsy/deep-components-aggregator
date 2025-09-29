import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

// Путь к файлу состояния
const stateFilePath = path.resolve('data/state/usage.json');
let state = {};

// Константы для настройки ротатора
const COOLDOWN_TIMES = {
  DEFAULT: 5 * 60 * 1000,         // 5 минут по умолчанию
  RATE_LIMIT: 15 * 60 * 1000,     // 15 минут для ошибок лимита запросов (429)
  PAYMENT_ISSUE: 30 * 60 * 1000,  // 30 минут для ошибок оплаты (402)
  SERVER_ERROR: 10 * 60 * 1000,   // 10 минут для серверных ошибок (5xx)
  NETWORK_ERROR: 3 * 60 * 1000    // 3 минуты для сетевых ошибок
};

const ERROR_THRESHOLDS = {
  CONSECUTIVE_ERRORS: 5,          // Количество последовательных ошибок до отключения
  HOURLY_ERROR_RATE: 0.5,         // 50% ошибок в час - снижение приоритета
  DAILY_QUOTA_PERCENT: 0.9        // 90% дневной квоты - снижение приоритета
};

// Загружаем состояние из файла или создаем новое
try {
  if (fs.existsSync(stateFilePath)) {
    state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  } else {
    fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  }
} catch (error) {
  console.error(`[ROTATOR] Error loading state: ${error.message}`);
}

// Сохраняем состояние в файл
const saveState = () => {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error(`[ROTATOR] Error saving state: ${error.message}`);
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
      return ['ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ'];
    } else if (name === 'scrapingbot') {
      return ['YObdDv4IEG9tXWW5Fd614JLNZ'];
    }

    return [];
  } catch (error) {
    console.error(`[ROTATOR] Error loading keys for ${name}: ${error.message}`);
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
        successCount: 0,
        hourlyStats: {
          startTime: Date.now(),
          requests: 0,
          errors: 0
        },
        dailyQuota: {
          limit: getProviderDailyLimit(providerName),
          used: 0,
          resetTime: getNextResetTime()
        }
      };
    } else {
      // Обновляем существующие ключи с новыми полями, если их нет
      if (!state[providerName][key].hourlyStats) {
        state[providerName][key].hourlyStats = {
          startTime: Date.now(),
          requests: 0,
          errors: 0
        };
      }

      if (!state[providerName][key].dailyQuota) {
        state[providerName][key].dailyQuota = {
          limit: getProviderDailyLimit(providerName),
          used: 0,
          resetTime: getNextResetTime()
        };
      }
    }
  }
}

saveState();

// Получение дневного лимита для провайдера
function getProviderDailyLimit(providerName) {
  // Примерные дневные лимиты (в реальности нужно уточнить в документации)
  switch (providerName) {
    case 'scraperapi':
      return 1000;
    case 'scrapingbee':
      return 1000;
    case 'scrapingbot':
      return 500;
    default:
      return 100;
  }
}

// Получение времени следующего сброса квоты (обычно в полночь UTC)
function getNextResetTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

// Обновление часовой статистики
function updateHourlyStats(keyState, isError) {
  const now = Date.now();

  // Если прошел час, сбрасываем статистику
  if (now - keyState.hourlyStats.startTime > 60 * 60 * 1000) {
    keyState.hourlyStats = {
      startTime: now,
      requests: 1,
      errors: isError ? 1 : 0
    };
    return;
  }

  // Иначе обновляем счетчики
  keyState.hourlyStats.requests++;
  if (isError) {
    keyState.hourlyStats.errors++;
  }
}

// Обновление дневной квоты
function updateDailyQuota(keyState) {
  const now = Date.now();

  // Если наступило время сброса, обнуляем использованную квоту
  if (now > keyState.dailyQuota.resetTime) {
    keyState.dailyQuota.used = 1;
    keyState.dailyQuota.resetTime = getNextResetTime();
  } else {
    keyState.dailyQuota.used++;
  }
}

// Расчет приоритета ключа (меньше = лучше)
function calculateKeyPriority(providerName, key) {
  const keyState = state[providerName][key];
  const now = Date.now();

  // Если ключ отключен, он имеет низкий приоритет
  if (keyState.disabled && now < keyState.disabledUntil) {
    return Infinity;
  }

  // Если ключ был отключен, но время истекло - сбрасываем флаг
  if (keyState.disabled && now >= keyState.disabledUntil) {
    keyState.disabled = false;
    keyState.errors = 0; // Сбрасываем счетчик ошибок
  }

  // Если много последовательных ошибок, понижаем приоритет
  if (keyState.errors >= ERROR_THRESHOLDS.CONSECUTIVE_ERRORS) {
    return 1000 + keyState.errors;
  }

  // Расчет часового уровня ошибок
  const hourlyErrorRate = keyState.hourlyStats.requests > 0
    ? keyState.hourlyStats.errors / keyState.hourlyStats.requests
    : 0;

  // Если высокий уровень ошибок, понижаем приоритет
  if (hourlyErrorRate > ERROR_THRESHOLDS.HOURLY_ERROR_RATE) {
    return 500 + hourlyErrorRate * 100;
  }

  // Проверка использования дневной квоты
  const quotaUsedPercent = keyState.dailyQuota.limit > 0
    ? keyState.dailyQuota.used / keyState.dailyQuota.limit
    : 0;

  // Если квота почти исчерпана, понижаем приоритет
  if (quotaUsedPercent > ERROR_THRESHOLDS.DAILY_QUOTA_PERCENT) {
    return 200 + quotaUsedPercent * 100;
  }

  // Базовый приоритет - время последнего использования
  // Чем дольше ключ не использовался, тем выше приоритет (меньше значение)
  return (now - keyState.lastUsed) * -1;
}

// Выбор ключа по стратегии round-robin с учетом приоритетов
export const pick = (providerName) => {
  const keys = providers[providerName];
  if (!keys || keys.length === 0) {
    return null;
  }

  const now = Date.now();

  // Сортируем ключи по приоритету (меньше = лучше)
  const sortedKeys = [...keys].sort((a, b) => {
    return calculateKeyPriority(providerName, a) - calculateKeyPriority(providerName, b);
  });

  // Берем ключ с наивысшим приоритетом
  const bestKey = sortedKeys[0];

  // Если даже лучший ключ имеет бесконечный приоритет, значит все ключи отключены
  if (calculateKeyPriority(providerName, bestKey) === Infinity) {
    console.warn(`[ROTATOR] All keys for ${providerName} are disabled`);

    // В крайнем случае, берем ключ с наименьшим временем до включения
    let minDisabledUntil = Infinity;
    let fallbackKey = null;

    for (const key of keys) {
      const keyState = state[providerName][key];
      if (keyState.disabledUntil < minDisabledUntil) {
        minDisabledUntil = keyState.disabledUntil;
        fallbackKey = key;
      }
    }

    if (fallbackKey) {
      console.warn(`[ROTATOR] Using disabled key for ${providerName} as fallback`);
      updateKeyUsage(providerName, fallbackKey);
      return fallbackKey;
    }

    return null;
  }

  // Обновляем статистику использования для выбранного ключа
  updateKeyUsage(providerName, bestKey);
  return bestKey;
};

// Обновление статистики использования ключа
function updateKeyUsage(providerName, key) {
  if (!state[providerName] || !state[providerName][key]) {
    return;
  }

  const keyState = state[providerName][key];
  keyState.lastUsed = Date.now();
  keyState.totalUses++;

  // Обновляем часовую статистику
  updateHourlyStats(keyState, false);

  // Обновляем дневную квоту
  updateDailyQuota(keyState);

  saveState();
}

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

  // Обновляем часовую статистику
  updateHourlyStats(keyState, true);

  // Определяем время cooldown в зависимости от типа ошибки
  let cooldownTime = COOLDOWN_TIMES.DEFAULT;

  if (errorCode === '429' || errorCode === 'rate_limit') {
    cooldownTime = COOLDOWN_TIMES.RATE_LIMIT;
  } else if (errorCode === '402' || errorCode === 'payment' || errorCode === 'usage-limit') {
    cooldownTime = COOLDOWN_TIMES.PAYMENT_ISSUE;
  } else if (errorCode.startsWith('5') || errorCode === 'server_error') {
    cooldownTime = COOLDOWN_TIMES.SERVER_ERROR;
  } else if (errorCode === 'timeout' || errorCode === 'network_error') {
    cooldownTime = COOLDOWN_TIMES.NETWORK_ERROR;
  }

  // Отключаем ключ на определенное время
  keyState.disabled = true;
  keyState.disabledUntil = Date.now() + cooldownTime;
  console.warn(`[ROTATOR] Key ${key.slice(0, 8)}... for ${providerName} disabled for ${cooldownTime/1000}s due to ${errorCode}`);

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
      totalKeys: providers[providerName]?.length || 0,
      availableKeys: 0,
      disabledKeys: 0,
      totalUses: 0,
      totalErrors: 0,
      errorRates: {},
      quotaUsage: {}
    };

    for (const key in state[providerName]) {
      const keyState = state[providerName][key];
      stats[providerName].totalUses += keyState.totalUses;

      // Проверяем, активен ли ключ
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

      // Добавляем информацию о квоте
      if (keyState.dailyQuota) {
        const keyId = key.slice(0, 8) + '...';
        stats[providerName].quotaUsage[keyId] = {
          used: keyState.dailyQuota.used,
          limit: keyState.dailyQuota.limit,
          percent: (keyState.dailyQuota.used / keyState.dailyQuota.limit * 100).toFixed(1) + '%',
          resetIn: Math.round((keyState.dailyQuota.resetTime - now) / (60 * 60 * 1000)) + 'h'
        };
      }
    }
  }

  return stats;
};

// Выбор наилучшего провайдера на основе статистики
export const pickBestProvider = () => {
  const stats = getUsageStats();
  const providerNames = Object.keys(stats);

  if (providerNames.length === 0) {
    return null;
  }

  // Оцениваем провайдеров по нескольким критериям
  const providerScores = providerNames.map(name => {
    const providerStats = stats[name];

    // Если нет доступных ключей, даем низкий балл
    if (providerStats.availableKeys === 0) {
      return { name, score: -100 };
    }

    // Базовый балл - количество доступных ключей
    let score = providerStats.availableKeys * 10;

    // Штраф за высокий процент ошибок
    const errorRate = providerStats.totalUses > 0
      ? providerStats.totalErrors / providerStats.totalUses
      : 0;

    score -= errorRate * 50;

    return { name, score };
  });

  // Сортируем провайдеров по баллам (выше = лучше)
  providerScores.sort((a, b) => b.score - a.score);

  // Возвращаем имя лучшего провайдера
  return providerScores[0].name;
};

// Проверка, не превышен ли лимит запросов для запроса
export const shouldThrottleQuery = (query, ttl = 60000) => {
  if (!state.queryCache) {
    state.queryCache = {};
  }

  const now = Date.now();
  const cacheKey = query.toLowerCase().trim();

  // Если запрос уже был недавно, возвращаем true (нужно ограничить)
  if (state.queryCache[cacheKey] && now - state.queryCache[cacheKey] < ttl) {
    return true;
  }

  // Иначе обновляем время последнего запроса и разрешаем выполнение
  state.queryCache[cacheKey] = now;

  // Очищаем старые записи в кэше
  for (const key in state.queryCache) {
    if (now - state.queryCache[key] > ttl * 2) {
      delete state.queryCache[key];
    }
  }

  saveState();
  return false;
};

export default {
  load,
  pick,
  recordError,
  recordSuccess,
  getUsageStats,
  pickBestProvider,
  shouldThrottleQuery
};
