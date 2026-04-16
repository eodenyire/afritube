import { Link } from "react-router-dom";
import { Music, Play, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Playlist } from "@/hooks/usePlaylist";

interface PlaylistCardProps {
  playlist: Playlist & { video_count?: number };
  onEdit?: (playlist: Playlist) => void;
  onDelete?: (playlistId: string) => void;
  onPlay?: (playlistId: string) => void;
}

export default function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
  onPlay,
}: PlaylistCardProps) {
  const playlistTypeLabel = {
    album: "Album",
    ep: "EP",
    compilation: "Compilation",
    custom: "Playlist",
    watch_later: "Watch Later",
  }[playlist.playlist_type];

  return (
    <div className="group relative bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {playlist.cover_url ? (
          <img
            src={playlist.cover_url}
            alt={playlist.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Overlay with play button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          {onPlay && (
            <Button
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onPlay(playlist.id)}
            >
              <Play className="w-5 h-5 fill-current" />
            </Button>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
          {playlistTypeLabel}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">
          {playlist.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {playlist.video_count || 0} video{playlist.video_count !== 1 ? "s" : ""}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Link
            to={`/playlist/${playlist.id}`}
            className="flex-1 text-xs text-primary hover:underline"
          >
            View
          </Link>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(playlist)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(playlist.id)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
