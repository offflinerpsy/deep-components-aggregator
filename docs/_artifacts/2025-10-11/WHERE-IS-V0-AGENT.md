# ГДЕ НАЙТИ V0 АГЕНТА В VS CODE

**Статус**: GitHub Copilot Chat 0.32.0 ПОДДЕРЖИВАЕТ MCP ✅  
**Конфиг**: chat.mcp.servers настроен ✅  
**API Key**: V0_API_KEY экспортирован ✅

---

## 🔍 ГДЕ ИСКАТЬ V0 АГЕНТА

### 1️⃣ **В Copilot Chat Panel**

**Открой Copilot Chat:**
- Нажми **Cmd+I** (или Ctrl+I)
- Или кликни иконку чата в боковой панели

**В чате ищи:**
- В поле ввода набери `@` — должен появиться список агентов
- Среди них должен быть `@v0`

**Если `@v0` НЕТ** — читай дальше ⬇️

---

### 2️⃣ **Проверь MCP Tools в Output**

**Открой Output panel:**
```
View > Output (Cmd+Shift+U / Ctrl+Shift+U)
```

**В выпадающем списке выбери:**
- "GitHub Copilot"
- Или "GitHub Copilot Chat"
- Или "MCP"

**Что искать:**
```
[MCP] Starting server: v0
[MCP] Server v0 connected
```

**Если видишь ошибки:**
```
[MCP] Server v0 failed to start
[MCP] Error: npx command not found
```

---

### 3️⃣ **Проверь Developer Tools**

**Открой DevTools:**
```
Help > Toggle Developer Tools
```

**В Console:**
- Фильтр: `mcp` или `v0`
- Ищи логи подключения к MCP серверу

---

## 🐛 TROUBLESHOOTING

### Проблема 1: "npx not found в VS Code terminal"

VS Code может запускать MCP сервер в **отдельном процессе** с чистым окружением.

**Решение:**
```bash
# Установить mcp-remote глобально
npm install -g mcp-remote

# Проверить
which mcp-remote
# Должно показать: /usr/local/bin/mcp-remote или /usr/bin/mcp-remote
```

**Обновить конфиг на абсолютный путь:**
```json
{
  "chat.mcp.servers": {
    "v0": {
      "command": "/usr/bin/npx",  // абсолютный путь!
      "args": [
        "mcp-remote",
        "https://mcp.v0.dev",
        "--header",
        "Authorization: Bearer v1:K9pGKBuEBv92LouvTaPFUtD1:Yi3vArR73im0UPTot76FLvEs"
      ]
    }
  }
}
```

---

### Проблема 2: "V0_API_KEY не подставляется"

VS Code может не подставлять переменные окружения в MCP конфиге.

**Решение: Хардкод API ключ в конфиге:**
```json
{
  "chat.mcp.servers": {
    "v0": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.v0.dev",
        "--header",
        "Authorization: Bearer v1:K9pGKBuEBv92LouvTaPFUtD1:Yi3vArR73im0UPTot76FLvEs"
      ]
    }
  }
}
```

⚠️ **ВНИМАНИЕ**: Не коммить .vscode/settings.json с API ключом в git!

---

### Проблема 3: "MCP сервер не стартует"

**Проверь вручную:**
```bash
export PATH=/usr/local/bin:/usr/bin:/bin
export V0_API_KEY="v1:K9pGKBuEBv92LouvTaPFUtD1:Yi3vArR73im0UPTot76FLvEs"

npx mcp-remote https://mcp.v0.dev \
  --header "Authorization: Bearer ${V0_API_KEY}"
```

**Должно подключиться без ошибок.**

Если видишь:
```
Ok to proceed? (y)
```
Нажми `y` — установится mcp-remote пакет.

---

### Проблема 4: "Firewall блокирует mcp.v0.dev"

**Проверь соединение:**
```bash
curl -I https://mcp.v0.dev
```

**Должно вернуть:**
```
HTTP/2 200
```

**Если timeout** — проверь firewall/proxy.

---

## 🎯 ФИНАЛЬНОЕ РЕШЕНИЕ

Если v0 **ТАК И НЕ ПОЯВИЛСЯ** после всех попыток:

### Используй v0-sdk напрямую (УЖЕ РАБОТАЕТ!)

```bash
# Генерация компонента
node scripts/test-v0-integration.mjs

# Результат:
# Chat ID: rxkJ7yG7pLk
# Demo: https://v0.app/chat/rxkJ7yG7pLk
```

**Создай удобный wrapper:**

```javascript
// scripts/v0-generate.mjs
import { createChat } from '../lib/v0-client.mjs';

const prompt = process.argv.slice(2).join(' ');
if (!prompt) {
  console.error('Usage: node scripts/v0-generate.mjs <prompt>');
  process.exit(1);
}

console.log(`🔨 Generating: ${prompt}`);
const chat = await createChat(prompt);

console.log('\n✅ Done!');
console.log(`🔗 Demo: ${chat.demo}`);
console.log(`💬 Chat: https://v0.app/chat/${chat.id}`);

if (chat.files) {
  console.log(`\n📁 Files: ${chat.files.length}`);
  chat.files.forEach((file, i) => {
    console.log(`  ${i+1}. ${file.name}`);
  });
}
```

**Использование:**
```bash
node scripts/v0-generate.mjs "Build a responsive navbar with dark mode"
```

---

## 📋 QUICK CHECKS

Пройди по списку:

```bash
# 1. V0_API_KEY экспортирован?
echo $V0_API_KEY
# ✅ Должно вывести ключ

# 2. npx доступен?
which npx
# ✅ Должно вывести /usr/bin/npx

# 3. mcp-remote работает?
npx mcp-remote --version
# ✅ Должно показать версию

# 4. v0-sdk работает?
node scripts/test-v0-integration.mjs
# ✅ Должно создать чат

# 5. Конфиг на месте?
cat ~/.vscode-server/data/Machine/settings.json | grep -A 10 "chat.mcp.servers"
# ✅ Должно показать v0 конфиг

# 6. VS Code перезагружен?
# Cmd+Shift+P > "Developer: Reload Window"
# ✅ Перезагрузить!
```

---

## 🚀 ЧТО ТОЧНО РАБОТАЕТ

✅ **v0-sdk** — работает 100%
✅ **API ключ** — валидный
✅ **Чат создаётся** — тест прошёл
✅ **Demo URL** — открывается

**Используй v0-sdk пока разбираешься с MCP!**

---

**TL;DR**: Если v0 не появился в Copilot Chat после перезагрузки — используй `node scripts/test-v0-integration.mjs` напрямую. Это работает 100%.
