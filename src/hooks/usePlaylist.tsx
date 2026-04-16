import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  playlist_type: "album" | "ep" | "compilation" | "custom" | "watch_later";
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  position: number;
  added_at: string;
}

export interface PlaylistWithVideos extends Playlist {
  items: PlaylistItem[];
  video_count: number;
}

export const usePlaylist = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  /**
   * Create a new playlist
   */
  const createPlaylist = useCallback(
    async (
      title: string,
      description?: string,
      coverUrl?: string,
      playlistType: "album" | "ep" | "compilation" | "custom" | "watch_later" = "custom"
    ): Promise<string | null> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("create_playlist", {
          p_title: title,
          p_description: description || null,
          p_cover_url: coverUrl || null,
          p_playlist_type: playlistType,
        });

        if (error) throw error;
        toast({ title: "Playlist created", description: `"${title}" has been created.` });
        return data as string;
      } catch (err: any) {
        toast({
          title: "Failed to create playlist",
          description: err.message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Fetch all playlists for the current user
   */
  const fetchUserPlaylists = useCallback(async (): Promise<Playlist[]> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error("Failed to fetch playlists:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a single playlist with its videos
   */
  const fetchPlaylist = useCallback(
    async (playlistId: string): Promise<PlaylistWithVideos | null> => {
      setLoading(true);
      try {
        // Fetch playlist
        const { data: playlist, error: playlistError } = await supabase
          .from("playlists")
          .select("*")
          .eq("id", playlistId)
          .single();

        if (playlistError) throw playlistError;

        // Fetch items
        const { data: items, error: itemsError } = await supabase
          .from("playlist_items")
          .select("*")
          .eq("playlist_id", playlistId)
          .order("position", { ascending: true });

        if (itemsError) throw itemsError;

        return {
          ...playlist,
          items: items || [],
          video_count: items?.length || 0,
        };
      } catch (err: any) {
        console.error("Failed to fetch playlist:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Add a video to a playlist
   */
  const addVideoToPlaylist = useCallback(
    async (playlistId: string, videoId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase.rpc("add_video_to_playlist", {
          p_playlist_id: playlistId,
          p_video_id: videoId,
        });

        if (error) throw error;
        toast({ title: "Video added to playlist" });
        return true;
      } catch (err: any) {
        toast({
          title: "Failed to add video",
          description: err.message,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Remove a video from a playlist
   */
  const removeVideoFromPlaylist = useCallback(
    async (playlistId: string, videoId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase.rpc("remove_video_from_playlist", {
          p_playlist_id: playlistId,
          p_video_id: videoId,
        });

        if (error) throw error;
        toast({ title: "Video removed from playlist" });
        return true;
      } catch (err: any) {
        toast({
          title: "Failed to remove video",
          description: err.message,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Reorder videos in a playlist
   */
  const reorderPlaylistItems = useCallback(
    async (playlistId: string, videoId: string, newPosition: number): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase.rpc("reorder_playlist_items", {
          p_playlist_id: playlistId,
          p_video_id: videoId,
          p_new_position: newPosition,
        });

        if (error) throw error;
        return true;
      } catch (err: any) {
        console.error("Failed to reorder playlist:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update playlist metadata
   */
  const updatePlaylist = useCallback(
    async (
      playlistId: string,
      updates: Partial<Playlist>
    ): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("playlists")
          .update(updates)
          .eq("id", playlistId);

        if (error) throw error;
        toast({ title: "Playlist updated" });
        return true;
      } catch (err: any) {
        toast({
          title: "Failed to update playlist",
          description: err.message,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Delete a playlist
   */
  const deletePlaylist = useCallback(
    async (playlistId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("playlists")
          .delete()
          .eq("id", playlistId);

        if (error) throw error;
        toast({ title: "Playlist deleted" });
        return true;
      } catch (err: any) {
        toast({
          title: "Failed to delete playlist",
          description: err.message,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    loading,
    createPlaylist,
    fetchUserPlaylists,
    fetchPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    reorderPlaylistItems,
    updatePlaylist,
    deletePlaylist,
  };
};
