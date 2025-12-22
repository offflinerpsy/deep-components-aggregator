/**
 * Catalog API – DigiKey category tree navigation
 * 
 * Endpoints:
 * - GET /api/catalog/categories (root categories)
 * - GET /api/catalog/categories/:slug (subcategories or leaf info)
 * - GET /api/catalog/breadcrumb/:slug (navigation path)
 */

import Database from 'better-sqlite3';

const DB_PATH = './var/db/deepagg.sqlite';

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

/**
 * Get root categories
 */
export function listRootCategories(req, res) {
  const db = getDb();
  
  const categories = db.prepare(`
    SELECT id, name, slug, path, icon_url
    FROM catalog_categories
    WHERE is_root = 1
    ORDER BY name ASC
  `).all();

  res.json({
    ok: true,
    count: categories.length,
    categories,
  });
}

/**
 * Get category by slug
 * Returns either:
 * - List of subcategories (if not leaf)
 * - Category info with is_leaf flag (for search redirect)
 */
export function getCategoryBySlug(req, res) {
  const { slug } = req.params;
  const db = getDb();

  // Find category by slug
  const category = db.prepare(`
    SELECT id, name, slug, parent_id, path, is_root, is_leaf, icon_url
    FROM catalog_categories
    WHERE slug = ?
  `).get(slug);

  if (!category) {
    return res.status(404).json({
      ok: false,
      error: 'Category not found',
    });
  }

  // If leaf category – return info only (frontend will redirect to search)
  if (category.is_leaf) {
    return res.json({
      ok: true,
      category,
      subcategories: [],
    });
  }

  // Otherwise get subcategories
  const subcategories = db.prepare(`
    SELECT id, name, slug, path, is_leaf, icon_url
    FROM catalog_categories
    WHERE parent_id = ?
    ORDER BY name ASC
  `).all(category.id);

  res.json({
    ok: true,
    category,
    subcategories,
  });
}

/**
 * Get breadcrumb path from slug to root
 */
export function getBreadcrumb(req, res) {
  const { slug } = req.params;
  const db = getDb();

  const category = db.prepare(`
    SELECT id, name, slug, parent_id, path
    FROM catalog_categories
    WHERE slug = ?
  `).get(slug);

  if (!category) {
    return res.status(404).json({
      ok: false,
      error: 'Category not found',
    });
  }

  // Build breadcrumb by walking up parent chain
  const breadcrumb = [category];
  let currentParentId = category.parent_id;

  while (currentParentId) {
    const parent = db.prepare(`
      SELECT id, name, slug, parent_id
      FROM catalog_categories
      WHERE id = ?
    `).get(currentParentId);

    if (!parent) break;
    breadcrumb.unshift(parent);
    currentParentId = parent.parent_id;
  }

  res.json({
    ok: true,
    breadcrumb,
  });
}

/**
 * Mount routes
 */
export default function mountCatalogRoutes(app) {
  app.get('/api/catalog/categories', listRootCategories);
  app.get('/api/catalog/categories/:slug', getCategoryBySlug);
  app.get('/api/catalog/breadcrumb/:slug', getBreadcrumb);
}
