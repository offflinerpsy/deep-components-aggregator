// src/proxy/public-proxies.js - список публичных прокси для фолбэка
// Без try/catch - только явные проверки

export const PUBLIC_PROXIES = [
  // Free HTTP proxies (обновляются каждые 24ч)
  { host: '8.210.83.33', port: 80, type: 'http' },
  { host: '47.74.152.29', port: 8888, type: 'http' },
  { host: '43.134.68.153', port: 80, type: 'http' },
  { host: '103.149.162.194', port: 80, type: 'http' },
  { host: '185.32.6.129', port: 8090, type: 'http' },
  { host: '103.216.103.26', port: 80, type: 'http' },
  { host: '41.65.236.57', port: 1981, type: 'http' },
  { host: '103.152.112.162', port: 80, type: 'http' },
  { host: '181.78.105.145', port: 999, type: 'http' },
  { host: '190.61.84.166', port: 9812, type: 'http' }
];

// Статистика использования прокси
const proxyStats = new Map();

export function getProxyStats(proxyUrl) {
  const key = `${proxyUrl}`;
  if (!proxyStats.has(key)) {
    proxyStats.set(key, { 
      requests: 0, 
      failures: 0, 
      lastUsed: null,
      avgResponseTime: 0
    });
  }
  return proxyStats.get(key);
}

export function updateProxyStats(proxyUrl, success, responseTime = 0) {
  const stats = getProxyStats(proxyUrl);
  stats.requests++;
  stats.lastUsed = new Date();
  
  if (!success) {
    stats.failures++;
  }
  
  if (responseTime > 0) {
    // Простое скользящее среднее
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
  }
}

// Выбор лучшего прокси на основе статистики
export function selectBestProxy() {
  if (PUBLIC_PROXIES.length === 0) return null;
  
  // Сортируем по успешности (меньше failures) и скорости ответа
  const sortedProxies = PUBLIC_PROXIES.map(proxy => {
    const url = `http://${proxy.host}:${proxy.port}`;
    const stats = getProxyStats(url);
    const successRate = stats.requests > 0 ? (stats.requests - stats.failures) / stats.requests : 1;
    const score = successRate * 1000 - (stats.avgResponseTime || 5000); // больше = лучше
    
    return { proxy, stats, score, url };
  }).sort((a, b) => b.score - a.score);
  
  return sortedProxies[0]?.url || null;
}

// Проверка работоспособности прокси
export async function testProxy(proxyUrl, timeout = 5000) {
  const startTime = Date.now();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const testUrl = 'http://httpbin.org/ip'; // простой тест
  
  const response = await fetch(testUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  clearTimeout(timeoutId);
  const responseTime = Date.now() - startTime;
  
  if (!response.ok) {
    updateProxyStats(proxyUrl, false, responseTime);
    return { ok: false, responseTime, status: response.status };
  }
  
  updateProxyStats(proxyUrl, true, responseTime);
  return { ok: true, responseTime, status: response.status };
}

// Логирование состояния прокси
export function logProxyHealth() {
  console.log('🔄 Proxy Health Report:');
  
  PUBLIC_PROXIES.forEach(proxy => {
    const url = `http://${proxy.host}:${proxy.port}`;
    const stats = getProxyStats(url);
    const successRate = stats.requests > 0 ? 
      Math.round((stats.requests - stats.failures) / stats.requests * 100) : 100;
    
    console.log(`  ${proxy.host}:${proxy.port} - ${successRate}% success, ${Math.round(stats.avgResponseTime)}ms avg`);
  });
}
