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
    const load = async () => {
      setLoading(true);
      const boundedLimit = Math.max(1, Math.min(limit, 50));
      const nowIso = new Date().toISOString();
      let orderedIds: string[] = [];

      if (userId) {
        const { data: ranked, error: rankingError } = await (supabase as any).rpc("get_recommended_videos", {
          p_user_id: userId,
          p_limit: boundedLimit,
        });
        if (!rankingError && ranked?.length) {
          orderedIds = (ranked as Array<{ video_id: string }>).map((row) => row.video_id);
        }
      }

      if (orderedIds.length > 0) {
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
        return;
      }

      const [{ data: candidates }, { data: events }] = await Promise.all([
        (supabase as any)
          .from("videos")
          .select("id, title, thumbnail_url, duration, views, category, user_id, created_at, profiles(display_name, avatar_url, is_monetized)")
          .eq("visibility", "public")
          .eq("processing_status", "ready")
          .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
          .order("views", { ascending: false })
          .limit(200),
        userId
          ? (supabase as any)
              .from("recommendation_events")
              .select("event_type, video_id, context, videos(category)")
              .eq("user_id", userId)
              .in("event_type", ["watch_start", "watch_complete", "search_result_click"])
              .order("created_at", { ascending: false })
              .limit(1000)
          : Promise.resolve({ data: [] }),
      ]);

      const watchedIds = new Set<string>();
      const categoryScores = new Map<string, number>();
      (events ?? []).forEach((event: any) => {
        if (event.video_id && (event.event_type === "watch_start" || event.event_type === "watch_complete")) {
          watchedIds.add(event.video_id);
        }
        const category = event?.videos?.category ?? event?.context?.category;
        if (!category || typeof category !== "string") return;
        const weight = event.event_type === "watch_complete" ? 5 : event.event_type === "watch_start" ? 3 : 2;
        categoryScores.set(category, (categoryScores.get(category) ?? 0) + weight);
      });

      const fallbackVideos = ((candidates ?? []) as any[])
        .filter((video) => !userId || !watchedIds.has(video.id))
        .map((video) => {
          const daysSinceUpload = Math.max(
            0,
            (Date.now() - new Date(video.created_at).getTime()) / (24 * 60 * 60 * 1000),
          );
          const freshnessScore = Math.max(0, 30 - daysSinceUpload) * 5;
          const popularityScore = Math.min(Number(video.views ?? 0), 1_000_000) / 1_000;
          const preferenceBoost = video.category ? (categoryScores.get(video.category) ?? 0) : 0;
          return {
            ...video,
            _score: popularityScore + freshnessScore + preferenceBoost,
          };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, boundedLimit)
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

      setRecommendedVideos(fallbackVideos);
      setLoading(false);
    };

    load();
  }, [userId, limit]);

  return { recommendedVideos, loading };
};
