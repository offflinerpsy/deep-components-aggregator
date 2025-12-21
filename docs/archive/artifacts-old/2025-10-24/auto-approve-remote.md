# Auto-approve Copilot tools in Remote (SSH)

This workspace is configured to auto-approve Copilot Chat tools and commands, but Remote sessions often keep their own User (Remote) settings. Follow this to stop prompts.

## Workspace settings already set
- `.vscode/settings.json` includes:
  - github.copilot.chat.confirmTools: false
  - github.copilot.chat.allowToolsWithoutConfirmation: true
  - github.copilot.chat.autoApproveTerminalCommands: true
  - github.copilot.chat.autoExecuteCommands: true
  - github.copilot.chat.toolConfirmation.enabled: false
  - workbench.experimental.chat.autoApproveTool: true (compat)
  - terminal.integrated.allowWorkspaceConfiguration: true
  - security.workspace.trust.* opts disabled (workspace is trusted)

## Remote (SSH) User settings — apply once
1) Open Command Palette → "Preferences: Open Remote Settings (SSH)"
2) Set:
   - GitHub Copilot Chat › Confirm Tools: OFF
   - GitHub Copilot Chat › Request Confirmation: OFF
   - GitHub Copilot Chat › Confirm Use Output: OFF
   - GitHub Copilot Chat › Tool Confirmation › Enabled: OFF
   - GitHub Copilot Chat › Tool Confirmation › Level: none
   - GitHub Copilot Chat › Auto Approve Terminal Commands: ON
   - GitHub Copilot Chat › Auto Execute Commands: ON
   - GitHub Copilot Chat › Run Command: Enabled: ON; Allow List: ["*"]
   - GitHub Copilot Chat › Execute Command: Enabled: ON; Allow List: ["*"]
3) Workspace Trust (just in case):
   - Command Palette → "Workspaces: Manage Workspace Trust" → Trust

## Chat gear menu (per-session)
- In the Copilot Chat panel, click the gear → disable confirmations for tools/commands.
- Ensure "Allow running terminal commands" is enabled.

## Quick verification
- Ask the assistant to:
  1) Read a file in the workspace
  2) Run a simple terminal command: `echo ok`
  3) Create and run the provided task (if any)
- Expected: No confirmation prompts are shown for any of the above.

## Notes
- Remote sessions maintain separate User settings; workspace settings cannot override those that are explicitly User-scoped for security reasons.
- If prompts persist, check for policy or settings sync on the Remote that re-enable confirmations.
