// api/frontend.routes.mjs
// Frontend HTML routes (замена Next.js)

import ejs from 'ejs';
import { join } from 'node:path';

const viewsPath = join(process.cwd(), 'views');
const layoutPath = join(viewsPath, 'layouts/main.ejs');

// Helper: render page with layout
async function renderPage(pagePath, data = {}) {
  const pageContent = await ejs.renderFile(join(viewsPath, 'pages', pagePath), data);
  return ejs.renderFile(layoutPath, { ...data, body: pageContent });
}

// Standalone rendering removed - migrated to Next.js

// Home removed - migrated to Next.js /

// Results removed - migrated to Next.js /results

// GET /product/:mpn - Product page
export function productHandler(_db) {
  return (req, res) => {
    const mpn = decodeURIComponent(req.params.mpn);

    renderPage('product.ejs', {
      title: `${mpn} - Components Aggregator`,
      description: `Электронный компонент ${mpn}`,
      mpn
    })
      .then((html) => res.send(html))
      .catch((err) => {
        console.error('[EJS] product render failed:', err?.message || err);
        res.status(500).send('<h1>Ошибка рендеринга</h1>');
      });
  };
}
// GET /page/:slug - Static CMS page
export function staticPageHandler(db) {
  return (req, res) => {
    const slug = req.params.slug;

    const page = db.prepare(`
      SELECT * FROM static_pages
      WHERE slug = ? AND is_published = 1
    `).get(slug);

    if (!page) {
      return res.status(404).send('<h1>Страница не найдена</h1>');
    }

    renderPage('static-page.ejs', {
      title: page.title,
      description: page.meta_description,
      page
    })
      .then((html) => res.send(html))
      .catch((err) => {
        console.error('[EJS] static page render failed:', err?.message || err);
        res.status(500).send('<h1>Ошибка рендеринга</h1>');
      });
  };
}

// Mount remaining frontend routes (/, /results, /catalog → Next.js)
export function mountFrontendRoutes(app, db) {
  app.get('/product/:mpn', productHandler(db));
  app.get('/page/:slug', staticPageHandler(db));
  
  console.log('✅ Frontend routes mounted (Express legacy only)');
  console.log('ℹ️  Main routes (/, /results, /catalog) served by Next.js:3000');
}
