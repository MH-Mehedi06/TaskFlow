import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { IDispute } from '../../types';

interface ApiResponse<T> { data: T; success: boolean; message: string; }

export const disputeApi = createApi({
  reducerPath: 'disputeApi',
  keepUnusedDataFor: 60,
  baseQuery: makeBaseQuery('/api/disputes'),
  tagTypes: ['Dispute'],
  endpoints: (builder) => ({
    getMyDisputes: builder.query<IDispute[], void>({
      query: () => '/',
      transformResponse: (res: ApiResponse<IDispute[]>) => res.data,
      providesTags: ['Dispute'],
    }),
    getDisputeById: builder.query<IDispute, string>({
      query: (id) => `/${id}`,
      transformResponse: (res: ApiResponse<IDispute>) => res.data,
      providesTags: ['Dispute'],
    }),
    createDispute: builder.mutation<IDispute, { taskId: string; reason: string; description: string }>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res: ApiResponse<IDispute>) => res.data,
      invalidatesTags: ['Dispute'],
    }),
    uploadEvidence: builder.mutation<IDispute, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({ url: `/${id}/evidence`, method: 'PUT', body: formData }),
      transformResponse: (res: ApiResponse<IDispute>) => res.data,
      invalidatesTags: ['Dispute'],
    }),
    updateDisputeStatus: builder.mutation<IDispute, { id: string; status: string; adminNotes?: string }>({
      query: ({ id, ...body }) => ({ url: `/${id}/status`, method: 'PUT', body }),
      transformResponse: (res: ApiResponse<IDispute>) => res.data,
      invalidatesTags: ['Dispute'],
    }),
    resolveDispute: builder.mutation<IDispute, { id: string; resolution: string; refundAmount?: number; adminNotes?: string }>({
      query: ({ id, ...body }) => ({ url: `/${id}/resolve`, method: 'POST', body }),
      transformResponse: (res: ApiResponse<IDispute>) => res.data,
      invalidatesTags: ['Dispute'],
    }),
  }),
});

export const {
  useGetMyDisputesQuery,
  useGetDisputeByIdQuery,
  useCreateDisputeMutation,
  useUploadEvidenceMutation,
  useUpdateDisputeStatusMutation,
  useResolveDisputeMutation,
} = disputeApi;
