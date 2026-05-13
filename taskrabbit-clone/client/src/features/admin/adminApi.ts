import { createApi } from '@reduxjs/toolkit/query/react';
import { IUser, ITask, IReview, IDispute, ICategory, ITaskerProfile } from '../../types';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';

interface ApiResponse<T> { data: T; success: boolean; message: string; }

interface AdminStats {
  users: { total: number; taskers: number; clients: number; recentSignups: number };
  tasks: Record<string, number>;
  revenue: { total: number; monthly: { _id: { year: number; month: number }; revenue: number; tasks: number }[] };
  openDisputes: number;
  pendingReviews: number;
}

interface AdminFinancials {
  summary: { totalRevenue: number; totalTaskerEarnings: number; totalTaskValue: number; capturedTasks: number };
  monthly: { _id: { year: number; month: number }; revenue: number; earnings: number; taskValue: number; count: number }[];
  topCategories: { _id: string; name: string; icon?: string; revenue: number; count: number }[];
  topTaskers: { _id: string; name: string; avatar?: string; earnings: number; count: number }[];
  paymentBreakdown: { _id: string; count: number; value: number }[];
  period: string;
}

export interface PlatformSettingsData {
  _id: string;
  platformFeePercent: number;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  maxTaskPrice: number;
  contactEmail: string;
}

export interface RecentActivity {
  recentUsers: (IUser & { createdAt?: string })[];
  recentTasks: (ITask & { createdAt?: string })[];
  recentDisputes: (IDispute & { createdAt?: string })[];
}

export interface AuditLogEntry {
  _id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  keepUnusedDataFor: 30,
  baseQuery: makeBaseQuery('/api/admin'),
  tagTypes: ['AdminUser', 'AdminTask', 'AdminReview', 'AdminDispute', 'AdminStats', 'AdminCategory', 'AdminTasker', 'AdminFinancials', 'AdminSettings', 'AdminActivity', 'AdminAuditLog'],
  endpoints: (builder) => ({
    // ── Stats ──
    getStats: builder.query<AdminStats, void>({
      query: () => '/stats',
      transformResponse: (res: ApiResponse<AdminStats>) => res.data,
      providesTags: ['AdminStats'],
    }),

    // ── Users ──
    getUsers: builder.query<{ users: IUser[]; total: number; page: number; pages: number }, { page?: number; role?: string; search?: string }>({
      query: ({ page = 1, role, search }) => {
        const p = new URLSearchParams({ page: String(page) });
        if (role) p.set('role', role);
        if (search) p.set('search', search);
        return `/users?${p}`;
      },
      transformResponse: (res: ApiResponse<{ users: IUser[]; total: number; page: number; pages: number }>) => res.data,
      providesTags: ['AdminUser'],
    }),
    updateUserRole: builder.mutation<IUser, { id: string; role: string }>({
      query: ({ id, role }) => ({ url: `/users/${id}/role`, method: 'PUT', body: { role } }),
      transformResponse: (res: ApiResponse<IUser>) => res.data,
      invalidatesTags: ['AdminUser', 'AdminStats'],
    }),
    banUser: builder.mutation<IUser, { id: string; banned: boolean }>({
      query: ({ id, banned }) => ({ url: `/users/${id}/ban`, method: 'PUT', body: { banned } }),
      transformResponse: (res: ApiResponse<IUser>) => res.data,
      invalidatesTags: ['AdminUser'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminUser', 'AdminStats', 'AdminTasker'],
    }),

    // ── Tasks ──
    getAllTasks: builder.query<{ tasks: ITask[]; total: number; page: number; pages: number }, { page?: number; status?: string; search?: string }>({
      query: ({ page = 1, status, search }) => {
        const p = new URLSearchParams({ page: String(page) });
        if (status) p.set('status', status);
        if (search) p.set('search', search);
        return `/tasks?${p}`;
      },
      transformResponse: (res: ApiResponse<{ tasks: ITask[]; total: number; page: number; pages: number }>) => res.data,
      providesTags: ['AdminTask'],
    }),

    // ── Assign tasker to task ──
    assignTasker: builder.mutation<ITask, { taskId: string; taskerId: string }>({
      query: ({ taskId, taskerId }) => ({ url: `/tasks/${taskId}/assign`, method: 'PUT', body: { taskerId } }),
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      invalidatesTags: ['AdminTask', 'AdminStats'],
    }),

    // ── Reviews ──
    getPendingReviews: builder.query<IReview[], void>({
      query: () => '/reviews/pending',
      transformResponse: (res: ApiResponse<IReview[]>) => res.data,
      providesTags: ['AdminReview'],
    }),
    moderateReview: builder.mutation<IReview, { id: string; approved: boolean }>({
      query: ({ id, approved }) => ({ url: `/reviews/${id}/moderate`, method: 'PUT', body: { approved } }),
      transformResponse: (res: ApiResponse<IReview>) => res.data,
      invalidatesTags: ['AdminReview', 'AdminStats'],
    }),

    // ── Disputes ──
    getAllDisputes: builder.query<{ disputes: IDispute[]; total: number; page: number; pages: number }, { page?: number; status?: string }>({
      query: ({ page = 1, status }) => {
        const p = new URLSearchParams({ page: String(page) });
        if (status) p.set('status', status);
        return `/disputes?${p}`;
      },
      transformResponse: (res: ApiResponse<{ disputes: IDispute[]; total: number; page: number; pages: number }>) => res.data,
      providesTags: ['AdminDispute'],
    }),
    resolveDispute: builder.mutation<IDispute, { id: string; status: string; adminNotes?: string; resolution?: string; refundAmount?: number }>({
      query: ({ id, ...body }) => ({ url: `/disputes/${id}/resolve`, method: 'PUT', body }),
      transformResponse: (res: ApiResponse<IDispute>) => res.data,
      invalidatesTags: ['AdminDispute', 'AdminStats'],
    }),

    // ── Categories ──
    getAdminCategories: builder.query<{ categories: ICategory[]; total: number; page: number; pages: number }, { page?: number; search?: string }>({
      query: ({ page = 1, search } = {}) => {
        const p = new URLSearchParams({ page: String(page), limit: '50' });
        if (search) p.set('search', search);
        return `/categories?${p}`;
      },
      transformResponse: (res: ApiResponse<{ categories: ICategory[]; total: number; page: number; pages: number }>) => res.data,
      providesTags: ['AdminCategory'],
    }),
    createCategory: builder.mutation<ICategory, Partial<ICategory>>({
      query: (body) => ({ url: '/categories', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ICategory>) => res.data,
      invalidatesTags: ['AdminCategory'],
    }),
    updateCategory: builder.mutation<ICategory, { id: string } & Partial<ICategory>>({
      query: ({ id, ...body }) => ({ url: `/categories/${id}`, method: 'PUT', body }),
      transformResponse: (res: ApiResponse<ICategory>) => res.data,
      invalidatesTags: ['AdminCategory'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminCategory'],
    }),

    // ── Financials ──
    getFinancials: builder.query<AdminFinancials, { period?: string }>({
      query: ({ period = '6m' } = {}) => `/financials?period=${period}`,
      transformResponse: (res: ApiResponse<AdminFinancials>) => res.data,
      providesTags: ['AdminFinancials'],
    }),

    // ── Taskers ──
    getAdminTaskers: builder.query<{ taskers: ITaskerProfile[]; total: number; page: number; pages: number }, { page?: number; search?: string; elite?: string }>({
      query: ({ page = 1, search, elite } = {}) => {
        const p = new URLSearchParams({ page: String(page) });
        if (search) p.set('search', search);
        if (elite) p.set('elite', elite);
        return `/taskers?${p}`;
      },
      transformResponse: (res: ApiResponse<{ taskers: ITaskerProfile[]; total: number; page: number; pages: number }>) => res.data,
      providesTags: ['AdminTasker'],
    }),
    toggleEliteBadge: builder.mutation<ITaskerProfile, { id: string; isElite: boolean }>({
      query: ({ id, isElite }) => ({ url: `/taskers/${id}/elite`, method: 'PUT', body: { isElite } }),
      transformResponse: (res: ApiResponse<ITaskerProfile>) => res.data,
      invalidatesTags: ['AdminTasker', 'AdminStats'],
    }),
    toggleBackgroundCheck: builder.mutation<ITaskerProfile, { id: string; backgroundChecked: boolean }>({
      query: ({ id, backgroundChecked }) => ({ url: `/taskers/${id}/background-check`, method: 'PUT', body: { backgroundChecked } }),
      transformResponse: (res: ApiResponse<ITaskerProfile>) => res.data,
      invalidatesTags: ['AdminTasker'],
    }),

    // ── Broadcast ──
    broadcastNotification: builder.mutation<void, { title: string; body: string; link?: string; userIds?: string[] }>({
      query: (body) => ({ url: '/notifications/broadcast', method: 'POST', body }),
    }),

    // ── User detail ──
    getUserById: builder.query<{ user: IUser; profile: ITaskerProfile | null; taskCount: number }, string>({
      query: (id) => `/users/${id}`,
      transformResponse: (res: ApiResponse<{ user: IUser; profile: ITaskerProfile | null; taskCount: number }>) => res.data,
      providesTags: (_r, _e, id) => [{ type: 'AdminUser', id }],
    }),

    // ── Settings ──
    getSettings: builder.query<PlatformSettingsData, void>({
      query: () => '/settings',
      transformResponse: (res: ApiResponse<PlatformSettingsData>) => res.data,
      providesTags: ['AdminSettings'],
    }),
    updateSettings: builder.mutation<PlatformSettingsData, Partial<PlatformSettingsData>>({
      query: (body) => ({ url: '/settings', method: 'PUT', body }),
      transformResponse: (res: ApiResponse<PlatformSettingsData>) => res.data,
      invalidatesTags: ['AdminSettings'],
    }),

    // ── Recent activity ──
    getRecentActivity: builder.query<RecentActivity, void>({
      query: () => '/recent-activity',
      transformResponse: (res: ApiResponse<RecentActivity>) => res.data,
      providesTags: ['AdminActivity'],
    }),

    // ── Audit log ──
    getAuditLog: builder.query<{ logs: AuditLogEntry[]; total: number; page: number; pages: number }, { page?: number; action?: string; targetType?: string }>({
      query: ({ page = 1, action, targetType } = {}) => {
        const p = new URLSearchParams({ page: String(page) });
        if (action) p.set('action', action);
        if (targetType) p.set('targetType', targetType);
        return `/audit-log?${p}`;
      },
      transformResponse: (res: ApiResponse<{ logs: AuditLogEntry[]; total: number; page: number; pages: number }>) => res.data,
      providesTags: ['AdminAuditLog'],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useBanUserMutation,
  useDeleteUserMutation,
  useGetAllTasksQuery,
  useAssignTaskerMutation,
  useGetPendingReviewsQuery,
  useModerateReviewMutation,
  useGetAllDisputesQuery,
  useResolveDisputeMutation,
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetFinancialsQuery,
  useGetAdminTaskersQuery,
  useToggleEliteBadgeMutation,
  useToggleBackgroundCheckMutation,
  useBroadcastNotificationMutation,
  useGetUserByIdQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetRecentActivityQuery,
  useGetAuditLogQuery,
} = adminApi;
