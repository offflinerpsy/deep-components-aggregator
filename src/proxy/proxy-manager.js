// src/proxy/proxy-manager.js - управление прокси (локальный + публичные)
// Без try/catch - только явные проверки

import { ProxyAgent } from 'undici';
import { selectBestProxy, testProxy, logProxyHealth } from './public-proxies.js';

// Конфигурация прокси
const LOCAL_PROXY_HOST = process.env.LOCAL_PROXY_HOST || '127.0.0.1';
const LOCAL_PROXY_PORT = process.env.LOCAL_PROXY_PORT || '8080';
const USE_LOCAL_PROXY = process.env.USE_LOCAL_PROXY !== 'false';

export class ProxyManager {
  constructor() {
    this.localProxyUrl = `http://${LOCAL_PROXY_HOST}:${LOCAL_PROXY_PORT}`;
    this.currentProxy = null;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 5 * 60 * 1000; // 5 минут
  }

  // Получить URL локального прокси
  getLocalProxyUrl() {
    return USE_LOCAL_PROXY ? this.localProxyUrl : null;
  }

  // Проверить доступность локального прокси
  async checkLocalProxy() {
    if (!USE_LOCAL_PROXY) return false;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${this.localProxyUrl}/proxy/http://httpbin.org/ip`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DeepAgg/1.0' }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  }

  // Получить лучший доступный прокси
  async getBestProxy() {
    const now = Date.now();
    
    // Проверяем здоровье прокси раз в 5 минут
    if (now - this.lastHealthCheck > this.healthCheckInterval) {
      await this.performHealthCheck();
      this.lastHealthCheck = now;
    }
    
    // Сначала пробуем локальный прокси
    if (USE_LOCAL_PROXY) {
      const isLocalOk = await this.checkLocalProxy();
      if (isLocalOk) {
        console.log('🔄 Using local proxy:', this.localProxyUrl);
        return this.localProxyUrl;
      }
      console.log('⚠️ Local proxy unavailable, falling back to public proxies');
    }
    
    // Фолбэк на публичные прокси
    const bestPublicProxy = selectBestProxy();
    if (bestPublicProxy) {
      console.log('🔄 Using public proxy:', bestPublicProxy);
      return bestPublicProxy;
    }
    
    console.log('⚠️ No working proxies available');
    return null;
  }

  // Создать ProxyAgent для fetch
  async createProxyAgent() {
    const proxyUrl = await this.getBestProxy();
    if (!proxyUrl) return null;
    
    return new ProxyAgent(proxyUrl);
  }

  // Выполнить проверку здоровья прокси
  async performHealthCheck() {
    console.log('🔍 Performing proxy health check...');
    
    // Проверяем локальный прокси
    if (USE_LOCAL_PROXY) {
      const isLocalOk = await this.checkLocalProxy();
      console.log(`🏠 Local proxy (${this.localProxyUrl}):`, isLocalOk ? '✅ OK' : '❌ FAIL');
    }
    
    // Проверяем публичные прокси (первые 3 для экономии времени)
    const publicProxies = [selectBestProxy()].filter(Boolean).slice(0, 3);
    
    for (const proxyUrl of publicProxies) {
      const result = await testProxy(proxyUrl);
      console.log(`🌐 Public proxy (${proxyUrl}):`, 
        result.ok ? `✅ OK (${result.responseTime}ms)` : `❌ FAIL (${result.status})`);
    }
    
    logProxyHealth();
  }

  // Получить прокси для конкретного домена (можно добавить логику маршрутизации)
  async getProxyForDomain(domain) {
    // Для российских сайтов можем использовать прямое соединение
    const russianDomains = ['chipdip.ru', 'platan.ru', 'elitan.ru', 'compitech.ru'];
    
    if (russianDomains.some(d => domain.includes(d))) {
      console.log(`🇷🇺 Direct connection for Russian domain: ${domain}`);
      return null; // прямое соединение
    }
    
    // Для остальных - через прокси
    return await this.getBestProxy();
  }

  // Создать fetch options с прокси
  async createFetchOptions(url, baseOptions = {}) {
    const urlObj = new URL(url);
    const proxyUrl = await this.getProxyForDomain(urlObj.hostname);
    
    const options = {
      ...baseOptions,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        ...baseOptions.headers
      }
    };
    
    if (proxyUrl) {
      options.dispatcher = new ProxyAgent(proxyUrl);
    }
    
    return options;
  }
}

// Глобальный экземпляр менеджера прокси
export const proxyManager = new ProxyManager();
