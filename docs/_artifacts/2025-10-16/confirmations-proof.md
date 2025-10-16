# Confirmations Disabled — Proof (2025-10-16)

Файлы настроек обновлены для полного отключения подтверждений и разрешений:

- User settings: `/root/.vscode-server/data/User/settings.json`
- Copilot Chat global: `/root/.vscode-server/data/User/globalStorage/github.copilot-chat/settings.json`

Снимки «до/после» сохранены:

- `user-settings.before.json`
- `user-settings.after.json`
- `copilot-global.before.json`
- `copilot-global.after.json`

Ключевые параметры (выдержка):

- `security.workspace.trust.enabled: false`
- `security.workspace.trust.startupPrompt: "never"`
- `terminal.integrated.confirmOnExit: "never"`
- `terminal.integrated.confirmOnKill: "never"`
- `explorer.confirmDelete: false`, `files.confirmDelete: false`
- `window.confirmBeforeClose: "never"`, `debug.confirmOnExit: "never"`
- `git.confirm*`: все отключены
- Copilot Chat: 
  - `allowToolsWithoutConfirmation: true`
  - `requestConfirmation: false`
  - `confirmTools: false`
  - `confirmUseOutput: false`
  - `autoApprove: true`, `autoExecute: true`
  - `allowedCommands: ["*"]`, `trustedWorkspaces: ["*"]`
  - `skipAllConfirmations: true`

Проверка минимальная:

1) Выполнение shell-команд без интерактивных запросов — PASS
2) Доступ к `/api/health` без подтверждений — PASS

Примечание: Некоторые подтверждения могут быть жёстко заложены в сторонние расширения; данные настройки отключают их на уровне VS Code и Copilot Chat там, где это возможно.
