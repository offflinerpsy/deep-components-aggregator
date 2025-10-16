/**
 * Settings utility functions
 * Provides a simple API for getting and setting application settings
 */

import { Setting } from '../db/models.js';

// Cache settings in memory
const settingsCache = new Map();
let cacheInitialized = false;

/**
 * Initialize settings cache
 * @returns {Promise<void>}
 */
export async function initSettingsCache() {
  try {
    const settings = await Setting.findAll();
    settings.forEach(setting => {
      settingsCache.set(setting.key, setting.getTypedValue());
    });
    cacheInitialized = true;
    console.log(`[settings] Cache initialized with ${settings.length} settings`);
  } catch (error) {
    console.error('[settings] Failed to initialize cache:', error);
    throw error;
  }
}

/**
 * Get a setting value
 * @param {string} key Setting key
 * @param {*} defaultValue Default value if setting not found
 * @param {boolean} [useCache=true] Whether to use cache
 * @returns {Promise<*>} Setting value
 */
export async function getSetting(key, defaultValue = null, useCache = true) {
  // Initialize cache if not done yet
  if (!cacheInitialized && useCache) {
    await initSettingsCache();
  }
  
  // Try to get from cache first
  if (useCache && settingsCache.has(key)) {
    return settingsCache.get(key);
  }
  
  // Get from database
  try {
    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      return defaultValue;
    }
    
    const value = setting.getTypedValue();
    
    // Update cache
    if (useCache) {
      settingsCache.set(key, value);
    }
    
    return value;
  } catch (error) {
    console.error(`[settings] Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a setting value
 * @param {string} key Setting key
 * @param {*} value Setting value
 * @param {Object} [options={}] Additional options
 * @param {string} [options.type] Value type (auto-detected if not provided)
 * @param {string} [options.category='general'] Setting category
 * @param {string} [options.description] Setting description
 * @param {boolean} [options.is_public=false] Whether the setting is public
 * @returns {Promise<Setting>} Created or updated setting
 */
export async function setSetting(key, value, options = {}) {
  // Determine value type if not provided
  let type = options.type;
  if (!type) {
    if (typeof value === 'string') {
      type = 'string';
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (Array.isArray(value)) {
      type = 'array';
      value = JSON.stringify(value);
    } else if (typeof value === 'object') {
      type = 'json';
      value = JSON.stringify(value);
    } else {
      type = 'string';
      value = String(value);
    }
  }
  
  // Convert value to string for storage
  const stringValue = type === 'string' ? value : 
                     (type === 'boolean' ? (value ? 'true' : 'false') : 
                     (type === 'json' || type === 'array' ? (typeof value === 'string' ? value : JSON.stringify(value)) : 
                     String(value)));
  
  try {
    // Find existing setting or create new one
    let setting = await Setting.findOne({ where: { key } });
    
    if (setting) {
      // Update existing setting
      await setting.update({
        value: stringValue,
        type,
        ...(options.category && { category: options.category }),
        ...(options.description && { description: options.description }),
        ...(options.is_public !== undefined && { is_public: options.is_public })
      });
    } else {
      // Create new setting
      setting = await Setting.create({
        key,
        value: stringValue,
        type,
        category: options.category || 'general',
        description: options.description || '',
        is_public: options.is_public || false
      });
    }
    
    // Update cache
    if (cacheInitialized) {
      settingsCache.set(key, setting.getTypedValue());
    }
    
    return setting;
  } catch (error) {
    console.error(`[settings] Error setting ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a setting
 * @param {string} key Setting key
 * @returns {Promise<boolean>} Whether the setting was deleted
 */
export async function deleteSetting(key) {
  try {
    const result = await Setting.destroy({ where: { key } });
    
    // Update cache
    if (cacheInitialized && result > 0) {
      settingsCache.delete(key);
    }
    
    return result > 0;
  } catch (error) {
    console.error(`[settings] Error deleting setting ${key}:`, error);
    return false;
  }
}

/**
 * Get all public settings
 * @returns {Promise<Object>} Object with key-value pairs
 */
export async function getPublicSettings() {
  try {
    const settings = await Setting.findAll({ where: { is_public: true } });
    const result = {};
    
    settings.forEach(setting => {
      result[setting.key] = setting.getTypedValue();
    });
    
    return result;
  } catch (error) {
    console.error('[settings] Error getting public settings:', error);
    return {};
  }
}

/**
 * Get all settings in a category
 * @param {string} category Category name
 * @returns {Promise<Object>} Object with key-value pairs
 */
export async function getCategorySettings(category) {
  try {
    const settings = await Setting.findAll({ where: { category } });
    const result = {};
    
    settings.forEach(setting => {
      result[setting.key] = setting.getTypedValue();
    });
    
    return result;
  } catch (error) {
    console.error(`[settings] Error getting settings for category ${category}:`, error);
    return {};
  }
}

export default {
  getSetting,
  setSetting,
  deleteSetting,
  getPublicSettings,
  getCategorySettings,
  initSettingsCache
};
