/**
 * Скрипт для проверки совместимости версий используемых библиотек
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Проверка совместимости версий библиотек...');

// Проверка версии Node.js
const nodeVersion = process.version;
console.log(`Версия Node.js: ${nodeVersion}`);

// Минимальная рекомендуемая версия Node.js
const minNodeVersion = 'v16.0.0';
if (compareVersions(nodeVersion, minNodeVersion) < 0) {
  console.warn(`ВНИМАНИЕ: Рекомендуется использовать Node.js версии ${minNodeVersion} или выше.`);
}

// Проверка package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log('Зависимости из package.json:');
} catch (err) {
  console.error('Ошибка при чтении package.json:', err.message);
  process.exit(1);
}

// Проверка установленных пакетов
console.log('\nПроверка установленных пакетов:');
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

for (const [name, version] of Object.entries(dependencies)) {
  try {
    // Пытаемся загрузить пакет для проверки его наличия
    const packagePath = path.join(__dirname, 'node_modules', name, 'package.json');
    if (fs.existsSync(packagePath)) {
      const installedPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      console.log(`✅ ${name}: ${installedPackage.version} (требуется: ${version})`);

      // Проверка совместимости с текущей версией Node.js
      if (installedPackage.engines && installedPackage.engines.node) {
        const requiredNodeVersion = installedPackage.engines.node;
        console.log(`   - Требуемая версия Node.js: ${requiredNodeVersion}`);

        // Проверка на совместимость (упрощенная)
        if (requiredNodeVersion.startsWith('>=')) {
          const minVersion = requiredNodeVersion.substring(2);
          if (compareVersions(nodeVersion, minVersion) < 0) {
            console.warn(`   ⚠️ ВНИМАНИЕ: ${name} требует Node.js ${requiredNodeVersion}`);
          }
        }
      }

      // Проверка типа модуля (ESM/CommonJS)
      if (installedPackage.type === 'module') {
        console.log(`   - Тип модуля: ESM`);
      } else {
        console.log(`   - Тип модуля: CommonJS`);
      }

      // Проверка специфичных зависимостей
      if (name === 'cheerio') {
        console.log(`   - Правильный импорт: import { load } from 'cheerio';`);
      }

    } else {
      console.warn(`⚠️ ${name}: не установлен (требуется: ${version})`);
    }
  } catch (err) {
    console.error(`❌ Ошибка при проверке ${name}:`, err.message);
  }
}

// Проверка конфликтов ESM/CommonJS
console.log('\nПроверка конфигурации проекта:');
if (packageJson.type === 'module') {
  console.log('✅ Проект настроен как ESM (type: "module")');
  console.log('   - Используйте import/export вместо require/module.exports');
  console.log('   - Файлы должны иметь расширение .mjs или .js');
} else {
  console.log('✅ Проект настроен как CommonJS (type не указан или "commonjs")');
  console.log('   - Используйте require/module.exports вместо import/export');
}

// Проверка наличия .gitignore
if (fs.existsSync(path.join(__dirname, '.gitignore'))) {
  console.log('✅ Файл .gitignore существует');
} else {
  console.warn('⚠️ Файл .gitignore отсутствует');
}

console.log('\nПроверка завершена!');

/**
 * Сравнивает две версии в формате semver
 * @param {string} v1 - Первая версия
 * @param {string} v2 - Вторая версия
 * @returns {number} - 1 если v1 > v2, -1 если v1 < v2, 0 если равны
 */
function compareVersions(v1, v2) {
  const v1Parts = v1.replace('v', '').split('.').map(Number);
  const v2Parts = v2.replace('v', '').split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}
