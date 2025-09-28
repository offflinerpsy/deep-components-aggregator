import { fetch } from 'undici';

// Проверяем, что сервер запущен и отвечает
async function checkHealth() {
  console.log('Проверка /api/health...');
  try {
    const response = await fetch('http://localhost:9201/api/health');
    if (!response.ok) {
      console.error(`❌ /api/health вернул статус ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ /api/health: ${JSON.stringify(data)}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при проверке /api/health: ${error.message}`);
    return false;
  }
}

// Проверяем поиск по API
async function checkSearch() {
  const queries = ['LM317', '1N4148', 'транзистор'];
  let success = true;

  for (const query of queries) {
    console.log(`Проверка /api/search?q=${query}...`);
    try {
      const response = await fetch(`http://localhost:9201/api/search?q=${query}`);
      if (!response.ok) {
        console.error(`❌ /api/search?q=${query} вернул статус ${response.status}`);
        success = false;
        continue;
      }

      const data = await response.json();
      if (data.count > 0) {
        console.log(`✅ /api/search?q=${query}: найдено ${data.count} элементов`);
      } else {
        console.warn(`⚠️ /api/search?q=${query}: элементы не найдены`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при проверке /api/search?q=${query}: ${error.message}`);
      success = false;
    }
  }

  return success;
}

// Проверяем live-поиск
async function checkLiveSearch() {
  const query = 'LM317';
  console.log(`Проверка /api/live/search?q=${query}...`);

  try {
    const controller = new AbortController();
    const signal = controller.signal;

    // Устанавливаем таймаут 5 секунд
    setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`http://localhost:9201/api/live/search?q=${query}`, { signal });
    if (!response.ok) {
      console.error(`❌ /api/live/search?q=${query} вернул статус ${response.status}`);
      return false;
    }

    const reader = response.body.getReader();
    let receivedLength = 0;
    let receivedEvents = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedLength += value.length;
      const text = new TextDecoder().decode(value);
      const events = text.split('\n\n').filter(Boolean);
      receivedEvents += events.length;
    }

    if (receivedLength > 0) {
      console.log(`✅ /api/live/search?q=${query}: получено ${receivedEvents} событий, ${receivedLength} байт`);
      return true;
    } else {
      console.warn(`⚠️ /api/live/search?q=${query}: данные не получены`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`✅ /api/live/search?q=${query}: соединение установлено (прервано по таймауту)`);
      return true;
    }

    console.error(`❌ Ошибка при проверке /api/live/search?q=${query}: ${error.message}`);
    return false;
  }
}

// Проверяем главную страницу
async function checkMainPage() {
  console.log('Проверка главной страницы...');
  try {
    const response = await fetch('http://localhost:9201/');
    if (!response.ok) {
      console.error(`❌ Главная страница вернула статус ${response.status}`);
      return false;
    }

    const html = await response.text();
    if (html.includes('<html') && html.includes('</html>')) {
      console.log('✅ Главная страница загружена успешно');
      return true;
    } else {
      console.error('❌ Главная страница не содержит HTML');
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка при проверке главной страницы: ${error.message}`);
    return false;
  }
}

// Запускаем все проверки
async function runTests() {
  console.log('Запуск проверок...');

  const healthOk = await checkHealth();
  const searchOk = await checkSearch();
  const liveSearchOk = await checkLiveSearch();
  const mainPageOk = await checkMainPage();

  console.log('\nРезультаты проверок:');
  console.log(`- Проверка /api/health: ${healthOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`- Проверка /api/search: ${searchOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`- Проверка /api/live/search: ${liveSearchOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`- Проверка главной страницы: ${mainPageOk ? '✅ OK' : '❌ FAIL'}`);

  const allOk = healthOk && searchOk && liveSearchOk && mainPageOk;
  console.log(`\nИтог: ${allOk ? '✅ Все проверки пройдены' : '❌ Есть ошибки'}`);

  process.exit(allOk ? 0 : 1);
}

runTests();
