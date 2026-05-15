import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ListVideo, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import PlaylistCard from "@/components/PlaylistCard";
import { supabase } from "@/integrations/supabase/client";

const BrowsePlaylists = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from("playlists")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);

      const ids = (rows ?? []).map((playlist) => playlist.id);
      const creatorIds = Array.from(new Set((rows ?? []).map((playlist) => playlist.user_id).filter(Boolean)));
      const counts = new Map<string, number>();
      const creators = new Map<string, string | null>();
      if (ids.length > 0) {
        const { data: items } = await supabase
          .from("playlist_items")
          .select("playlist_id")
          .in("playlist_id", ids);
        (items ?? []).forEach((item: any) => {
          counts.set(item.playlist_id, (counts.get(item.playlist_id) ?? 0) + 1);
        });
      }

      if (creatorIds.length > 0) {
        const { data: creatorRows } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", creatorIds);
        (creatorRows ?? []).forEach((creator: any) => {
          creators.set(creator.user_id, creator.display_name ?? null);
        });
      }

      setPlaylists((rows ?? []).map((playlist: any) => ({
        ...playlist,
        video_count: counts.get(playlist.id) ?? 0,
        creator_name: creators.get(playlist.user_id) ?? null,
      })));
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 mb-1">
            <ListVideo className="text-primary" /> Browse Playlists
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Public playlists from creators across AfriTube.
          </p>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No public playlists found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onPlay={(id) => navigate(`/playlist/${id}`)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default BrowsePlaylists;
