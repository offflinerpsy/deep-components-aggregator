#!/usr/bin/env node
/**
 * Debug: check why keywords aren't matching
 */

import { readFileSync } from 'fs';

const TRANSCRIPT_PATH = 'docs/_artifacts/video/transcript.txt';

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

const content = readFileSync(TRANSCRIPT_PATH, 'utf-8');
const lines = content.split('\n').filter(Boolean);

console.log(`Total lines: ${lines.length}`);
console.log();

let matchCount = 0;
for (const line of lines) {
  const match = line.match(/^\[(\d+\.?\d*)-(\d+\.?\d*)\]\s*(.+)$/);
  if (!match) {
    console.log('Failed to parse:', line.substring(0, 50));
    continue;
  }

  const [, start, end, text] = match;
  const textLower = text.toLowerCase();

  for (const kw of ACTION_KEYWORDS) {
    if (textLower.includes(kw)) {
      matchCount++;
      console.log(`✓ [${start}s] "${kw}" → ${text.substring(0, 80)}...`);
      break; // Only count once per line
    }
  }
}

console.log();
console.log(`Matched ${matchCount} lines with action keywords`);
