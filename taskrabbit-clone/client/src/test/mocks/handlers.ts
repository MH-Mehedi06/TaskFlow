import { http, HttpResponse } from 'msw';

const mockUser = {
  _id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'client' as const,
  isVerified: true,
  isActive: true,
  notifications: { email: true, push: true },
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockCategory = {
  _id: 'cat1',
  name: 'Cleaning',
  slug: 'cleaning',
  description: 'Home cleaning services',
  startingPrice: 50,
  isActive: true,
  sortOrder: 1,
  trending: true,
  trendingTags: ['popular'],
  children: [],
};

export const handlers = [
  http.get('/api/auth/me', () =>
    HttpResponse.json({ success: true, data: mockUser, message: 'Success' })
  ),

  http.post('/api/auth/login', () =>
    HttpResponse.json({
      success: true,
      data: { user: mockUser, accessToken: 'mock.access.token' },
      message: 'Login successful',
    })
  ),

  http.post('/api/auth/register', () =>
    HttpResponse.json(
      { success: true, data: { user: mockUser }, message: 'Registration successful' },
      { status: 201 }
    )
  ),

  http.post('/api/auth/logout', () =>
    HttpResponse.json({ success: true, data: null, message: 'Logged out' })
  ),

  http.get('/api/categories', () =>
    HttpResponse.json({
      success: true,
      data: [mockCategory],
      message: 'Categories fetched',
    })
  ),

  http.get('/api/tasks', () =>
    HttpResponse.json({
      success: true,
      data: { tasks: [], total: 0, page: 1, pages: 0 },
      message: 'Tasks fetched',
    })
  ),

  http.get('/api/tasks/stats', () =>
    HttpResponse.json({
      success: true,
      data: { posted: 2, assigned: 1, in_progress: 0, completed: 5, cancelled: 0, total: 8, totalSpent: 400, totalEarned: 0, upcoming: 3 },
      message: 'Stats fetched',
    })
  ),
];
