import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const Subscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Mark notifications as seen when visiting this page
    localStorage.setItem("afritube_notif_seen", new Date().toISOString());

    const load = async () => {
      setLoading(true);

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("creator_id")
        .eq("subscriber_id", user.id);

      const creatorIds = (subs ?? []).map((s: any) => s.creator_id);

      if (creatorIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: vids } = await supabase
        .from("videos")
        .select("*")
        .in("user_id", creatorIds)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(24);

      const vidList = vids ?? [];
      setVideos(vidList);

      const { data: profs } = await (supabase.from("profiles") as any)
        .select("user_id, display_name, avatar_url")
        .in("user_id", creatorIds);
      const map: Record<string, any> = {};
      ((profs ?? []) as any[]).forEach((p) => { map[p.user_id] = p; });
      setProfiles(map);

      setLoading(false);
    };

    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const videoCards = videos.map((v) => {
    const p = profiles[v.user_id];
    return {
      id: v.id,
      title: v.title,
      channel: p?.display_name ?? "Unknown",
      views: formatViews(v.views),
      duration: formatDuration(v.duration),
      thumbnail: v.thumbnail_url ?? null,
      avatar: p?.avatar_url ?? "",
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Users size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl text-foreground">Subscriptions</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : videoCards.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No subscriptions yet</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Subscribe to creators to see their latest videos here
            </p>
            <Button
              onClick={() => navigate("/")}
              className="rounded-full bg-gradient-gold text-primary-foreground"
            >
              Explore Creators
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {videoCards.map((v) => (
              <VideoCard key={v.id} {...v} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Subscriptions;
