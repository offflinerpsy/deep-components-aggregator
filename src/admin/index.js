/**
 * AdminJS configuration and setup
 */

const AdminJS = require('adminjs')
const AdminJSExpress = require('@adminjs/express')
const AdminJSSequelize = require('@adminjs/sequelize')
const session = require('express-session')

const {
  sequelize,
  AdminUser,
  Order,
  ApiHealth,
  ApiKey,
  StaticPage,
  ManualProduct,
  ProjectStat
} = require('../db/models')

// Register Sequelize adapter
AdminJS.registerAdapter({
  Resource: AdminJSSequelize.Resource,
  Database: AdminJSSequelize.Database
})

// AdminJS configuration
const adminOptions = {
  resources: [
    {
      resource: Order,
      options: {
        navigation: { name: 'Управление', icon: 'ShoppingCart' },
        listProperties: ['id', 'customer_name', 'mpn', 'manufacturer', 'qty', 'status', 'created_at'],
        showProperties: ['id', 'customer_name', 'customer_contact', 'mpn', 'manufacturer', 'qty', 'pricing_snapshot', 'dealer_links', 'status', 'meta', 'created_at', 'updated_at'],
        editProperties: ['status', 'meta'],
        filterProperties: ['customer_contact', 'mpn', 'manufacturer', 'status'],
        sort: {
          sortBy: 'created_at',
          direction: 'desc'
        },
        properties: {
          id: {
            isTitle: true
          },
          customer_name: {
            type: 'string'
          },
          customer_contact: {
            type: 'string',
            isTitle: false
          },
          mpn: {
            type: 'string'
          },
          manufacturer: {
            type: 'string'
          },
          qty: {
            type: 'number'
          },
          pricing_snapshot: {
            type: 'mixed',
            isVisible: { list: false, show: true, edit: false, filter: false }
          },
          dealer_links: {
            type: 'mixed',
            isVisible: { list: false, show: true, edit: false, filter: false }
          },
          meta: {
            type: 'mixed',
            isVisible: { list: false, show: true, edit: true, filter: false }
          },
          status: {
            availableValues: [
              { value: 'pending', label: 'Ожидает' },
              { value: 'processing', label: 'В обработке' },
              { value: 'completed', label: 'Выполнен' },
              { value: 'cancelled', label: 'Отменён' }
            ]
          }
        }
      }
    },
    {
      resource: ApiHealth,
      options: {
        navigation: { name: 'Система', icon: 'Activity' },
        listProperties: ['service', 'status', 'last_check', 'response_time_ms', 'success_rate_24h'],
        showProperties: ['service', 'status', 'last_check', 'response_time_ms', 'success_rate_24h', 'error_message'],
        editProperties: ['service', 'status'],
        actions: {
          new: { isVisible: false },
          delete: { isVisible: false }
        },
        properties: {
          service: {
            availableValues: [
              { value: 'digikey', label: 'DigiKey' },
              { value: 'mouser', label: 'Mouser' },
              { value: 'farnell', label: 'Farnell' },
              { value: 'tme', label: 'TME' }
            ]
          },
          status: {
            availableValues: [
              { value: 'online', label: '🟢 Online' },
              { value: 'offline', label: '🔴 Offline' },
              { value: 'degraded', label: '🟡 Degraded' }
            ]
          }
        }
      }
    },
    {
      resource: ApiKey,
      options: {
        navigation: { name: 'Система', icon: 'Key' },
        listProperties: ['service', 'key_name', 'is_active', 'expires_at', 'last_used'],
        showProperties: ['service', 'key_name', 'key_value', 'is_active', 'expires_at', 'last_used'],
        editProperties: ['service', 'key_name', 'key_value', 'is_active', 'expires_at'],
        properties: {
          key_value: {
            type: 'password',
            isVisible: { list: false, filter: false, show: true, edit: true }
          },
          service: {
            availableValues: [
              { value: 'digikey', label: 'DigiKey' },
              { value: 'mouser', label: 'Mouser' },
              { value: 'farnell', label: 'Farnell' },
              { value: 'tme', label: 'TME' },
              { value: 'oemstrade', label: 'OEMstrade' }
            ]
          }
        }
      }
    },
    {
      resource: StaticPage,
      options: {
        navigation: { name: 'Контент', icon: 'FileText' },
        listProperties: ['title', 'slug', 'is_published', 'position', 'sort_order'],
        showProperties: ['title', 'slug', 'content', 'meta_description', 'is_published', 'position', 'sort_order', 'created_at', 'updated_at'],
        editProperties: ['title', 'slug', 'content', 'meta_description', 'is_published', 'position', 'sort_order'],
        properties: {
          content: {
            type: 'richtext'
          },
          position: {
            availableValues: [
              { value: 'header', label: 'Шапка' },
              { value: 'footer', label: 'Подвал' },
              { value: 'both', label: 'Шапка и подвал' }
            ]
          }
        }
      }
    },
    {
      resource: ManualProduct,
      options: {
        navigation: { name: 'Товары', icon: 'Package' },
        listProperties: ['mpn', 'manufacturer', 'price', 'stock', 'is_active', 'created_at'],
        showProperties: ['mpn', 'manufacturer', 'description', 'price', 'currency', 'region', 'stock', 'image_url', 'datasheet_url', 'is_active', 'category'],
        editProperties: ['mpn', 'manufacturer', 'description', 'price', 'currency', 'region', 'stock', 'image_url', 'datasheet_url', 'is_active', 'category'],
        sort: {
          sortBy: 'created_at',
          direction: 'desc'
        }
      }
    },
    {
      resource: ProjectStat,
      options: {
        navigation: { name: 'Статистика', icon: 'TrendingUp' },
        listProperties: ['date', 'total_searches', 'cache_hits', 'live_searches', 'total_orders', 'avg_response_time_ms'],
        actions: {
          new: { isVisible: false },
          edit: { isVisible: false },
          delete: { isVisible: false }
        },
        sort: {
          sortBy: 'date',
          direction: 'desc'
        }
      }
    },
    {
      resource: AdminUser,
      options: {
        navigation: { name: 'Система', icon: 'Users' },
        listProperties: ['email', 'name', 'role', 'is_active', 'created_at'],
        showProperties: ['email', 'name', 'role', 'is_active', 'created_at'],
        editProperties: ['email', 'name', 'password_hash', 'role', 'is_active'],
        properties: {
          password_hash: {
            type: 'password',
            isVisible: { list: false, filter: false, show: false, edit: true }
          },
          role: {
            availableValues: [
              { value: 'admin', label: 'Администратор' },
              { value: 'moderator', label: 'Модератор' }
            ]
          }
        }
      }
    }
  ],
  rootPath: '/admin',
  branding: {
    companyName: 'Deep Components Aggregator',
    logo: false,
    softwareBrothers: false,
    theme: {
      colors: {
        primary100: '#1976d2'
      }
    }
  },
  locale: {
    language: 'ru',
    translations: {
      ru: {
        labels: {
          loginWelcome: 'Добро пожаловать в админ-панель'
        }
      }
    }
  },
  dashboard: {
    component: AdminJS.bundle('./components/Dashboard')
  }
}

const adminJs = new AdminJS(adminOptions)

// Authentication
const authenticate = async (email, password) => {
  const user = await AdminUser.findOne({ where: { email, is_active: true } })
  if (user && await user.verifyPassword(password)) {
    return { email: user.email, name: user.name, role: user.role }
  }
  return null
}

// Session store (in-memory for now, can be upgraded to Redis)
const sessionStore = session({
  secret: process.env.ADMIN_SESSION_SECRET || 'deep-agg-admin-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
})

// Build router
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate,
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'deep-agg-cookie-secret-change-in-production'
  },
  null,
  {
    resave: false,
    saveUninitialized: false,
    secret: process.env.ADMIN_SESSION_SECRET || 'deep-agg-admin-secret-change-in-production',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  }
)

module.exports = { adminJs, adminRouter, sessionStore }
