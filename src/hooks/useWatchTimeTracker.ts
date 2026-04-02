import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWatchTimeTrackerProps {
  videoId: string;
  creatorUserId: string;
  videoElement: HTMLVideoElement | null;
}

/**
 * Tracks actual watch time on a video and reports it to the backend
 * every 30 seconds and on unmount/pause.
 */
export const useWatchTimeTracker = ({
  videoId,
  creatorUserId,
  videoElement,
}: UseWatchTimeTrackerProps) => {
  const accumulatedSeconds = useRef(0);
  const lastTickTime = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFlushing = useRef(false);

  const flush = useCallback(async () => {
    const seconds = Math.floor(accumulatedSeconds.current);
    if (seconds < 1 || isFlushing.current) return;

    isFlushing.current = true;
    accumulatedSeconds.current = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const viewerId = session?.user?.id ?? null;

      await supabase.rpc("add_watch_time", {
        p_video_id: videoId,
        p_creator_id: creatorUserId,
        p_viewer_id: viewerId,
        p_seconds: seconds,
      });
    } catch (err) {
      // Re-add seconds on failure so they aren't lost
      accumulatedSeconds.current += seconds;
      console.error("Failed to report watch time:", err);
    } finally {
      isFlushing.current = false;
    }
  }, [videoId, creatorUserId]);

  useEffect(() => {
    if (!videoElement) return;

    const tick = () => {
      if (!videoElement.paused && !videoElement.ended && lastTickTime.current) {
        const now = Date.now();
        const delta = (now - lastTickTime.current) / 1000;
        // Cap at 2s to avoid jumps from tab-sleeping
        accumulatedSeconds.current += Math.min(delta, 2);
        lastTickTime.current = now;
      }
    };

    const onPlay = () => {
      lastTickTime.current = Date.now();
    };

    const onPause = () => {
      tick();
      lastTickTime.current = null;
      flush();
    };

    const onEnded = () => {
      tick();
      lastTickTime.current = null;
      flush();
    };

    videoElement.addEventListener("play", onPlay);
    videoElement.addEventListener("pause", onPause);
    videoElement.addEventListener("ended", onEnded);

    // If already playing when hook mounts
    if (!videoElement.paused) {
      lastTickTime.current = Date.now();
    }

    // Tick every second, flush every 30s
    const tickInterval = setInterval(tick, 1000);
    intervalRef.current = setInterval(() => {
      tick();
      flush();
    }, 30000);

    return () => {
      clearInterval(tickInterval);
      if (intervalRef.current) clearInterval(intervalRef.current);
      videoElement.removeEventListener("play", onPlay);
      videoElement.removeEventListener("pause", onPause);
      videoElement.removeEventListener("ended", onEnded);
      // Final flush on unmount
      tick();
      flush();
    };
  }, [videoElement, flush]);
};
