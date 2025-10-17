/**
 * AdminJS configuration - ESM version
 * Consistent with package "type": "module"
 */

import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import AdminJSSequelize from '@adminjs/sequelize'

import session from 'express-session'

// Import models (ESM)
import {
  sequelize,
  AdminUser,
  Order,
  ApiHealth,
  ApiKey,
  StaticPage,
  ManualProduct,
  ProjectStat,
  AdminNotification,
  Setting
} from '../db/models.js'

// Register Sequelize adapter
AdminJS.registerAdapter({
  Resource: AdminJSSequelize.Resource,
  Database: AdminJSSequelize.Database
})

const adminOptions = {
  resources: [
    {
      resource: Setting,
      options: {
        navigation: { name: 'Система', icon: 'Sliders' },
        listProperties: ['key', 'category', 'type', 'updated_at', 'is_public'],
        showProperties: ['key', 'value', 'type', 'category', 'description', 'is_public', 'created_at', 'updated_at'],
        editProperties: ['key', 'value', 'type', 'category', 'description', 'is_public'],
        filterProperties: ['category', 'type', 'is_public'],
        sort: { sortBy: 'category', direction: 'asc' },
        properties: {
          value: { type: 'textarea', props: { rows: 3 } },
          type: {
            availableValues: [
              { value: 'string', label: 'Строка' },
              { value: 'number', label: 'Число' },
              { value: 'boolean', label: 'Логическое' },
              { value: 'json', label: 'JSON' },
              { value: 'array', label: 'Массив' }
            ]
          },
          category: {
            availableValues: [
              { value: 'general', label: 'Общие' },
              { value: 'pricing', label: 'Ценообразование' },
              { value: 'notifications', label: 'Уведомления' },
              { value: 'api', label: 'API' },
              { value: 'seo', label: 'SEO' }
            ]
          }
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.payload.key) {
                request.payload.key = request.payload.key
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')
              }
              return request
            }
          },
          edit: {
            before: async (request) => {
              if (request.payload.key) {
                request.payload.key = request.payload.key
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')
              }
              return request
            }
          }
        }
      }
    },
    {
      resource: AdminNotification,
      options: {
        navigation: { name: 'Уведомления', icon: 'Bell' },
        listProperties: ['id', 'type', 'created_at', 'read_at'],
        showProperties: ['id', 'type', 'payload', 'created_at', 'read_at'],
        editProperties: ['type', 'payload'],
        filterProperties: ['type', 'read_at'],
        sort: { sortBy: 'created_at', direction: 'desc' },
        properties: {
          payload: { type: 'mixed' },
          type: {
            availableValues: [
              { value: 'order', label: 'Заказ' },
              { value: 'system', label: 'Система' },
              { value: 'alert', label: 'Оповещение' }
            ]
          }
        },
        actions: {
          markAsRead: {
            actionType: 'record',
            icon: 'CheckDouble',
            isVisible: (context) => {
              const record = context.record
              return record && !record.params.read_at
            },
            handler: async (request, response, context) => {
              const { record } = context
              if (record) {
                await record.update({ read_at: Date.now() })
                return {
                  record: record.toJSON(context.currentAdmin),
                  notice: { message: 'Отмечено как прочитанное', type: 'success' }
                }
              }
              return { record }
            }
          },
          markAsUnread: {
            actionType: 'record',
            icon: 'Undo',
            isVisible: (context) => {
              const record = context.record
              return record && record.params.read_at
            },
            handler: async (request, response, context) => {
              const { record } = context
              if (record) {
                await record.update({ read_at: null })
                return {
                  record: record.toJSON(context.currentAdmin),
                  notice: { message: 'Отмечено как непрочитанное', type: 'success' }
                }
              }
              return { record }
            }
          },
          markAllAsRead: {
            actionType: 'bulk',
            icon: 'CheckSquare',
            isVisible: true,
            handler: async (request, response, context) => {
              const { records } = context
              if (records && records.length) {
                await Promise.all(records.map(record => record.update({ read_at: Date.now() })))
                return {
                  records: records.map(record => record.toJSON(context.currentAdmin)),
                  notice: { message: `${records.length} уведомлений отмечено как прочитанные`, type: 'success' }
                }
              }
              return { records }
            }
          }
        }
      }
    },
    {
      resource: Order,
      options: {
        navigation: { name: 'Управление', icon: 'ShoppingCart' },
        listProperties: ['order_code', 'mpn', 'created_at', 'qty', 'customer_name', 'status'],
        showProperties: ['order_code', 'created_at', 'customer_name', 'customer_email', 'customer_contact', 'mpn', 'manufacturer', 'qty', 'pricing_snapshot', 'dealer_links', 'status', 'status_comment', 'status_history'],
        editProperties: ['status', 'status_comment'],
        filterProperties: ['order_code', 'customer_email', 'mpn', 'status'],
        sort: { sortBy: 'created_at', direction: 'desc' },
        properties: {
          pricing_snapshot: { type: 'mixed' },
          dealer_links: { type: 'mixed' },
          mpn: {},
          customer_contact: { type: 'mixed' },
          status_history: { type: 'mixed' },
          status: {
            availableValues: [
              { value: 'pending', label: 'Новый' },
              { value: 'processing', label: 'В обработке' },
              { value: 'completed', label: 'Завершён' },
              { value: 'cancelled', label: 'Отменён' }
            ]
          }
        },
        actions: {
          export: { isVisible: true },
          updateStatus: {
            actionType: 'record',
            icon: 'FlagInCog',
            isVisible: true,
            guard: 'Изменить статус заказа? Клиенту придёт письмо, если указан email.',
            component: false,
            handler: async (request, response, context) => {
              const { record } = context
              const id = record?.params?.id || record?.id
              const status = request?.payload?.status
              const comment = request?.payload?.comment || null
              if (!id || !status) {
                return { notice: { message: 'Нужны поля: status (и опционально comment)' } }
              }
              try {
                const res = await fetch(`${process.env.BASE_URL || 'http://localhost:9201'}/api/admin/orders/${id}`, {
                  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, comment })
                })
                const json = await res.json()
                return {
                  record: record?.toJSON ? record.toJSON(context.currentAdmin) : record,
                  notice: { message: json && json.ok ? 'Статус обновлён' : `Ошибка: ${json?.error || res.status}` }
                }
              } catch (e) {
                return { notice: { message: `Ошибка запроса: ${e.message}` } }
              }
            },
            componentProps: {
              fields: [
                { name: 'status', type: 'select', availableValues: [
                  { value: 'pending', label: 'Новый' },
                  { value: 'processing', label: 'В обработке' },
                  { value: 'completed', label: 'Завершён' },
                  { value: 'cancelled', label: 'Отменён' }
                ]},
                { name: 'comment', type: 'textarea', props: { rows: 3 } }
              ]
            }
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
        actions: { new: { isVisible: false }, delete: { isVisible: false } },
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
          key_value: { type: 'password', isVisible: { list: false, filter: false, show: true, edit: true } },
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
        listProperties: ['title', 'slug', 'is_published', 'position', 'section', 'sort_order'],
        showProperties: ['title', 'slug', 'content', 'meta_description', 'is_published', 'position', 'section', 'sort_order', 'created_at', 'updated_at'],
        editProperties: ['title', 'slug', 'content', 'meta_description', 'is_published', 'position', 'section', 'sort_order'],
        properties: {
          content: { type: 'textarea', props: { rows: 15 } },
          position: {
            availableValues: [
              { value: 'header', label: 'Шапка' },
              { value: 'footer', label: 'Подвал' },
              { value: 'both', label: 'Шапка и подвал' }
            ]
          },
          section: {
            availableValues: [
              { value: 'about', label: 'О компании' },
              { value: 'help', label: 'Помощь' },
              { value: 'info', label: 'Информация' }
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
        showProperties: ['mpn', 'manufacturer', 'description', 'price', 'currency', 'region', 'stock', 'image_url', 'datasheet_url', 'is_active', 'category', 'technical_specs'],
        editProperties: ['mpn', 'manufacturer', 'description', 'price', 'currency', 'region', 'stock', 'image_url', 'datasheet_url', 'is_active', 'category', 'technical_specs'],
        sort: { sortBy: 'created_at', direction: 'desc' }
      }
    },
    {
      resource: ProjectStat,
      options: {
        navigation: { name: 'Статистика', icon: 'TrendingUp' },
        listProperties: ['date', 'total_searches', 'cache_hits', 'live_searches', 'total_orders', 'avg_response_time_ms'],
        actions: { new: { isVisible: false }, edit: { isVisible: false }, delete: { isVisible: false } },
        sort: { sortBy: 'date', direction: 'desc' }
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
          password_hash: { type: 'password', isVisible: { list: false, filter: false, show: false, edit: true } },
          role: { availableValues: [ { value: 'admin', label: 'Администратор' }, { value: 'moderator', label: 'Модератор' } ] }
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
  branding: { companyName: 'Deep Components Aggregator', logo: false, softwareBrothers: false, theme: { colors: { primary100: '#1976d2' } } },
  locale: { language: 'ru' }
}

export const adminJs = new AdminJS(adminOptions)

const authenticate = async (email, password) => {
  const user = await AdminUser.findOne({ where: { email, is_active: true } })
  if (user && await user.verifyPassword(password)) {
    return { email: user.email, name: user.name, role: user.role }
  }
  return null
}

export const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  { authenticate, cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'deep-agg-cookie-secret-change-in-production' },
  null,
  {
    resave: false,
    saveUninitialized: false,
    secret: process.env.ADMIN_SESSION_SECRET || 'deep-agg-admin-secret-change-in-production',
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' }
  }
)

if (process.env.NODE_ENV === 'production') {
  const cookieWeak = !process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_COOKIE_SECRET.includes('change-in-production')
  const sessionWeak = !process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.includes('change-in-production')
  if (cookieWeak || sessionWeak) {
    console.warn('[admin] Weak admin secrets detected in production. Please set ADMIN_COOKIE_SECRET and ADMIN_SESSION_SECRET.')
  }
}

export { sequelize, AdminUser, Order, ApiHealth, ApiKey, StaticPage, ManualProduct, ProjectStat, AdminNotification, Setting }


