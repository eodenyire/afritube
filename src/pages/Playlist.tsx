import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Share2, Heart, Trash2, Plus, Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlaylist, type PlaylistWithVideos } from "@/hooks/usePlaylist";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

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

interface PlaylistOwnerProfile {
  display_name: string | null;
}

interface VideoProfileRow {
  user_id: string;
  display_name: string | null;
}

const Playlist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchPlaylist, removeVideoFromPlaylist, deletePlaylist, addVideoToPlaylist } = usePlaylist();

  const [playlist, setPlaylist] = useState<PlaylistWithVideos | null>(null);
  const [playlistOwner, setPlaylistOwner] = useState<PlaylistOwnerProfile | null>(null);
  const [videos, setVideos] = useState<VideoWithDetails[]>([]);
  const [availableVideos, setAvailableVideos] = useState<VideoWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [addingVideoId, setAddingVideoId] = useState<string | null>(null);

  const updatePlaylistItemsFromVideos = (nextVideos: VideoWithDetails[]) => {
    setPlaylist((prev) => {
      if (!prev || !id) return prev;
      const existingItemMap = new Map(prev.items.map((item) => [item.video_id, item]));
      return {
        ...prev,
        items: nextVideos.map((video, index) => {
          const existing = existingItemMap.get(video.id);
          return {
            id: existing?.id ?? `tmp-${video.id}`,
            playlist_id: id,
            video_id: video.id,
            position: index,
            added_at: existing?.added_at ?? new Date().toISOString(),
          };
        }),
        video_count: nextVideos.length,
      };
    });
  };

  const persistVideoOrder = async (orderedVideos: VideoWithDetails[]) => {
    if (!id) return false;
    setSavingOrder(true);
    const updates = await Promise.all(
      orderedVideos.map((video, index) =>
        supabase
          .from("playlist_items")
          .update({ position: index })
          .eq("playlist_id", id)
          .eq("video_id", video.id)
      )
    );
    setSavingOrder(false);

    const failed = updates.find((result) => result.error);
    if (failed) {
      toast({
        title: "Failed to save order",
        description: failed.error?.message,
        variant: "destructive",
      });
      return false;
    }
    updatePlaylistItemsFromVideos(orderedVideos);
    return true;
  };

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setVideos([]);
      setAvailableVideos([]);
      setPlaylistOwner(null);

      const attachVideoProfiles = async (videoRows: any[]): Promise<VideoWithDetails[]> => {
        if (videoRows.length === 0) return [];

        const creatorIds = Array.from(new Set(videoRows.map((video) => video.user_id).filter(Boolean)));
        if (creatorIds.length === 0) return videoRows as VideoWithDetails[];

        const { data: profileRows } = await (supabase
          .from("profiles") as any)
          .select("user_id, display_name")
          .in("user_id", creatorIds);

        const profileMap = new Map(
          ((profileRows ?? []) as VideoProfileRow[]).map((profile) => [profile.user_id, profile.display_name])
        );

        return videoRows.map((video) => ({
          ...video,
          profiles: {
            display_name: profileMap.get(video.user_id) ?? null,
          },
        })) as VideoWithDetails[];
      };

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
      const ownsPlaylist = user?.id === playlistData.user_id;
      setIsOwner(ownsPlaylist);

      const { data: ownerProfile } = await (supabase
        .from("profiles") as any)
        .select("display_name")
        .eq("user_id", playlistData.user_id)
        .single();
      setPlaylistOwner((ownerProfile as PlaylistOwnerProfile | null) ?? null);

      // Fetch videos in playlist
      if (playlistData.items.length > 0) {
        const videoIds = playlistData.items
          .map((item) => item.video_id)
          .filter((videoId): videoId is string => Boolean(videoId));
        if (videoIds.length > 0) {
          const playlistVideosQuery = (supabase
            .from("videos") as any)
            .select("id, title, thumbnail_url, views, duration, category, user_id")
            .in("id", videoIds);
          if (!ownsPlaylist) {
            playlistVideosQuery.eq("is_published", true);
          }
          const { data: videosData } = await playlistVideosQuery;

          if (videosData) {
            const playlistVideos = await attachVideoProfiles(videosData as any[]);
            // Sort by playlist order
            const orderedVideos = (playlistData.items
              .map((item) => playlistVideos.find((video) => video.id === item.video_id))
              .filter(Boolean)) as unknown as VideoWithDetails[];
            setVideos(orderedVideos);
          }
        }
      }

      if (ownsPlaylist && user?.id) {
        const { data: ownVideos } = await (supabase
          .from("videos") as any)
          .select("id, title, thumbnail_url, views, duration, category, user_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        const existingIds = new Set(playlistData.items.map((item) => item.video_id));
        const selectableVideos = (await attachVideoProfiles((ownVideos ?? []) as any[]))
          .filter((video) => !existingIds.has(video.id));
        setAvailableVideos(selectableVideos);
      }

      setLoading(false);
    };

    load();
  }, [id, user, fetchPlaylist, navigate, toast]);

  const handleRemoveVideo = async (videoId: string) => {
    if (!id) return;
    const success = await removeVideoFromPlaylist(id, videoId);
    if (success) {
      const removedVideo = videos.find((video) => video.id === videoId);
      const nextVideos = videos.filter((video) => video.id !== videoId);
      setVideos(nextVideos);
      if (removedVideo) setAvailableVideos((prev) => [removedVideo, ...prev]);
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items
                .filter((item) => item.video_id !== videoId)
                .map((item, index) => ({ ...item, position: index })),
              video_count: Math.max(0, prev.video_count - 1),
            }
          : null
      );
    }
  };

  const handleAddVideo = async (video: VideoWithDetails) => {
    if (!id) return;
    setAddingVideoId(video.id);
    const success = await addVideoToPlaylist(id, video.id);
    setAddingVideoId(null);
    if (!success) return;

    const nextVideos = [...videos, video];
    setVideos(nextVideos);
    updatePlaylistItemsFromVideos(nextVideos);
    setAvailableVideos((prev) => prev.filter((item) => item.id !== video.id));
  };

  const handleMoveVideo = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) return;

    const previous = [...videos];
    const reordered = [...videos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setVideos(reordered);
    updatePlaylistItemsFromVideos(reordered);
    const saved = await persistVideoOrder(reordered);
    if (!saved) {
      setVideos(previous);
      updatePlaylistItemsFromVideos(previous);
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

  const filteredAvailableVideos = availableVideos.filter((video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              {playlistOwner?.display_name && (
                <p className="text-sm text-muted-foreground mb-2">
                  by {playlistOwner.display_name}
                </p>
              )}
              {playlist.description && (
                <p className="text-muted-foreground mb-4">{playlist.description}</p>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                {playlist.video_count} video{playlist.video_count !== 1 ? "s" : ""}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="gap-2 bg-gradient-gold text-primary-foreground rounded-full"
                  disabled={videos.length === 0}
                  onClick={() => videos[0] && navigate(`/watch/${videos[0].id}?list=${playlist.id}`)}
                >
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
          {isOwner && (
            <div className="mb-6 rounded-xl border border-border p-4 bg-card/60">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add your uploads</h3>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your uploaded videos..."
                  className="pl-8"
                />
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {filteredAvailableVideos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {availableVideos.length === 0
                      ? "All your uploaded videos are already in this playlist."
                      : "No videos match your search."}
                  </p>
                ) : (
                  filteredAvailableVideos.map((video) => (
                    <div key={video.id} className="flex items-center gap-3 border border-border rounded-lg px-3 py-2">
                      <div className="w-20 aspect-video rounded bg-secondary overflow-hidden shrink-0">
                        {video.thumbnail_url && (
                          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{Number(video.views ?? 0).toLocaleString()} views</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddVideo(video)}
                        disabled={addingVideoId === video.id}
                        className="gap-1"
                      >
                        {addingVideoId === video.id ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
            <div className="space-y-2">
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex gap-3 items-center group p-2 rounded-lg hover:bg-card transition-colors"
                >
                  <div className="text-muted-foreground font-semibold w-8 text-right shrink-0">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => navigate(`/watch/${video.id}?list=${playlist.id}`)}
                    className="flex-1 flex gap-3 items-center text-left min-w-0"
                  >
                    <div className="w-32 aspect-video rounded-md bg-secondary overflow-hidden shrink-0">
                      {video.thumbnail_url && (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {video.profiles?.display_name ?? "Unknown"} · {Number(video.views ?? 0).toLocaleString()} views
                      </p>
                    </div>
                  </button>
                  {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveVideo(index, "up")}
                        disabled={index === 0 || savingOrder}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-40 px-1.5"
                        aria-label="Move up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveVideo(index, "down")}
                        disabled={index === videos.length - 1 || savingOrder}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-40 px-1.5"
                        aria-label="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveVideo(video.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 px-1.5"
                        aria-label="Remove from playlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
