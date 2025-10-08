// api/order.stream.mjs
// GET /api/order/:id/stream - Server-Sent Events (SSE) for order status tracking
// Follows WHATWG HTML Living Standard for SSE format

import { openDb } from '../src/db/sql.mjs';
import * as sse from '../lib/sse.mjs';

const HEARTBEAT_INTERVAL_MS = 15000; // 15s heartbeat to prevent connection timeout

/**
 * Stream order status updates via SSE
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function streamOrderStatus(req, res) {
  const { id } = req.params;

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  // Open SSE connection with proper headers
  sse.open(res);

  const db = openDb();
  let heartbeatTimer = null;

  try {
    // Get initial order status
    const stmt = db.prepare(`
      SELECT 
        id, 
        status, 
        created_at, 
        updated_at,
        customer_name,
        mpn,
        manufacturer,
        qty
      FROM orders 
      WHERE id = ?
    `);
    const order = stmt.get(id);

    if (!order) {
      // Send error event and close
      sse.send(res, 'error', { message: 'Order not found', orderId: id });
      sse.done(res);
      return res.end();
    }

    // Send initial order status
    sse.send(res, 'status', {
      orderId: order.id,
      status: order.status,
      customer: order.customer_name,
      item: {
        mpn: order.mpn,
        manufacturer: order.manufacturer,
        qty: order.qty
      },
      timeline: {
        created: order.created_at,
        updated: order.updated_at
      }
    });

    // Send status timeline (for UI visualization)
    const statusSteps = ['pending', 'processing', 'completed'];
    const currentIndex = statusSteps.indexOf(order.status);
    
    sse.send(res, 'timeline', {
      steps: statusSteps.map((step, index) => ({
        name: step,
        completed: index <= currentIndex,
        active: index === currentIndex
      }))
    });

    // Start heartbeat to keep connection alive
    heartbeatTimer = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatTimer);
        return;
      }
      sse.heartbeat(res);
    }, HEARTBEAT_INTERVAL_MS);

    // Send completion event
    sse.done(res);

    // Cleanup on client disconnect
    req.on('close', () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    });

  } catch (err) {
    console.error('[order.stream] Error:', err);
    
    if (!res.writableEnded) {
      sse.send(res, 'error', { message: 'Internal server error' });
      sse.done(res);
      res.end();
    }

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
  }
}
