import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ServedAd {
  campaign_id: string;
  headline: string | null;
  creative_url: string;
  click_url: string | null;
  skip_after_seconds: number;
}

interface Props {
  videoId: string;
  category?: string | null;
  isMonetized: boolean;
  isOwner: boolean;
  onFinished?: () => void;
}

/** Pre-roll ad overlay shown before a monetized creator's video plays. */
const VideoAdOverlay = ({ videoId, category, isMonetized, isOwner, onFinished }: Props) => {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [remaining, setRemaining] = useState(0);
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (!isMonetized || isOwner || !videoId) return;
    if (requested.current === videoId) return;
    requested.current = videoId;
    (async () => {
      const { data } = await (supabase as any).rpc("serve_ad", {
        p_video_id: videoId,
        p_category: category ?? null,
        p_ad_type: "pre_roll",
      });
      const served = Array.isArray(data) ? data[0] : data;
      if (served?.creative_url) {
        setAd(served as ServedAd);
        setRemaining(served.skip_after_seconds ?? 5);
      }
    })();
  }, [videoId, category, isMonetized, isOwner]);

  useEffect(() => {
    if (!ad) return;
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [ad]);

  if (!ad) return null;

  const close = () => {
    setAd(null);
    onFinished?.();
  };

  const handleClick = async () => {
    await (supabase as any).rpc("record_ad_event", {
      p_campaign_id: ad.campaign_id,
      p_video_id: videoId,
      p_event_type: "click",
    });
    if (ad.click_url) window.open(ad.click_url, "_blank", "noopener,noreferrer");
  };

  const isVideoCreative = /\.(mp4|webm|mov)(\?|$)/i.test(ad.creative_url);

  return (
    <div className="absolute inset-0 z-20 bg-black flex flex-col">
      <button type="button" onClick={handleClick} className="flex-1 min-h-0 w-full">
        {isVideoCreative ? (
          <video
            src={ad.creative_url}
            autoPlay
            muted
            playsInline
            onEnded={close}
            className="w-full h-full object-contain"
          />
        ) : (
          <img src={ad.creative_url} alt={ad.headline ?? "Advertisement"} className="w-full h-full object-contain" />
        )}
      </button>
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-black/80">
        <span className="text-xs text-white/70 truncate">
          Ad · {ad.headline ?? "Sponsored"}
        </span>
        <button
          type="button"
          onClick={close}
          disabled={remaining > 0}
          className="text-xs rounded-full px-3 py-1 bg-white/15 text-white disabled:opacity-60"
        >
          {remaining > 0 ? `Skip in ${remaining}s` : "Skip ad"}
        </button>
      </div>
    </div>
  );
};

export default VideoAdOverlay;
