import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SubscribeButton from "@/components/SubscribeButton";
import { User, Eye, Clock, Play, Music, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  subscriber_count: number;
  is_monetized: boolean;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  duration: number | null;
  created_at: string;
}

interface AudioTrack {
  id: string;
  title: string;
  cover_url: string | null;
  streams: number;
  artist_name: string | null;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  cover_url: string | null;
  excerpt: string | null;
  likes: number;
  created_at: string;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const timeAgo = (dateStr: string) => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days > 365) return `${Math.floor(days / 365)}y ago`;
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  return "Today";
};

const formatDuration = (s: number | null) => {
  if (!s) return "0:00";
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

const CreatorProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [audio, setAudio] = useState<AudioTrack[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: prof }, { data: vids }, { data: tracks }, { data: posts }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, bio, subscriber_count, is_monetized, created_at")
            .eq("user_id", userId)
            .single(),
          supabase
            .from("videos")
            .select("id, title, thumbnail_url, views, duration, created_at")
            .eq("user_id", userId)
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("audio_tracks")
            .select("id, title, cover_url, streams, artist_name, created_at")
            .eq("user_id", userId)
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("blog_posts")
            .select("id, title, cover_url, excerpt, likes, created_at")
            .eq("user_id", userId)
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
        ]);
      setProfile(prof);
      setVideos(vids ?? []);
      setAudio(tracks ?? []);
      setBlogs(posts ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-video rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Creator not found</h1>
          <p className="text-muted-foreground mt-2">This profile doesn't exist.</p>
          <Link to="/" className="mt-6 text-primary underline">Go Home</Link>
        </div>
      </div>
    );
  }

  const totalContent = videos.length + audio.length + blogs.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 max-w-5xl mx-auto px-4 md:px-6 pb-16">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8"
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? "Creator"}
              className="w-24 h-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-border">
              <User size={36} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="font-display font-bold text-xl text-foreground truncate">
                {profile.display_name ?? "Unknown Creator"}
              </h1>
              {profile.is_monetized && (
                <span className="bg-gradient-gold text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  ✦ MONETIZED
                </span>
              )}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground mt-1">
              <span>{formatCount(profile.subscriber_count)} subscribers</span>
              <span>{totalContent} uploads</span>
              <span>Joined {timeAgo(profile.created_at)}</span>
            </div>
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            )}
            <div className="mt-4">
              <SubscribeButton creatorUserId={profile.user_id} />
            </div>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-xl mb-6 overflow-x-auto">
            <TabsTrigger value="videos" className="gap-1.5 rounded-lg">
              <Play size={14} /> Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="music" className="gap-1.5 rounded-lg">
              <Music size={14} /> Music ({audio.length})
            </TabsTrigger>
            <TabsTrigger value="blogs" className="gap-1.5 rounded-lg">
              <BookOpen size={14} /> Blogs ({blogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Videos */}
          <TabsContent value="videos">
            {videos.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No videos yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((v) => (
                  <Link key={v.id} to={`/watch/${v.id}`}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="rounded-xl overflow-hidden bg-card border border-border group"
                    >
                      <div className="relative aspect-video bg-secondary">
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Play size={24} />
                          </div>
                        )}
                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                          {formatDuration(v.duration)}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {v.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1"><Eye size={11} /> {formatCount(v.views)}</span>
                          <span>{timeAgo(v.created_at)}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Music */}
          <TabsContent value="music">
            {audio.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No music yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {audio.map((t) => (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -4 }}
                    className="rounded-xl overflow-hidden bg-card border border-border"
                  >
                    <div className="relative aspect-square bg-secondary">
                      {t.cover_url ? (
                        <img src={t.cover_url} alt={t.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Music size={24} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">{t.title}</h3>
                      {t.artist_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t.artist_name}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                        <span>{formatCount(t.streams)} streams</span>
                        <span>{timeAgo(t.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Blogs */}
          <TabsContent value="blogs">
            {blogs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No blog posts yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {blogs.map((b) => (
                  <motion.div
                    key={b.id}
                    whileHover={{ y: -4 }}
                    className="rounded-xl overflow-hidden bg-card border border-border"
                  >
                    {b.cover_url && (
                      <div className="aspect-[2/1] bg-secondary">
                        <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2">{b.title}</h3>
                      {b.excerpt && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span>{formatCount(b.likes)} likes</span>
                        <span>{timeAgo(b.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreatorProfile;
