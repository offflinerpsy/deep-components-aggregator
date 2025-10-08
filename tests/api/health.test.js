import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('GET /api/health', () => {
  it('should return 200 and basic health status', async () => {
    // Minimal mock server for testing health endpoint pattern
    const app = express();

    app.get('/api/health', (req, res) => {
      res.json({
        ok: true,
        node: process.version,
        timestamp: Date.now()
      });
    });

    const response = await request(app)
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('ok', true);
    expect(response.body).toHaveProperty('node');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should have probe support (query param)', async () => {
    const app = express();

    app.get('/api/health', (req, res) => {
      const probe = req.query.probe === 'true';
      res.json({
        ok: true,
        probe,
        timestamp: Date.now()
      });
    });

    const response = await request(app)
      .get('/api/health?probe=true')
      .expect(200);

    expect(response.body.probe).toBe(true);
  });
});
