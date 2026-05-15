import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Loader2, ListVideo } from "lucide-react";
import Navbar from "@/components/Navbar";
import PlaylistCard from "@/components/PlaylistCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlaylist, type Playlist } from "@/hooks/usePlaylist";
import { supabase } from "@/integrations/supabase/client";

type PlaylistType = "custom" | "album" | "ep" | "compilation" | "watch_later";

const Playlists = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createPlaylist, deletePlaylist } = usePlaylist();

  const [playlists, setPlaylists] = useState<(Playlist & { video_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PlaylistType>("custom");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: pls } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const ids = (pls ?? []).map((p) => p.id);
    let counts = new Map<string, number>();
    if (ids.length) {
      const { data: items } = await supabase
        .from("playlist_items")
        .select("playlist_id")
        .in("playlist_id", ids);
      (items ?? []).forEach((it: any) => {
        counts.set(it.playlist_id, (counts.get(it.playlist_id) ?? 0) + 1);
      });
    }
    setPlaylists((pls ?? []).map((p: any) => ({ ...p, video_count: counts.get(p.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    const id = await createPlaylist(title.trim(), description.trim() || undefined, undefined, type);
    setSubmitting(false);
    if (id) {
      setOpen(false);
      setTitle(""); setDescription(""); setType("custom");
      navigate(`/playlist/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this playlist?")) return;
    const ok = await deletePlaylist(id);
    if (ok) setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <ListVideo className="text-primary" /> Your Playlists
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Organize your videos into series, courses, albums, and Watch Later.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-gradient-gold text-primary-foreground hover:opacity-90 gap-1.5">
                  <Plus size={16} /> New Playlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new playlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pl-title">Title</Label>
                    <Input id="pl-title" value={title} onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. React Crash Course" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pl-desc">Description (optional)</Label>
                    <Textarea id="pl-desc" rows={3} value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's this playlist about?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as PlaylistType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Playlist / Course</SelectItem>
                        <SelectItem value="album">Album</SelectItem>
                        <SelectItem value="ep">EP</SelectItem>
                        <SelectItem value="compilation">Compilation</SelectItem>
                        <SelectItem value="watch_later">Watch Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={submitting || !title.trim()}
                    className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16">
              <ListVideo size={42} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">You haven't created any playlists yet.</p>
              <Button onClick={() => setOpen(true)} className="rounded-full bg-gradient-gold text-primary-foreground hover:opacity-90 gap-1.5">
                <Plus size={16} /> Create your first playlist
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {playlists.map((p) => (
                <PlaylistCard
                  key={p.id}
                  playlist={p}
                  onPlay={(id) => navigate(`/playlist/${id}`)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Playlists;
