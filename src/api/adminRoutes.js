/**
 * API route handlers for AdminJS integration
 * Add these routes to server.js
 */

// Static pages API for frontend
export async function getStaticPages(req, res) {
  try {
    const { StaticPage } = await import('./db/models.js')
    
    const position = req.query.position // 'header', 'footer', 'both'
    
    const where = { is_published: true }
    if (position) {
      where.position = [position, 'both']
    }
    
    const pages = await StaticPage.findAll({
      where,
      order: [['sort_order', 'ASC']],
      attributes: ['slug', 'title', 'position', 'meta_description']
    })
    
    res.json(pages)
  } catch (error) {
    console.error('Failed to fetch static pages:', error)
    res.status(500).json({ error: 'Failed to fetch pages' })
  }
}

// Get single static page by slug
export async function getStaticPageBySlug(req, res) {
  try {
    const { StaticPage } = await import('./db/models.js')
    const { slug } = req.params
    
    const page = await StaticPage.findOne({
      where: { slug, is_published: true }
    })
    
    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }
    
    res.json(page)
  } catch (error) {
    console.error('Failed to fetch static page:', error)
    res.status(500).json({ error: 'Failed to fetch page' })
  }
}

// Create order endpoint
export async function createOrder(req, res) {
  try {
    const { Order, ProjectStat } = await import('./db/models.js')
    const {
      client_name,
      client_email,
      client_phone,
      client_address,
      items, // Array of { mpn, manufacturer, quantity, price, dealer_links }
      total_price,
      currency = 'RUB'
    } = req.body
    
    // Validation
    if (!client_name || !client_email || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // Create order
    const order = await Order.create({
      order_number: orderNumber,
      client_name,
      client_email,
      client_phone,
      client_address,
      items,
      total_price,
      currency,
      status: 'new'
    })
    
    // Update today's stats
    const today = new Date().toISOString().split('T')[0]
    const [stats] = await ProjectStat.findOrCreate({
      where: { date: today },
      defaults: {
        total_searches: 0,
        cache_hits: 0,
        live_searches: 0,
        total_orders: 0
      }
    })
    await stats.increment('total_orders')
    
    res.json({
      success: true,
      order_number: orderNumber,
      order_id: order.id
    })
  } catch (error) {
    console.error('Failed to create order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
}

// Update project stats (call this from search handlers)
export async function incrementSearchStats(isCache = false) {
  try {
    const { ProjectStat } = await import('./db/models.js')
    const today = new Date().toISOString().split('T')[0]
    
    const [stats] = await ProjectStat.findOrCreate({
      where: { date: today },
      defaults: {
        total_searches: 0,
        cache_hits: 0,
        live_searches: 0,
        total_orders: 0
      }
    })
    
    await stats.increment('total_searches')
    if (isCache) {
      await stats.increment('cache_hits')
    } else {
      await stats.increment('live_searches')
    }
  } catch (error) {
    console.error('Failed to update search stats:', error)
  }
}

// Update API health (call this from API parsers)
export async function updateApiHealth(service, isSuccess, responseTimeMs = null, errorMessage = null) {
  try {
    const { ApiHealth } = await import('./db/models.js')
    
    const status = isSuccess ? 'online' : 'offline'
    
    await ApiHealth.upsert({
      service,
      status,
      last_check: new Date(),
      response_time_ms: responseTimeMs,
      error_message: errorMessage
    })
  } catch (error) {
    console.error('Failed to update API health:', error)
  }
}
