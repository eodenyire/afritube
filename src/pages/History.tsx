import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Loader2, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WatchHistoryRow {
  id: string;
  video_id: string;
  watch_seconds: number;
  created_at: string;
}

interface VideoMeta {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

const History = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<WatchHistoryRow[]>([]);
  const [videoMap, setVideoMap] = useState<Record<string, VideoMeta>>({});
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("watch_history")
        .select("id, video_id, watch_seconds, created_at")
        .eq("viewer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        toast({ title: "Could not load history", description: error.message, variant: "destructive" });
        setRows([]);
        setVideoMap({});
        setLoading(false);
        return;
      }

      const historyRows = (data ?? []) as WatchHistoryRow[];
      setRows(historyRows);

      const videoIds = Array.from(new Set(historyRows.map((r) => r.video_id)));
      if (!videoIds.length) {
        setVideoMap({});
        setLoading(false);
        return;
      }

      const { data: videos } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url")
        .in("id", videoIds);

      const map: Record<string, VideoMeta> = {};
      (videos ?? []).forEach((video: any) => {
        map[video.id] = video as VideoMeta;
      });
      setVideoMap(map);
      setLoading(false);
    };

    load();
  }, [user, toast]);

  const totalWatchSeconds = useMemo(
    () => rows.reduce((sum, row) => sum + row.watch_seconds, 0),
    [rows],
  );

  const formatWatchTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const clearHistory = async () => {
    if (!user) return;
    setClearing(true);
    const { error } = await supabase
      .from("watch_history")
      .delete()
      .eq("viewer_id", user.id);
    setClearing(false);

    if (error) {
      toast({ title: "Could not clear history", description: error.message, variant: "destructive" });
      return;
    }

    setRows([]);
    setVideoMap({});
    toast({ title: "History cleared" });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Watch History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length} entries • {formatWatchTime(totalWatchSeconds)} watched
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={clearHistory}
            disabled={clearing || rows.length === 0}
          >
            {clearing ? <Loader2 className="animate-spin mr-2" size={14} /> : <Trash2 className="mr-2" size={14} />}
            Clear history
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" /> Loading history...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Clock className="mx-auto text-muted-foreground mb-3" size={30} />
            <h2 className="font-semibold text-foreground">No watch history yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Start watching videos and they’ll appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const video = videoMap[row.video_id];
              return (
                <button
                  key={row.id}
                  onClick={() => navigate(`/watch/${row.video_id}`)}
                  className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-32 aspect-video rounded-md overflow-hidden bg-secondary shrink-0">
                      {video?.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground line-clamp-2">{video?.title ?? "Video unavailable"}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Watched {Math.max(1, Math.floor(row.watch_seconds / 60))} min • {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
