import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecommendedVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number;
  category: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  creator_is_monetized: boolean;
}

export const useRecommendations = (userId?: string, limit = 20) => {
  const [recommendedVideos, setRecommendedVideos] = useState<RecommendedVideo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setRecommendedVideos([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      const boundedLimit = Math.max(1, Math.min(limit, 50));
      const { data: ranked, error: rankingError } = await (supabase as any).rpc("get_recommended_videos", {
        p_user_id: userId,
        p_limit: boundedLimit,
      });

      if (rankingError || !ranked?.length) {
        setRecommendedVideos([]);
        setLoading(false);
        return;
      }

      const orderedIds = (ranked as Array<{ video_id: string }>).map((row) => row.video_id);
      const { data: videos } = await (supabase as any)
        .from("videos")
        .select("id, title, thumbnail_url, duration, views, category, user_id, profiles(display_name, avatar_url, is_monetized)")
        .in("id", orderedIds);

      const videosById = new Map<string, any>(((videos ?? []) as any[]).map((video) => [video.id, video]));
      const orderedVideos: RecommendedVideo[] = orderedIds
        .map((id) => videosById.get(id))
        .filter(Boolean)
        .map((video) => ({
          id: video.id,
          title: video.title,
          thumbnail_url: video.thumbnail_url ?? null,
          duration: video.duration ?? null,
          views: Number(video.views ?? 0),
          category: video.category ?? null,
          creator_name: video.profiles?.display_name ?? null,
          creator_avatar: video.profiles?.avatar_url ?? null,
          creator_is_monetized: !!video.profiles?.is_monetized,
        }));

      setRecommendedVideos(orderedVideos);
      setLoading(false);
    };

    load();
  }, [userId, limit]);

  return { recommendedVideos, loading };
};
