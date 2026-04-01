import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface VideoCommentsProps {
  videoId: string;
}

const VideoComments = ({ videoId }: VideoCommentsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    const cmts = data ?? [];

    // Fetch profiles for comment authors
    const userIds = [...new Set(cmts.map((c: any) => c.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.user_id] = p;
      });
      cmts.forEach((c: any) => {
        c.profile = profileMap[c.user_id] ?? null;
      });
    }

    setComments(cmts);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Sign in to comment");
      navigate("/auth");
      return;
    }
    const trimmed = newComment.trim();
    if (!trimmed || trimmed.length > 2000) {
      toast.error("Comment must be 1-2000 characters");
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      content: trimmed,
    });
    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      toast.success("Comment posted!");
      fetchComments();
    }
    setPosting(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Comment deleted");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="mt-6">
      <h3 className="font-display font-semibold text-foreground text-base flex items-center gap-2 mb-4">
        <MessageSquare size={18} />
        Comments ({comments.length})
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Add a comment..." : "Sign in to comment..."}
          className="bg-card border-border resize-none min-h-[80px] text-sm"
          maxLength={2000}
        />
        <div className="flex justify-end mt-2 gap-2">
          {newComment.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewComment("")}
              className="rounded-full text-muted-foreground"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={posting || !newComment.trim()}
            className="rounded-full bg-gradient-gold text-primary-foreground hover:opacity-90 gap-1.5"
          >
            <Send size={14} /> Post
          </Button>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-3 group"
              >
                {c.profile?.avatar_url ? (
                  <img
                    src={c.profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {c.profile?.display_name ?? "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(c.created_at)}
                    </span>
                    {user?.id === c.user_id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-auto"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default VideoComments;
