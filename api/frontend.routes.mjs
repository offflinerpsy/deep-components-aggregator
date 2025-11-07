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

// Helper: render standalone page (no layout wrapper)
async function renderStandalonePage(pagePath, data = {}) {
  return ejs.renderFile(join(viewsPath, 'pages', pagePath), data);
}

// GET / - Home page
export function homeHandler() {
  return (req, res) => {
    renderStandalonePage('home.ejs', {
      title: 'Components Aggregator - Поиск электронных компонентов',
      description: 'Поиск электронных компонентов по всем источникам'
    })
      .then((html) => res.send(html))
      .catch((err) => {
        console.error('[EJS] home render failed:', err?.message || err);
        res.status(500).send('<h1>Ошибка рендеринга</h1>');
      });
  };
}

// GET /results - Search results
export function resultsHandler() {
  return (req, res) => {
    const query = req.query.q || '';

    if (!query) {
      return res.redirect('/');
    }

    renderStandalonePage('results.ejs', {
      title: `Поиск: ${query}`,
      description: `Результаты поиска: ${query}`,
      query
    })
      .then((html) => res.send(html))
      .catch((err) => {
        console.error('[EJS] results render failed:', err?.message || err);
        res.status(500).send('<h1>Ошибка рендеринга</h1>');
      });
  };
}

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

// Mount all frontend routes
export function mountFrontendRoutes(app, db) {
  app.get('/', homeHandler());
  app.get('/results', resultsHandler());
  app.get('/product/:mpn', productHandler(db));
  app.get('/page/:slug', staticPageHandler(db));
  
  // Catalog test page (standalone HTML)
  // GET /catalog-test - Catalog browser (EJS)
  app.get('/catalog-test', (req, res) => {
    renderStandalonePage('catalog.ejs', {
      title: 'Каталог Компонентов - ДИПОНИКА',
      description: 'DigiKey категории электронных компонентов'
    })
      .then((html) => res.send(html))
      .catch((err) => {
        console.error('[EJS] catalog render failed:', err?.message || err);
        res.status(500).send('<h1>Ошибка рендеринга</h1>');
      });
  });

  console.log('✅ Frontend routes mounted (EJS)');
}
