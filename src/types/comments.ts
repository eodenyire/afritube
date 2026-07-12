/**
 * Comments System Types
 * Defines all TypeScript interfaces for the comments feature
 */

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
}

export interface CommentWithDetails extends Comment {
  user_name: string;
  user_avatar: string | null;
  reply_count: number;
  like_count: number;
  heart_count: number;
  flag_count: number;
  is_liked_by_user?: boolean;
  is_hearted_by_creator?: boolean;
}

export interface CommentFlag {
  id: string;
  comment_id: string;
  user_id: string;
  reason: string;
  custom_reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface CommentHeart {
  id: string;
  comment_id: string;
  creator_id: string;
  created_at: string;
}

export interface ModerationQueueItem {
  flag_id: string;
  comment_id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  video_id: string;
  video_title: string;
  reason: string;
  custom_reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  total_flags: number;
  created_at: string;
}

// API Request/Response Types

export interface CreateCommentRequest {
  video_id: string;
  parent_comment_id?: string;
  content: string;
}

export interface CreateCommentResponse {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface GetCommentsResponse {
  comments: CommentWithDetails[];
  total: number;
  has_more: boolean;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface FlagCommentRequest {
  reason: 'spam' | 'harassment' | 'hate_speech' | 'misinformation' | 'other';
  custom_reason?: string;
}

export interface ReviewFlagRequest {
  action: 'approve' | 'reject';
  reason?: string;
}

export interface GetModerationQueueResponse {
  flags: ModerationQueueItem[];
  total: number;
  has_more: boolean;
}

// UI Component Props Types

export interface CommentFormProps {
  videoId: string;
  parentCommentId?: string;
  onSubmit?: (content: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface CommentThreadProps {
  comment: CommentWithDetails;
  isReply?: boolean;
  onReply?: (parentId: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onHeart?: (id: string) => void;
  onLike?: (id: string) => void;
  onFlag?: (id: string) => void;
}

export interface CommentListProps {
  videoId: string;
  sort?: 'newest' | 'oldest' | 'top';
  limit?: number;
}

export interface CommentActionsProps {
  comment: CommentWithDetails;
  isAuthor: boolean;
  isCreator: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onHeart?: () => void;
  onLike?: () => void;
  onFlag?: () => void;
}

export interface ModerationQueueProps {
  onReview?: (flagId: string, action: 'approve' | 'reject') => void;
}

// Query Parameters

export interface GetCommentsParams {
  video_id: string;
  sort?: 'newest' | 'oldest' | 'top';
  limit?: number;
  offset?: number;
}

export interface GetModerationQueueParams {
  status?: 'pending' | 'approved' | 'rejected';
  limit?: number;
  offset?: number;
}

// Error Types

export interface CommentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Validation Types

export interface CommentValidation {
  isValid: boolean;
  errors: string[];
}

export const COMMENT_CONSTRAINTS = {
  MAX_LENGTH: 5000,
  MIN_LENGTH: 1,
  MAX_NESTING_LEVEL: 3,
  MAX_PINNED_PER_VIDEO: 3,
  RATE_LIMIT_PER_MINUTE: 10,
  AUTO_HIDE_FLAG_THRESHOLD: 5,
} as const;

export const FLAG_REASONS = [
  'spam',
  'harassment',
  'hate_speech',
  'misinformation',
  'other',
] as const;

export type FlagReason = typeof FLAG_REASONS[number];

