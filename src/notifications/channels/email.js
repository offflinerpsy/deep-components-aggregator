/**
 * Email notification channel
 */

import { getSetting } from '../../utils/settings.js';
import { sendMail } from '../../lib/mailer.mjs';

/**
 * Send notification via email
 * @param {Object} notification Notification data
 * @param {string} notification.title Notification title
 * @param {string} notification.message Notification message
 * @param {string} notification.type Notification type
 * @param {Object} notification.payload Additional data
 * @param {string} notification.priority Notification priority
 * @param {Object} options Channel options
 * @param {string} options.to Recipient email (optional, defaults to admin email from settings)
 * @returns {Promise<Object>} Result
 */
export async function sendEmailNotification(notification, options = {}) {
  try {
    // Get recipient from options or settings
    const to = options.to || await getSetting('notification_email', null);
    
    if (!to) {
      throw new Error('No recipient email specified and no default notification_email setting found');
    }
    
    // Create email subject based on notification type and priority
    let subject = notification.title;
    
    if (notification.priority === 'high') {
      subject = `[ВАЖНО] ${subject}`;
    }
    
    // Create email content
    const text = notification.message;
    const html = `<p>${notification.message.replace(/\n/g, '<br>')}</p>`;
    
    // Add additional data if available
    if (notification.payload && Object.keys(notification.payload).length > 0) {
      const payloadHtml = Object.entries(notification.payload)
        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
        .join('<br>');
      
      html += `<div style="margin-top: 20px; padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;">
        <p><strong>Дополнительная информация:</strong></p>
        <p>${payloadHtml}</p>
      </div>`;
    }
    
    // Send email
    const result = await sendMail({
      to,
      subject,
      text,
      html
    });
    
    return {
      success: result.ok,
      channel: 'email',
      recipient: to,
      error: result.ok ? null : result.error
    };
  } catch (error) {
    console.error('Email notification error:', error);
    return {
      success: false,
      channel: 'email',
      error: error.message
    };
  }
}
