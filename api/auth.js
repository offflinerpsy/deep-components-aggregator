// api/auth.js
// Authentication endpoints:
// - POST /auth/register - Create new local user
// - POST /auth/login - Local authentication
// - POST /auth/logout - Destroy session
// - GET /auth/google - Initiate Google OAuth
// - GET /auth/google/callback - Google OAuth callback
// - GET /auth/yandex - Initiate Yandex OAuth
// - GET /auth/yandex/callback - Yandex OAuth callback
// - GET /auth/me - Get current user info

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import passport from 'passport';
import { hashPassword } from '../config/passport.mjs';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load and compile schemas
const registerSchema = JSON.parse(
  readFileSync(new URL('../schemas/auth.register.schema.json', import.meta.url), 'utf8')
);
const loginSchema = JSON.parse(
  readFileSync(new URL('../schemas/auth.login.schema.json', import.meta.url), 'utf8')
);

const validateRegister = ajv.compile(registerSchema);
const validateLogin = ajv.compile(loginSchema);

/**
 * POST /auth/register
 * Create new user with email + password
 */
export function registerHandler(db, logger) {
  return async (req, res) => {
    console.log('[REGISTER] Handler called, body:', JSON.stringify(req.body));
    
    // Guard: Validate request body
    const valid = validateRegister(req.body);
    if (!valid) {
      logger.warn({ errors: validateRegister.errors }, 'Registration validation failed');
      
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: validateRegister.errors.map(err => ({
          field: err.instancePath || err.params?.missingProperty || 'body',
          message: err.message,
          params: err.params
        }))
      });
    }
    
    const { email, password, confirmPassword, name } = req.body;
    
    // Guard: Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: [{ field: 'confirmPassword', message: 'Passwords do not match' }]
      });
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Guard: Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      logger.info({ email: 'REDACTED' }, 'Registration attempt: email already exists');
      
      return res.status(409).json({
        ok: false,
        error: 'email_exists',
        message: 'Email already registered'
      });
    }
    
    // Hash password with Argon2id
    let passwordHash;
    try {
      passwordHash = await hashPassword(password);
    } catch (error) {
      logger.error({ error: error.message }, 'Password hashing failed');
      
      return res.status(500).json({
        ok: false,
        error: 'server_error',
        message: 'Failed to process registration'
      });
    }
    
    // Create user
    const now = Date.now();
    const userId = randomUUID();
    
    const insertTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, created_at, updated_at, email, password_hash, provider, provider_id, name)
        VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)
      `).run(
        userId,
        now,
        now,
        normalizedEmail,
        passwordHash,
        name || null
      );
    });
    
    insertTransaction();
    
    logger.info({ userId }, 'User registered successfully');
    
    // Log in the new user immediately
    const user = {
      id: userId,
      email: normalizedEmail,
      name: name || null,
      provider: null
    };
    
    req.login(user, (err) => {
      if (err) {
        logger.error({ error: err.message, userId }, 'Auto-login after registration failed');
        
        // Return success anyway - user can log in manually
        return res.status(201).json({
          ok: true,
          userId,
          message: 'Registration successful. Please log in.'
        });
      }
      
      res.status(201).json({
        ok: true,
        userId,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    });
  };
}

/**
 * POST /auth/login
 * Authenticate with email + password using Passport Local strategy
 */
export function loginHandler(db, logger) {
  return (req, res, next) => {
    // Guard: Validate request body
    const valid = validateLogin(req.body);
    if (!valid) {
      logger.warn({ errors: validateLogin.errors }, 'Login validation failed');
      
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        errors: validateLogin.errors.map(err => ({
          field: err.instancePath || 'body',
          message: err.message
        }))
      });
    }
    
    // Authenticate with Passport
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        logger.error({ error: err.message }, 'Login authentication error');
        
        return res.status(500).json({
          ok: false,
          error: 'server_error',
          message: 'Authentication failed'
        });
      }
      
      if (!user) {
        logger.info({ info }, 'Login failed: invalid credentials');
        
        return res.status(401).json({
          ok: false,
          error: 'invalid_credentials',
          message: info?.message || 'Invalid email or password'
        });
      }
      
      // Log in the user (create session)
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error({ error: loginErr.message, userId: user.id }, 'Session creation failed');
          
          return res.status(500).json({
            ok: false,
            error: 'server_error',
            message: 'Failed to create session'
          });
        }
        
        logger.info({ userId: user.id }, 'Login successful');
        
        res.json({
          ok: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            provider: user.provider
          }
        });
      });
    })(req, res, next);
  };
}

/**
 * POST /auth/logout
 * Destroy session and log out user
 */
export function logoutHandler(logger) {
  return (req, res) => {
    const userId = req.user?.id;
    
    req.logout((err) => {
      if (err) {
        logger.error({ error: err.message, userId }, 'Logout error');
        
        return res.status(500).json({
          ok: false,
          error: 'server_error',
          message: 'Logout failed'
        });
      }
      
      // Destroy session
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          logger.error({ error: destroyErr.message, userId }, 'Session destruction failed');
        }
        
        // Clear cookie
        res.clearCookie('deep_agg_sid');
        
        logger.info({ userId }, 'Logout successful');
        
        res.status(204).send();
      });
    });
  };
}

/**
 * GET /auth/me
 * Get current authenticated user info
 */
export function meHandler() {
  return (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'not_authenticated',
        message: 'Not logged in'
      });
    }
    
    res.json({
      ok: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        provider: req.user.provider
      }
    });
  };
}

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
export function googleAuthHandler() {
  return passport.authenticate('google', {
    scope: ['profile', 'email']
  });
}

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
export function googleCallbackHandler(logger) {
  return (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      if (err) {
        logger.error({ error: err.message }, 'Google OAuth error');
        return res.redirect('/ui/auth.html?error=oauth_failed');
      }
      
      if (!user) {
        logger.warn({ info }, 'Google OAuth failed');
        return res.redirect('/ui/auth.html?error=oauth_failed');
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error({ error: loginErr.message, userId: user.id }, 'Google OAuth session creation failed');
          return res.redirect('/ui/auth.html?error=session_failed');
        }
        
        logger.info({ userId: user.id, provider: 'google' }, 'Google OAuth login successful');
        
        // Redirect to main page or dashboard
        res.redirect('/ui/my-orders.html');
      });
    })(req, res, next);
  };
}

/**
 * GET /auth/yandex
 * Initiate Yandex OAuth flow
 */
export function yandexAuthHandler() {
  return passport.authenticate('yandex');
}

/**
 * GET /auth/yandex/callback
 * Yandex OAuth callback
 */
export function yandexCallbackHandler(logger) {
  return (req, res, next) => {
    passport.authenticate('yandex', (err, user, info) => {
      if (err) {
        logger.error({ error: err.message }, 'Yandex OAuth error');
        return res.redirect('/ui/auth.html?error=oauth_failed');
      }
      
      if (!user) {
        logger.warn({ info }, 'Yandex OAuth failed');
        return res.redirect('/ui/auth.html?error=oauth_failed');
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error({ error: loginErr.message, userId: user.id }, 'Yandex OAuth session creation failed');
          return res.redirect('/ui/auth.html?error=session_failed');
        }
        
        logger.info({ userId: user.id, provider: 'yandex' }, 'Yandex OAuth login successful');
        
        // Redirect to main page or dashboard
        res.redirect('/ui/my-orders.html');
      });
    })(req, res, next);
  };
}

/**
 * GET /auth/vk
 * Initiate VKontakte OAuth flow
 */
export function vkAuthHandler() {
  return passport.authenticate('vkontakte', {
    scope: ['email']
  });
}

/**
 * GET /auth/vk/callback
 * VKontakte OAuth callback
 */
export function vkCallbackHandler(logger) {
  return (req, res, next) => {
    passport.authenticate('vkontakte', (err, user, info) => {
      if (err) {
        logger.error({ error: err.message }, 'VK OAuth error');
        return res.redirect('/ui/auth.html?error=oauth_failed');
      }
      
      if (!user) {
        logger.warn({ info }, 'VK OAuth failed');
        return res.redirect('/ui/auth.html?error=oauth_failed');
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error({ error: loginErr.message, userId: user.id }, 'VK OAuth session creation failed');
          return res.redirect('/ui/auth.html?error=session_failed');
        }
        
        logger.info({ userId: user.id, provider: 'vk' }, 'VK OAuth login successful');
        
        // Redirect to main page or dashboard
        res.redirect('/ui/my-orders.html');
      });
    })(req, res, next);
  };
}

/**
 * Mount auth routes to Express app
 * @param {Object} app - Express app instance
 * @param {Object} db - SQLite database instance
 * @param {Object} logger - Pino logger instance
 * @param {Function} [authRateLimiter] - Optional rate limiter for register/login
 */
export function mountAuthRoutes(app, db, logger, authRateLimiter) {
  // Apply rate limiting to register and login if provided
  const rateLimitMiddleware = authRateLimiter || ((req, res, next) => next());
  
  app.post('/auth/register', rateLimitMiddleware, registerHandler(db, logger));
  app.post('/auth/login', rateLimitMiddleware, loginHandler(db, logger));
  app.post('/auth/logout', logoutHandler(logger));
  app.get('/auth/me', meHandler());
  
  // Google OAuth
  app.get('/auth/google', googleAuthHandler());
  app.get('/auth/google/callback', googleCallbackHandler(logger));
  
  // Yandex OAuth
  app.get('/auth/yandex', yandexAuthHandler());
  app.get('/auth/yandex/callback', yandexCallbackHandler(logger));
  
  // VKontakte OAuth
  app.get('/auth/vk', vkAuthHandler());
  app.get('/auth/vk/callback', vkCallbackHandler(logger));
}

export default {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  googleAuthHandler,
  googleCallbackHandler,
  yandexAuthHandler,
  yandexCallbackHandler,
  vkAuthHandler,
  vkCallbackHandler,
  mountAuthRoutes
};
