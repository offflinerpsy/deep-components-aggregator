/**
 * Notification dispatcher
 * Handles sending notifications through different channels
 */

import { getSetting } from '../utils/settings.js';
import { sendEmailNotification } from './channels/email.js';
// Telegram channel disabled by requirement
// import { sendTelegramNotification } from './channels/telegram.js';
import { createNotification } from '../utils/notifications.js';

/**
 * Send notification through configured channels
 * @param {Object} notification Notification data
 * @param {string} notification.title Notification title
 * @param {string} notification.message Notification message
 * @param {string} notification.type Notification type (order, system, alert)
 * @param {Object} [notification.payload={}] Additional data
 * @param {string} [notification.priority='normal'] Notification priority (low, normal, high)
 * @param {Object} [options={}] Dispatch options
 * @param {boolean} [options.storeInDb=true] Whether to store notification in database
 * @param {string[]} [options.channels] Specific channels to use (overrides settings)
 * @param {Object} [options.channelOptions={}] Channel-specific options
 * @returns {Promise<Object>} Dispatch results
 */
export async function dispatchNotification(notification, options = {}) {
  try {
    const { storeInDb = true, channels: specificChannels, channelOptions = {} } = options;
    const results = { success: false, channels: {} };

    // Store notification in database if requested
    if (storeInDb) {
      try {
        const dbNotification = await createNotification({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          payload: notification.payload || {},
          priority: notification.priority || 'normal'
        });

        results.dbNotification = {
          id: dbNotification.id,
          success: true
        };
      } catch (dbError) {
        console.error('Failed to store notification in database:', dbError);
        results.dbNotification = {
          success: false,
          error: dbError.message
        };
      }
    }

    // Determine which channels to use
    const channels = specificChannels || await getEnabledChannels(notification);

    // Send through each enabled channel
    const channelPromises = [];

    if (channels.includes('email')) {
      channelPromises.push(
        sendEmailNotification(notification, channelOptions.email || {})
          .then(result => {
            results.channels.email = result;
            return result;
          })
      );
    }

    // Telegram disabled – no calls

    // Wait for all channels to complete
    if (channelPromises.length > 0) {
      const channelResults = await Promise.all(channelPromises);
      results.success = channelResults.some(result => result.success);
    }

    return results;
  } catch (error) {
    console.error('Notification dispatch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get enabled notification channels based on settings and notification type/priority
 * @param {Object} notification Notification data
 * @returns {Promise<string[]>} Enabled channels
 */
async function getEnabledChannels(notification) {
  const enabledChannels = [];

  // Only email remains enabled (controlled by settings)
  const emailEnabled = await getSetting('notifications_email_enabled', true);
  if (emailEnabled) {
    enabledChannels.push('email');
  }

  return enabledChannels;
}

export default {
  dispatchNotification
};

