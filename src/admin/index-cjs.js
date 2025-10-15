/**
 * AdminJS configuration - CommonJS wrapper
 * This file wraps the ES modules for use in CommonJS server.js
 */

import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import AdminJSSequelize from '@adminjs/sequelize'

import {
  sequelize,
  AdminUser,
  Order,
  ApiHealth,
  ApiKey,
  StaticPage,
  ManualProduct,
  ProjectStat
} from '../db/models.js'

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
        listProperties: ['id', 'order_number', 'client_name', 'client_email', 'total_price', 'status', 'created_at'],
        showProperties: ['id', 'order_number', 'client_name', 'client_email', 'client_phone', 'client_address', 'items', 'total_price', 'currency', 'status', 'notes', 'created_at'],
        editProperties: ['status', 'notes'],
        filterProperties: ['order_number', 'client_email', 'status'],
        sort: {
          sortBy: 'created_at',
          direction: 'desc'
        },
        properties: {
          items: {
            type: 'mixed'
          },
          status: {
            availableValues: [
              { value: 'new', label: 'Новый' },
              { value: 'processing', label: 'В обработке' },
              { value: 'shipped', label: 'Отправлен' },
              { value: 'delivered', label: 'Доставлен' },
              { value: 'cancelled', label: 'Отменён' }
            ]
          }
        },
        actions: {
          export: { isVisible: true }
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
            type: 'textarea',
            props: {
              rows: 15
            }
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
  dashboard: {
    handler: async () => {
      const [ordersCount, pendingCount, processingCount, completedCount] = await Promise.all([
        Order.count(),
        Order.count({ where: { status: 'pending' } }),
        Order.count({ where: { status: 'processing' } }),
        Order.count({ where: { status: 'completed' } })
      ])

      const health = await ApiHealth.findAll()
      const healthSummary = health.map(h => ({ service: h.service, status: h.status, last_check: h.last_check, response_time_ms: h.response_time_ms }))

      const pages = await StaticPage.count({ where: { is_published: true } })

      return {
        stats: {
          orders: { total: ordersCount, pending: pendingCount, processing: processingCount, completed: completedCount },
          staticPagesPublished: pages
        },
        health: healthSummary
      }
    },
    component: false
  },
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
    language: 'ru'
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

// Build authenticated router
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

// Warn if weak admin secrets in production
if (process.env.NODE_ENV === 'production') {
  const cookieWeak = !process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_COOKIE_SECRET.includes('change-in-production')
  const sessionWeak = !process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.includes('change-in-production')
  if (cookieWeak || sessionWeak) {
    console.warn('[admin] Weak admin secrets detected in production. Please set ADMIN_COOKIE_SECRET and ADMIN_SESSION_SECRET.')
  }
}

export { adminJs, adminRouter, sequelize, AdminUser, Order, ApiHealth, ApiKey, StaticPage, ManualProduct, ProjectStat }
