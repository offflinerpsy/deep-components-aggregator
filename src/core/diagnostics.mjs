import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Класс для сбора диагностической информации
 */
export class DiagnosticsCollector {
  /**
   * @param {string} query Поисковый запрос
   */
  constructor(query) {
    this.query = query;
    this.startTime = Date.now();
    this.events = [];
    this.providers = [];
    this.results = [];
    this.errors = [];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.dirPath = path.join('_diag', timestamp);
    this.filePath = path.join(this.dirPath, 'trace.txt');

    this.ensureDir();
  }

  /**
   * Создает директорию для диагностики, если она не существует
   */
  ensureDir() {
    mkdirSync(this.dirPath, { recursive: true });
  }

  /**
   * Добавляет событие в диагностику
   * @param {string} phase Фаза события
   * @param {string} message Сообщение
   * @param {object} data Дополнительные данные
   */
  addEvent(phase, message, data = {}) {
    const timestamp = Date.now();
    const event = {
      phase,
      message,
      timestamp,
      elapsed: timestamp - this.startTime,
      ...data
    };

    this.events.push(event);

    if (data.error) {
      this.errors.push(event);
    }

    // Немедленно записываем в файл для отладки
    try {
      const line = `[${new Date(timestamp).toISOString()}] [${phase}] ${message}\n`;
      writeFileSync(this.filePath, line, { flag: 'a' });

      if (data && Object.keys(data).length > 0) {
        const dataStr = JSON.stringify(data, null, 2);
        writeFileSync(this.filePath, `${dataStr}\n\n`, { flag: 'a' });
      }
    } catch (error) {
      console.error('Error writing diagnostic event:', error);
    }
  }

  /**
   * Добавляет информацию о провайдере в диагностику
   * @param {string} provider Имя провайдера
   * @param {string} url URL запроса
   * @param {boolean} success Успешность запроса
   * @param {number} time Время выполнения запроса
   * @param {string} key Ключ API
   */
  addProvider(provider, url, success, time, key) {
    const timestamp = Date.now();
    const providerInfo = {
      provider,
      url,
      success,
      time,
      key: key ? `${key.substring(0, 3)}...${key.substring(key.length - 3)}` : null,
      timestamp,
      elapsed: timestamp - this.startTime
    };

    this.providers.push(providerInfo);

    // Немедленно записываем в файл для отладки
    try {
      const line = `[${new Date(timestamp).toISOString()}] [provider:${provider}] ${url} ${success ? 'OK' : 'FAIL'} ${time}ms\n`;
      writeFileSync(this.filePath, line, { flag: 'a' });
    } catch (error) {
      console.error('Error writing diagnostic provider:', error);
    }
  }

  /**
   * Добавляет результаты поиска в диагностику
   * @param {number} count Количество найденных элементов
   * @param {Array} items Найденные элементы
   */
  addResults(count, items = []) {
    const timestamp = Date.now();

    this.results = {
      count,
      items: items.map(item => ({
        mpn: item.mpn,
        brand: item.brand,
        title: item.title
      })),
      timestamp,
      elapsed: timestamp - this.startTime
    };

    // Немедленно записываем в файл для отладки
    try {
      const line = `[${new Date(timestamp).toISOString()}] [results] Found ${count} items\n`;
      writeFileSync(this.filePath, line, { flag: 'a' });
    } catch (error) {
      console.error('Error writing diagnostic results:', error);
    }
  }

  /**
   * Сохраняет диагностику в файл
   * @returns {string} Путь к файлу диагностики
   */
  save() {
    try {
      const summary = {
        query: this.query,
        startTime: this.startTime,
        endTime: Date.now(),
        duration: Date.now() - this.startTime,
        eventsCount: this.events.length,
        providersCount: this.providers.length,
        resultsCount: this.results.count || 0,
        errorsCount: this.errors.length
      };

      const summaryPath = path.join(this.dirPath, 'summary.json');
      writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      return this.filePath;
    } catch (error) {
      console.error('Error saving diagnostics:', error);
      return null;
    }
  }
}
