import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clapperboard, ChevronUp, ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const PAGE_SIZE = 10;

  const loadPage = useCallback(async (pageIndex: number) => {
    const nowIso = new Date().toISOString();
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await (supabase.from("videos") as any)
      .select("id, title, thumbnail_url, video_url, user_id, views")
      .eq("visibility", "public")
      .eq("processing_status", "ready")
      .eq("is_short", true)
      .lte("duration", 60)
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .order("created_at", { ascending: false })
      .range(from, to);
    return (data ?? []) as ShortVideo[];
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    const rows = await loadPage(page);
    if (rows.length < PAGE_SIZE) setHasMore(false);
    if (rows.length > 0) {
      setShorts((prev) => {
        const seen = new Set(prev.map((short) => short.id));
        return [...prev, ...rows.filter((short) => !seen.has(short.id))];
      });
      setPage((prev) => prev + 1);
    }
    if (rows.length === 0 && page === 0) {
      setShorts([]);
    }
    setLoading(false);
  }, [hasMore, loadPage, page]);

  useEffect(() => {
    setLoading(true);
    loadMore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const userIds = Array.from(new Set(shorts.map((video) => video.user_id)));
    if (userIds.length === 0) {
      setProfiles({});
      return;
    }

    const loadProfiles = async () => {
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
    };
    loadProfiles();
  }, [shorts]);

  useEffect(() => {
    const active = shorts[currentIndex];
    Object.entries(videoRefs.current).forEach(([id, node]) => {
      if (!node) return;
      if (active && id === active.id) {
        node.play().catch(() => undefined);
      } else {
        node.pause();
      }
    });
  }, [currentIndex, shorts]);

  useEffect(() => {
    if (!scrollContainerRef.current || shorts.length === 0) return;
    const container = scrollContainerRef.current;
    const items = Array.from(container.querySelectorAll<HTMLElement>("[data-short-id]"));
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            const shortId = entry.target.getAttribute("data-short-id");
            if (!shortId) return;
            const idx = shorts.findIndex((item) => item.id === shortId);
            if (idx >= 0) {
              setCurrentIndex(idx);
              if (idx >= shorts.length - 3 && hasMore) {
                loadMore().then();
              }
            }
          });
      },
      { root: container, threshold: 0.7 },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [shorts, hasMore, loadMore]);

  const activeShort = useMemo(() => shorts[currentIndex] ?? null, [shorts, currentIndex]);

  const scrollToIndex = (nextIndex: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const clampedIndex = Math.max(0, Math.min(nextIndex, shorts.length - 1));
    const target = container.querySelector<HTMLElement>(`[data-index="${clampedIndex}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 pt-20 pb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Clapperboard size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl text-foreground">Shorts</h1>
          {activeShort && (
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} / {shorts.length}
            </p>
          )}
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
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="h-[calc(100vh-8rem)] overflow-y-auto snap-y snap-mandatory rounded-2xl border border-border bg-card/30"
            >
            {shorts.map((video, index) => (
              <section
                key={video.id}
                data-short-id={video.id}
                data-index={index}
                className="h-[calc(100vh-8rem)] snap-start flex items-center justify-center p-4 md:p-6"
              >
                <div className="relative w-full max-w-sm h-full rounded-2xl overflow-hidden bg-black">
                  <video
                    ref={(node) => {
                      videoRefs.current[video.id] = node;
                    }}
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    poster={video.thumbnail_url ?? undefined}
                    controls
                    muted
                    loop
                    playsInline
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                    <h3 className="text-sm font-medium text-white line-clamp-2">{video.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {profiles[video.user_id]?.avatar_url && (
                        <img src={profiles[video.user_id]?.avatar_url ?? ""} alt="" className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <p className="text-xs text-white/90">
                        {profiles[video.user_id]?.display_name ?? "Unknown"} • {formatViews(video.views)} views
                      </p>
                    </div>
                    <Link to={`/watch/${video.id}`} className="inline-block mt-3 text-xs font-semibold text-primary-foreground bg-primary px-3 py-1 rounded-full">
                      Open full watch page
                    </Link>
                  </div>
                </div>
              </section>
            ))}
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-full"
                onClick={() => scrollToIndex(currentIndex - 1)}
                disabled={currentIndex <= 0}
              >
                <ChevronUp size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-full"
                onClick={() => scrollToIndex(currentIndex + 1)}
                disabled={currentIndex >= shorts.length - 1 && !hasMore}
              >
                <ChevronDown size={18} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Shorts;
