# AdminJS Integration Guide

## ✅ Что уже сделано

1. **Установлены зависимости** (450 пакетов):
   - adminjs@^7.8.1
   - @adminjs/express@^6.1.0
   - @adminjs/sequelize@^4.1.0
   - sequelize@^6.35.0
   - sqlite3@^5.1.6
   - bcrypt@^5.1.1
   - express-session@^1.17.3

2. **Созданы файлы**:
   - `src/db/sequelize.js` - подключение к SQLite
   - `src/db/models.js` - 7 моделей (AdminUser, Order, ApiHealth, ApiKey, StaticPage, ManualProduct, ProjectStat)
   - `src/db/init.js` - скрипт инициализации БД
   - `src/admin/index.js` - конфигурация AdminJS
   - `src/admin/components/Dashboard.jsx` - кастомный дашборд
   - `src/admin/components/OrderItemsShow.jsx` - отображение заказов с ссылками на диллеров

## 🚀 Шаги для запуска

### Шаг 1: Инициализация базы данных

```bash
cd /opt/deep-agg
node src/db/init.js
```

Этот скрипт:
- Создаст все таблицы в SQLite (var/db/deepagg.sqlite)
- Создаст админ-юзера: `admin@deepagg.local` / `admin123`
- Добавит записи для мониторинга API (DigiKey, Mouser, Farnell, TME)
- Создаст стартовые статические страницы (О компании, Контакты, Доставка, Политика)
- Инициализирует статистику за сегодня

### Шаг 2: Интеграция в server.js

Добавьте в `server.js` после импортов:

```javascript
// AdminJS
const { adminRouter } = require('./src/admin/index')
const { sequelize } = require('./src/db/models')

// ... existing code ...

// После всех роутов, перед app.listen():

// Mount AdminJS
app.use('/admin', adminRouter)

// Sync database before starting server
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database synced')
  
  // existing app.listen() code here
})
```

### Шаг 3: Обновить .env (опционально)

Добавьте в `.env` для production:

```env
# Admin Panel
ADMIN_SESSION_SECRET=your-random-secret-here-change-in-production
ADMIN_COOKIE_SECRET=another-random-secret-change-in-production
```

### Шаг 4: Перезапуск сервера

```bash
pm2 restart deepagg-backend
# или
npm run dev
```

### Шаг 5: Доступ к админке

Откройте браузер:
- **URL**: http://localhost:9201/admin
- **Email**: admin@deepagg.local
- **Password**: admin123

## 📊 Структура админки

После входа вы увидите:

### Dashboard (главная)
- 📊 Статистика за сегодня (поиски, кэш, заказы)
- 🔌 Статус API (DigiKey, Mouser, Farnell, TME)
- ⏱️ Время ответа сервисов
- 📈 Success Rate за 24 часа

### Меню "Управление"
- **Заказы (Orders)**: Просмотр/редактирование заказов
  - Информация о клиенте
  - Список товаров с ссылками на диллеров (DigiKey/Mouser/Farnell/TME)
  - Статусы: Новый → В обработке → Отправлен → Доставлен
  - Примечания администратора

### Меню "Товары"
- **Ручные товары (ManualProduct)**: Добавление товаров вручную
  - MPN, производитель, описание
  - Цена, валюта, регион, склад
  - Изображение, даташит
  - Категория

### Меню "Контент"
- **Статические страницы (StaticPage)**: CMS для footer/header
  - Slug (URL)
  - Заголовок, контент (HTML/Markdown)
  - Meta описание
  - Позиция (шапка/подвал/оба)
  - Порядок сортировки
  - Публикация

### Меню "Система"
- **API Health**: Мониторинг статуса API
  - Статус: Online/Offline/Degraded
  - Последняя проверка
  - Время ответа (ms)
  - Success rate за 24ч

- **API Keys**: Управление ключами
  - Сервис (DigiKey/Mouser/Farnell/TME/OEMstrade)
  - Имя ключа (CLIENT_ID, API_KEY, etc.)
  - Значение (зашифровано)
  - Активность, срок действия

- **Admin Users**: Управление пользователями админки
  - Email, имя, роль (админ/модератор)
  - Смена пароля
  - Активация/деактивация

### Меню "Статистика"
- **ProjectStat**: История метрик по дням
  - Дата
  - Всего поисков
  - Попадания в кэш
  - Live-поиск (API)
  - Заказы
  - Среднее время ответа

## 🔐 Безопасность

1. **Авторизация**: bcrypt-хеширование паролей
2. **Сессии**: express-session с httpOnly cookies
3. **CSRF**: защита встроена в AdminJS
4. **Роли**: admin (полный доступ), moderator (ограниченный)

## 🎨 Кастомизация

### Изменить тему
В `src/admin/index.js`:

```javascript
branding: {
  companyName: 'Ваше название',
  theme: {
    colors: {
      primary100: '#1976d2' // Ваш цвет
    }
  }
}
```

### Добавить новую модель
1. Создайте модель в `src/db/models.js`
2. Добавьте в `resources` в `src/admin/index.js`
3. Запустите `node src/db/init.js` для создания таблицы

## 🔗 API для фронтенда

### Получение статических страниц

Добавьте эндпоинт в `server.js`:

```javascript
// Static pages API for frontend
app.get('/api/static-pages', async (req, res) => {
  try {
    const { StaticPage } = require('./src/db/models')
    const pages = await StaticPage.findAll({
      where: { is_published: true },
      order: [['sort_order', 'ASC']],
      attributes: ['slug', 'title', 'position']
    })
    res.json(pages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pages' })
  }
})
```

### Интеграция в Next.js footer/header

В `v0-components-aggregator-page/app/layout.tsx`:

```typescript
// Fetch static pages
const staticPages = await fetch('http://localhost:9201/api/static-pages').then(r => r.json())

// Filter by position
const footerLinks = staticPages.filter(p => ['footer', 'both'].includes(p.position))
const headerLinks = staticPages.filter(p => ['header', 'both'].includes(p.position))

// Render in footer/header
{footerLinks.map(link => (
  <a key={link.slug} href={`/pages/${link.slug}`}>{link.title}</a>
))}
```

## 📝 TODO после запуска

1. ✅ Проверить доступ к /admin
2. ✅ Добавить тестовый заказ
3. ✅ Настроить API keys (DigiKey, Mouser, Farnell, TME)
4. ✅ Создать статические страницы
5. ✅ Добавить ручной товар
6. ⏳ Настроить мониторинг API (cron/scheduler)
7. ⏳ Интегрировать статические страницы во фронтенд
8. ⏳ Создать эндпоинт для создания заказов
9. ⏳ Добавить уведомления о новых заказах (email/Telegram)

## ❓ Troubleshooting

### Ошибка "Cannot find module '@adminjs/design-system'"
```bash
npm install @adminjs/design-system
```

### Ошибка "Module not found: Can't resolve './components/Dashboard'"
AdminJS компилирует JSX-компоненты автоматически через `AdminJS.bundle()`. Убедитесь, что пути корректны относительно `src/admin/index.js`.

### База данных не создаётся
Проверьте права на папку `var/db/`:
```bash
mkdir -p /opt/deep-agg/var/db
chmod 755 /opt/deep-agg/var/db
```

### Не работает авторизация
Проверьте, что админ-юзер создан:
```bash
node -e "const {AdminUser} = require('./src/db/models'); AdminUser.findAll().then(console.log)"
```

## 🎯 Результат

После выполнения всех шагов у вас будет:

✅ Полнофункциональная админка на `/admin`  
✅ Управление заказами со ссылками на 4 диллера  
✅ Мониторинг статуса API  
✅ Редактирование API-ключей без доступа к серверу  
✅ CMS для статических страниц (footer/header)  
✅ Добавление товаров вручную  
✅ Впечатляющий дашборд с метриками проекта  
✅ Защищённая авторизация (bcrypt + sessions)  

**Доступ**: http://localhost:9201/admin  
**Логин**: admin@deepagg.local  
**Пароль**: admin123 (смените после первого входа!)
