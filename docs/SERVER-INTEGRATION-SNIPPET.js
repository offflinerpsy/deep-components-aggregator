/**
 * AdminJS integration for server.js
 * Since server.js uses CommonJS (require), we need to import ES modules dynamically
 */

// Add this near the top of server.js after other imports:

// AdminJS setup (dynamic import for ES modules)
let adminRouter;
(async () => {
  try {
    // Import ES modules dynamically
    const adminModule = await import('./src/admin/index-cjs.js');
    adminRouter = adminModule.adminRouter;
    
    // Mount AdminJS after it's loaded
    app.use('/admin', (req, res, next) => {
      if (adminRouter) {
        adminRouter(req, res, next);
      } else {
        res.status(503).send('Admin panel is loading...');
      }
    });
    
    console.log('✅ AdminJS mounted at /admin');
  } catch (error) {
    console.error('❌ Failed to load AdminJS:', error);
  }
})();

// Add this before app.listen() to sync database:

// Sync database
(async () => {
  try {
    const { sequelize } = await import('./src/db/models.js');
    await sequelize.authenticate();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
})();
