#!/usr/bin/env node
// Patch VS Code Remote (SSH/code-server) user/machine settings to auto-approve Copilot Chat tools/commands
// Safe: creates timestamped backups; idempotent merges; no try/catch per project rules — use guards and early returns

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

// Candidate settings locations for Remote server contexts
const candidates = [
  path.join(HOME, '.vscode-server', 'data', 'Machine', 'settings.json'), // VS Code Remote - SSH (machine)
  path.join(HOME, '.vscode-server', 'data', 'User', 'settings.json'),    // VS Code Remote - SSH (user)
  path.join(HOME, '.vscode-server-insiders', 'data', 'Machine', 'settings.json'),
  path.join(HOME, '.vscode-server-insiders', 'data', 'User', 'settings.json'),
  path.join(HOME, '.vscode-remote', 'data', 'Machine', 'settings.json'), // legacy
  path.join(HOME, '.local', 'share', 'code-server', 'User', 'settings.json'), // code-server
  path.join(HOME, '.config', 'Code', 'User', 'settings.json') // plain Code on remote (fallback)
];

const desired = {
  'github.copilot.chat.confirmTools': false,
  'github.copilot.chat.requestConfirmation': false,
  'github.copilot.chat.confirmUseOutput': false,
  'github.copilot.chat.toolConfirmation.enabled': false,
  'github.copilot.chat.toolConfirmation.level': 'none',
  'github.copilot.chat.allowToolsWithoutConfirmation': true,
  'github.copilot.chat.autoApproveTerminalCommands': true,
  'github.copilot.chat.autoExecuteCommands': true,
  'github.copilot.chat.runCommand.enabled': true,
  'github.copilot.chat.runCommand.allowList': ['*'],
  'github.copilot.chat.executeCommand.enabled': true,
  'github.copilot.chat.executeCommand.allowList': ['*'],
  'workbench.trustedDomains.prompt': false,
  'workbench.trustedDomains': ['*'],
  'security.workspace.trust.enabled': false,
  'security.promptForExternalProtocol': false,
  'terminal.integrated.enableMultiLinePasteWarning': 'never',
  'terminal.integrated.confirmOnExit': 'never',
  'terminal.integrated.confirmOnKill': 'never',
  // Allow ALL edits and ALL terminal commands (new schema)
  'chat.tools.confirmation.enabled': false,
  'chat.tools.edits.enableAutoApprove': true,
  'chat.tools.terminal.enableAutoApprove': true,
  'chat.tools.terminal.autoReplyToPrompts': true,
  'chat.tools.edits.autoApprove': { '**/*': true },
  'chat.tools.terminal.autoApprove': { '.*': true },
  // Global auto-approve (as of VS Code 1.104 / Copilot Chat 0.32.x)
  'chat.tools.global.autoApprove': true
};

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(p) {
  if (!fs.existsSync(p)) return {};
  const txt = fs.readFileSync(p, 'utf8');
  const trimmed = txt.trim();
  if (trimmed.length === 0) return {};
  const data = JSON.parse(trimmed);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data;
}

function backup(p) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${p}.bak.${ts}`;
  fs.copyFileSync(p, bak);
  return bak;
}

function mergeSettings(current, desiredMap) {
  const next = { ...current };
  let updated = 0;
  for (const [k, v] of Object.entries(desiredMap)) {
    const cur = next[k];
    const same = Array.isArray(v) ? Array.isArray(cur) && v.length === cur.length && v.every((vv, i) => vv === cur[i]) : cur === v;
    if (!same) {
      next[k] = v;
      updated += 1;
    }
  }
  return { next, updated };
}

const results = [];
let createdPrimary = false;

for (const p of candidates) {
  const exists = fs.existsSync(p);
  // Create primary VS Code Remote (SSH) machine settings if none of the candidates exist yet
  if (!exists && !createdPrimary) {
    // We'll prefer .vscode-server/data/Machine/settings.json as primary
    const primary = candidates[0];
    if (p !== primary) continue;
    ensureDir(primary);
    fs.writeFileSync(primary, '{}', 'utf8');
    createdPrimary = true;
  }

  if (!fs.existsSync(p)) continue;

  const before = readJsonSafe(p);
  const beforeKeys = Object.keys(before).length;
  const { next, updated } = mergeSettings(before, desired);
  if (updated > 0) {
    if (beforeKeys > 0) backup(p);
    fs.writeFileSync(p, JSON.stringify(next, null, 2) + '\n', 'utf8');
  }
  results.push({ path: p, existed: exists, beforeKeys, updated });
}

const summary = {
  ok: true,
  candidates,
  results,
  createdPrimary
};

process.stdout.write(JSON.stringify(summary, null, 2));
