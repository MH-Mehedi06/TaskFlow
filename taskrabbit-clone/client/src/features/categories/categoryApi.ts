import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { ICategory, ApiResponse } from '../../types';

export const categoryApi = createApi({
  reducerPath: 'categoryApi',
  baseQuery: makeBaseQuery('/api/categories'),
  tagTypes: ['Category'],
  keepUnusedDataFor: 3600,
  endpoints: (builder) => ({
    getCategories: builder.query<ICategory[], void>({
      query: () => '/',
      transformResponse: (res: ApiResponse<ICategory[]>) => res.data,
      providesTags: ['Category'],
    }),
    getCategoryBySlug: builder.query<ICategory, string>({
      query: (slug) => `/${slug}`,
      transformResponse: (res: ApiResponse<ICategory>) => res.data,
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<ICategory, Partial<ICategory>>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ICategory>) => res.data,
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<ICategory, { id: string; body: Partial<ICategory> }>({
      query: ({ id, body }) => ({ url: `/${id}`, method: 'PUT', body }),
      transformResponse: (res: ApiResponse<ICategory>) => res.data,
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryBySlugQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
