import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Класс для сбора диагностической информации о запросах
 */
export class DiagnosticsCollector {
  /**
   * Создает новый экземпляр сборщика диагностики
   * @param {string} query Поисковый запрос
   */
  constructor(query) {
    this.query = query;
    this.startTime = Date.now();
    this.events = [];
    this.providers = {};
    this.ts = new Date().toISOString().replace(/[:.]/g, '-');
    this.dir = path.join('_diag', this.ts);
    this.ensureDir();
  }

  /**
   * Создает директорию для диагностики
   */
  ensureDir() {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  /**
   * Добавляет событие в диагностику
   * @param {string} phase Фаза запроса
   * @param {string} message Сообщение
   * @param {object} data Дополнительные данные
   */
  addEvent(phase, message, data = {}) {
    const event = {
      ts: Date.now(),
      elapsed: Date.now() - this.startTime,
      phase,
      message,
      ...data
    };
    this.events.push(event);
    return this;
  }

  /**
   * Добавляет информацию о запросе к провайдеру
   * @param {string} provider Имя провайдера
   * @param {string} url URL запроса
   * @param {boolean} success Успешность запроса
   * @param {number} time Время выполнения запроса
   * @param {string} key Используемый ключ API
   */
  addProvider(provider, url, success, time, key) {
    if (!this.providers[provider]) {
      this.providers[provider] = [];
    }

    this.providers[provider].push({
      ts: Date.now(),
      elapsed: Date.now() - this.startTime,
      url,
      success,
      time,
      key: key ? key.slice(0, 8) + '...' : undefined
    });

    return this;
  }

  /**
   * Добавляет информацию о результатах
   * @param {number} count Количество результатов
   * @param {Array} items Результаты
   */
  addResults(count, items = []) {
    this.addEvent('results', `Found ${count} items`, { count });
    return this;
  }

  /**
   * Сохраняет диагностику в файл
   * @returns {string} Путь к файлу диагностики
   */
  save() {
    const filePath = path.join(this.dir, 'trace.txt');

    let content = `QUERY: ${this.query}\n`;
    content += `START_TIME: ${new Date(this.startTime).toISOString()}\n`;
    content += `TOTAL_TIME: ${Date.now() - this.startTime}ms\n\n`;

    content += '=== EVENTS ===\n';
    for (const event of this.events) {
      content += `[${event.elapsed}ms] [${event.phase}] ${event.message}\n`;

      // Добавляем дополнительные данные, если они есть
      const { ts, elapsed, phase, message, ...data } = event;
      if (Object.keys(data).length > 0) {
        content += `  ${JSON.stringify(data)}\n`;
      }
    }

    content += '\n=== PROVIDERS ===\n';
    for (const [provider, requests] of Object.entries(this.providers)) {
      content += `${provider} (${requests.length} requests):\n`;
      for (const req of requests) {
        content += `  [${req.elapsed}ms] ${req.success ? 'OK' : 'FAIL'} ${req.time}ms ${req.url} ${req.key || ''}\n`;
      }
    }

    // Сохраняем файл
    writeFileSync(filePath, content);

    return filePath;
  }
}
