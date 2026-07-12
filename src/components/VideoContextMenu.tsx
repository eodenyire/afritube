import { useEffect, useRef } from "react";
import { ListPlus, Share2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueue } from "@/hooks/useQueue";

interface VideoContextMenuProps {
  videoId?: string;
  audioId?: string;
  title: string;
  thumbnailUrl?: string;
  onClose: () => void;
  onSaveToPlaylist?: () => void;
}

const VideoContextMenu = ({ videoId, audioId, title, thumbnailUrl, onClose, onSaveToPlaylist }: VideoContextMenuProps) => {
  const { addToQueue } = useQueue();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleAddToQueue = () => {
    addToQueue({ id: videoId ?? audioId ?? "", title, thumbnailUrl, type: videoId ? "video" : "audio" });
    toast.success(`"${title}" added to queue`);
    onClose();
  };

  const handleSaveToPlaylist = () => {
    if (!videoId || !onSaveToPlaylist) {
      toast.error("This item cannot be saved to playlists");
      return;
    }
    onSaveToPlaylist();
    onClose();
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
      <div className="py-1">
        <button onClick={handleAddToQueue} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
          <ListPlus size={16} className="text-muted-foreground" /> Add to queue
        </button>
        <button onClick={handleSaveToPlaylist} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
          <Plus size={16} className="text-muted-foreground" /> Save to playlist
        </button>
        <div className="border-t border-border my-1" />
        <button onClick={handleShare} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
          <Share2 size={16} className="text-muted-foreground" /> Share
        </button>
      </div>
    </div>
  );
};

export default VideoContextMenu;
