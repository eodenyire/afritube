import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMix } from "@/hooks/useMix";

const Mix = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { mixVideos, loading } = useMix(user?.id, 40);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const mixVideoIds = mixVideos.map((video) => video.id).join(",");
  const playAll = () => {
    const first = mixVideos[0];
    if (!first) return;
    navigate(`/watch/${first.id}?list=mix&videos=${encodeURIComponent(mixVideoIds)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Made for you</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Your Mix</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Based on the videos you watch most.
          </p>

          <div className="mt-6">
            <Button
              onClick={playAll}
              disabled={mixVideos.length === 0}
              className="rounded-full bg-gradient-gold text-primary-foreground"
            >
              <Play size={16} className="mr-1.5 fill-current" />
              Play All
            </Button>
          </div>

          {loading || authLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : mixVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              Watch more videos to automatically build your mix.
            </p>
          ) : (
            <div className="mt-8 space-y-2">
              {mixVideos.map((video, index) => (
                <button
                  key={video.id}
                  className="w-full flex gap-3 items-center p-2 rounded-lg hover:bg-card transition-colors text-left"
                  onClick={() => navigate(`/watch/${video.id}?list=mix&videos=${encodeURIComponent(mixVideoIds)}`)}
                >
                  <div className="w-8 text-right text-sm text-muted-foreground font-semibold shrink-0">{index + 1}</div>
                  <div className="w-32 aspect-video rounded bg-secondary overflow-hidden shrink-0">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.creator_name ?? "Unknown"} · {Number(video.views ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Mix;
