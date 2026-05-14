import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { IReview } from '../../types';

interface ApiResponse<T> { data: T; success: boolean; message: string; }

interface ReviewsResponse {
  reviews: IReview[];
  total: number;
  avg: number;
  page: number;
  pages: number;
}

export const reviewApi = createApi({
  reducerPath: 'reviewApi',
  keepUnusedDataFor: 120,
  baseQuery: makeBaseQuery('/api/reviews'),
  tagTypes: ['Review'],
  endpoints: (builder) => ({
    getReviewsByUser: builder.query<ReviewsResponse, { userId: string; page?: number }>({
      query: ({ userId, page = 1 }) => `/user/${userId}?page=${page}`,
      transformResponse: (res: ApiResponse<ReviewsResponse>) => res.data,
      providesTags: ['Review'],
    }),
    getReviewByTask: builder.query<IReview | null, string>({
      query: (taskId) => `/task/${taskId}`,
      transformResponse: (res: ApiResponse<IReview | null>) => res.data,
      providesTags: ['Review'],
    }),
    createReview: builder.mutation<IReview, { taskId: string; rating: number; comment: string; photos?: string[] }>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res: ApiResponse<IReview>) => res.data,
      invalidatesTags: ['Review'],
    }),
    replyToReview: builder.mutation<IReview, { id: string; reply: string }>({
      query: ({ id, reply }) => ({ url: `/${id}/reply`, method: 'PUT', body: { reply } }),
      transformResponse: (res: ApiResponse<IReview>) => res.data,
      invalidatesTags: ['Review'],
    }),
  }),
});

export const {
  useGetReviewsByUserQuery,
  useGetReviewByTaskQuery,
  useCreateReviewMutation,
  useReplyToReviewMutation,
} = reviewApi;
