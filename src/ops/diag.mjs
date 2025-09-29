/**
 * Модуль для сбора диагностической информации
 * @module src/ops/diag
 */

import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

/**
 * Класс для сбора диагностической информации
 */
export class DiagnosticsCollector {
  /**
   * Создает экземпляр коллектора диагностики
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции коллектора
   * @param {string} [options.id] - Идентификатор сессии (генерируется автоматически, если не указан)
   * @param {string} [options.baseDir='_diag'] - Базовая директория для хранения диагностики
   */
  constructor(query, options = {}) {
    this.query = query;
    this.id = options.id || nanoid();
    this.baseDir = options.baseDir || '_diag';
    this.startTime = Date.now();
    this.events = [];
    this.providers = [];
    this.phaseTimes = {};
    this.errors = [];
    this.itemsEmitted = 0;
    
    // Создаем директорию для диагностики
    this.sessionDir = this._createSessionDir();
  }
  
  /**
   * Создает директорию для диагностики
   * @private
   * @returns {string} Путь к директории
   */
  _createSessionDir() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionDir = path.join(this.baseDir, timestamp, this.id);
    
    try {
      fs.mkdirSync(sessionDir, { recursive: true });
    } catch (error) {
      console.error(`[DIAG] Error creating session directory: ${error.message}`);
    }
    
    return sessionDir;
  }
  
  /**
   * Добавляет событие в диагностику
   * @param {string} type - Тип события
   * @param {string} message - Сообщение события
   * @param {Object} [data] - Дополнительные данные события
   */
  addEvent(type, message, data = {}) {
    const event = {
      type,
      message,
      timestamp: Date.now(),
      elapsed: Date.now() - this.startTime,
      ...data
    };
    
    this.events.push(event);
    
    // Записываем событие в трейс-файл
    this._appendToTrace(`[${new Date(event.timestamp).toISOString()}] [${type}] ${message}`);
    
    // Если это ошибка, добавляем в список ошибок
    if (data.error || type.includes('error') || type.includes('exception')) {
      this.errors.push(event);
    }
  }
  
  /**
   * Добавляет информацию о провайдере в диагностику
   * @param {string} name - Имя провайдера
   * @param {string} url - URL запроса
   * @param {boolean} success - Успешность запроса
   * @param {number} duration - Длительность запроса в миллисекундах
   * @param {string} key - Использованный ключ (маскированный)
   * @param {number} [attempt=0] - Номер попытки
   */
  addProvider(name, url, success, duration, key, attempt = 0) {
    const provider = {
      name,
      url,
      success,
      duration,
      key,
      attempt,
      timestamp: Date.now()
    };
    
    this.providers.push(provider);
    
    // Записываем информацию о провайдере в трейс-файл
    this._appendToTrace(
      `[${new Date().toISOString()}] [PROVIDER] ${name} ${success ? 'SUCCESS' : 'FAILED'} ` +
      `for ${url} in ${duration}ms (key: ${key}, attempt: ${attempt + 1})`
    );
  }
  
  /**
   * Отмечает начало фазы
   * @param {string} phase - Название фазы
   */
  startPhase(phase) {
    if (!this.phaseTimes[phase]) {
      this.phaseTimes[phase] = {};
    }
    
    this.phaseTimes[phase].start = Date.now();
    this._appendToTrace(`[${new Date().toISOString()}] [PHASE_START] ${phase}`);
  }
  
  /**
   * Отмечает окончание фазы
   * @param {string} phase - Название фазы
   */
  endPhase(phase) {
    if (this.phaseTimes[phase] && this.phaseTimes[phase].start) {
      const start = this.phaseTimes[phase].start;
      const end = Date.now();
      const duration = end - start;
      
      this.phaseTimes[phase].end = end;
      this.phaseTimes[phase].duration = duration;
      
      this._appendToTrace(`[${new Date().toISOString()}] [PHASE_END] ${phase} (${duration}ms)`);
    }
  }
  
  /**
   * Отмечает эмиссию элемента
   * @param {Object} item - Элемент
   */
  itemEmitted(item) {
    this.itemsEmitted++;
    
    const itemInfo = {
      mpn: item.mpn || 'unknown',
      brand: item.brand || 'unknown',
      title: item.title || 'unknown'
    };
    
    this._appendToTrace(
      `[${new Date().toISOString()}] [ITEM_EMITTED] Item #${this.itemsEmitted}: ` +
      `${itemInfo.mpn} ${itemInfo.brand} ${itemInfo.title}`
    );
  }
  
  /**
   * Добавляет строку в трейс-файл
   * @private
   * @param {string} line - Строка для добавления
   */
  _appendToTrace(line) {
    try {
      const tracePath = path.join(this.sessionDir, 'trace.txt');
      fs.appendFileSync(tracePath, line + '\n');
    } catch (error) {
      console.error(`[DIAG] Error appending to trace: ${error.message}`);
    }
  }
  
  /**
   * Сохраняет диагностику в файлы
   * @returns {string} Путь к директории с диагностикой
   */
  save() {
    try {
      // Создаем итоговый объект
      const summary = {
        query: this.query,
        id: this.id,
        startTime: this.startTime,
        endTime: Date.now(),
        duration: Date.now() - this.startTime,
        phaseTimes: this.phaseTimes,
        providerStats: this._getProviderStats(),
        errors: this.errors,
        itemsEmitted: this.itemsEmitted,
        eventsCount: this.events.length
      };
      
      // Сохраняем итоговую информацию
      const summaryPath = path.join(this.sessionDir, 'summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      // Сохраняем полную информацию о событиях
      const eventsPath = path.join(this.sessionDir, 'events.json');
      fs.writeFileSync(eventsPath, JSON.stringify(this.events, null, 2));
      
      // Сохраняем полную информацию о провайдерах
      const providersPath = path.join(this.sessionDir, 'providers.json');
      fs.writeFileSync(providersPath, JSON.stringify(this.providers, null, 2));
      
      return this.sessionDir;
    } catch (error) {
      console.error(`[DIAG] Error saving diagnostics: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Получает статистику по провайдерам
   * @private
   * @returns {Object} Статистика по провайдерам
   */
  _getProviderStats() {
    const stats = {};
    
    for (const provider of this.providers) {
      const { name } = provider;
      
      if (!stats[name]) {
        stats[name] = {
          total: 0,
          success: 0,
          failed: 0,
          avgDuration: 0,
          totalDuration: 0
        };
      }
      
      stats[name].total++;
      stats[name].totalDuration += provider.duration;
      stats[name].avgDuration = stats[name].totalDuration / stats[name].total;
      
      if (provider.success) {
        stats[name].success++;
      } else {
        stats[name].failed++;
      }
    }
    
    return stats;
  }
}

/**
 * Создает коллектор диагностики для поискового запроса
 * @param {string} query - Поисковый запрос
 * @param {Object} [options] - Опции коллектора
 * @returns {DiagnosticsCollector} Коллектор диагностики
 */
export function createDiagnostics(query, options = {}) {
  return new DiagnosticsCollector(query, options);
}

export default {
  DiagnosticsCollector,
  createDiagnostics
};
