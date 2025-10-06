import fs from 'node:fs';
import path from 'node:path';
import { create, insert, search } from '@orama/orama';

let db = null;

export const buildIndex = async () => false;

export const searchIndex = async (query, { limit = 50 } = {}) => {
  try {
    if (!db) {
      db = await create({
        schema: {
          id: 'string',
          mpn: 'string',
          brand: 'string',
          title: 'string',
          text: 'string'
        }
      });
    }

    const results = await search(db, {
      term: query,
      properties: ['mpn', 'brand', 'title', 'text'],
      limit
    });

    return {
      hits: results.hits.map(hit => ({
        ...hit.document,
        score: hit.score
      })),
      count: results.count
    };
  } catch (error) {
    console.error(`Ошибка при поиске "${query}":`, error.message);
    return { hits: [], count: 0 };
  }
};

export default { buildIndex, searchIndex };