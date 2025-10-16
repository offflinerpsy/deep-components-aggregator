/**
 * Telegram notification channel
 */

import { getSetting } from '../../utils/settings.js';

/**
 * Send notification via Telegram
 * @param {Object} notification Notification data
 * @param {string} notification.title Notification title
 * @param {string} notification.message Notification message
 * @param {string} notification.type Notification type
 * @param {Object} notification.payload Additional data
 * @param {string} notification.priority Notification priority
 * @param {Object} options Channel options
 * @param {string} options.chatId Telegram chat ID (optional, defaults to telegram_chat_id setting)
 * @returns {Promise<Object>} Result
 */
export async function sendTelegramNotification(notification, options = {}) {
  try {
    // Get bot token and chat ID from settings
    const botToken = await getSetting('telegram_bot_token', null);
    const chatId = options.chatId || await getSetting('telegram_chat_id', null);
    
    if (!botToken) {
      throw new Error('No Telegram bot token found in settings (telegram_bot_token)');
    }
    
    if (!chatId) {
      throw new Error('No Telegram chat ID specified and no default telegram_chat_id setting found');
    }
    
    // Create message text
    let messageText = `*${escapeMarkdown(notification.title)}*\n\n${escapeMarkdown(notification.message)}`;
    
    // Add priority indicator for high priority
    if (notification.priority === 'high') {
      messageText = `🚨 ${messageText}`;
    }
    
    // Add additional data if available
    if (notification.payload && Object.keys(notification.payload).length > 0) {
      messageText += '\n\n*Дополнительная информация:*\n';
      
      for (const [key, value] of Object.entries(notification.payload)) {
        messageText += `\n• *${escapeMarkdown(key)}:* ${escapeMarkdown(String(value))}`;
      }
    }
    
    // Send message to Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'MarkdownV2'
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description || 'Unknown Telegram API error');
    }
    
    return {
      success: true,
      channel: 'telegram',
      recipient: chatId,
      messageId: result.result?.message_id
    };
  } catch (error) {
    console.error('Telegram notification error:', error);
    return {
      success: false,
      channel: 'telegram',
      error: error.message
    };
  }
}

/**
 * Escape special characters for Markdown V2
 * @param {string} text Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  return String(text)
    .replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');
}
