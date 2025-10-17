// Static pages API endpoints

export function mountStaticPagesRoutes(app, db) {
  // GET /api/pages/:slug - Get a specific static page by slug
  app.get('/api/pages/:slug', (req, res) => {
    const { slug } = req.params;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid slug' });
    }

    const page = db
      .prepare('SELECT id, slug, title, content, meta_description, is_published, updated_at FROM static_pages WHERE slug = ? AND is_published = 1')
      .get(slug);

    if (!page) {
      return res.status(404).json({ ok: false, error: 'Page not found' });
    }

    return res.json({ ok: true, page });
  });

  // GET /api/static-pages - List all published static pages
  app.get('/api/static-pages', (req, res) => {
    const pages = db
      .prepare(`
        SELECT slug, title, position, sort_order, COALESCE(section, 'info') AS section
        FROM static_pages
        WHERE is_published = 1
        ORDER BY sort_order ASC, title ASC
      `)
      .all();

    return res.json({ ok: true, pages });
  });

  // GET /api/static-pages/header - List pages for header navigation
  app.get('/api/static-pages/header', (req, res) => {
    const pages = db
      .prepare(`
        SELECT slug, title, sort_order, COALESCE(section, 'info') AS section
        FROM static_pages
        WHERE is_published = 1 AND (position = 'header' OR position = 'both')
        ORDER BY sort_order ASC, title ASC
      `)
      .all();

    return res.json({ ok: true, pages });
  });

  // GET /api/static-pages/footer - List pages for footer navigation
  app.get('/api/static-pages/footer', (req, res) => {
    const pages = db
      .prepare(`
        SELECT slug, title, sort_order, COALESCE(section, 'info') AS section
        FROM static_pages
        WHERE is_published = 1 AND (position = 'footer' OR position = 'both')
        ORDER BY sort_order ASC, title ASC
      `)
      .all();

    return res.json({ ok: true, pages });
  });
}

export default { mountStaticPagesRoutes };
