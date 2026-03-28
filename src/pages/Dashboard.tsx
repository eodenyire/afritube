import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, Music, BookOpen, Eye, Users, Clock, TrendingUp,
  DollarSign, Edit2, Upload, BarChart3, Loader2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  category: string;
  created_at: string;
}

interface AudioItem {
  id: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  streams: number;
  genre: string;
  created_at: string;
}

interface BlogItem {
  id: string;
  title: string;
  cover_url: string | null;
  likes: number;
  comments_count: number;
  category: string;
  created_at: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const Dashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchContent = async () => {
      setLoading(true);
      const [vRes, aRes, bRes] = await Promise.all([
        supabase.from("videos").select("id, title, thumbnail_url, views, category, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("audio_tracks").select("id, title, artist_name, cover_url, streams, genre, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("blog_posts").select("id, title, cover_url, likes, comments_count, category, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setVideos(vRes.data ?? []);
      setAudios(aRes.data ?? []);
      setBlogs(bRes.data ?? []);
      setLoading(false);
    };
    fetchContent();
  }, [user]);

  const handleDelete = async (table: "videos" | "audio_tracks" | "blog_posts", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    if (table === "videos") setVideos(prev => prev.filter(v => v.id !== id));
    else if (table === "audio_tracks") setAudios(prev => prev.filter(a => a.id !== id));
    else setBlogs(prev => prev.filter(b => b.id !== id));
    toast({ title: "Deleted successfully" });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const subscriberProgress = Math.min((profile?.subscriber_count ?? 0) / 100 * 100, 100);
  const watchHoursProgress = Math.min((profile?.watch_hours ?? 0) / 1000 * 100, 100);
  const isEligible = profile?.is_monetized || (subscriberProgress >= 100 && watchHoursProgress >= 100);
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalStreams = audios.reduce((s, a) => s + a.streams, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-5xl mx-auto px-4">
        <motion.div {...fadeUp}>
          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xl font-bold font-display">
                  {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground truncate">
                {profile?.display_name || "Creator"}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {profile?.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>}
            </div>
            <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => navigate("/upload")}>
              <Upload size={14} /> Upload
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard icon={<Users size={18} />} label="Subscribers" value={profile?.subscriber_count ?? 0} />
            <StatCard icon={<Clock size={18} />} label="Watch Hours" value={profile?.watch_hours ?? 0} />
            <StatCard icon={<Eye size={18} />} label="Total Views" value={totalViews} />
            <StatCard icon={<BarChart3 size={18} />} label="Total Streams" value={totalStreams} />
          </div>

          {/* Monetization card */}
          <Card className="mb-8 bg-card border-border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">Monetization Progress</h2>
                {isEligible && (
                  <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Eligible ✓
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Subscribers</span>
                    <span className="font-medium text-foreground">{profile?.subscriber_count ?? 0} / 100</span>
                  </div>
                  <Progress value={subscriberProgress} className="h-2.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Watch Hours</span>
                    <span className="font-medium text-foreground">{profile?.watch_hours ?? 0} / 1,000</span>
                  </div>
                  <Progress value={watchHoursProgress} className="h-2.5" />
                </div>
              </div>
              {!isEligible && (
                <p className="text-xs text-muted-foreground mt-4">
                  Reach 100 subscribers and 1,000 watch hours to start earning from ads on your content.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Content tabs */}
          <Tabs defaultValue="videos" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-secondary">
              <TabsTrigger value="videos" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <Video size={14} /> Videos ({videos.length})
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <Music size={14} /> Audio ({audios.length})
              </TabsTrigger>
              <TabsTrigger value="blogs" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <BookOpen size={14} /> Blogs ({blogs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-4">
              {loading ? <LoadingState /> : videos.length === 0 ? (
                <EmptyState icon={<Video size={36} />} text="No videos yet" cta="Upload Video" onClick={() => navigate("/upload")} />
              ) : (
                <div className="space-y-3">
                  {videos.map(v => (
                    <ContentRow key={v.id}
                      image={v.thumbnail_url}
                      title={v.title}
                      meta={`${v.views.toLocaleString()} views · ${v.category}`}
                      date={v.created_at}
                      onDelete={() => handleDelete("videos", v.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="mt-4">
              {loading ? <LoadingState /> : audios.length === 0 ? (
                <EmptyState icon={<Music size={36} />} text="No tracks yet" cta="Upload Track" onClick={() => navigate("/upload")} />
              ) : (
                <div className="space-y-3">
                  {audios.map(a => (
                    <ContentRow key={a.id}
                      image={a.cover_url}
                      title={a.title}
                      meta={`${a.streams.toLocaleString()} streams · ${a.genre}${a.artist_name ? ` · ${a.artist_name}` : ""}`}
                      date={a.created_at}
                      onDelete={() => handleDelete("audio_tracks", a.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="blogs" className="mt-4">
              {loading ? <LoadingState /> : blogs.length === 0 ? (
                <EmptyState icon={<BookOpen size={36} />} text="No blog posts yet" cta="Write a Post" onClick={() => navigate("/upload")} />
              ) : (
                <div className="space-y-3">
                  {blogs.map(b => (
                    <ContentRow key={b.id}
                      image={b.cover_url}
                      title={b.title}
                      meta={`${b.likes} likes · ${b.comments_count} comments · ${b.category}`}
                      date={b.created_at}
                      onDelete={() => handleDelete("blog_posts", b.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
        <p className="font-display text-xl font-bold text-foreground">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function ContentRow({ image, title, meta, date, onDelete }: {
  image: string | null; title: string; meta: string; date: string; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div className="w-16 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
        {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Video size={16} /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">{new Date(date).toLocaleDateString()}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ icon, text, cta, onClick }: { icon: React.ReactNode; text: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <p className="text-muted-foreground mb-4">{text}</p>
      <Button onClick={onClick} className="bg-gradient-gold text-primary-foreground rounded-full px-6 hover:opacity-90">
        <Upload size={16} className="mr-1.5" /> {cta}
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );
}

export default Dashboard;
