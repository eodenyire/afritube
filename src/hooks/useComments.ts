/**
 * useComments Hook
 * Manages all comment-related API calls and state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase = _supabase as any;
import {
  Comment,
  CommentWithDetails,
  CreateCommentRequest,
  GetCommentsParams,
  FlagCommentRequest,
  ReviewFlagRequest,
  GetModerationQueueParams,
  ModerationQueueItem,
} from '@/types/comments';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all comments for a video
 */
export const useGetComments = (params: GetCommentsParams) => {
  return useQuery({
    queryKey: ['comments', params.video_id, params.sort, params.limit, params.offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments_with_details')
        .select('*')
        .eq('video_id', params.video_id)
        .is('parent_comment_id', true)
        .order(
          params.sort === 'top' ? 'like_count' : 'created_at',
          { ascending: params.sort === 'oldest' }
        )
        .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

      if (error) throw error;
      return data as CommentWithDetails[];
    },
    enabled: !!params.video_id,
  });
};

/**
 * Get replies for a comment
 */
export const useGetReplies = (commentId: string, limit = 5) => {
  return useQuery({
    queryKey: ['comments', 'replies', commentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments_with_details')
        .select('*')
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CommentWithDetails[];
    },
    enabled: !!commentId,
  });
};

/**
 * Get moderation queue
 */
export const useGetModerationQueue = (params: GetModerationQueueParams) => {
  return useQuery({
    queryKey: ['moderation-queue', params.status, params.limit, params.offset],
    queryFn: async () => {
      let query = supabase
        .from('moderation_queue')
        .select('*');

      if (params.status) {
        query = query.eq('status', params.status);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

      if (error) throw error;
      return data as ModerationQueueItem[];
    },
  });
};

/**
 * Check if user liked a comment
 */
export const useCheckCommentLike = (commentId: string, userId: string) => {
  return useQuery({
    queryKey: ['comment-like', commentId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    },
    enabled: !!commentId && !!userId,
  });
};

/**
 * Check if creator hearted a comment
 */
export const useCheckCommentHeart = (commentId: string, creatorId: string) => {
  return useQuery({
    queryKey: ['comment-heart', commentId, creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comment_hearts')
        .select('id')
        .eq('comment_id', commentId)
        .eq('creator_id', creatorId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    },
    enabled: !!commentId && !!creatorId,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new comment
 */
export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCommentRequest) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          video_id: request.video_id,
          parent_comment_id: request.parent_comment_id || null,
          content: request.content,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (data) => {
      // Invalidate comments query
      queryClient.invalidateQueries({
        queryKey: ['comments', data.video_id],
      });
    },
  });
};

/**
 * Update a comment
 */
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .update({
          content,
          edited_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', data.video_id],
      });
    },
  });
};

/**
 * Delete a comment
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};

/**
 * Pin a comment
 */
export const usePinComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ is_pinned: true })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', data.video_id],
      });
    },
  });
};

/**
 * Unpin a comment
 */
export const useUnpinComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ is_pinned: false })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', data.video_id],
      });
    },
  });
};

/**
 * Like a comment
 */
export const useLikeComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, userId }: { commentId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};

/**
 * Unlike a comment
 */
export const useUnlikeComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, userId }: { commentId: string; userId: string }) => {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};

/**
 * Heart a comment (creator only)
 */
export const useHeartComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, creatorId }: { commentId: string; creatorId: string }) => {
      const { data, error } = await supabase
        .from('comment_hearts')
        .insert({ comment_id: commentId, creator_id: creatorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};

/**
 * Unheart a comment (creator only)
 */
export const useUnheartComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, creatorId }: { commentId: string; creatorId: string }) => {
      const { error } = await supabase
        .from('comment_hearts')
        .delete()
        .eq('comment_id', commentId)
        .eq('creator_id', creatorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};

/**
 * Flag a comment
 */
export const useFlagComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      userId,
      request,
    }: {
      commentId: string;
      userId: string;
      request: FlagCommentRequest;
    }) => {
      const { data, error } = await supabase
        .from('comment_flags')
        .insert({
          comment_id: commentId,
          user_id: userId,
          reason: request.reason,
          custom_reason: request.custom_reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['moderation-queue'],
      });
    },
  });
};

/**
 * Review a flagged comment (admin only)
 */
export const useReviewFlag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flagId,
      reviewerId,
      request,
    }: {
      flagId: string;
      reviewerId: string;
      request: ReviewFlagRequest;
    }) => {
      const { data, error } = await supabase
        .from('comment_flags')
        .update({
          status: request.action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', flagId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['moderation-queue'],
      });
    },
  });
};

