/**
 * Utility functions for creating admin notifications
 */

import { AdminNotification } from '../db/models.js';

/**
 * Create a new admin notification
 * @param {Object} options Notification options
 * @param {string} options.title Notification title
 * @param {string} options.message Notification message
 * @param {string} options.type Notification type (order, system, alert)
 * @param {Object} [options.payload] Additional data related to the notification
 * @param {string} [options.priority='normal'] Notification priority (low, normal, high)
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification({ title, message, type, payload = {}, priority = 'normal' }) {
  if (!title || !message || !type) {
    throw new Error('Title, message, and type are required for notifications');
  }

  // Validate type
  const validTypes = ['order', 'system', 'alert'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate priority
  const validPriorities = ['low', 'normal', 'high'];
  if (!validPriorities.includes(priority)) {
    priority = 'normal'; // Default to normal if invalid
  }

  try {
    const notification = await AdminNotification.create({
      title,
      message,
      type,
      payload,
      priority,
      read_at: null
    });

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Create an order notification
 * @param {Object} options Notification options
 * @param {string} options.orderId Order ID
 * @param {string} options.orderCode Human-readable order code
 * @param {string} options.title Notification title
 * @param {string} options.message Notification message
 * @param {string} [options.priority='normal'] Notification priority
 * @returns {Promise<Object>} Created notification
 */
export async function createOrderNotification({ orderId, orderCode, title, message, priority = 'normal' }) {
  return createNotification({
    title,
    message,
    type: 'order',
    payload: { orderId, orderCode },
    priority
  });
}

/**
 * Create a system notification
 * @param {Object} options Notification options
 * @param {string} options.title Notification title
 * @param {string} options.message Notification message
 * @param {string} [options.priority='normal'] Notification priority
 * @param {Object} [options.payload={}] Additional data
 * @returns {Promise<Object>} Created notification
 */
export async function createSystemNotification({ title, message, priority = 'normal', payload = {} }) {
  return createNotification({
    title,
    message,
    type: 'system',
    payload,
    priority
  });
}

/**
 * Create an alert notification
 * @param {Object} options Notification options
 * @param {string} options.title Notification title
 * @param {string} options.message Notification message
 * @param {string} [options.priority='high'] Notification priority
 * @param {Object} [options.payload={}] Additional data
 * @returns {Promise<Object>} Created notification
 */
export async function createAlertNotification({ title, message, priority = 'high', payload = {} }) {
  return createNotification({
    title,
    message,
    type: 'alert',
    payload,
    priority
  });
}

/**
 * Mark a notification as read
 * @param {number|string} id Notification ID
 * @returns {Promise<boolean>} Success status
 */
export async function markNotificationAsRead(id) {
  try {
    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return false;
    }

    await notification.update({ read_at: new Date() });
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Get unread notifications count
 * @returns {Promise<number>} Count of unread notifications
 */
export async function getUnreadNotificationsCount() {
  try {
    return await AdminNotification.count({
      where: { read_at: null }
    });
  } catch (error) {
    console.error('Failed to get unread notifications count:', error);
    return 0;
  }
}

export default {
  createNotification,
  createOrderNotification,
  createSystemNotification,
  createAlertNotification,
  markNotificationAsRead,
  getUnreadNotificationsCount
};
