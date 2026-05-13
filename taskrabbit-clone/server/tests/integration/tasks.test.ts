import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDB, clearDB, disconnectDB } from '../helpers/db';
import { Category } from '../../src/models/Category';

const app = createApp();

const clientUser = { name: 'Client One', email: 'client@example.com', password: 'Client123!', role: 'client' };
const taskerUser = { name: 'Tasker One', email: 'tasker@example.com', password: 'Tasker123!', role: 'tasker' };

let clientToken: string;
let taskerToken: string;
let categoryId: string;

beforeAll(async () => {
  await connectDB();
  await request(app).post('/api/auth/register').send(clientUser);
  await request(app).post('/api/auth/register').send(taskerUser);
  const cLogin = await request(app).post('/api/auth/login').send({ email: clientUser.email, password: clientUser.password });
  const tLogin = await request(app).post('/api/auth/login').send({ email: taskerUser.email, password: taskerUser.password });
  clientToken = cLogin.body.data.accessToken;
  taskerToken = tLogin.body.data.accessToken;
  const cat = await Category.create({ name: 'Home Cleaning', startingPrice: 50 });
  categoryId = String(cat._id);
});

afterEach(async () => {
  const { Task } = await import('../../src/models/Task');
  await Task.deleteMany({});
});

afterAll(() => disconnectDB());

const baseTask = () => ({
  categoryId,
  title: 'Clean my apartment',
  description: 'Need a deep clean of 2-bedroom apartment',
  address: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701', country: 'US' },
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  estimatedHours: 3,
});

describe('POST /api/tasks', () => {
  it('creates a task as authenticated client', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(baseTask());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Clean my apartment');
    expect(res.body.data.status).toBe('posted');
  });

  it('rejects unauthenticated task creation', async () => {
    const res = await request(app).post('/api/tasks').send(baseTask());
    expect(res.status).toBe(401);
  });

  it('rejects missing required fields with 422', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ title: 'No category' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${clientToken}`).send(baseTask());
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${clientToken}`).send({ ...baseTask(), title: 'Second task' });
  });

  it('returns paginated tasks for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('returns empty list for tasker (no assigned tasks)', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${taskerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(0);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns a task by ID', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(baseTask());
    const taskId = created.body.data._id;

    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(taskId);
  });

  it('returns 404 for unknown task ID', async () => {
    const res = await request(app)
      .get('/api/tasks/000000000000000000000000')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tasks/available', () => {
  it('returns posted tasks visible to taskers', async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${clientToken}`).send(baseTask());

    const res = await request(app)
      .get('/api/tasks/available')
      .set('Authorization', `Bearer ${taskerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/tasks/stats', () => {
  it('returns task stats for authenticated user', async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${clientToken}`).send(baseTask());

    const res = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.posted).toBe('number');
    expect(res.body.data.posted).toBeGreaterThanOrEqual(1);
  });
});
