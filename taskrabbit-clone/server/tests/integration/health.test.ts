import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDB, disconnectDB } from '../helpers/db';

const app = createApp();

beforeAll(() => connectDB());
afterAll(() => disconnectDB());

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.status).toBe(404);
  });
});
