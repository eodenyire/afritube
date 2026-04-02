import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface VideoReactionsProps {
  videoId: string;
}

type ReactionType = "like" | "dislike";

const VideoReactions = ({ videoId }: VideoReactionsProps) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
      supabase
        .from("video_reactions")
        .select("*", { count: "exact", head: true })
        .eq("video_id", videoId)
        .eq("reaction_type", "like"),
      supabase
        .from("video_reactions")
        .select("*", { count: "exact", head: true })
        .eq("video_id", videoId)
        .eq("reaction_type", "dislike"),
    ]);
    setLikes(likeCount ?? 0);
    setDislikes(dislikeCount ?? 0);
  }, [videoId]);

  const fetchUserReaction = useCallback(async () => {
    if (!user) {
      setUserReaction(null);
      return;
    }
    const { data } = await supabase
      .from("video_reactions")
      .select("reaction_type")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();
    setUserReaction((data?.reaction_type as ReactionType) ?? null);
  }, [videoId, user]);

  useEffect(() => {
    fetchCounts();
    fetchUserReaction();
  }, [fetchCounts, fetchUserReaction]);

  const handleReaction = async (type: ReactionType) => {
    if (!user) {
      toast.error("Sign in to react to videos");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      if (userReaction === type) {
        // Remove reaction
        await supabase
          .from("video_reactions")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id);
        setUserReaction(null);
      } else if (userReaction) {
        // Switch reaction
        await supabase
          .from("video_reactions")
          .update({ reaction_type: type })
          .eq("video_id", videoId)
          .eq("user_id", user.id);
        setUserReaction(type);
      } else {
        // New reaction
        await supabase
          .from("video_reactions")
          .insert({ video_id: videoId, user_id: user.id, reaction_type: type });
        setUserReaction(type);
      }
      await fetchCounts();
    } catch {
      toast.error("Failed to save reaction");
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="flex gap-1">
      <Button
        variant={userReaction === "like" ? "default" : "secondary"}
        size="sm"
        className="rounded-l-full rounded-r-none gap-1.5 pr-3"
        onClick={() => handleReaction("like")}
        disabled={loading}
      >
        <ThumbsUp size={16} className={userReaction === "like" ? "fill-current" : ""} />
        {formatCount(likes)}
      </Button>
      <Button
        variant={userReaction === "dislike" ? "default" : "secondary"}
        size="sm"
        className="rounded-r-full rounded-l-none gap-1.5 pl-3 border-l border-border"
        onClick={() => handleReaction("dislike")}
        disabled={loading}
      >
        <ThumbsDown size={16} className={userReaction === "dislike" ? "fill-current" : ""} />
        {formatCount(dislikes)}
      </Button>
    </div>
  );
};

export default VideoReactions;
