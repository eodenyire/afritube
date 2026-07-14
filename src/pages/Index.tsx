import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Music, BookOpen, TrendingUp, Upload, Sparkles, Zap, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import AudioCard from "@/components/AudioCard";
import BlogCard from "@/components/BlogCard";
import CreatorBadge from "@/components/CreatorBadge";
import SectionHeader from "@/components/SectionHeader";
import CategoryPills from "@/components/CategoryPills";
import LiveRail from "@/components/LiveRail";
import Footer from "@/components/Footer";
import PlaylistCard from "@/components/PlaylistCard";
import { useMix } from "@/hooks/useMix";
import { useRecommendations } from "@/hooks/useRecommendations";

import heroBg from "@/assets/hero-bg.jpg";
import thumb1 from "@/assets/thumb-1.jpg";
import thumb2 from "@/assets/thumb-2.jpg";
import thumb3 from "@/assets/thumb-3.jpg";
import thumb4 from "@/assets/thumb-4.jpg";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import blog1 from "@/assets/blog-1.jpg";
import blog2 from "@/assets/blog-2.jpg";

const videoCategories = ["Trending", "Music", "Comedy", "Tech", "Food", "Travel", "Education", "Sports"];

// Fallback sample data shown when DB is empty
const sampleVideos = [
  { title: "Afrobeats Live: Lagos to the World Tour 2025", channel: "Afro Vibes", views: "1.2M", duration: "45:20", thumbnail: thumb1, avatar: album2, isMonetized: true },
  { title: "How to Cook the Perfect Jollof Rice — The Ultimate Guide", channel: "Chef Amara", views: "845K", duration: "18:33", thumbnail: thumb2, avatar: album1, isMonetized: true },
  { title: "Building Africa's Next Tech Unicorn — Startup Documentary", channel: "TechAfrika", views: "320K", duration: "1:02:15", thumbnail: thumb3, avatar: album3, isMonetized: false },
  { title: "Serengeti Sunrise — 4K Wildlife Documentary", channel: "NatureAfrica", views: "2.1M", duration: "52:08", thumbnail: thumb4, avatar: album4, isMonetized: true },
];

const sampleAudios = [
  { title: "Midnight in Lagos", artist: "Ayo Beats", cover: album1, streams: "3.2M", duration: "3:45" },
  { title: "Sahara Dreams", artist: "Nala Queen", cover: album2, streams: "1.8M", duration: "4:12" },
  { title: "Amapiano Sunrise", artist: "DJ Mzansi", cover: album3, streams: "5.1M", duration: "5:30" },
  { title: "Highlife Gold", artist: "Kwame & The Elders", cover: album4, streams: "890K", duration: "6:15" },
];

const sampleBlogs = [
  { title: "The Rise of African Street Fashion: From Lagos to Paris", excerpt: "How African designers are reshaping global fashion with bold prints, sustainable materials, and unapologetic creativity.", author: "Zara Okafor", avatar: album2, cover: blog1, readTime: "5 min read", likes: 234, comments: 42, category: "Fashion" },
  { title: "Inside Africa's Digital Art Revolution", excerpt: "A new generation of African digital artists is blending tradition with technology to create stunning visual narratives.", author: "Kofi Mensah", avatar: album4, cover: blog2, readTime: "8 min read", likes: 189, comments: 31, category: "Art & Culture" },
];

const sampleCreators = [
  { name: "Afro Vibes", avatar: album2, subscribers: 150, watchHours: 2400, isEligible: true },
  { name: "Chef Amara", avatar: album1, subscribers: 87, watchHours: 650, isEligible: false },
  { name: "DJ Mzansi", avatar: album3, subscribers: 120, watchHours: 1100, isEligible: true },
  { name: "Kofi Mensah", avatar: album4, subscribers: 45, watchHours: 320, isEligible: false },
];

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const parseViews = (v: string) => {
  if (v.endsWith("M")) return parseFloat(v) * 1_000_000;
  if (v.endsWith("K")) return parseFloat(v) * 1_000;
  return parseFloat(v) || 0;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dbVideos, setDbVideos] = useState<any[]>([]);
  const [dbAudios, setDbAudios] = useState<any[]>([]);
  const [dbBlogs, setDbBlogs] = useState<any[]>([]);
  const [dbCreators, setDbCreators] = useState<any[]>([]);
  const [dbPlaylists, setDbPlaylists] = useState<any[]>([]);
  const [activeVideoCategory, setActiveVideoCategory] = useState("Trending");
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [videoPage, setVideoPage] = useState(0);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { mixVideos, loading: mixLoading } = useMix(user?.id, 20);
  const { recommendedVideos, loading: recommendationsLoading } = useRecommendations(user?.id, 20);
  const getMonetizedStatus = (value?: boolean) => isAdmin && !!value;

  const VIDEOS_PAGE_SIZE = 12;

  const fetchProfilesFor = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const profileSelect = isAdmin
      ? "user_id, display_name, avatar_url, is_monetized, subscriber_count, watch_hours"
      : "user_id, display_name, avatar_url";
    const { data: profs } = await (supabase.from("profiles") as any)
      .select(profileSelect)
      .in("user_id", userIds);
    const list = (profs ?? []) as any[];
    setProfiles((prev) => {
      const next = { ...prev };
      list.forEach((p) => { next[p.user_id] = p; });
      return next;
    });
    if (list.length > 0) {
      setDbCreators((prev) => {
        const seen = new Set(prev.map((c: any) => c.user_id));
        const merged = [...prev];
        list.forEach((p) => { if (!seen.has(p.user_id)) merged.push(p); });
        return merged;
      });
    }
  }, [isAdmin]);

  const loadVideosPage = useCallback(async (page: number) => {
    const nowIso = new Date().toISOString();
    const from = page * VIDEOS_PAGE_SIZE;
    const to = from + VIDEOS_PAGE_SIZE - 1;
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("visibility", "public")
      .eq("processing_status", "ready")
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .order("created_at", { ascending: false })
      .range(from, to);
    const rows = data ?? [];
    return rows;
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const [videos, audiosRes, blogsRes, playlistsRes] = await Promise.all([
        loadVideosPage(0),
        supabase.from("audio_tracks").select("*").eq("is_published", true).order("streams", { ascending: false }).limit(6),
        supabase.from("blog_posts").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("playlists").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(6),
      ]);

      const audios = audiosRes.data ?? [];
      const blogs = blogsRes.data ?? [];
      const playlists = playlistsRes.data ?? [];

      const userIds = new Set<string>();
      videos.forEach((v: any) => userIds.add(v.user_id));
      audios.forEach((a: any) => userIds.add(a.user_id));
      blogs.forEach((b: any) => userIds.add(b.user_id));
      playlists.forEach((p: any) => userIds.add(p.user_id));

      await fetchProfilesFor(Array.from(userIds));

      setDbVideos(videos);
      setHasMoreVideos(videos.length === VIDEOS_PAGE_SIZE);
      setVideoPage(0);
      setDbAudios(audios);
      setDbBlogs(blogs);
      if (playlists.length > 0) {
        const playlistIds = playlists.map((playlist) => playlist.id);
        const { data: playlistItems } = await supabase
          .from("playlist_items")
          .select("playlist_id")
          .in("playlist_id", playlistIds);
        const counts = new Map<string, number>();
        (playlistItems ?? []).forEach((item: any) => {
          counts.set(item.playlist_id, (counts.get(item.playlist_id) ?? 0) + 1);
        });
        setDbPlaylists(playlists.map((playlist) => ({ ...playlist, video_count: counts.get(playlist.id) ?? 0 })));
      } else {
        setDbPlaylists([]);
      }
      setLoading(false);
    };

    fetchAll();
  }, [isAdmin, loadVideosPage, fetchProfilesFor]);

  const loadMoreVideos = useCallback(async () => {
    if (loadingMoreVideos || !hasMoreVideos || loading) return;
    setLoadingMoreVideos(true);
    const nextPage = videoPage + 1;
    const rows = await loadVideosPage(nextPage);
    if (rows.length > 0) {
      const knownIds = new Set(Object.keys(profiles));
      const newUserIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter((id: string) => !knownIds.has(id))));
      if (newUserIds.length > 0) await fetchProfilesFor(newUserIds);
      setDbVideos((prev) => {
        const seen = new Set(prev.map((v: any) => v.id));
        return [...prev, ...rows.filter((r: any) => !seen.has(r.id))];
      });
      setVideoPage(nextPage);
    }
    if (rows.length < VIDEOS_PAGE_SIZE) setHasMoreVideos(false);
    setLoadingMoreVideos(false);
  }, [loadingMoreVideos, hasMoreVideos, loading, videoPage, loadVideosPage, profiles, fetchProfilesFor]);

  // Infinite scroll sentinel
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreVideos();
    }, { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreVideos]);

  // Map DB videos to VideoCard props — filter by active category
  const allVideoCards = dbVideos.length > 0
    ? dbVideos.map((v) => {
        const p = profiles[v.user_id];
        return {
          id: v.id,
          title: v.title,
          channel: p?.display_name ?? "Unknown",
          views: formatViews(v.views),
          duration: formatDuration(v.duration),
          thumbnail: v.thumbnail_url ?? null,
          avatar: p?.avatar_url ?? album1,
          isMonetized: getMonetizedStatus(p?.is_monetized),
          category: v.category,
        };
      })
    : sampleVideos.map((v) => ({ ...v, category: "Trending", isMonetized: getMonetizedStatus(v.isMonetized) }));

  const recommendedVideoCards = recommendedVideos.map((video) => ({
    id: video.id,
    title: video.title,
    channel: video.creator_name ?? "Unknown",
    views: formatViews(video.views),
    duration: formatDuration(video.duration),
    thumbnail: video.thumbnail_url ?? null,
    avatar: video.creator_avatar ?? album1,
    isMonetized: getMonetizedStatus(video.creator_is_monetized),
    category: video.category ?? "General",
  }));

  const usingRecommendedFeed = activeVideoCategory === "Trending" && recommendedVideoCards.length > 0;
  const videoCards = activeVideoCategory === "Trending"
    ? (usingRecommendedFeed
        ? recommendedVideoCards
        : [...allVideoCards].sort((a, b) => parseViews(b.views) - parseViews(a.views)))
    : allVideoCards.filter((v) => v.category?.toLowerCase() === activeVideoCategory.toLowerCase());
  const showInfiniteScroll = !usingRecommendedFeed && dbVideos.length > 0;

  const audioCards = dbAudios.length > 0
    ? dbAudios.map((a) => ({
        id: a.id,
        title: a.title,
        artist: a.artist_name ?? "Unknown Artist",
        cover: a.cover_url ?? album1,
        streams: formatViews(a.streams),
        duration: formatDuration(a.duration),
        audioUrl: a.audio_url,
      }))
    : [...sampleAudios, ...sampleAudios.slice(0, 2)];

  const blogCards = dbBlogs.length > 0
    ? dbBlogs.map((b) => {
        const p = profiles[b.user_id];
        return {
          title: b.title,
          excerpt: b.excerpt ?? b.content.slice(0, 120) + "…",
          author: p?.display_name ?? "Unknown",
          avatar: p?.avatar_url ?? album1,
          cover: b.cover_url ?? blog1,
          readTime: `${Math.max(1, Math.ceil((b.content?.length ?? 0) / 1000))} min read`,
          likes: b.likes,
          comments: b.comments_count,
          category: b.category ?? "General",
        };
      })
    : sampleBlogs;

  const creatorCards = dbCreators.length > 0
    ? dbCreators.slice(0, 4).map((c) => ({
        name: c.display_name ?? "Creator",
        avatar: c.avatar_url ?? album1,
        subscribers: c.subscriber_count ?? 0,
        watchHours: Number(c.watch_hours ?? 0),
        isEligible: c.is_monetized ?? false,
      }))
    : sampleCreators;

  const hasMoreCreators = dbCreators.length > 4;
  const mixPreview = mixVideos.slice(0, 4);
  const mixVideoIds = mixVideos.map((video) => video.id).join(",");
  const mixStartHref = mixVideos[0] ? `/watch/${mixVideos[0].id}?list=mix&videos=${encodeURIComponent(mixVideoIds)}` : null;

  const shortCards = dbVideos
    .filter((v) => v.duration !== null && v.duration <= 60)
    .map((v) => {
      const p = profiles[v.user_id];
      return {
        id: v.id,
        title: v.title,
        views: formatViews(v.views),
        thumbnail: v.thumbnail_url ?? null,
      };
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[70vh] min-h-[500px] flex items-center">
          <img src={heroBg} alt="AfriTube" className="absolute inset-0 w-full h-full object-cover" width={1920} height={800} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-6 w-full">
            <motion.div {...fadeUp} className="max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-primary" />
                <span className="text-sm font-medium text-primary">Africa's #1 Content Platform</span>
              </div>
              <h1 className="font-display font-bold text-4xl md:text-6xl leading-tight text-foreground">
                Watch. Listen.{" "}
                <span className="text-gradient-gold">Create.</span>
              </h1>
              <p className="text-muted-foreground text-lg mt-4 leading-relaxed">
                Stream videos, discover music, read stories — all from Africa's most vibrant creators. Upload your content and earn from your passion.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button size="lg" className="bg-gradient-gold text-primary-foreground font-semibold rounded-full px-8 hover:opacity-90 transition-opacity shadow-gold" onClick={() => document.getElementById("videos")?.scrollIntoView({ behavior: "smooth" })}>
                  <Play size={18} className="mr-2" fill="currentColor" /> Start Watching
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8 border-border text-foreground hover:bg-secondary" onClick={() => navigate("/upload")}>
                  <Upload size={18} className="mr-2" /> Upload Content
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <span><strong className="text-foreground">10M+</strong> Views Daily</span>
                <span><strong className="text-foreground">50K+</strong> Creators</span>
                <span><strong className="text-foreground">30+</strong> Countries</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="max-w-[1440px] mx-auto px-4 md:px-6 space-y-16 pb-20">
        <LiveRail />
        {/* Videos */}
        <motion.section {...fadeUp} id="videos">
          <SectionHeader
            icon={<Play size={22} />}
            title={user && activeVideoCategory === "Trending" && recommendedVideoCards.length > 0 ? "Recommended Videos" : "Trending Videos"}
            subtitle={user && activeVideoCategory === "Trending" && recommendedVideoCards.length > 0 ? "Personalized using your watch and search activity" : "The hottest content from across Africa"}
            onSeeAll={() => navigate(`/search?type=videos${activeVideoCategory !== "Trending" ? `&q=${activeVideoCategory}` : ""}`)}
          />
          <CategoryPills categories={videoCategories} onSelect={setActiveVideoCategory} />
          {user && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">Made for you</p>
                  <h3 className="font-display text-xl font-bold text-foreground mt-1">Your Mix</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Auto-generated from what you watch most.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      disabled={!mixStartHref || mixLoading}
                      onClick={() => mixStartHref && navigate(mixStartHref)}
                      className="rounded-full bg-gradient-gold text-primary-foreground"
                    >
                      <Play size={16} className="mr-1.5 fill-current" />
                      Play Mix
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={() => navigate("/mix")}>
                      Open Mix
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full md:w-56 shrink-0">
                  {mixPreview.length === 0 ? (
                    <div className="col-span-2 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      Keep watching videos to build your mix.
                    </div>
                  ) : (
                    mixPreview.map((video) => (
                      <div key={video.id} className="aspect-video rounded-lg overflow-hidden bg-secondary">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {loading || (user && activeVideoCategory === "Trending" && recommendationsLoading) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : videoCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No videos in the "{activeVideoCategory}" category yet.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                {videoCards.map((v: any, i: number) => (
                  <VideoCard key={v.id ?? `${v.title}-${i}`} {...v} />
                ))}
              </div>
              {showInfiniteScroll && (
                <>
                  {loadingMoreVideos && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="aspect-video rounded-xl" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  )}
                  {hasMoreVideos ? (
                    <div ref={sentinelRef} className="h-10 mt-6" aria-hidden />
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground">You're all caught up.</div>
                  )}
                </>
              )}
            </>
          )}
        </motion.section>

        {/* Public playlists */}
        <motion.section {...fadeUp} id="playlists">
          <SectionHeader
            icon={<ListVideo size={22} />}
            title="Public Playlists"
            subtitle="Series, courses, and collections from creators"
            onSeeAll={() => navigate("/browse-playlists")}
          />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : dbPlaylists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No public playlists yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {dbPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} onPlay={(id) => navigate(`/playlist/${id}`)} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Shorts */}
        {!loading && shortCards.length > 0 && (
          <motion.section {...fadeUp}>
            <SectionHeader icon={<Zap size={22} />} title="Shorts" subtitle="Quick clips under 60 seconds" />
            <div className="flex gap-4 overflow-x-auto pb-4 mt-4" style={{ scrollbarWidth: "none" }}>
              {shortCards.map((s) => (
                <div
                  key={s.id}
                  className="shrink-0 w-40 cursor-pointer group"
                  onClick={() => navigate(`/watch/${s.id}`)}
                >
                  <div className="aspect-[9/16] rounded-xl overflow-hidden bg-secondary relative mb-2">
                    {s.thumbnail ? (
                      <img
                        src={s.thumbnail}
                        alt={s.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap size={28} className="text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-2">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.views} views</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Audio */}
        <motion.section {...fadeUp} id="music">
          <SectionHeader icon={<Music size={22} />} title="Hot Tracks" subtitle="Afrobeats, Amapiano, Highlife and more" onSeeAll={() => navigate("/search?type=music")} />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {audioCards.map((a, i) => (
                <AudioCard key={`${a.title}-${i}`} {...a} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Blogs */}
        <motion.section {...fadeUp} id="blogs">
          <SectionHeader icon={<BookOpen size={22} />} title="Featured Stories" subtitle="Voices, opinions, and stories from the continent" onSeeAll={() => navigate("/search?type=blogs")} />
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1,2].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[16/9] rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogCards.map((b) => (
                <BlogCard key={b.title} {...b} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Creator Monetization */}
        <motion.section {...fadeUp} id="creators">
          <SectionHeader
            icon={<TrendingUp size={22} />}
            title={isAdmin ? "Creator Hub" : "Featured Creators"}
            subtitle={isAdmin ? "Track your progress to monetization — 100 subscribers & 1,000 watch hours" : "Discover creators across Africa"}
            onSeeAll={hasMoreCreators ? () => navigate("/search?type=creators") : undefined}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creatorCards.map((c) => (
              <CreatorBadge key={c.name} {...c} showEligibility={isAdmin} />
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
