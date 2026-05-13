import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { INotification } from '../../types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message: string;
  success: boolean;
}

interface NotificationsResponse {
  notifications: INotification[];
  total: number;
  unread: number;
  page: number;
  pages: number;
}

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: makeBaseQuery('/api/notifications'),
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, { page?: number }>({
      query: ({ page = 1 }) => `?page=${page}`,
      transformResponse: (res: ApiResponse<NotificationsResponse>) => res.data,
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<number, void>({
      query: () => '/unread-count',
      transformResponse: (res: ApiResponse<number>) => res.data,
      providesTags: ['Notification'],
    }),
    markRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/${id}/read`, method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),
    markAllRead: builder.mutation<void, void>({
      query: () => ({ url: '/read-all', method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;
