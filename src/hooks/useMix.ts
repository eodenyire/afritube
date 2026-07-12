import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MixVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number;
  creator_name: string | null;
}

export const useMix = (viewerId?: string, limit = 20) => {
  const [mixVideos, setMixVideos] = useState<MixVideo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viewerId) {
      setMixVideos([]);
      return;
    }

    const load = async () => {
      setLoading(true);

      const boundedLimit = Math.max(1, Math.min(limit, 50));
      const { data: ranked, error: mixError } = await (supabase as any).rpc("get_user_mix", {
        p_viewer_id: viewerId,
        p_limit: boundedLimit,
      });

      if (mixError || !ranked?.length) {
        setMixVideos([]);
        setLoading(false);
        return;
      }

      const orderedIds = (ranked as Array<{ video_id: string }>).map((row) => row.video_id);
      const { data: videos } = await (supabase
        .from("videos") as any)
        .select("id, title, thumbnail_url, duration, views, user_id, profiles(display_name)")
        .eq("processing_status", "ready")
        .in("id", orderedIds);

      const videosById = new Map<string, any>(((videos ?? []) as any[]).map((video) => [video.id, video]));
      const orderedVideos: MixVideo[] = orderedIds
        .map((id) => videosById.get(id))
        .filter(Boolean)
        .map((video) => ({
          id: video.id,
          title: video.title,
          thumbnail_url: video.thumbnail_url ?? null,
          duration: video.duration ?? null,
          views: Number(video.views ?? 0),
          creator_name: video.profiles?.display_name ?? null,
        }));

      setMixVideos(orderedVideos);
      setLoading(false);
    };

    load();
  }, [viewerId, limit]);

  return { mixVideos, loading };
};
