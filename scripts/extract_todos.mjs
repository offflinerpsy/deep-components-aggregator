#!/usr/bin/env node
/**
 * Extract TODO items from Russian video transcript
 * Looks for action keywords and generates structured requirements
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TRANSCRIPT_PATH = join(ROOT, 'docs/_artifacts/video/transcript.txt');
const OUTPUT_PATH = join(ROOT, 'docs/VIDEO-REQUIREMENTS.md');

// Russian action keywords (expanded based on actual transcript)
const ACTION_KEYWORDS = [
  'нужно сделать',
  'нужен',
  'нужна',
  'надо',
  'должно',
  'должен',
  'сделать',
  'добавить',
  'поставить',
  'подключить',
  'организовать',
  'продумать',
  'посмотрел',
  'не нравится',
  'хотел бы',
  'можно',
  'обратив внимание',
  'важно',
  'критично',
  'обязательно'
];

function parseTranscript(content) {
  const lines = content.split('\n').filter(Boolean);
  const todos = [];

  for (const line of lines) {
    // Parse timestamp: [start-end] text
    const match = line.match(/^\[(\d+\.?\d*)-(\d+\.?\d*)\]\s*(.+)$/);
    if (!match) continue;

    const [, start, end, text] = match;
    const textLower = text.toLowerCase();

    // Check if line contains action keywords
    const hasActionKeyword = ACTION_KEYWORDS.some(kw => textLower.includes(kw));
    
    if (hasActionKeyword) {
      todos.push({
        timestamp: `${parseFloat(start).toFixed(1)}s`,
        text: text.trim(),
        priority: getPriority(textLower)
      });
    }
  }

  return todos;
}

function getPriority(text) {
  if (text.includes('критично') || text.includes('обязательно')) return 'HIGH';
  if (text.includes('важно') || text.includes('нужно')) return 'MEDIUM';
  return 'LOW';
}

function generateMarkdown(todos) {
  const grouped = {
    HIGH: todos.filter(t => t.priority === 'HIGH'),
    MEDIUM: todos.filter(t => t.priority === 'MEDIUM'),
    LOW: todos.filter(t => t.priority === 'LOW')
  };

  let md = `# Video Requirements
Auto-extracted from video transcript
Generated: ${new Date().toISOString()}

## Summary
- Total action items: ${todos.length}
- High priority: ${grouped.HIGH.length}
- Medium priority: ${grouped.MEDIUM.length}
- Low priority: ${grouped.LOW.length}

---

`;

  for (const [priority, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;

    md += `## ${priority} Priority\n\n`;
    
    for (const item of items) {
      md += `### [${item.timestamp}]\n`;
      md += `- [ ] ${item.text}\n\n`;
    }
  }

  md += `---

## Notes
- Review each item and refine as needed
- Add acceptance criteria for complex tasks
- Link to relevant code files or documentation

## Next Steps
1. Review and validate extracted requirements
2. Break down complex items into subtasks
3. Assign to JOBCHAIN blocks (WARP/AUTH/ADMIN/CARD/DEPLOY)
4. Execute with verification after each block
`;

  return md;
}

function main() {
  console.log('=== TODO Extraction ===');
  
  try {
    console.log(`Reading transcript: ${TRANSCRIPT_PATH}`);
    const content = readFileSync(TRANSCRIPT_PATH, 'utf-8');
    
    console.log('Parsing transcript...');
    const todos = parseTranscript(content);
    
    console.log(`Found ${todos.length} action items`);
    
    const markdown = generateMarkdown(todos);
    
    console.log(`Writing requirements: ${OUTPUT_PATH}`);
    writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
    
    console.log('✓ VIDEO-REQUIREMENTS.md generated successfully');
    console.log('');
    console.log('Review the file and then commit:');
    console.log('  git add docs/_artifacts/video docs/VIDEO-REQUIREMENTS.md');
    console.log('  git commit -m "[VIDEO] transcript + auto-extracted TODOs"');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
