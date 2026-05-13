import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { IConversation, IMessage } from '../../types';

interface MessagesResponse {
  messages: IMessage[];
  total: number;
  page: number;
  pages: number;
}

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message: string;
  success: boolean;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: makeBaseQuery('/api/conversations'),
  tagTypes: ['Conversation', 'Message'],
  endpoints: (builder) => ({
    getConversations: builder.query<IConversation[], void>({
      query: () => '/',
      transformResponse: (res: ApiResponse<IConversation[]>) => res.data,
      providesTags: ['Conversation'],
    }),
    getMessages: builder.query<MessagesResponse, { conversationId: string; page?: number }>({
      query: ({ conversationId, page = 1 }) => `/${conversationId}/messages?page=${page}`,
      transformResponse: (res: ApiResponse<MessagesResponse>) => res.data,
      providesTags: ['Message'],
    }),
    createConversation: builder.mutation<IConversation, { taskId: string }>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res: ApiResponse<IConversation>) => res.data,
      invalidatesTags: ['Conversation'],
    }),
    markAsRead: builder.mutation<void, string>({
      query: (conversationId) => ({ url: `/${conversationId}/read`, method: 'PATCH' }),
      invalidatesTags: ['Conversation'],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useCreateConversationMutation,
  useMarkAsReadMutation,
} = chatApi;
