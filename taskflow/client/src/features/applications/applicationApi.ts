import { createApi } from '@reduxjs/toolkit/query/react';
import { ITaskApplication, ITask, ApiResponse, PaginatedResponse } from '../../types';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';

interface AcceptApplicationResponse {
  task: ITask;
  application: ITaskApplication;
}

interface ApplyPayload {
  taskId: string;
  coverLetter: string;
  proposedRate: number;
}

interface ApplicationActionPayload {
  taskId: string;
  applicationId: string;
}

export const applicationApi = createApi({
  reducerPath: 'applicationApi',
  keepUnusedDataFor: 300,
  baseQuery: makeBaseQuery('/api/tasks'),
  tagTypes: ['Application', 'Task'],
  endpoints: (builder) => ({
    // Tasker: apply to a task
    applyToTask: builder.mutation<ITaskApplication, ApplyPayload>({
      query: ({ taskId, ...body }) => ({ url: `/${taskId}/apply`, method: 'POST', body }),
      transformResponse: (res: ApiResponse<ITaskApplication>) => res.data,
      invalidatesTags: ['Application'],
    }),

    // Client/Admin: get all applications for a task
    getApplications: builder.query<ITaskApplication[], string>({
      query: (taskId) => `/${taskId}/applications`,
      transformResponse: (res: ApiResponse<ITaskApplication[]>) => res.data,
      providesTags: ['Application'],
    }),

    // Tasker: check own application for a task
    checkMyApplication: builder.query<ITaskApplication | null, string>({
      query: (taskId) => `/${taskId}/applications/mine`,
      transformResponse: (res: ApiResponse<ITaskApplication | null>) => res.data,
      providesTags: ['Application'],
    }),

    // Client: accept an application
    acceptApplication: builder.mutation<AcceptApplicationResponse, ApplicationActionPayload>({
      query: ({ taskId, applicationId }) => ({
        url: `/${taskId}/applications/${applicationId}/accept`,
        method: 'POST',
      }),
      transformResponse: (res: ApiResponse<AcceptApplicationResponse>) => res.data,
      invalidatesTags: ['Application', 'Task'],
    }),

    // Client: reject an application
    rejectApplication: builder.mutation<ITaskApplication, ApplicationActionPayload>({
      query: ({ taskId, applicationId }) => ({
        url: `/${taskId}/applications/${applicationId}/reject`,
        method: 'POST',
      }),
      transformResponse: (res: ApiResponse<ITaskApplication>) => res.data,
      invalidatesTags: ['Application'],
    }),

    // Tasker: withdraw own application
    withdrawApplication: builder.mutation<ITaskApplication, string>({
      query: (taskId) => ({ url: `/${taskId}/applications/mine`, method: 'DELETE' }),
      transformResponse: (res: ApiResponse<ITaskApplication>) => res.data,
      invalidatesTags: ['Application'],
    }),

    // Tasker: get all own applications
    getMyApplications: builder.query<PaginatedResponse<ITaskApplication>, Record<string, string | number>>({
      query: (params) => ({ url: '/my-applications', params }),
      transformResponse: (res: ApiResponse<PaginatedResponse<ITaskApplication>>) => res.data,
      providesTags: ['Application'],
    }),
  }),
});

export const {
  useApplyToTaskMutation,
  useGetApplicationsQuery,
  useCheckMyApplicationQuery,
  useAcceptApplicationMutation,
  useRejectApplicationMutation,
  useWithdrawApplicationMutation,
  useGetMyApplicationsQuery,
} = applicationApi;
