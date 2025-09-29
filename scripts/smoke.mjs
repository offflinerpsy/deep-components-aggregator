/**
 * Скрипт для быстрой проверки работоспособности API
 *
 * Использование:
 * node scripts/smoke.mjs [--host=http://localhost:9201]
 *
 * Пример:
 * node scripts/smoke.mjs --host=http://89.104.69.77
 */

import { fetch } from 'undici';

// Получаем аргументы командной строки
const args = process.argv.slice(2);
let host = 'http://localhost:9201';

// Парсим аргументы
for (const arg of args) {
  if (arg.startsWith('--host=')) {
    host = arg.split('=')[1];
  }
}

// Форматирование вывода
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Функция для проверки эндпоинта
async function checkEndpoint(url, options = {}) {
  try {
    console.log(`${colors.blue}GET${colors.reset} ${url}`);

    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();

    const responseTime = endTime - startTime;

    if (response.ok) {
      console.log(`${colors.green}✓ ${response.status} OK${colors.reset} (${responseTime} ms)`);

      // Получаем тело ответа
      let body;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        body = await response.json();
        console.log(`${colors.gray}${JSON.stringify(body, null, 2).substring(0, 400)}${body && JSON.stringify(body).length > 400 ? '...' : ''}${colors.reset}`);
      } else if (contentType && contentType.includes('text/event-stream')) {
        console.log(`${colors.yellow}[SSE Stream]${colors.reset}`);

        // Читаем первые 3 события или до таймаута
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let events = 0;
        let buffer = '';

        const timeout = setTimeout(() => {
          console.log(`${colors.yellow}[SSE Timeout]${colors.reset}`);
          reader.cancel();
        }, 5000);

        try {
          while (events < 3) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Ищем события в буфере
            const eventMatches = buffer.match(/event: [^\n]+\ndata: {[^}]+}/g);

            if (eventMatches) {
              for (const eventMatch of eventMatches) {
                console.log(`${colors.gray}${eventMatch}${colors.reset}`);
                events++;

                if (events >= 3) break;
              }

              // Удаляем обработанные события из буфера
              buffer = buffer.replace(/event: [^\n]+\ndata: {[^}]+}\n\n/, '');
            }
          }
        } catch (error) {
          console.error(`${colors.red}Ошибка при чтении SSE:${colors.reset}`, error.message);
        } finally {
          clearTimeout(timeout);
          reader.cancel();
        }
      } else {
        const text = await response.text();
        console.log(`${colors.gray}${text.substring(0, 200)}${text.length > 200 ? '...' : ''}${colors.reset}`);
      }

      return true;
    } else {
      console.log(`${colors.red}✗ ${response.status} ${response.statusText}${colors.reset} (${responseTime} ms)`);

      try {
        const text = await response.text();
        console.log(`${colors.gray}${text.substring(0, 200)}${text.length > 200 ? '...' : ''}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Ошибка при чтении тела ответа:${colors.reset}`, error.message);
      }

      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Ошибка:${colors.reset}`, error.message);
    return false;
  }
}

// Основная функция для проверки API
async function smokeTest() {
  console.log(`${colors.magenta}=== Smoke Test ====${colors.reset}`);
  console.log(`${colors.cyan}Хост:${colors.reset} ${host}`);
  console.log(`${colors.cyan}Время:${colors.reset} ${new Date().toISOString()}`);
  console.log();

  let success = 0;
  let failed = 0;

  // Проверка API здоровья
  console.log(`${colors.yellow}Проверка API здоровья${colors.reset}`);
  if (await checkEndpoint(`${host}/api/health`)) {
    success++;
  } else {
    failed++;
  }
  console.log();

  // Проверка API поиска
  console.log(`${colors.yellow}Проверка API поиска${colors.reset}`);
  if (await checkEndpoint(`${host}/api/search?q=LM317`)) {
    success++;
  } else {
    failed++;
  }
  console.log();

  // Проверка API живого поиска
  console.log(`${colors.yellow}Проверка API живого поиска${colors.reset}`);
  if (await checkEndpoint(`${host}/api/live/search?q=LM317`, {
    headers: {
      'Accept': 'text/event-stream'
    }
  })) {
    success++;
  } else {
    failed++;
  }
  console.log();

  // Проверка API продукта
  console.log(`${colors.yellow}Проверка API продукта${colors.reset}`);
  if (await checkEndpoint(`${host}/api/product?mpn=LM317`)) {
    success++;
  } else {
    failed++;
  }
  console.log();

  // Итоги
  console.log(`${colors.magenta}=== Итоги ====${colors.reset}`);
  console.log(`${colors.green}Успешно:${colors.reset} ${success}`);
  console.log(`${colors.red}С ошибками:${colors.reset} ${failed}`);
  console.log(`${colors.cyan}Всего:${colors.reset} ${success + failed}`);

  // Возвращаем код завершения
  process.exit(failed > 0 ? 1 : 0);
}

// Запускаем тест
smokeTest().catch(error => {
  console.error(`${colors.red}Критическая ошибка:${colors.reset}`, error);
  process.exit(1);
});
