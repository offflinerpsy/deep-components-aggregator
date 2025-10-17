/**
 * Simple logger utility
 */

// Simple logger implementation
const logger = {
  info: (message) => {
    console.log(`[INFO] ${message}`);
  },
  warn: (message) => {
    console.warn(`[WARN] ${message}`);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

export default logger;