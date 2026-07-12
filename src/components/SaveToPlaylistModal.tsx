import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlaylist, type Playlist } from "@/hooks/usePlaylist";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SaveToPlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId?: string;
}

const SaveToPlaylistModal = ({ open, onOpenChange, videoId }: SaveToPlaylistModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addVideoToPlaylist, createPlaylist } = usePlaylist();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasWatchLater = useMemo(
    () => playlists.some((playlist) => playlist.playlist_type === "watch_later"),
    [playlists]
  );

  useEffect(() => {
    if (!open || !user) return;

    const fetchPlaylists = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Failed to load playlists",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setPlaylists((data ?? []) as Playlist[]);
      }
      setLoading(false);
    };

    fetchPlaylists();
  }, [open, user, toast]);

  useEffect(() => {
    if (!open) {
      setSelectedPlaylistId("");
      setNewPlaylistTitle("");
      setSaving(false);
      setLoading(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Sign in to save videos to playlists.",
        variant: "destructive",
      });
      return;
    }

    if (!videoId) {
      toast({
        title: "Cannot save",
        description: "This video cannot be saved to a playlist.",
        variant: "destructive",
      });
      return;
    }

    let targetPlaylistId = selectedPlaylistId;
    const shouldCreateNew = selectedPlaylistId === "create_new";
    const shouldCreateWatchLater = selectedPlaylistId === "create_watch_later";

    if (shouldCreateNew) {
      if (!newPlaylistTitle.trim()) {
        toast({
          title: "Playlist name required",
          description: "Enter a name for your new playlist.",
          variant: "destructive",
        });
        return;
      }
      setSaving(true);
      const createdId = await createPlaylist(newPlaylistTitle.trim(), undefined, undefined, "custom");
      setSaving(false);
      if (!createdId) return;
      targetPlaylistId = createdId;
    }

    if (shouldCreateWatchLater) {
      setSaving(true);
      const createdId = await createPlaylist("Watch Later", undefined, undefined, "watch_later");
      setSaving(false);
      if (!createdId) return;
      targetPlaylistId = createdId;
    }

    if (!targetPlaylistId) {
      toast({
        title: "Select a playlist",
        description: "Choose a playlist to continue.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const success = await addVideoToPlaylist(targetPlaylistId, videoId);
    setSaving(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to playlist</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="animate-spin text-primary" size={20} />
          </div>
        ) : (
          <div className="space-y-3 py-1 max-h-72 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className={`w-full text-left border rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedPlaylistId === playlist.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {playlist.title}
              </button>
            ))}

            {!hasWatchLater && (
              <button
                onClick={() => setSelectedPlaylistId("create_watch_later")}
                className={`w-full text-left border rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedPlaylistId === "create_watch_later"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary"
                }`}
              >
                Create Watch Later
              </button>
            )}

            <button
              onClick={() => setSelectedPlaylistId("create_new")}
              className={`w-full text-left border rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                selectedPlaylistId === "create_new"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <Plus size={14} />
              Create new playlist
            </button>

            {selectedPlaylistId === "create_new" && (
              <Input
                autoFocus
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="New playlist name"
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              loading ||
              !selectedPlaylistId ||
              (selectedPlaylistId === "create_new" && !newPlaylistTitle.trim())
            }
            className="bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveToPlaylistModal;
