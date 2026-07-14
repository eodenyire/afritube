import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Circle, Radio, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveRailStream {
  id: string;
  title: string;
  creator_id: string;
  thumbnail_url: string | null;
  viewer_count: number | null;
  creator_name?: string;
  creator_avatar?: string | null;
}

const LiveRail = () => {
  const [streams, setStreams] = useState<LiveRailStream[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase.from("live_streams") as any)
      .select("id, title, creator_id, thumbnail_url, viewer_count")
      .eq("status", "live")
      .eq("visibility", "public")
      .order("viewer_count", { ascending: false })
      .limit(10);

    const rows = (data ?? []) as LiveRailStream[];
    if (rows.length === 0) {
      setStreams([]);
      setLoading(false);
      return;
    }
    const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", creatorIds);
    const map = new Map(
      (profs ?? []).map((p: any) => [p.user_id, p]),
    );
    setStreams(
      rows.map((r) => ({
        ...r,
        creator_name: (map.get(r.creator_id) as any)?.display_name ?? "Creator",
        creator_avatar: (map.get(r.creator_id) as any)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("live-rail")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || streams.length === 0) return null;

  return (
    <section className="pt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Radio size={20} className="text-red-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">Live now</h2>
        <span className="text-xs text-muted-foreground">{streams.length} broadcasting</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
        {streams.map((s) => (
          <Link
            key={s.id}
            to={`/live/${s.id}`}
            className="flex-shrink-0 w-[260px] snap-start rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors group"
          >
            <div className="relative aspect-video bg-secondary">
              {s.thumbnail_url ? (
                <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Radio size={28} className="text-muted-foreground" />
                </div>
              )}
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                <Circle size={7} className="fill-current" /> LIVE
              </span>
              {typeof s.viewer_count === "number" && s.viewer_count > 0 && (
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 text-white text-[10px] px-1.5 py-0.5">
                  <Users size={10} /> {s.viewer_count}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.creator_name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LiveRail;
