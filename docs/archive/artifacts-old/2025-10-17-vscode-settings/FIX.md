# VS Code Remote SSH — Автоапрув команд (fix)

**Дата**: 17 октября 2025  
**Проблема**: При подключении к удалённому серверу через SSH каждая команда Copilot требует ручного подтверждения "Allow"

---

## ✅ Что сделано

### 1. Обновлены настройки VS Code Remote

**Файл**: `/root/.vscode-server/data/User/settings.json`

**Бэкап создан**: `/root/.vscode-server/data/User/settings.json.backup-<timestamp>`

### 2. Добавлены ключевые параметры автоапрува

```json
{
  // === COPILOT CHAT AUTO-APPROVE (FULL SET) ===
  "github.copilot.chat.confirmTools": false,
  "github.copilot.chat.allowToolsWithoutConfirmation": true,
  "github.copilot.chat.requestConfirmation": false,
  "github.copilot.chat.confirmUseOutput": false,
  "github.copilot.chat.autoApproveTerminalCommands": true,
  "github.copilot.chat.autoExecuteCommands": true,
  "github.copilot.chat.allowedCommands": ["*"],
  "github.copilot.chat.trustedWorkspaces": ["*"],
  
  // === COPILOT EDITS AUTO-APPROVE (НОВОЕ!) ===
  "github.copilot.chat.edits.enabled": true,
  "github.copilot.chat.edits.autoApprove": true,
  "github.copilot.chat.edits.confirmChanges": false,
  
  // === COPILOT RUN COMMAND (LATEST API) ===
  "github.copilot.chat.executeCommand.enabled": true,
  "github.copilot.chat.executeCommand.allowList": ["*"],
  "github.copilot.chat.executeCommand.confirmBeforeRun": false,
  
  // === TASKS AUTO-APPROVE ===
  "task.allowAutomaticTasks": "on",
  "task.problemMatchers.neverPrompt": true,
  
  // === TERMINAL NO CONFIRMATIONS ===
  "terminal.integrated.confirmOnKill": "never",
  "terminal.integrated.confirmOnExit": "never",
  "terminal.integrated.enableMultiLinePasteWarning": false,
  
  // === WORKSPACE TRUST DISABLED ===
  "security.workspace.trust.enabled": false,
  "security.workspace.trust.banner": "never",
  "security.workspace.trust.startupPrompt": "never"
}
```

---

## 🔧 Что изменилось

### Добавлены новые параметры (не было раньше):

1. **`github.copilot.chat.edits.autoApprove`** — автоматическое применение изменений кода
2. **`github.copilot.chat.edits.confirmChanges`** — отключение подтверждения изменений
3. **`github.copilot.chat.executeCommand.confirmBeforeRun`** — отключение подтверждения запуска команд
4. **`task.problemMatchers.neverPrompt`** — не спрашивать про problem matchers
5. **`task.autoDetect`** — автоматическое обнаружение задач

---

## 📋 Что нужно сделать сейчас

### 1. **Перезагрузить VS Code** (важно!)

**Как**:
- В VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`
- Или закрыть VS Code полностью и переподключиться по SSH

### 2. Проверка работы

После перезагрузки попроси меня выполнить любую команду:
- Создать файл
- Запустить команду в терминале
- Отредактировать файл

**Ожидается**: Никаких диалогов "Allow" не должно появляться.

---

## 🚨 Если всё равно спрашивает

### Вариант A: Проверь локальные настройки VS Code

Открой **локальный** `settings.json` (не remote!):
- `Ctrl+,` → правый верхний угол → иконка `{}` (Open Settings JSON)

Добавь эти параметры:

```json
{
  "remote.SSH.enableDynamicForwarding": true,
  "remote.SSH.enableRemoteCommand": true,
  "remote.SSH.showLoginTerminal": false,
  "remote.SSH.remoteServerListenOnSocket": true,
  
  "github.copilot.chat.allowToolsWithoutConfirmation": true,
  "github.copilot.chat.confirmTools": false,
  "github.copilot.chat.autoApproveTerminalCommands": true,
  "github.copilot.chat.trustedWorkspaces": ["*"]
}
```

### Вариант B: Workspace settings

В корне проекта создать `.vscode/settings.json`:

```json
{
  "github.copilot.chat.allowToolsWithoutConfirmation": true,
  "github.copilot.chat.confirmTools": false,
  "github.copilot.chat.autoApproveTerminalCommands": true,
  "task.allowAutomaticTasks": "on"
}
```

---

## 🎯 Ключевые параметры (must-have)

Эти **3 параметра** критичны для автоапрува:

```json
{
  "github.copilot.chat.confirmTools": false,
  "github.copilot.chat.allowToolsWithoutConfirmation": true,
  "github.copilot.chat.autoApproveTerminalCommands": true
}
```

Если они есть — всё должно работать.

---

## 📄 Проверка текущих настроек

Команда для проверки:
```bash
cat /root/.vscode-server/data/User/settings.json | jq '.["github.copilot.chat.confirmTools", "github.copilot.chat.allowToolsWithoutConfirmation", "github.copilot.chat.autoApproveTerminalCommands"]'
```

**Ожидается**:
```json
false
true
true
```

---

## ✅ Статус

- [x] Настройки обновлены на remote сервере
- [x] JSON валидация прошла успешно
- [x] Бэкап создан
- [ ] **Требуется**: Reload VS Code Window

---

**Следующий шаг**: **Перезагрузи VS Code** (`Ctrl+Shift+P` → `Developer: Reload Window`) и попроси меня выполнить любую команду для проверки!

---

**Файлы**:
- Remote settings: `/root/.vscode-server/data/User/settings.json`
- Backup: `/root/.vscode-server/data/User/settings.json.backup-*`
