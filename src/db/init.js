/**
 * Database initialization and seeding
 * Run: node src/db/init.js
 */

import {
  sequelize,
  AdminUser,
  Order,
  ApiHealth,
  ApiKey,
  StaticPage,
  ManualProduct,
  ProjectStat
} from './models.js'

async function initDatabase() {
  try {
    console.log('🔄 Connecting to database...')
    await sequelize.authenticate()
    console.log('✅ Database connection established')

    console.log('🔄 Syncing models...')
    // Используем { alter: false } чтобы не изменять существующие таблицы
    // Новые таблицы будут созданы автоматически
    await sequelize.sync({ force: false, alter: false })
    console.log('✅ All models synced')

    // Seed admin user
    const adminExists = await AdminUser.findOne({ where: { email: 'admin@deepagg.local' } })
    if (!adminExists) {
      console.log('🔄 Creating default admin user...')
      await AdminUser.create({
        email: 'admin@deepagg.local',
        password_hash: 'admin123', // Will be hashed by beforeCreate hook
        name: 'Admin',
        role: 'admin',
        is_active: true
      })
      console.log('✅ Admin user created: admin@deepagg.local / admin123')
    }

    // Seed API health records
    const services = ['digikey', 'mouser', 'farnell', 'tme']
    for (const service of services) {
      const exists = await ApiHealth.findOne({ where: { service } })
      if (!exists) {
        await ApiHealth.create({
          service,
          status: 'offline',
          last_check: new Date(),
          response_time_ms: null,
          success_rate_24h: 0
        })
        console.log(`✅ API health record created: ${service}`)
      }
    }

    // Seed static pages
    const pages = [
      {
        slug: 'about',
        title: 'О компании',
        content: '<p>Deep Components Aggregator — профессиональный поиск электронных компонентов.</p>',
        meta_description: 'О нашей компании и сервисе поиска компонентов',
        is_published: true,
        position: 'footer',
        sort_order: 1
      },
      {
        slug: 'contacts',
        title: 'Контакты',
        content: '<p>Email: info@deepagg.local<br>Телефон: +7 (xxx) xxx-xx-xx</p>',
        meta_description: 'Свяжитесь с нами',
        is_published: true,
        position: 'footer',
        sort_order: 2
      },
      {
        slug: 'delivery',
        title: 'Доставка',
        content: '<p>Доставка осуществляется по всей России через партнерские склады.</p>',
        meta_description: 'Условия доставки компонентов',
        is_published: true,
        position: 'footer',
        sort_order: 3
      },
      {
        slug: 'privacy',
        title: 'Политика конфиденциальности',
        content: '<p>Мы заботимся о защите ваших персональных данных.</p>',
        meta_description: 'Политика конфиденциальности',
        is_published: true,
        position: 'footer',
        sort_order: 4
      }
    ]

    for (const page of pages) {
      const exists = await StaticPage.findOne({ where: { slug: page.slug } })
      if (!exists) {
        await StaticPage.create(page)
        console.log(`✅ Static page created: ${page.slug}`)
      }
    }

    // Initialize today's stats
    const today = new Date().toISOString().split('T')[0]
    const todayStats = await ProjectStat.findOne({ where: { date: today } })
    if (!todayStats) {
      await ProjectStat.create({
        date: today,
        total_searches: 0,
        cache_hits: 0,
        live_searches: 0,
        total_orders: 0
      })
      console.log(`✅ Project stats initialized for ${today}`)
    }

    console.log('\n✅ Database initialization complete!')
    console.log('\n📊 Summary:')
    console.log(`   Admin users: ${await AdminUser.count()}`)
    console.log(`   API health records: ${await ApiHealth.count()}`)
    console.log(`   Static pages: ${await StaticPage.count()}`)
    console.log(`   Orders: ${await Order.count()}`)
    console.log(`   Manual products: ${await ManualProduct.count()}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initDatabase()
