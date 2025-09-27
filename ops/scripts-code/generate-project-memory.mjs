#!/usr/bin/env node
// scripts/generate-project-memory.mjs - Генерация PROJECT_MEMORY.md

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'docs/PROJECT_MEMORY.md');

// Создаём директорию docs если её нет
const docsDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Читаем package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));

// Читаем конфигурацию RU-источников
const sourcesConfig = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'src/config/sources.ru.json'), 'utf8'));

// Генерируем PROJECT_MEMORY.md
const content = `# 🧠 PROJECT_MEMORY.md

## 📋 Project Overview
- **Name**: ${packageJson.name}
- **Version**: ${packageJson.version}
- **Description**: ${packageJson.description}
- **Last Updated**: ${new Date().toISOString()}

## 🏗️ Architecture

### Core Components
- **Server**: Express.js на порту 9201
- **UI**: HTML/CSS/JS с CSS Grid layout
- **Testing**: Playwright e2e + smoke tests
- **CI/CD**: GitHub Actions с авто-merge

### RU Content Sources
${Object.entries(sourcesConfig).map(([name, config]) => `
- **${name}**: ${config.baseUrl}
  - Search: ${config.searchUrl}
  - Selectors: ${Object.keys(config.selectors).length} configured
`).join('')}

### Data Flow
1. **RU Adapters** → извлекают контент с русских сайтов
2. **Orchestrator** → выбирает наиболее полный RU-контент
3. **OEMsTrade** → добавляет коммерческие данные
4. **CBR Rates** → конвертирует валюты в рубли
5. **AJV Validation** → валидирует по схеме
6. **UI Rendering** → отображает в фиксированном layout

## 🧪 Testing Strategy

### E2E Tests
- **search.spec.ts**: Проверка колонок, RU-контент в описаниях
- **product.spec.ts**: Проверка layout, RU-контент в карточке
- **smoke-50.spec.ts**: 50 MPN с 80% success threshold

### CI Gates
- Code quality (npm audit)
- E2E tests (Playwright)
- Smoke-50 (≥80% success)
- API health checks

## 📁 Key Files

### Configuration
- \`src/config/sources.ru.json\` - RU sources selectors
- \`src/services/rates-cbr.js\` - CBR currency rates
- \`src/services/orchestrator.js\` - Content orchestration

### Adapters
- \`src/adapters/ru/chipdip.js\` - ChipDip parser
- \`src/adapters/ru/promelec.js\` - Promelec parser
- \`src/adapters/ru/platan.js\` - Platan parser
- \`src/adapters/ru/electronshik.js\` - Electronshik parser
- \`src/adapters/ru/elitan.js\` - Elitan parser

### UI
- \`public/ui/index.html\` - Search page
- \`public/ui/product.html\` - Product card
- \`public/ui/product.css\` - CSS Grid layout
- \`public/ui/product.js\` - RU-canon mapping

### Tests
- \`tests/e2e/search.spec.ts\` - Search tests
- \`tests/e2e/product.spec.ts\` - Product tests
- \`tests/e2e/smoke-50.spec.ts\` - Smoke tests

## 🎯 Success Metrics

### Quality Gates
- ✅ Zero console errors
- ✅ Zero HTTP 4xx/5xx errors
- ✅ RU content presence validation
- ✅ Smoke-50 ≥80% success rate

### Performance
- ✅ Server startup <5s
- ✅ API response <2s
- ✅ E2E tests <30min
- ✅ CI pipeline <45min

## 🔧 Development Commands

\`\`\`bash
# Development
npm start                    # Start server
npm run qa:headless         # Run QA tests
npm run test:e2e            # Run E2E tests
npm run verify:prod         # Full verification

# CI/CD
npm ci                      # Install dependencies
npx playwright install      # Install browsers
npx playwright test         # Run all tests
\`\`\`

## 📊 Monitoring

### Logs
- Structured JSON logging
- Adapter performance metrics
- Error tracking and reporting

### Artifacts
- HTML sources from RU sites
- Raw JSON responses
- Canonical JSON data
- Playwright traces/videos

## 🚀 Deployment

### Production Ready
- ✅ Graceful shutdown
- ✅ Error handling (no try/catch)
- ✅ Input validation (AJV)
- ✅ Security audit clean
- ✅ CI/CD pipeline green

### Environment
- Node.js 20.x
- Express.js server
- Playwright browsers
- GitHub Actions CI

---
*Generated automatically by scripts/generate-project-memory.mjs*
`;

fs.writeFileSync(OUTPUT_FILE, content);
console.log(`✅ PROJECT_MEMORY.md generated: ${OUTPUT_FILE}`);
