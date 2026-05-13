import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDB, clearDB, disconnectDB } from '../helpers/db';

const app = createApp();

const clientUser = {
  name: 'Test Client',
  email: 'testclient@example.com',
  password: 'Password123!',
  role: 'client',
};

beforeAll(() => connectDB());
afterEach(() => clearDB());
afterAll(() => disconnectDB());

describe('POST /api/auth/register', () => {
  it('registers a new user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send(clientUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(clientUser.email);
    expect(res.body.data.user.role).toBe('client');
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(clientUser);
    const res = await request(app).post('/api/auth/register').send(clientUser);
    expect(res.status).toBe(409);
  });

  it('rejects invalid email with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...clientUser, email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('rejects short name with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...clientUser, name: 'A' });
    expect(res.status).toBe(422);
  });

  it('rejects short password with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...clientUser, password: '123' });
    expect(res.status).toBe(422);
  });

  it('creates a tasker profile when role is tasker', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...clientUser, email: 'tasker@example.com', role: 'tasker' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('tasker');
  });
});

// Login, /me, and logout share a single beforeAll login to stay under rate limit
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(clientUser);
  });

  it('returns accessToken and sets refresh cookie on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: clientUser.email, password: clientUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(clientUser.email);
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: clientUser.email, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: clientUser.password });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me and POST /api/auth/logout', () => {
  let accessToken: string;

  // Single login shared across all tests to stay under rate limit
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(clientUser);
    const login = await request(app).post('/api/auth/login').send({ email: clientUser.email, password: clientUser.password });
    accessToken = login.body.data.accessToken;
  });

  afterAll(() => clearDB());

  it('GET /api/auth/me returns current user when authenticated', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(clientUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('GET /api/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns 401 with invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout clears refresh cookie', async () => {
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.includes('refreshToken=;'))).toBe(true);
  });
});
