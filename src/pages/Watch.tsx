import { useEffect, useState, useCallback, useRef } from "react";
import { backfillVideoThumbnail } from "@/lib/videoThumbnail";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Eye, Clock, Share2, User, ChevronDown, ChevronUp, BadgeCheck } from "lucide-react";
import VideoReactions from "@/components/VideoReactions";
import SubscribeButton from "@/components/SubscribeButton";
import VideoComments from "@/components/VideoComments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useWatchTimeTracker } from "@/hooks/useWatchTimeTracker";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subtitle_url: string | null;
  views: number;
  duration: number | null;
  category: string | null;
  created_at: string;
  user_id: string;
}

interface CreatorProfile {
  display_name: string | null;
  avatar_url: string | null;
  subscriber_count?: number;
  is_monetized?: boolean;
  is_creator?: boolean;
}

interface PlaylistContext {
  id: string;
  title: string;
  videos: { id: string; title: string; thumbnail_url: string | null; duration: number | null }[];
  currentIndex: number;
  extraQuery?: string;
}

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const listId = searchParams.get("list");
  const mixVideoIdsParam = searchParams.get("videos");
  const { user, isAdmin } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [playlistCtx, setPlaylistCtx] = useState<PlaylistContext | null>(null);
  const [showRelated, setShowRelated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  const videoRef = useCallback((el: HTMLVideoElement | null) => setVideoElement(el), []);
  const buildWatchHref = useCallback((videoId: string, context?: PlaylistContext | null) => {
    if (!context) return `/watch/${videoId}`;
    const suffix = context.extraQuery ? `&${context.extraQuery}` : "";
    return `/watch/${videoId}?list=${context.id}${suffix}`;
  }, []);

  useWatchTimeTracker({
    videoId: id ?? "",
    creatorUserId: video?.user_id ?? "",
    videoElement,
  });

  // Auto-backfill missing thumbnails when the owner watches their own video.
  const backfillAttempted = useRef<string | null>(null);
  useEffect(() => {
    if (!video || !user) return;
    if (video.thumbnail_url) return;
    if (user.id !== video.user_id) return;
    if (backfillAttempted.current === video.id) return;
    backfillAttempted.current = video.id;

    backfillVideoThumbnail(video.id, video.video_url, video.user_id).then((url) => {
      if (url) setVideo((v) => (v ? { ...v, thumbnail_url: url } : v));
    });
  }, [video, user]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();

      // Fetch video
      const { data: vid } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();

      if (!vid) {
        setLoading(false);
        return;
      }
      setVideo(vid);

      // Increment view count (fire-and-forget)
      supabase
        .from("videos")
        .update({ views: vid.views + 1 })
        .eq("id", id)
        .then();

      // Fetch creator profile
      const canViewEligibility = isAdmin || user?.id === vid.user_id;
      const profileSelect = canViewEligibility
        ? "display_name, avatar_url, subscriber_count, is_monetized, is_creator"
        : "display_name, avatar_url, is_creator";
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select(profileSelect)
        .eq("user_id", vid.user_id)
        .single();
      setCreator(profile as any);

      // Fetch related videos (same category, exclude current)
      const { data: rel } = await supabase
        .from("videos")
        .select("*")
        .neq("id", id)
        .eq("visibility", "public")
        .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
        .order("views", { ascending: false })
        .limit(8);
      setRelated(rel ?? []);

      setLoading(false);
    };

    load();
  }, [id, isAdmin, user?.id]);

  // Load playlist context when ?list= is present
  useEffect(() => {
    if (!listId || !id) { setPlaylistCtx(null); return; }
    (async () => {
      if (listId === "mix") {
        const mixVideoIds = (mixVideoIdsParam ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const dedupedIds = Array.from(new Set(mixVideoIds));
        if (dedupedIds.length === 0) {
          setPlaylistCtx(null);
          return;
        }

        const { data: vids } = await supabase
          .from("videos")
          .select("id, title, thumbnail_url, duration")
          .in("id", dedupedIds);
        const byId = new Map(((vids ?? []) as any[]).map((video: any) => [video.id, video]));
        const ordered = dedupedIds.map((videoId) => byId.get(videoId)).filter(Boolean) as any[];
        if (ordered.length === 0) {
          setPlaylistCtx(null);
          return;
        }

        const idx = ordered.findIndex((video) => video.id === id);
        setPlaylistCtx({
          id: "mix",
          title: "Your Mix",
          videos: ordered,
          currentIndex: idx >= 0 ? idx : 0,
          extraQuery: `videos=${encodeURIComponent(dedupedIds.join(","))}`,
        });
        return;
      }

      const { data: pl } = await supabase.from("playlists").select("id, title").eq("id", listId).single();
      if (!pl) return;
      const { data: items } = await supabase
        .from("playlist_items")
        .select("video_id, position")
        .eq("playlist_id", listId)
        .order("position", { ascending: true });
      const videoIds = (items ?? []).map((i: any) => i.video_id).filter(Boolean);
      if (!videoIds.length) return;
      const { data: vids } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, duration")
        .in("id", videoIds);
      const ordered = videoIds
        .map((vid: string) => (vids ?? []).find((v: any) => v.id === vid))
        .filter(Boolean) as any[];
      const idx = ordered.findIndex((v) => v.id === id);
      setPlaylistCtx({ id: pl.id, title: pl.title, videos: ordered, currentIndex: idx >= 0 ? idx : 0 });
    })();
  }, [listId, mixVideoIdsParam, id]);

  useEffect(() => {
    setShowRelated(!playlistCtx);
  }, [playlistCtx]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadSubtitles = async () => {
      if (!video?.subtitle_url) {
        setSubtitleTrackUrl(null);
        return;
      }

      try {
        const response = await fetch(video.subtitle_url);
        if (!response.ok) throw new Error(`Failed to fetch subtitles: ${response.status}`);
        const srtText = await response.text();
        const vttText = `WEBVTT\n\n${srtText
          .replace(/\r/g, "")
          .replace(/--&gt;/g, "-->")
          .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
        objectUrl = URL.createObjectURL(new Blob([vttText], { type: "text/vtt" }));
        setSubtitleTrackUrl(objectUrl);
      } catch (error) {
        console.warn("Subtitle processing failed:", error);
        setSubtitleTrackUrl(video.subtitle_url);
      }
    };

    loadSubtitles();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [video?.subtitle_url]);

  // Auto-advance to next video in playlist
  useEffect(() => {
    if (!videoElement || !playlistCtx) return;
    const handler = () => {
      const next = playlistCtx.videos[playlistCtx.currentIndex + 1];
      if (next) navigate(buildWatchHref(next.id, playlistCtx));
    };
    videoElement.addEventListener("ended", handler);
    return () => videoElement.removeEventListener("ended", handler);
  }, [videoElement, playlistCtx, navigate, buildWatchHref]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
    return views.toString();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return `${Math.floor(days / 30)} months ago`;
    if (days > 0) return `${days} days ago`;
    return "Today";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="w-full aspect-video rounded-xl" />
              <Skeleton className="h-8 w-3/4 mt-4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Video not found</h1>
          <p className="text-muted-foreground mt-2">This video may have been removed or doesn't exist.</p>
          <Link to="/">
            <Button className="mt-6 rounded-full">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canViewCreatorStats = isAdmin || user?.id === video.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 max-w-[1440px] mx-auto px-4 md:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Player */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2"
          >
            {/* Video Player */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={video.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                poster={video.thumbnail_url ?? undefined}
              >
                {subtitleTrackUrl && (
                  <track kind="subtitles" src={subtitleTrackUrl} srcLang="en" label="Subtitles" default />
                )}
              </video>
            </div>

            {/* Video Info */}
            <h1 className="font-display font-bold text-lg md:text-xl text-foreground mt-4 leading-snug">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye size={16} /> {formatViews(video.views)} views
                </span>
                <span>{timeAgo(video.created_at)}</span>
                {video.category && (
                  <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs">
                    {video.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <VideoReactions videoId={video.id} />
                <Button variant="secondary" size="sm" className="rounded-full gap-1.5">
                  <Share2 size={16} /> Share
                </Button>
              </div>
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3 mt-5 p-4 rounded-xl bg-card border border-border">
              {creator?.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name ?? "Creator"}
                  className="w-11 h-11 rounded-full object-cover"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
                  <User size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link to={`/creator/${video.user_id}`} className="font-semibold text-foreground text-sm truncate hover:text-primary transition-colors">
                    {creator?.display_name ?? "Unknown Creator"}
                  </Link>
                  {creator?.is_creator && (
                    <span className="inline-flex items-center text-primary" title="Verified creator">
                      <BadgeCheck size={14} />
                    </span>
                  )}
                  {canViewCreatorStats && creator?.is_monetized && (
                    <span className="bg-gradient-gold text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      MONETIZED
                    </span>
                  )}
                </div>
                {canViewCreatorStats && (
                  <span className="text-xs text-muted-foreground">
                    {formatViews(creator?.subscriber_count ?? 0)} subscribers
                  </span>
                )}
              </div>
              <SubscribeButton creatorUserId={video.user_id} />
            </div>

            {/* Description */}
            {video.description && (
              <div className="mt-4 p-4 rounded-xl bg-card border border-border">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {video.description}
                </p>
              </div>
            )}

            {/* Comments */}
            <VideoComments videoId={video.id} />
          </motion.div>

          {/* Related Videos Sidebar */}
          <div className="space-y-3 lg:sticky lg:top-24 self-start">
            {playlistCtx && (
              <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs text-muted-foreground">Playing from playlist</p>
                  {playlistCtx.id === "mix" ? (
                    <Link to="/mix" className="font-display font-semibold text-foreground text-sm hover:text-primary line-clamp-1">
                      {playlistCtx.title}
                    </Link>
                  ) : (
                    <Link to={`/playlist/${playlistCtx.id}`} className="font-display font-semibold text-foreground text-sm hover:text-primary line-clamp-1">
                      {playlistCtx.title}
                    </Link>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {playlistCtx.currentIndex + 1} / {playlistCtx.videos.length}
                  </p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {playlistCtx.videos.map((pv, i) => {
                    const active = pv.id === video.id;
                    const isUpNext = i === playlistCtx.currentIndex + 1;
                    return (
                      <Link key={pv.id} to={buildWatchHref(pv.id, playlistCtx)}
                        className={`flex gap-2 items-start px-3 py-2 hover:bg-secondary transition-colors ${active ? "bg-secondary" : ""}`}>
                        <span className={`text-xs w-5 text-center pt-1 ${active ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {active ? "▶" : i + 1}
                        </span>
                        <div className="w-20 aspect-video rounded bg-secondary overflow-hidden shrink-0">
                          {pv.thumbnail_url ? (
                            <img src={pv.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs line-clamp-2 block ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {pv.title}
                          </span>
                          {isUpNext && !active && (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              ▶ Up Next
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
              onClick={() => setShowRelated((prev) => !prev)}
            >
              <span>Related Videos</span>
              {showRelated ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showRelated && (
              <>
                {related.length === 0 && (
                  <p className="text-sm text-muted-foreground">No related videos yet.</p>
                )}
                {related.map((rv) => (
                  <Link key={rv.id} to={`/watch/${rv.id}`}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex gap-3 group cursor-pointer p-2 rounded-lg hover:bg-card transition-colors"
                    >
                      <div className="relative w-40 min-w-[10rem] aspect-video rounded-lg overflow-hidden bg-secondary shrink-0">
                        {rv.thumbnail_url ? (
                          <img
                            src={rv.thumbnail_url}
                            alt={rv.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Eye size={20} />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                          {formatDuration(rv.duration)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {rv.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Eye size={11} /> {formatViews(rv.views)} views
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {timeAgo(rv.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
