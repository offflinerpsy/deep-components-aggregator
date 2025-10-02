import PQueue from 'p-queue';
import fs from 'node:fs';
import path from 'node:path';

// Создаем директорию для логов
try {
  fs.mkdirSync(path.resolve('logs'), { recursive: true });
} catch (error) {
  console.error(`Error creating logs directory: ${error.message}`);
}

// Логирование операций очереди
const logQueueOperation = (operation, task, result) => {
  try {
    const logFile = path.resolve('logs/queue-operations.log');
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${operation}] ${task.id} - ${task.type} - ${result}\n`;

    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(`Error logging queue operation: ${error.message}`);
  }
};

// Основная очередь задач с ограничением параллельности и скорости
export const mainQueue = new PQueue({
  concurrency: 4,       // Максимум 4 задачи одновременно
  intervalCap: 30,      // Максимум 30 задач
  interval: 60 * 1000,  // за 60 секунд (1 минута)
  carryoverConcurrencyCount: true // Учитывать задачи, которые уже выполняются
});

// Очередь для скрапинга с более строгими ограничениями
export const scrapeQueue = new PQueue({
  concurrency: 2,       // Максимум 2 задачи скрапинга одновременно
  intervalCap: 10,      // Максимум 10 задач скрапинга
  interval: 60 * 1000,  // за 60 секунд (1 минута)
  carryoverConcurrencyCount: true
});

// Очередь для парсинга с высокой параллельностью (CPU-bound)
export const parseQueue = new PQueue({
  concurrency: 8,       // Максимум 8 задач парсинга одновременно
  carryoverConcurrencyCount: true
});

// Обертка для добавления задачи в очередь с логированием и обработкой ошибок
export const addTask = async (queue, taskFn, taskData) => {
  const taskId = taskData.id || `task-${Math.random().toString(36).substring(2, 10)}`;
  const taskType = taskData.type || 'unknown';

  const task = {
    id: taskId,
    type: taskType,
    data: taskData,
    startTime: Date.now()
  };

  logQueueOperation('QUEUED', task, `Queue size: ${queue.size}, Pending: ${queue.pending}`);

  return queue.add(async () => {
    logQueueOperation('STARTED', task, `Queue size: ${queue.size}, Pending: ${queue.pending}`);

    try {
      const result = await taskFn(taskData);

      const duration = Date.now() - task.startTime;
      logQueueOperation('COMPLETED', task, `Duration: ${duration}ms, Queue size: ${queue.size}, Pending: ${queue.pending}`);

      return result;
    } catch (error) {
      const duration = Date.now() - task.startTime;
      logQueueOperation('FAILED', task, `Error: ${error.message}, Duration: ${duration}ms`);

      throw error;
    }
  });
};

// Добавление задачи скрапинга
export const addScrapeTask = async (taskFn, taskData) => {
  return addTask(scrapeQueue, taskFn, { ...taskData, type: 'scrape' });
};

// Добавление задачи парсинга
export const addParseTask = async (taskFn, taskData) => {
  return addTask(parseQueue, taskFn, { ...taskData, type: 'parse' });
};

// Добавление общей задачи
export const add = async (taskFn, taskData) => {
  return addTask(mainQueue, taskFn, taskData);
};

// Обработчики событий для очередей
const setupQueueEvents = (queue, name) => {
  queue.on('active', () => {
    console.log(`[QUEUE:${name}] Size: ${queue.size}, Pending: ${queue.pending}`);
  });

  queue.on('idle', () => {
    console.log(`[QUEUE:${name}] Queue is idle. Completed all tasks.`);
  });

  queue.on('error', (error, task) => {
    console.error(`[QUEUE:${name}] Error in task:`, error);
  });
};

setupQueueEvents(mainQueue, 'main');
setupQueueEvents(scrapeQueue, 'scrape');
setupQueueEvents(parseQueue, 'parse');

// Получение статистики очередей
export const getQueueStats = () => {
  return {
    main: {
      size: mainQueue.size,
      pending: mainQueue.pending,
      isPaused: mainQueue.isPaused
    },
    scrape: {
      size: scrapeQueue.size,
      pending: scrapeQueue.pending,
      isPaused: scrapeQueue.isPaused
    },
    parse: {
      size: parseQueue.size,
      pending: parseQueue.pending,
      isPaused: parseQueue.isPaused
    }
  };
};

// Пауза/возобновление очередей
export const pauseQueues = () => {
  mainQueue.pause();
  scrapeQueue.pause();
  parseQueue.pause();
  console.log('[QUEUE] All queues paused');
};

export const resumeQueues = () => {
  mainQueue.start();
  scrapeQueue.start();
  parseQueue.start();
  console.log('[QUEUE] All queues resumed');
};

// Очистка очередей
export const clearQueues = () => {
  mainQueue.clear();
  scrapeQueue.clear();
  parseQueue.clear();
  console.log('[QUEUE] All queues cleared');
};

export default {
  mainQueue,
  scrapeQueue,
  parseQueue,
  add,
  addScrapeTask,
  addParseTask,
  getQueueStats,
  pauseQueues,
  resumeQueues,
  clearQueues
};
