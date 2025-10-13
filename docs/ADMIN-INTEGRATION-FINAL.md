# AdminJS Integration — Final Steps

## ✅ Что уже готово

1. ✅ База данных проинициализирована (`var/db/deepagg.sqlite`)
2. ✅ Создан admin-юзер: **admin@deepagg.local** / **admin123**
3. ✅ 4 API health records (DigiKey, Mouser, Farnell, TME)
4. ✅ 4 статические страницы (О компании, Контакты, Доставка, Политика)
5. ✅ Все модели и конфигурация AdminJS готовы

## 🚀 Интеграция в server.js

### Шаг 1: Добавить AdminJS роутер

Откройте `/opt/deep-agg/server.js` и добавьте **после всех импортов**:

```javascript
// ============================================
// AdminJS Integration
// ============================================
let adminRouter;
(async () => {
  try {
    const adminModule = await import('./src/admin/index-cjs.js');
    adminRouter = adminModule.adminRouter;
    console.log('✅ AdminJS loaded');
  } catch (error) {
    console.error('❌ Failed to load AdminJS:', error);
  }
})();
```

### Шаг 2: Смонтировать AdminJS

Найдите в `server.js` место где монтируются роуты (обычно перед `app.listen()`), добавьте:

```javascript
// ============================================
// AdminJS Routes
// ============================================
app.use('/admin', (req, res, next) => {
  if (adminRouter) {
    adminRouter(req, res, next);
  } else {
    res.status(503).send('Admin panel is loading...');
  }
});
```

### Шаг 3: Добавить API эндпоинты

Добавьте эти роуты для фронтенда:

```javascript
// ============================================
// Static Pages API
// ============================================
import { 
  getStaticPages, 
  getStaticPageBySlug, 
  createOrder 
} from './src/api/adminRoutes.js';

// Get all static pages (for footer/header)
app.get('/api/static-pages', getStaticPages);

// Get single static page by slug
app.get('/api/pages/:slug', getStaticPageBySlug);

// Create order
app.post('/api/orders', express.json(), createOrder);
```

**ВАЖНО:** Если `server.js` использует CommonJS (`require`), используйте динамический импорт:

```javascript
app.get('/api/static-pages', async (req, res) => {
  const { getStaticPages } = await import('./src/api/adminRoutes.js');
  return getStaticPages(req, res);
});

app.get('/api/pages/:slug', async (req, res) => {
  const { getStaticPageBySlug } = await import('./src/api/adminRoutes.js');
  return getStaticPageBySlug(req, res);
});

app.post('/api/orders', express.json(), async (req, res) => {
  const { createOrder } = await import('./src/api/adminRoutes.js');
  return createOrder(req, res);
});
```

### Шаг 4: Добавить подключение к БД

**Перед** `app.listen()` добавьте:

```javascript
// ============================================
// Database Connection
// ============================================
(async () => {
  try {
    const { sequelize } = await import('./src/db/models.js');
    await sequelize.authenticate();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
})();
```

### Шаг 5: Интегрировать метрики в поиск

В обработчике **live-поиска** (SSE) и **кеш-поиска** добавьте:

```javascript
// После успешного поиска (в конце обработчика)
import { incrementSearchStats } from './src/api/adminRoutes.js';

// Для кеша:
incrementSearchStats(true); // isCache = true

// Для live-поиска:
incrementSearchStats(false); // isCache = false
```

В парсерах API (DigiKey/Mouser/Farnell/TME) добавьте мониторинг:

```javascript
import { updateApiHealth } from './src/api/adminRoutes.js';

try {
  const startTime = Date.now();
  // ... ваш API запрос ...
  const responseTime = Date.now() - startTime;
  
  await updateApiHealth('digikey', true, responseTime); // success
} catch (error) {
  await updateApiHealth('digikey', false, null, error.message); // error
}
```

### Полный пример интеграции в server.js:

```javascript
// ============================================
// AdminJS Setup (добавить после импортов)
// ============================================
let adminRouter;
(async () => {
  try {
    const adminModule = await import('./src/admin/index-cjs.js');
    adminRouter = adminModule.adminRouter;
    console.log('✅ AdminJS loaded');
  } catch (error) {
    console.error('❌ Failed to load AdminJS:', error);
  }
})();

// ============================================
// API Routes (добавить перед app.listen)
// ============================================

// AdminJS panel
app.use('/admin', (req, res, next) => {
  if (adminRouter) {
    adminRouter(req, res, next);
  } else {
    res.status(503).send('Admin panel is loading...');
  }
});

// Static pages API
app.get('/api/static-pages', async (req, res) => {
  const { getStaticPages } = await import('./src/api/adminRoutes.js');
  return getStaticPages(req, res);
});

app.get('/api/pages/:slug', async (req, res) => {
  const { getStaticPageBySlug } = await import('./src/api/adminRoutes.js');
  return getStaticPageBySlug(req, res);
});

// Create order
app.post('/api/orders', express.json(), async (req, res) => {
  const { createOrder } = await import('./src/api/adminRoutes.js');
  return createOrder(req, res);
});

// ============================================
// Database Connection (перед app.listen)
// ============================================
(async () => {
  try {
    const { sequelize } = await import('./src/db/models.js');
    await sequelize.authenticate();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
})();

// Existing app.listen() code...
```

## 🔄 Перезапуск сервера

```bash
pm2 restart deepagg-backend
# или
npm run dev
```

## 🌐 Доступ к админке

1. Откройте браузер: **http://localhost:9201/admin**
2. Войдите: **admin@deepagg.local** / **admin123**
3. Вы увидите:
   - 📊 Dashboard с метриками
   - 📦 Заказы (пока пусто)
   - 🔌 API Health (DigiKey/Mouser/Farnell/TME)
   - 🔑 API Keys (настройка)
   - 📄 Статические страницы (4 готовые)
   - ➕ Ручные товары
   - 📈 Статистика

## 📋 Проверочный чеклист

После интеграции проверьте:

- [ ] `/admin` открывается
- [ ] Логин работает (admin@deepagg.local / admin123)
- [ ] Dashboard показывает метрики
- [ ] Можно создать тестовый заказ
- [ ] Можно отредактировать статическую страницу
- [ ] Можно добавить ручной товар
- [ ] `/api/static-pages` возвращает JSON
- [ ] `/api/pages/about` возвращает страницу

## 🐛 Troubleshooting

### "Cannot find module 'adminjs'"
Убедитесь, что вы в корне проекта:
```bash
cd /opt/deep-agg && npm list adminjs
```

### "Admin panel is loading..."
AdminJS ещё не загрузился. Подождите 2-3 секунды и обновите страницу.

### "Database connection failed"
Проверьте права на `var/db/deepagg.sqlite`:
```bash
ls -la /opt/deep-agg/var/db/deepagg.sqlite
```

### "Invalid credentials"
Пересоздайте админ-юзера:
```bash
cd /opt/deep-agg
node src/db/init.js
```

## 📝 Следующие шаги

После успешного запуска админки:

1. **Настройте API keys** в разделе "Система → API Keys"
2. **Создайте первый заказ** для теста (Управление → Заказы → New)
3. **Добавьте ручной товар** (Товары → Manual Products → New)
4. **Интегрируйте статические страницы** во фронтенд (см. ниже)

---

## 🎨 Интеграция во Frontend (Next.js)

### Вариант 1: Server Component (рекомендуется)

Создайте `/opt/deep-agg/v0-components-aggregator-page/app/pages/[slug]/page.tsx`:

```typescript
export default async function StaticPage({ params }: { params: { slug: string } }) {
  const res = await fetch(`http://localhost:9201/api/pages/${params.slug}`, {
    cache: 'no-store' // или 'force-cache' для кеша
  });
  
  if (!res.ok) {
    return <div>Page not found</div>;
  }
  
  const page = await res.json();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}
```

### Вариант 2: Footer/Header Links

В `layout.tsx`:

```typescript
async function getFooterLinks() {
  const res = await fetch('http://localhost:9201/api/static-pages?position=footer');
  return res.json();
}

export default async function RootLayout({ children }) {
  const footerLinks = await getFooterLinks();
  
  return (
    <html>
      <body>
        {children}
        <footer>
          {footerLinks.map((link: any) => (
            <a key={link.slug} href={`/pages/${link.slug}`}>
              {link.title}
            </a>
          ))}
        </footer>
      </body>
    </html>
  );
}
```

### Важно: Next.js rewrites

Если используете rewrites в `next.config.js`:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:9201/api/:path*'
    }
  ];
}
```

Тогда во фронтенде используйте `/api/*` вместо `http://localhost:9201/api/*`.

---

## ✅ Готово!

После выполнения всех шагов у вас будет:

✅ Админ-панель на `/admin`  
✅ API для статических страниц  
✅ API для создания заказов  
✅ Мониторинг API health  
✅ Статистика по поисковым запросам  
✅ Управление товарами и ключами  

**Доступ:** http://localhost:9201/admin  
**Логин:** admin@deepagg.local  
**Пароль:** admin123 ⚠️ Смените после первого входа!
