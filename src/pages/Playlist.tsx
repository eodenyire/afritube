import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Share2, Heart, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaylist, type PlaylistWithVideos } from "@/hooks/usePlaylist";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import { useToast } from "@/hooks/use-toast";

interface VideoWithDetails {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  duration: number | null;
  category: string | null;
  user_id: string;
  profiles?: {
    display_name: string | null;
  };
}

const Playlist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchPlaylist, removeVideoFromPlaylist, deletePlaylist } = usePlaylist();

  const [playlist, setPlaylist] = useState<PlaylistWithVideos | null>(null);
  const [videos, setVideos] = useState<VideoWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);

      // Fetch playlist
      const playlistData = await fetchPlaylist(id);
      if (!playlistData) {
        toast({
          title: "Playlist not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setPlaylist(playlistData);
      setIsOwner(user?.id === playlistData.user_id);

      // Fetch videos in playlist
      if (playlistData.items.length > 0) {
        const videoIds = playlistData.items.map((item) => item.video_id);
        const { data: videosData } = await supabase
          .from("videos")
          .select("*, profiles(display_name)")
          .in("id", videoIds);

        if (videosData) {
          // Sort by playlist order
          const orderedVideos = playlistData.items
            .map((item) => videosData.find((v) => v.id === item.video_id))
            .filter(Boolean) as VideoWithDetails[];
          setVideos(orderedVideos);
        }
      }

      setLoading(false);
    };

    load();
  }, [id, user, fetchPlaylist, navigate, toast]);

  const handleRemoveVideo = async (videoId: string) => {
    if (!id) return;
    const success = await removeVideoFromPlaylist(id, videoId);
    if (success) {
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((item) => item.video_id !== videoId),
              video_count: prev.video_count - 1,
            }
          : null
      );
    }
  };

  const handleDeletePlaylist = async () => {
    if (!id || !confirm("Are you sure you want to delete this playlist?")) return;
    const success = await deletePlaylist(id);
    if (success) {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Playlist not found
          </h2>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const playlistTypeLabel = {
    album: "Album",
    ep: "EP",
    compilation: "Compilation",
    custom: "Playlist",
    watch_later: "Watch Later",
  }[playlist.playlist_type];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto px-4 mb-12"
        >
          <div className="flex gap-8 items-start">
            {/* Cover */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 rounded-lg overflow-hidden bg-secondary">
                {playlist.cover_url ? (
                  <img
                    src={playlist.cover_url}
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">🎵</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary mb-2">
                {playlistTypeLabel}
              </p>
              <h1 className="font-display text-4xl font-bold text-foreground mb-2">
                {playlist.title}
              </h1>
              {playlist.description && (
                <p className="text-muted-foreground mb-4">{playlist.description}</p>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                {playlist.video_count} video{playlist.video_count !== 1 ? "s" : ""}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button className="gap-2 bg-gradient-gold text-primary-foreground rounded-full">
                  <Play size={18} className="fill-current" />
                  Play All
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Share2 size={18} />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Heart size={18} />
                </Button>
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full"
                    onClick={handleDeletePlaylist}
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Videos */}
        <div className="max-w-6xl mx-auto px-4">
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                This playlist is empty
              </p>
              {isOwner && (
                <Button onClick={() => navigate("/upload")} className="gap-2">
                  <Plus size={18} />
                  Add Videos
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-4 items-start group"
                >
                  <div className="flex-shrink-0 text-muted-foreground font-semibold w-8 text-right">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <VideoCard
                      id={video.id}
                      title={video.title}
                      channel={video.profiles?.display_name ?? "Unknown"}
                      views={video.views}
                      duration={video.duration}
                      thumbnailUrl={video.thumbnail_url}
                      onPress={() => navigate(`/watch/${video.id}`)}
                    />
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveVideo(video.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playlist;
