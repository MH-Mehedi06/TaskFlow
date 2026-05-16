import { createApi } from '@reduxjs/toolkit/query/react';
import { ITaskerProfile, ApiResponse, PaginatedResponse } from '../../types';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';

type PaginatedTaskers = PaginatedResponse<ITaskerProfile>;

export const taskerApi = createApi({
  reducerPath: 'taskerApi',
  baseQuery: makeBaseQuery('/api/taskers'),
  tagTypes: ['Tasker'],
  endpoints: (builder) => ({
    getTaskers: builder.query<PaginatedTaskers, Record<string, string | number>>({
      query: (params) => ({ url: '/', params }),
      transformResponse: (res: ApiResponse<PaginatedTaskers>) => res.data,
      keepUnusedDataFor: 60,
    }),
    getTaskerById: builder.query<ITaskerProfile, string>({
      query: (id) => `/${id}`,
      transformResponse: (res: ApiResponse<ITaskerProfile>) => res.data,
      providesTags: ['Tasker'],
    }),
    getMyProfile: builder.query<ITaskerProfile, void>({
      query: () => '/me',
      transformResponse: (res: ApiResponse<ITaskerProfile>) => res.data,
      providesTags: ['Tasker'],
    }),
    updateProfile: builder.mutation<ITaskerProfile, Partial<ITaskerProfile>>({
      query: (body) => ({ url: '/me/profile', method: 'PUT', body }),
      transformResponse: (res: ApiResponse<ITaskerProfile>) => res.data,
      invalidatesTags: ['Tasker'],
    }),
    updateAvailability: builder.mutation<ITaskerProfile, { availability: ITaskerProfile['availability'] }>({
      query: (body) => ({ url: '/me/availability', method: 'PUT', body }),
      transformResponse: (res: ApiResponse<ITaskerProfile>) => res.data,
      invalidatesTags: ['Tasker'],
    }),
    uploadAvatar: builder.mutation<{ avatar: string }, { base64: string; mimeType: string }>({
      query: (body) => ({ url: '/me/avatar', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ avatar: string }>) => res.data,
    }),
    uploadPortfolio: builder.mutation<{ portfolio: string[] }, FormData>({
      query: (body) => ({ url: '/me/portfolio', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ portfolio: string[] }>) => res.data,
      invalidatesTags: ['Tasker'],
    }),
    deletePortfolioImage: builder.mutation<{ portfolio: string[] }, { url: string }>({
      query: (body) => ({ url: '/me/portfolio', method: 'DELETE', body }),
      transformResponse: (res: ApiResponse<{ portfolio: string[] }>) => res.data,
      invalidatesTags: ['Tasker'],
    }),
    semanticSearch: builder.query<ITaskerProfile[], string>({
      query: (q) => `/semantic-search?q=${encodeURIComponent(q)}`,
      transformResponse: (res: ApiResponse<ITaskerProfile[]>) => res.data,
    }),
  }),
});

export const {
  useGetTaskersQuery,
  useGetTaskerByIdQuery,
  useGetMyProfileQuery,
  useUpdateProfileMutation,
  useUpdateAvailabilityMutation,
  useUploadAvatarMutation,
  useUploadPortfolioMutation,
  useDeletePortfolioImageMutation,
  useSemanticSearchQuery,
} = taskerApi;
