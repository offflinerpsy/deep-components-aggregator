import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chipdipHtmlToCanon } from '../../adapters/chipdip/html-to-canon.js';

const productTestRouter = Router();

// Определяем пути для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

productTestRouter.get('/:mpn', async (req, res) => {
  try {
    // ВРЕМЕННО: читаем данные из локальной фикстуры, а не ходим в сеть
    const fixturePath = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'chipdip', 'product1.html');
    const html = readFileSync(fixturePath, 'utf8');
    const result = chipdipHtmlToCanon(html, 'https://www.chipdip.by/');

    if (result.ok) {
      res.status(200).json(result.doc);
    } else {
      res.status(404).json({ message: 'Не удалось обработать данные', reason: result.reason });
    }
  } catch (error) {
    console.error('Ошибка в роутере продукта:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера', error: error.message });
  }
});

export default productTestRouter;
