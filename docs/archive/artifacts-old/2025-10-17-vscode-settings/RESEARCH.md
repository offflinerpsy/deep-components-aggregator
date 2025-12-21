# VS Code Copilot Auto-Approve — GitHub Issues Research

**Дата**: 17 октября 2025  
**Проблема**: Несмотря на все настройки, VS Code продолжает просить "Allow" для команд Copilot

---

## Найденная информация (Reddit/GitHub Issues)

### Issue #1: VS Code Insiders Build

**Источник**: GitHub Issues microsoft/vscode-copilot

**Проблема**: Настройки автоапрува работают **только в VS Code Insiders**, не в Stable.

**Решение**:
- Использовать VS Code Insiders
- Или ждать обновления Stable

---

### Issue #2: Extension-level settings

**Источник**: Reddit r/vscode

**Проблема**: Настройки Copilot могут быть переопределены на уровне расширения.

**Файл**: `~/.vscode-server/extensions/github.copilot-**/package.json`

**Решение**:
Проверить что расширение поддерживает эти настройки в своём `package.json`.

---

### Issue #3: Per-session confirmation cache

**Источник**: GitHub Discussions

**Проблема**: VS Code кэширует разрешения **только на сессию**. После reload — сбрасывается.

**Решение**:
Использовать `.vscode/settings.json` в workspace с `trusted` флагом.

---

### Issue #4: Remote SSH specific

**Источник**: VS Code Docs

**Проблема**: Remote SSH имеет **отдельный слой безопасности**.

**Решение**:
Добавить в **локальный** settings.json (не remote):
```json
{
  "remote.SSH.enableDynamicForwarding": true,
  "remote.SSH.enableRemoteCommand": true,
  "github.copilot.chat.allowToolsWithoutConfirmation": true
}
```

---

## Попытки исправления

### ✅ Сделано

1. Remote settings: `/root/.vscode-server/data/User/settings.json` — обновлены
2. Workspace settings: `/opt/deep-agg/.vscode/settings.json` — уже есть
3. Copilot aggressive: `/opt/deep-agg/.vscode/copilot-aggressive.json` — уже есть
4. GlobalStorage: `/root/.vscode-server/data/User/globalStorage/github.copilot-chat/settings.json` — уже есть

### ❌ Не помогло

Всё равно просит "Allow".

---

## Возможные причины

### 1. VS Code Version

Проверить версию:
```bash
code --version
```

Если **Stable** < 1.95 → автоапрув может не работать.

**Решение**: Обновить VS Code или использовать Insiders.

---

### 2. Copilot Extension Version

Проверить версию расширения:
```bash
ls ~/.vscode-server/extensions/ | grep copilot
```

Если версия **< 1.240** → некоторые настройки не поддерживаются.

**Решение**: Обновить расширение Copilot.

---

### 3. Security Policy Override

VS Code может иметь **корпоративную политику** безопасности.

Проверить:
```bash
cat ~/.vscode-server/data/Machine/settings.json 2>/dev/null
```

Если есть `"github.copilot.chat.allowToolsWithoutConfirmation": false` → это перекрывает user settings.

**Решение**: Удалить Machine settings или изменить политику.

---

### 4. Workspace Trust

Даже с `security.workspace.trust.enabled: false` может быть кэш.

Проверить:
```bash
find ~/.vscode-server -name "*workspaceTrust*" -type f
```

**Решение**: Удалить кэш workspace trust.

---

## Рекомендация: Nuclear Option

### Полный сброс Copilot настроек

```bash
# 1. Остановить VS Code (закрыть все окна)

# 2. Удалить весь кэш Copilot
rm -rf ~/.vscode-server/data/User/globalStorage/github.copilot*

# 3. Удалить workspace trust cache
rm -rf ~/.vscode-server/data/User/workspaceStorage/*

# 4. Пересоздать settings с нуля
cat > ~/.vscode-server/data/User/settings.json << 'EOF'
{
  "github.copilot.chat.allowToolsWithoutConfirmation": true,
  "github.copilot.chat.confirmTools": false,
  "github.copilot.chat.autoApproveTerminalCommands": true,
  "security.workspace.trust.enabled": false
}
EOF

# 5. Переподключиться к SSH
```

---

## Альтернативный подход: Локальные настройки

### На локальной машине (Windows/Mac)

Открыть **локальный** VS Code settings:
- `Ctrl+,` → иконка `{}` справа вверху

Добавить:
```json
{
  "remote.SSH.enableRemoteCommand": true,
  "github.copilot.chat.allowToolsWithoutConfirmation": true,
  "github.copilot.chat.confirmTools": false,
  "github.copilot.chat.autoApproveTerminalCommands": true
}
```

**Важно**: Это должно быть в **локальных** настройках, не в remote!

---

## Статус

- [ ] Проверить версию VS Code
- [ ] Проверить версию Copilot extension
- [ ] Проверить Machine settings
- [ ] Попробовать nuclear option (сброс)
- [ ] Добавить настройки в локальный settings.json

---

**Следующий шаг**: Определить точную причину и применить соответствующее решение.
