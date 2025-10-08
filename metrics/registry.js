// metrics/registry.js
// Prometheus metrics registry for Deep Aggregator

import { register, Counter, Gauge, Histogram } from 'prom-client';

// Configure default labels
register.setDefaultLabels({
  app: 'deep-aggregator',
  version: '3.0.0'
});

// ==================== ORDERS METRICS ====================

/**
 * Counter: Total orders created
 * Labels: status (accepted|rejected)
 */
export const ordersTotal = new Counter({
  name: 'orders_total',
  help: 'Total number of order requests',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Gauge: Current number of orders by status
 * Labels: status (pending|processing|completed|cancelled)
 */
export const ordersByStatus = new Gauge({
  name: 'orders_by_status',
  help: 'Current number of orders in each status',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Histogram: Order creation duration in seconds
 * Buckets: 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s
 */
export const orderCreateDuration = new Histogram({
  name: 'order_create_duration_seconds',
  help: 'Duration of order creation in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// ==================== HTTP METRICS ====================

/**
 * Counter: Total HTTP requests
 * Labels: method, path, status_code
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register]
});

/**
 * Histogram: HTTP request duration in seconds
 * Labels: method, path
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// ==================== API SOURCES METRICS ====================

/**
 * Counter: Total API calls to external sources
 * Labels: source (mouser|digikey|tme|farnell), status (success|error)
 */
export const apiCallsTotal = new Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls to external sources',
  labelNames: ['source', 'status'],
  registers: [register]
});

/**
 * Histogram: API call duration in seconds
 * Labels: source
 */
export const apiCallDuration = new Histogram({
  name: 'api_call_duration_seconds',
  help: 'Duration of API calls to external sources in seconds',
  labelNames: ['source'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// ==================== CACHE METRICS ====================

/**
 * Counter: Cache operations
 * Labels: operation (hit|miss), type (search|product)
 */
export const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'type'],
  registers: [register]
});

/**
 * Counter: Cache hits
 * Labels: source (vitrine|search)
 */
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['source'],
  registers: [register]
});

/**
 * Counter: Cache misses
 * Labels: source (vitrine|search)
 */
export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['source'],
  registers: [register]
});

/**
 * Counter: FTS5 queries executed
 */
export const ftsQueriesTotal = new Counter({
  name: 'fts_queries_total',
  help: 'Total number of FTS5 queries executed',
  registers: [register]
});

/**
 * Histogram: FTS5 query duration in milliseconds
 * Buckets: 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s, 5s
 */
export const ftsQueryDurationMs = new Histogram({
  name: 'fts_query_duration_ms',
  help: 'FTS5 query duration in milliseconds',
  buckets: [1, 5, 10, 50, 100, 500, 1000, 5000],
  registers: [register]
});

// ==================== SEARCH METRICS ====================

/**
 * Counter: Total search requests
 * Labels: status (success|error)
 */
export const searchRequestsTotal = new Counter({
  name: 'search_requests_total',
  help: 'Total number of search requests',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Counter: Search errors
 * Labels: error_type
 */
export const searchErrorsTotal = new Counter({
  name: 'search_errors_total',
  help: 'Total number of search errors',
  labelNames: ['error_type'],
  registers: [register]
});

/**
 * Histogram: Search latency in seconds
 * Buckets: 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s, 10s
 */
export const searchLatencySeconds = new Histogram({
  name: 'search_latency_seconds',
  help: 'Search request latency in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

/**
 * Counter: Search results by source
 * Labels: source (digikey|mouser|tme|farnell)
 */
export const searchResultsBySource = new Counter({
  name: 'search_results_by_source_total',
  help: 'Total number of search results by source',
  labelNames: ['source'],
  registers: [register]
});

// ==================== RATE LIMIT METRICS ====================

/**
 * Counter: Rate limit hits
 * Labels: endpoint
 */
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint'],
  registers: [register]
});

// ==================== SETTINGS METRICS ====================

export const settingsReadsTotal = new Counter({
  name: 'settings_reads_total',
  help: 'Total number of settings reads',
  labelNames: ['key'],
  registers: [register]
});

export const settingsUpdatesTotal = new Counter({
  name: 'settings_updates_total',
  help: 'Total number of settings updates',
  labelNames: ['key'],
  registers: [register]
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Update ordersByStatus gauge from database
 * @param {Object} db - SQLite database instance
 */
export function updateOrdersByStatusGauge(db) {
  if (!db) return;
  
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM orders 
    GROUP BY status
  `).all();

  // Reset all gauges to 0 first
  ['pending', 'processing', 'completed', 'cancelled'].forEach(status => {
    ordersByStatus.set({ status }, 0);
  });

  // Set actual counts
  statusCounts.forEach(row => {
    ordersByStatus.set({ status: row.status }, row.count);
  });
}

/**
 * Get metrics in Prometheus format
 * @returns {Promise<string>} Metrics in text format
 */
export async function getMetrics() {
  return register.metrics();
}

/**
 * Get metrics content type
 * @returns {string} Content-Type header value
 */
export function getMetricsContentType() {
  return register.contentType;
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics() {
  register.clear();
}

export default {
  register,
  ordersTotal,
  ordersByStatus,
  orderCreateDuration,
  httpRequestsTotal,
  httpRequestDuration,
  apiCallsTotal,
  apiCallDuration,
  cacheOperations,
  cacheHitsTotal,
  cacheMissesTotal,
  ftsQueriesTotal,
  ftsQueryDurationMs,
  searchRequestsTotal,
  searchErrorsTotal,
  searchLatencySeconds,
  searchResultsBySource,
  rateLimitHits,
  settingsReadsTotal,
  settingsUpdatesTotal,
  updateOrdersByStatusGauge,
  getMetrics,
  getMetricsContentType,
  clearMetrics
};
