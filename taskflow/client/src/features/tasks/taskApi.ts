import { createApi } from '@reduxjs/toolkit/query/react';
import { ITask, ApiResponse, PaginatedResponse } from '../../types';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';

type PaginatedTasks = PaginatedResponse<ITask>;

export interface TaskStats {
  posted: number; assigned: number; in_progress: number; completed: number;
  cancelled: number; total: number; totalSpent: number; totalEarned: number; upcoming: number;
}

export const taskApi = createApi({
  reducerPath: 'taskApi',
  keepUnusedDataFor: 30,
  baseQuery: makeBaseQuery('/api/tasks'),
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getMyTaskStats: builder.query<TaskStats, void>({
      query: () => '/stats',
      transformResponse: (res: ApiResponse<TaskStats>) => res.data,
      providesTags: ['Task'],
    }),
    createTask: builder.mutation<ITask, Partial<ITask> & { taskerId?: string }>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      invalidatesTags: ['Task'],
    }),
    getMyTasks: builder.query<PaginatedTasks, Record<string, string | number>>({
      query: (params) => ({ url: '/', params }),
      transformResponse: (res: ApiResponse<PaginatedTasks>) => res.data,
      providesTags: ['Task'],
    }),
    getAvailableTasks: builder.query<PaginatedTasks, Record<string, string | number>>({
      query: (params) => ({ url: '/available', params }),
      transformResponse: (res: ApiResponse<PaginatedTasks>) => res.data,
      providesTags: ['Task'],
    }),
    getTaskById: builder.query<ITask, string>({
      query: (id) => `/${id}`,
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      providesTags: ['Task'],
    }),
    updateTask: builder.mutation<ITask, { id: string } & Partial<ITask>>({
      query: ({ id, ...body }) => ({ url: `/${id}`, method: 'PUT', body }),
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      invalidatesTags: ['Task'],
    }),
    updateTaskStatus: builder.mutation<ITask, { id: string; status: string; taskerId?: string }>({
      query: ({ id, ...body }) => ({ url: `/${id}/status`, method: 'PUT', body }),
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      invalidatesTags: ['Task'],
    }),
    cancelTask: builder.mutation<ITask, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/${id}/cancel`, method: 'POST', body: { reason } }),
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      invalidatesTags: ['Task'],
    }),
    uploadTaskPhotos: builder.mutation<{ photos: string[] }, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({ url: `/${id}/photos`, method: 'POST', body: formData }),
      transformResponse: (res: ApiResponse<{ photos: string[] }>) => res.data,
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useGetMyTaskStatsQuery,
  useCreateTaskMutation,
  useGetMyTasksQuery,
  useGetAvailableTasksQuery,
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useCancelTaskMutation,
  useUploadTaskPhotosMutation,
} = taskApi;
