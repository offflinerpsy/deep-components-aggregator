// middleware/rateLimiter.js
// Rate limiting middleware for POST /api/order

import rateLimit from 'express-rate-limit';
import { rateLimitHits } from '../metrics/registry.js';

/**
 * Create rate limiter for order creation
 * Limits number of order requests per IP address
 * Configuration from environment variables:
 * - ORDER_RATE_LIMIT_WINDOW_MS: Time window in ms (default: 60000 = 1 minute)
 * - ORDER_RATE_LIMIT_MAX: Max requests per window (default: 10)
 */
export function createOrderRateLimiter() {
  const windowMs = parseInt(process.env.ORDER_RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
  const max = parseInt(process.env.ORDER_RATE_LIMIT_MAX) || 10; // 10 requests
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    
    // Custom error response
    handler: (req, res) => {
      // Record metric
      rateLimitHits.inc({ endpoint: '/api/order' });
      
      res.status(429).json({
        ok: false,
        error: 'rate_limit',
        message: `Too many order requests. Please try again later.`,
        retry_after: Math.ceil(windowMs / 1000)
      });
    },
    
    // Skip rate limiting for specific IPs (optional)
    skip: (req) => {
      const trustedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
      return trustedIPs.includes(req.ip);
    },
    
    // Custom key generator (use IP address)
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
  });
}

/**
 * Create rate limiter for authentication endpoints
 * Protects against brute-force attacks on register/login
 * Configuration from environment variables:
 * - AUTH_RATE_LIMIT_WINDOW_MS: Time window in ms (default: 900000 = 15 minutes)
 * - AUTH_RATE_LIMIT_MAX: Max requests per window (default: 5)
 */
export function createAuthRateLimiter() {
  const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutes
  const max = parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5; // 5 attempts
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    
    handler: (req, res) => {
      rateLimitHits.inc({ endpoint: '/auth' });
      
      res.status(429).json({
        ok: false,
        error: 'rate_limit',
        message: 'Too many authentication attempts. Please try again later.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    },
    
    skip: (req) => {
      const trustedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
      return trustedIPs.includes(req.ip);
    },
    
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
  });
}

/**
 * Create general API rate limiter (for all endpoints)
 * More permissive than order-specific limiter
 */
export function createGeneralRateLimiter() {
  const windowMs = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
  const max = parseInt(process.env.API_RATE_LIMIT_MAX) || 100; // 100 requests
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    
    handler: (req, res) => {
      rateLimitHits.inc({ endpoint: 'general' });
      
      res.status(429).json({
        ok: false,
        error: 'rate_limit',
        message: 'Too many requests. Please try again later.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    },
    
    skip: (req) => {
      // Skip admin endpoints (protected by Nginx Basic Auth anyway)
      if (req.path.startsWith('/api/admin/')) return true;
      
      // Skip metrics endpoint
      if (req.path === '/api/metrics') return true;
      
      // Skip health check
      if (req.path === '/api/health') return true;
      
      const trustedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
      return trustedIPs.includes(req.ip);
    },
    
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
  });
}

export default {
  createOrderRateLimiter,
  createAuthRateLimiter,
  createGeneralRateLimiter
};
