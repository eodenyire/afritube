import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clapperboard } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ShortVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  user_id: string;
  views: number;
}

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const Shorts = () => {
  const [loading, setLoading] = useState(true);
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const { data } = await (supabase.from("videos") as any)
        .select("id, title, thumbnail_url, video_url, user_id, views")
        .eq("visibility", "public")
        .eq("processing_status", "ready")
        .eq("is_short", true)
        .lte("duration", 60)
        .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(30);

      const rows = (data ?? []) as ShortVideo[];
      setShorts(rows);

      const userIds = Array.from(new Set(rows.map((video) => video.user_id)));
      if (userIds.length) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const map: Record<string, Profile> = {};
        (profileRows ?? []).forEach((profile: any) => {
          map[profile.user_id] = {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          };
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }

      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Clapperboard size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl text-foreground">Shorts</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[9/16] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : shorts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No shorts yet. Upload a video and enable “Publish as Short”.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {shorts.map((video) => (
              <Link key={video.id} to={`/watch/${video.id}`} className="group">
                <div className="rounded-xl overflow-hidden bg-secondary aspect-[9/16] mb-2">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <video src={video.video_url} className="w-full h-full object-cover" muted playsInline />
                  )}
                </div>
                <h3 className="text-sm font-medium line-clamp-2">{video.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {profiles[video.user_id]?.avatar_url && (
                    <img src={profiles[video.user_id]?.avatar_url ?? ""} alt="" className="w-5 h-5 rounded-full object-cover" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {profiles[video.user_id]?.display_name ?? "Unknown"} • {formatViews(video.views)} views
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Shorts;
