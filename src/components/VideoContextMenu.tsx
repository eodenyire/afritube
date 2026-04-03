import { useState, useEffect, useRef } from "react";
import { ListPlus, Clock, Share2, Plus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueue } from "@/hooks/useQueue";

interface VideoContextMenuProps {
  videoId?: string;
  audioId?: string;
  title: string;
  thumbnailUrl?: string;
  onClose: () => void;
}

const VideoContextMenu = ({ videoId, audioId, title, thumbnailUrl, onClose }: VideoContextMenuProps) => {
  const { user } = useAuth();
  const { addToQueue } = useQueue();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addedTo, setAddedTo] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (user && showPlaylists) fetchPlaylists();
  }, [user, showPlaylists]);

  const fetchPlaylists = async () => {
    const { data } = await supabase
      .from("playlists")
      .select("id, title")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setPlaylists(data ?? []);
  };

  const handleAddToQueue = () => {
    addToQueue({ id: videoId ?? audioId ?? "", title, thumbnailUrl, type: videoId ? "video" : "audio" });
    toast.success(`"${title}" added to queue`);
    onClose();
  };

  const handleWatchLater = async () => {
    if (!user) { toast.error("Sign in to save videos"); return; }
    // Find or create "Watch Later" playlist
    let { data: existing } = await supabase
      .from("playlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", "Watch Later")
      .single();

    if (!existing) {
      const { data } = await supabase
        .from("playlists")
        .insert({ user_id: user.id, title: "Watch Later", is_public: false })
        .select("id")
        .single();
      existing = data;
    }

    if (existing) {
      await supabase.from("playlist_items").insert({
        playlist_id: existing.id,
        video_id: videoId ?? null,
        audio_id: audioId ?? null,
        position: 0,
      });
      toast.success("Saved to Watch Later");
    }
    onClose();
  };

  const handleAddToPlaylist = async (playlistId: string, playlistTitle: string) => {
    if (!user) return;
    const { error } = await supabase.from("playlist_items").insert({
      playlist_id: playlistId,
      video_id: videoId ?? null,
      audio_id: audioId ?? null,
      position: 0,
    });
    if (error) {
      toast.error("Already in this playlist");
    } else {
      setAddedTo((prev) => [...prev, playlistId]);
      toast.success(`Added to "${playlistTitle}"`);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    const { data, error } = await supabase
      .from("playlists")
      .insert({ user_id: user.id, title: newPlaylistName.trim() })
      .select("id, title")
      .single();
    if (!error && data) {
      await handleAddToPlaylist(data.id, data.title);
      setNewPlaylistName("");
      setShowNewPlaylist(false);
      fetchPlaylists();
    }
  };

  const handleShare = async () => {
    const url = videoId
      ? `${window.location.origin}/watch/${videoId}`
      : window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-8 z-50 w-56 rounded-xl bg-card border border-border shadow-card overflow-hidden"
    >
      {!showPlaylists ? (
        <div className="py-1">
          <button onClick={handleAddToQueue} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
            <ListPlus size={16} className="text-muted-foreground" /> Add to queue
          </button>
          <button onClick={handleWatchLater} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
            <Clock size={16} className="text-muted-foreground" /> Save to Watch Later
          </button>
          <button onClick={() => setShowPlaylists(true)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
            <Plus size={16} className="text-muted-foreground" /> Save to playlist
          </button>
          <div className="border-t border-border my-1" />
          <button onClick={handleShare} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
            <Share2 size={16} className="text-muted-foreground" /> Share
          </button>
        </div>
      ) : (
        <div className="py-1">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <button onClick={() => setShowPlaylists(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
            <span className="text-sm font-medium text-foreground">Save to playlist</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id, pl.title)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <span className="truncate">{pl.title}</span>
                {addedTo.includes(pl.id) && <Check size={14} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
          {!showNewPlaylist ? (
            <button
              onClick={() => setShowNewPlaylist(true)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-primary hover:bg-secondary transition-colors border-t border-border"
            >
              <Plus size={14} /> New playlist
            </button>
          ) : (
            <div className="px-3 py-2 border-t border-border space-y-2">
              <input
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                placeholder="Playlist name"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button onClick={handleCreatePlaylist} className="flex-1 bg-gradient-gold text-primary-foreground text-xs font-medium rounded-lg py-1.5 hover:opacity-90">
                  Create
                </button>
                <button onClick={() => setShowNewPlaylist(false)} className="flex-1 bg-secondary text-foreground text-xs rounded-lg py-1.5 hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoContextMenu;
