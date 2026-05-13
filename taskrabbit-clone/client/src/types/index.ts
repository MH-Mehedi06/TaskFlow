export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'tasker' | 'admin';
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  location?: { type: 'Point'; coordinates: [number, number] };
  notifications: { email: boolean; push: boolean };
  createdAt: string;
}

export interface ITaskerProfile {
  _id: string;
  userId: IUser | string;
  bio: string;
  headline: string;
  skills: ICategory[];
  hourlyRates: { categoryId: string; rate: number }[];
  serviceRadius: number;
  backgroundChecked: boolean;
  isElite: boolean;
  stripeAccountId?: string;
  portfolio: string[];
  certifications: string[];
  availability: { day: number; slots: { start: string; end: string }[] }[];
  avgRating: number;
  totalReviews: number;
  totalTasksCompleted: number;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  startingPrice: number;
  isActive: boolean;
  sortOrder: number;
  trending: boolean;
  trendingTags: string[];
  children?: ICategory[];
}

export type TaskStatus = 'draft' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'held' | 'captured' | 'refunded';

export interface ITask {
  _id: string;
  clientId: IUser | string;
  taskerId?: IUser | string;
  categoryId: ICategory | string;
  title: string;
  description: string;
  photos: string[];
  status: TaskStatus;
  scheduledAt: string;
  address: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  estimatedHours?: number;
  price?: number;
  platformFee?: number;
  taskerEarnings?: number;
  paymentIntentId?: string;
  paymentStatus: PaymentStatus;
  isRated: boolean;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: IUser | string;
  content: string;
  attachments: string[];
  readBy: string[];
  messageType: 'text' | 'image' | 'system';
  createdAt: string;
}

export interface IConversation {
  _id: string;
  taskId: ITask | string;
  participants: IUser[];
  lastMessage?: { content: string; senderId: string; createdAt: string };
  unreadCount: Record<string, number>;
  createdAt: string;
}

export interface IReview {
  _id: string;
  taskId: string;
  reviewerId: IUser | string;
  revieweeId: IUser | string;
  rating: number;
  comment: string;
  reply?: string;
  isApproved: boolean;
  aiModerationScore?: number;
  aiModerationReason?: string;
  photos: string[];
  createdAt: string;
}

export interface INotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface IDispute {
  _id: string;
  taskId: ITask | string;
  clientId: string;
  taskerId: string;
  raisedBy: string;
  reason: string;
  description: string;
  evidence: string[];
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'closed';
  adminId?: string;
  adminNotes?: string;
  aiSummary?: string;
  aiSuggestedResolution?: string;
  resolution?: 'full_refund' | 'partial_refund' | 'no_refund';
  refundAmount?: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
