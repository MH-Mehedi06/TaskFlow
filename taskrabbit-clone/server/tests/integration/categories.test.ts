import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDB, clearDB, disconnectDB } from '../helpers/db';
import { Category } from '../../src/models/Category';

const app = createApp();

const adminUser = { name: 'Admin User', email: 'admin@example.com', password: 'Admin123!' };
let adminToken: string;

beforeAll(async () => {
  await connectDB();
  // Register as client then promote to admin (register endpoint rejects 'admin' role)
  await request(app).post('/api/auth/register').send({ ...adminUser, role: 'client' });
  const { User } = await import('../../src/models/User');
  await User.updateOne({ email: adminUser.email }, { role: 'admin' });
  const login = await request(app).post('/api/auth/login').send({ email: adminUser.email, password: adminUser.password });
  adminToken = login.body.data.accessToken;
});

afterAll(() => disconnectDB());

// Add unique query params to bypass Redis response cache between tests
const fresh = () => `/api/categories?t=${Date.now()}`;
const freshSlug = (slug: string) => `/api/categories/${slug}?t=${Date.now()}`;

describe('GET /api/categories', () => {
  afterEach(() => Category.deleteMany({}));

  it('returns empty array when no categories exist', async () => {
    const res = await request(app).get(fresh());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns active parent categories with nested children', async () => {
    const parent = await Category.create({ name: 'Cleaning', startingPrice: 50 });
    await Category.create({ name: 'Deep Cleaning', parentId: parent._id, startingPrice: 80 });
    await Category.create({ name: 'Regular Cleaning', parentId: parent._id, startingPrice: 40 });

    const res = await request(app).get(fresh());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Cleaning');
    expect(res.body.data[0].children).toHaveLength(2);
  });

  it('excludes inactive categories', async () => {
    await Category.create({ name: 'Active Cat', isActive: true });
    await Category.create({ name: 'Inactive Cat', isActive: false });

    const res = await request(app).get(fresh());
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Active Cat');
  });
});

describe('GET /api/categories/:slug', () => {
  afterEach(() => Category.deleteMany({}));

  it('returns category by slug', async () => {
    await Category.create({ name: 'Plumbing', startingPrice: 60 });

    const res = await request(app).get(freshSlug('plumbing'));
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Plumbing');
    expect(res.body.data.slug).toBe('plumbing');
  });

  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get(freshSlug('nonexistent-xyz'));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/categories (admin only)', () => {
  afterEach(() => Category.deleteMany({}));

  it('creates a category when admin', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electrical', startingPrice: 75 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Electrical');
    expect(res.body.data.slug).toBe('electrical');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Should Fail', startingPrice: 50 });
    expect(res.status).toBe(401);
  });
});
