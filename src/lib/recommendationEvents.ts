import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type RecommendationEventType =
  | "search_query"
  | "search_result_click"
  | "watch_start"
  | "watch_complete";

export const logRecommendationEvent = async (
  eventType: RecommendationEventType,
  options: { userId?: string | null; videoId?: string | null; context?: Json } = {},
) => {
  const { userId, videoId = null, context = {} } = options;
  if (!userId) return;

  const { error } = await supabase.from("recommendation_events").insert({
    user_id: userId,
    video_id: videoId,
    event_type: eventType,
    context,
  });

  if (error) {
    console.warn("Failed to log recommendation event:", eventType, error.message);
  }
};
