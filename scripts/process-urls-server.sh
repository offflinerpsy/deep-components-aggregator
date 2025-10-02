#!/bin/bash
# Скрипт для обработки файла с URL ChipDip на сервере

# Конфигурация
SERVER="89.104.69.77"
USER="root"
PASSWORD="DCIIcWfISxT3R4hT"
REMOTE_DIR="/opt/deep-agg"
INPUT_FILE="/opt/deep-agg/loads/urls-db/chipdip-urls.txt"
OUTPUT_DIR="/opt/deep-agg/loads/urls-db/chunks"
CHUNK_SIZE=1000
FORMAT="json"

# Создаем скрипт для выполнения на сервере
cat > remote-process.sh << 'EOL'
#!/bin/bash
set -e

# Параметры
INPUT_FILE="$1"
OUTPUT_DIR="$2"
CHUNK_SIZE="$3"
FORMAT="$4"

# Проверяем существование файла
if [ ! -f "$INPUT_FILE" ]; then
  echo "Ошибка: файл $INPUT_FILE не существует"
  exit 1
fi

# Создаем выходную директорию
mkdir -p "$OUTPUT_DIR"

# Получаем размер файла
FILE_SIZE=$(stat -c%s "$INPUT_FILE")
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc)
echo "Размер файла: $FILE_SIZE_MB MB"

# Подсчитываем количество строк
echo "Подсчет строк в файле..."
TOTAL_LINES=$(wc -l < "$INPUT_FILE")
echo "Всего строк в файле: $TOTAL_LINES"

# Обрабатываем файл в зависимости от формата
if [ "$FORMAT" = "txt" ]; then
  echo "Разбиваем файл на чанки по $CHUNK_SIZE строк в формате TXT..."
  split -l "$CHUNK_SIZE" "$INPUT_FILE" "$OUTPUT_DIR/chipdip-chunk-" --numeric-suffixes=0 --suffix-length=3 -a 3

  # Добавляем расширение .txt к файлам
  for file in "$OUTPUT_DIR"/chipdip-chunk-*; do
    mv "$file" "$file.txt"
  done

  echo "Создано $(ls "$OUTPUT_DIR"/chipdip-chunk-*.txt | wc -l) чанков в формате TXT"
elif [ "$FORMAT" = "json" ]; then
  echo "Разбиваем файл на чанки по $CHUNK_SIZE строк в формате JSON..."

  # Создаем временный скрипт для конвертации в JSON
  cat > /tmp/convert-to-json.js << 'EOF'
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

// Функция для извлечения ID продукта из URL
function extractProductId(url) {
  const match = url.match(/\/product0?\/([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

// Функция для создания хеша URL
function createUrlHash(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

async function processChunk(inputFile, outputFile, startLine, endLine) {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const products = [];
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;

    if (lineNumber < startLine) continue;
    if (lineNumber > endLine) break;

    const url = line.trim();

    if (url && url.includes('chipdip.ru')) {
      const id = extractProductId(url);

      if (id) {
        products.push({
          url,
          id,
          hash: createUrlHash(url),
          timestamp: Date.now()
        });
      }
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
  return products.length;
}

// Получаем аргументы
const inputFile = process.argv[2];
const outputFile = process.argv[3];
const startLine = parseInt(process.argv[4], 10);
const endLine = parseInt(process.argv[5], 10);

processChunk(inputFile, outputFile, startLine, endLine)
  .then(count => console.log(`Обработано ${count} URL, записано в ${outputFile}`))
  .catch(error => {
    console.error('Ошибка:', error);
    process.exit(1);
  });
EOF

  # Разбиваем файл на чанки
  CHUNK_COUNT=$(( (TOTAL_LINES + CHUNK_SIZE - 1) / CHUNK_SIZE ))

  for (( i=0; i<CHUNK_COUNT; i++ )); do
    START_LINE=$(( i * CHUNK_SIZE + 1 ))
    END_LINE=$(( (i + 1) * CHUNK_SIZE ))

    if [ $END_LINE -gt $TOTAL_LINES ]; then
      END_LINE=$TOTAL_LINES
    fi

    CHUNK_FILE="$OUTPUT_DIR/chipdip-chunk-$(printf "%03d" $i).json"
    echo "Обработка чанка $i ($START_LINE-$END_LINE)..."

    node /tmp/convert-to-json.js "$INPUT_FILE" "$CHUNK_FILE" $START_LINE $END_LINE
  done

  # Создаем индексный файл
  cat > "$OUTPUT_DIR/index.json" << EOF
{
  "totalChunks": $CHUNK_COUNT,
  "totalUrls": $TOTAL_LINES,
  "chunkSize": $CHUNK_SIZE,
  "format": "json",
  "timestamp": $(date +%s000)
}
EOF

  echo "Создано $CHUNK_COUNT чанков в формате JSON"
  echo "Создан индексный файл: $OUTPUT_DIR/index.json"

  # Удаляем временный скрипт
  rm /tmp/convert-to-json.js
elif [ "$FORMAT" = "sqlite" ]; then
  echo "Создаем SQLite базу данных..."

  # Создаем базу данных
  DB_FILE="$OUTPUT_DIR/chipdip-urls.db"

  # Удаляем существующую базу, если она есть
  if [ -f "$DB_FILE" ]; then
    rm "$DB_FILE"
  fi

  # Создаем схему базы данных
  sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE IF NOT EXISTS chipdip_urls (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chipdip_urls_hash ON chipdip_urls(hash);
EOF

  # Создаем временный скрипт для импорта в SQLite
  cat > /tmp/import-to-sqlite.js << 'EOF'
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Функция для извлечения ID продукта из URL
function extractProductId(url) {
  const match = url.match(/\/product0?\/([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

// Функция для создания хеша URL
function createUrlHash(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

// Функция для экранирования строки для SQLite
function escapeSqlite(str) {
  return str.replace(/'/g, "''");
}

async function importToSqlite(inputFile, dbFile, batchSize) {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch = [];
  let totalProcessed = 0;
  let batchNumber = 0;

  for await (const line of rl) {
    const url = line.trim();

    if (url && url.includes('chipdip.ru')) {
      const id = extractProductId(url);

      if (id) {
        const hash = createUrlHash(url);
        const timestamp = Date.now();

        batch.push(`INSERT OR REPLACE INTO chipdip_urls (id, url, hash, timestamp) VALUES ('${id}', '${escapeSqlite(url)}', '${hash}', ${timestamp})`);
        totalProcessed++;

        if (batch.length >= batchSize) {
          await executeSqlBatch(dbFile, batch);
          console.log(`Обработано ${totalProcessed} URL (батч ${++batchNumber})`);
          batch = [];
        }
      }
    }
  }

  // Обрабатываем оставшиеся URL
  if (batch.length > 0) {
    await executeSqlBatch(dbFile, batch);
    console.log(`Обработано ${totalProcessed} URL (батч ${++batchNumber})`);
  }

  return totalProcessed;
}

async function executeSqlBatch(dbFile, statements) {
  return new Promise((resolve, reject) => {
    const sqlite = spawn('sqlite3', [dbFile]);

    sqlite.stdin.write('BEGIN TRANSACTION;\n');

    for (const statement of statements) {
      sqlite.stdin.write(statement + ';\n');
    }

    sqlite.stdin.write('COMMIT;\n');
    sqlite.stdin.end();

    let stderr = '';

    sqlite.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    sqlite.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`SQLite завершился с кодом ${code}: ${stderr}`));
      }
    });
  });
}

// Получаем аргументы
const inputFile = process.argv[2];
const dbFile = process.argv[3];
const batchSize = parseInt(process.argv[4], 10) || 1000;

importToSqlite(inputFile, dbFile, batchSize)
  .then(count => console.log(`Всего обработано ${count} URL, записано в ${dbFile}`))
  .catch(error => {
    console.error('Ошибка:', error);
    process.exit(1);
  });
EOF

  # Импортируем данные в SQLite
  echo "Импорт данных в SQLite..."
  node /tmp/import-to-sqlite.js "$INPUT_FILE" "$DB_FILE" 5000

  # Оптимизируем базу данных
  echo "Оптимизация базы данных..."
  sqlite3 "$DB_FILE" "VACUUM;"

  # Выводим информацию о базе данных
  echo "Информация о базе данных:"
  sqlite3 "$DB_FILE" "SELECT COUNT(*) AS total_urls FROM chipdip_urls;"

  # Удаляем временный скрипт
  rm /tmp/import-to-sqlite.js

  echo "База данных создана: $DB_FILE"
else
  echo "Ошибка: неподдерживаемый формат: $FORMAT"
  exit 1
fi

echo "Обработка завершена!"
EOL

# Копируем скрипт на сервер
sshpass -p "$PASSWORD" scp remote-process.sh $USER@$SERVER:/tmp/
sshpass -p "$PASSWORD" ssh $USER@$SERVER "chmod +x /tmp/remote-process.sh && /tmp/remote-process.sh '$INPUT_FILE' '$OUTPUT_DIR' '$CHUNK_SIZE' '$FORMAT'"

# Удаляем временный скрипт
rm remote-process.sh

echo "Обработка файла на сервере завершена!"
