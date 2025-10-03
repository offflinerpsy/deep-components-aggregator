// config/passport.mjs
// Passport authentication strategies configuration
// - Local (email + password with Argon2id)
// - Google OAuth 2.0 (OpenID Connect)
// - Yandex OAuth 2.0

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oidc';
import { Strategy as YandexStrategy } from 'passport-yandex';
import { Strategy as VKontakteStrategy } from 'passport-vkontakte';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

/**
 * Argon2id hashing parameters
 * Tuned for server performance while maintaining security
 * 
 * These parameters provide ~100ms hashing time on modern hardware
 * Adjust based on your server's capabilities and security requirements
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 3,          // Number of iterations
  memoryCost: 65536,    // Memory usage in KiB (64 MB)
  parallelism: 4        // Number of parallel threads
};

/**
 * Configure Passport strategies
 * @param {Object} db - SQLite database instance
 * @param {Function} logger - Pino logger instance
 */
export function configurePassport(db, logger) {
  // ==================== SERIALIZATION ====================
  
  passport.serializeUser((user, done) => {
    // Store only user ID in session
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    // Guard: Validate ID format
    if (!id || typeof id !== 'string') {
      return done(null, false);
    }
    
    // Fetch user from database (include role for RBAC)
    const user = db.prepare('SELECT id, email, name, provider, role FROM users WHERE id = ?').get(id);
    
    if (!user) {
      logger.warn({ userId: id }, 'User not found during deserialization');
      return done(null, false);
    }
    
    done(null, user);
  });
  
  // ==================== LOCAL STRATEGY ====================
  
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, (email, password, done) => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Guard: Find user by email
    const user = db.prepare(`
      SELECT id, email, password_hash, name 
      FROM users 
      WHERE email = ? AND provider IS NULL
    `).get(normalizedEmail);
    
    if (!user) {
      logger.info({ email: 'REDACTED' }, 'Login attempt: user not found');
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    // Guard: Check if password_hash exists (should always be true for local users)
    if (!user.password_hash) {
      logger.error({ userId: user.id }, 'Local user missing password_hash');
      return done(null, false, { message: 'Account configuration error' });
    }
    
    // Verify password with Argon2
    argon2.verify(user.password_hash, password)
      .then(isValid => {
        if (!isValid) {
          logger.info({ userId: user.id }, 'Login attempt: invalid password');
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        // Success - return user without password_hash
        logger.info({ userId: user.id }, 'Login successful');
        done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          provider: null
        });
      })
      .catch(err => {
        logger.error({ error: err.message }, 'Argon2 verify error');
        done(err);
      });
  }));
  
  // ==================== GOOGLE STRATEGY ====================
  
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:9201/auth/google/callback';
  
  if (googleClientId && googleClientSecret) {
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackURL,
      scope: ['profile', 'email']
    }, (issuer, profile, done) => {
      const providerId = profile.id;
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      
      // Guard: Validate required OAuth data
      if (!providerId) {
        logger.error({ profile }, 'Google OAuth: missing provider ID');
        return done(new Error('Invalid OAuth response'));
      }
      
      // Check if user exists by provider_id
      let user = db.prepare(`
        SELECT id, email, name, provider, provider_id 
        FROM users 
        WHERE provider = 'google' AND provider_id = ?
      `).get(providerId);
      
      if (user) {
        // Existing OAuth user - log in
        logger.info({ userId: user.id, provider: 'google' }, 'OAuth login: existing user');
        return done(null, user);
      }
      
      // Check if email already exists (local account)
      if (email) {
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        
        if (existingUser) {
          // TODO: Optional - link OAuth to existing local account
          // For now, we reject to avoid account conflicts
          logger.warn({ email: 'REDACTED', provider: 'google' }, 'OAuth email matches existing local account');
          return done(null, false, { message: 'Email already registered with password login' });
        }
      }
      
      // Create new OAuth user
      const now = Date.now();
      const userId = randomUUID();
      
      const insertTransaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO users (id, created_at, updated_at, email, password_hash, provider, provider_id, name)
          VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
        `).run(
          userId,
          now,
          now,
          email ? email.toLowerCase().trim() : null,
          'google',
          providerId,
          name || null
        );
      });
      
      insertTransaction();
      
      logger.info({ userId, provider: 'google' }, 'OAuth login: new user created');
      
      done(null, {
        id: userId,
        email: email ? email.toLowerCase().trim() : null,
        name: name || null,
        provider: 'google',
        provider_id: providerId
      });
    }));
  } else {
    logger.warn('Google OAuth not configured (missing CLIENT_ID or CLIENT_SECRET)');
  }
  
  // ==================== YANDEX STRATEGY ====================
  
  const yandexClientId = process.env.YANDEX_CLIENT_ID;
  const yandexClientSecret = process.env.YANDEX_CLIENT_SECRET;
  const yandexCallbackURL = process.env.YANDEX_CALLBACK_URL || 'http://localhost:9201/auth/yandex/callback';
  
  if (yandexClientId && yandexClientSecret) {
    passport.use(new YandexStrategy({
      clientID: yandexClientId,
      clientSecret: yandexClientSecret,
      callbackURL: yandexCallbackURL
    }, (accessToken, refreshToken, profile, done) => {
      const providerId = profile.id;
      const email = profile.emails?.[0]?.value || profile.default_email;
      const name = profile.displayName || profile.real_name;
      
      // Guard: Validate required OAuth data
      if (!providerId) {
        logger.error({ profile }, 'Yandex OAuth: missing provider ID');
        return done(new Error('Invalid OAuth response'));
      }
      
      // Check if user exists by provider_id
      let user = db.prepare(`
        SELECT id, email, name, provider, provider_id 
        FROM users 
        WHERE provider = 'yandex' AND provider_id = ?
      `).get(providerId);
      
      if (user) {
        // Existing OAuth user - log in
        logger.info({ userId: user.id, provider: 'yandex' }, 'OAuth login: existing user');
        return done(null, user);
      }
      
      // Check if email already exists (local account)
      if (email) {
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        
        if (existingUser) {
          logger.warn({ email: 'REDACTED', provider: 'yandex' }, 'OAuth email matches existing local account');
          return done(null, false, { message: 'Email already registered with password login' });
        }
      }
      
      // Create new OAuth user
      const now = Date.now();
      const userId = randomUUID();
      
      const insertTransaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO users (id, created_at, updated_at, email, password_hash, provider, provider_id, name)
          VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
        `).run(
          userId,
          now,
          now,
          email ? email.toLowerCase().trim() : null,
          'yandex',
          providerId,
          name || null
        );
      });
      
      insertTransaction();
      
      logger.info({ userId, provider: 'yandex' }, 'OAuth login: new user created');
      
      done(null, {
        id: userId,
        email: email ? email.toLowerCase().trim() : null,
        name: name || null,
        provider: 'yandex',
        provider_id: providerId
      });
    }));
  } else {
    logger.warn('Yandex OAuth not configured (missing CLIENT_ID or CLIENT_SECRET)');
  }
  
  // ==================== VKONTAKTE STRATEGY ====================
  
  const vkClientId = process.env.VK_CLIENT_ID;
  const vkClientSecret = process.env.VK_CLIENT_SECRET;
  const vkCallbackURL = process.env.VK_CALLBACK_URL || 'http://localhost:9201/auth/vk/callback';
  
  if (vkClientId && vkClientSecret) {
    passport.use(new VKontakteStrategy({
      clientID: vkClientId,
      clientSecret: vkClientSecret,
      callbackURL: vkCallbackURL,
      scope: ['email'],
      profileFields: ['email', 'first_name', 'last_name']
    }, (accessToken, refreshToken, params, profile, done) => {
      const providerId = profile.id;
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
      
      // Guard: Validate required OAuth data
      if (!providerId) {
        logger.error({ profile }, 'VK OAuth: missing provider ID');
        return done(new Error('Invalid OAuth response'));
      }
      
      // Check if user exists by provider_id
      let user = db.prepare(`
        SELECT id, email, name, provider, provider_id 
        FROM users 
        WHERE provider = 'vk' AND provider_id = ?
      `).get(String(providerId));
      
      if (user) {
        // Existing OAuth user - log in
        logger.info({ userId: user.id, provider: 'vk' }, 'OAuth login: existing user');
        return done(null, user);
      }
      
      // Check if email already exists (local account)
      if (email) {
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        
        if (existingUser) {
          logger.warn({ email: 'REDACTED', provider: 'vk' }, 'OAuth email matches existing local account');
          return done(null, false, { message: 'Email already registered with password login' });
        }
      }
      
      // Create new OAuth user
      const now = Date.now();
      const userId = randomUUID();
      
      const insertTransaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO users (id, created_at, updated_at, email, password_hash, provider, provider_id, name)
          VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
        `).run(
          userId,
          now,
          now,
          email ? email.toLowerCase().trim() : null,
          'vk',
          String(providerId),
          name || null
        );
      });
      
      insertTransaction();
      
      logger.info({ userId, provider: 'vk' }, 'OAuth login: new user created');
      
      done(null, {
        id: userId,
        email: email ? email.toLowerCase().trim() : null,
        name: name || null,
        provider: 'vk',
        provider_id: String(providerId)
      });
    }));
  } else {
    logger.warn('VK OAuth not configured (missing CLIENT_ID or CLIENT_SECRET)');
  }
  
  logger.info({
    local: true,
    google: !!(googleClientId && googleClientSecret),
    yandex: !!(yandexClientId && yandexClientSecret),
    vk: !!(vkClientId && vkClientSecret)
  }, 'Passport strategies configured');
}

/**
 * Hash password with Argon2id
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify password against hash
 * @param {string} hash - Argon2id hash
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

export default {
  configurePassport,
  hashPassword,
  verifyPassword,
  ARGON2_OPTIONS
};
