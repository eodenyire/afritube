import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Eye, Clock, Share2, User } from "lucide-react";
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
  views: number;
  duration: number | null;
  category: string | null;
  created_at: string;
  user_id: string;
}

interface CreatorProfile {
  display_name: string | null;
  avatar_url: string | null;
  subscriber_count: number;
  is_monetized: boolean;
}

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useWatchTimeTracker({
    videoId: id ?? "",
    creatorUserId: video?.user_id ?? "",
    videoElement: videoRef.current,
  });

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, subscriber_count, is_monetized")
        .eq("user_id", vid.user_id)
        .single();
      setCreator(profile);

      // Fetch related videos (same category, exclude current)
      const { data: rel } = await supabase
        .from("videos")
        .select("*")
        .neq("id", id)
        .eq("is_published", true)
        .order("views", { ascending: false })
        .limit(8);
      setRelated(rel ?? []);

      setLoading(false);
    };

    load();
  }, [id]);

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
              />
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
                  <span className="font-semibold text-foreground text-sm truncate">
                    {creator?.display_name ?? "Unknown Creator"}
                  </span>
                  {creator?.is_monetized && (
                    <span className="bg-gradient-gold text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      MONETIZED
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatViews(creator?.subscriber_count ?? 0)} subscribers
                </span>
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
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Related Videos
            </h2>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
