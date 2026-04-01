import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, SlidersHorizontal, X, Play, Music, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import AudioCard from "@/components/AudioCard";
import BlogCard from "@/components/BlogCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import thumb1 from "@/assets/thumb-1.jpg";
import album1 from "@/assets/album-1.jpg";
import blog1 from "@/assets/blog-1.jpg";

type ContentType = "all" | "videos" | "music" | "blogs";

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

const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <SlidersHorizontal size={14} /> },
  { value: "videos", label: "Videos", icon: <Play size={14} /> },
  { value: "music", label: "Music", icon: <Music size={14} /> },
  { value: "blogs", label: "Blogs", icon: <BookOpen size={14} /> },
];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialType = (searchParams.get("type") as ContentType) ?? "all";

  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState<ContentType>(initialType);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    const term = `%${q.trim()}%`;

    const [videosRes, audiosRes, blogsRes] = await Promise.all([
      activeType === "all" || activeType === "videos"
        ? supabase
            .from("videos")
            .select("*")
            .eq("is_published", true)
            .or(`title.ilike.${term},description.ilike.${term},category.ilike.${term}`)
            .order("views", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
      activeType === "all" || activeType === "music"
        ? supabase
            .from("audio_tracks")
            .select("*")
            .eq("is_published", true)
            .or(`title.ilike.${term},artist_name.ilike.${term},genre.ilike.${term}`)
            .order("streams", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
      activeType === "all" || activeType === "blogs"
        ? supabase
            .from("blog_posts")
            .select("*")
            .eq("is_published", true)
            .or(`title.ilike.${term},content.ilike.${term},category.ilike.${term}`)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    const vids = videosRes.data ?? [];
    const auds = audiosRes.data ?? [];
    const blgs = blogsRes.data ?? [];

    // Fetch profiles for video/blog creators
    const userIds = new Set<string>();
    vids.forEach((v: any) => userIds.add(v.user_id));
    blgs.forEach((b: any) => userIds.add(b.user_id));

    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, is_monetized")
        .in("user_id", Array.from(userIds));
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }

    setVideos(vids);
    setAudios(auds);
    setBlogs(blgs);
    setLoading(false);
  };

  // Run search on mount if query param exists
  useEffect(() => {
    if (initialQuery) performSearch(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query, type: activeType });
    performSearch(query);
  };

  const handleTypeChange = (type: ContentType) => {
    setActiveType(type);
    if (query.trim()) {
      setSearchParams({ q: query, type });
      // Re-search with new type after state update
      setTimeout(() => performSearch(query), 0);
    }
  };

  const totalResults = videos.length + audios.length + blogs.length;

  const videoCards = videos.map((v) => {
    const p = profiles[v.user_id];
    return {
      id: v.id,
      title: v.title,
      channel: p?.display_name ?? "Unknown",
      views: formatViews(v.views),
      duration: formatDuration(v.duration),
      thumbnail: v.thumbnail_url ?? thumb1,
      avatar: p?.avatar_url ?? album1,
      isMonetized: p?.is_monetized ?? false,
    };
  });

  const audioCards = audios.map((a) => ({
    title: a.title,
    artist: a.artist_name ?? "Unknown Artist",
    cover: a.cover_url ?? album1,
    streams: formatViews(a.streams),
    duration: formatDuration(a.duration),
  }));

  const blogCards = blogs.map((b) => {
    const p = profiles[b.user_id];
    return {
      title: b.title,
      excerpt: b.excerpt ?? (b.content?.slice(0, 120) + "…"),
      author: p?.display_name ?? "Unknown",
      avatar: p?.avatar_url ?? album1,
      cover: b.cover_url ?? blog1,
      readTime: `${Math.max(1, Math.ceil((b.content?.length ?? 0) / 1000))} min read`,
      likes: b.likes,
      comments: b.comments_count,
      category: b.category ?? "General",
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 pt-24 pb-20">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center rounded-full border border-border bg-secondary focus-within:border-primary focus-within:shadow-gold transition-all">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos, music, blogs..."
              className="flex-1 bg-transparent px-5 py-3 text-foreground placeholder:text-muted-foreground outline-none text-sm"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="p-2 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            )}
            <button type="submit" className="px-5 py-3 text-muted-foreground hover:text-primary transition-colors">
              <SearchIcon size={20} />
            </button>
          </div>
        </form>

        {/* Content type filters */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {contentTypes.map((ct) => (
            <Button
              key={ct.value}
              size="sm"
              variant={activeType === ct.value ? "default" : "outline"}
              onClick={() => handleTypeChange(ct.value)}
              className={`rounded-full gap-1.5 ${
                activeType === ct.value
                  ? "bg-gradient-gold text-primary-foreground hover:opacity-90"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ct.icon}
              {ct.label}
            </Button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : hasSearched ? (
          totalResults === 0 ? (
            <div className="text-center py-20">
              <SearchIcon size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No results found</h2>
              <p className="text-muted-foreground text-sm">Try different keywords or change the content filter</p>
            </div>
          ) : (
            <div className="space-y-12">
              <p className="text-sm text-muted-foreground text-center">
                Found <strong className="text-foreground">{totalResults}</strong> result{totalResults !== 1 && "s"} for "{query}"
              </p>

              {videoCards.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                    <Play size={18} /> Videos ({videoCards.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {videoCards.map((v) => (
                      <VideoCard key={v.id || v.title} {...v} />
                    ))}
                  </div>
                </motion.section>
              )}

              {audioCards.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                    <Music size={18} /> Music ({audioCards.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {audioCards.map((a, i) => (
                      <AudioCard key={`${a.title}-${i}`} {...a} />
                    ))}
                  </div>
                </motion.section>
              )}

              {blogCards.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                    <BookOpen size={18} /> Blogs ({blogCards.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {blogCards.map((b) => (
                      <BlogCard key={b.title} {...b} />
                    ))}
                  </div>
                </motion.section>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-20">
            <SearchIcon size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Search AfriTube</h2>
            <p className="text-muted-foreground text-sm">Find videos, music, and blogs from African creators</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
