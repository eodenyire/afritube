import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clapperboard } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface VideoItem {
  id: string;
  title: string;
}

const StudioSEO = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = (data ?? []) as VideoItem[];
      setVideos(rows);
      if (rows[0]) setSelectedVideoId(rows[0].id);
    };

    load();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !selectedVideoId) return;

    const loadSeo = async () => {
      const { data } = await ((supabase as any).from("video_seo_settings"))
        .select("thumbnail_title, tags")
        .eq("video_id", selectedVideoId)
        .eq("user_id", user.id)
        .maybeSingle();
      setSeoTitle(data?.thumbnail_title ?? "");
      setTags(Array.isArray(data?.tags) ? data.tags.join(", ") : "");
    };

    loadSeo();
  }, [selectedVideoId, user]);

  const canSave = useMemo(() => !!user && !!selectedVideoId, [user, selectedVideoId]);

  const handleSave = async () => {
    if (!user || !selectedVideoId) return;

    const normalizedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const { error } = await ((supabase as any).from("video_seo_settings"))
      .upsert({
        video_id: selectedVideoId,
        user_id: user.id,
        thumbnail_title: seoTitle.trim() || null,
        tags: normalizedTags,
      }, { onConflict: "video_id" });

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Saved", description: "SEO settings updated." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Clapperboard size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl text-foreground">Studio SEO</h1>
        </div>

        <div className="space-y-5">
          <div>
            <Label>Video</Label>
            <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a video" />
              </SelectTrigger>
              <SelectContent>
                {videos.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
                    {video.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="seo-title">Optimized title</Label>
            <Input id="seo-title" className="mt-1.5" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="seo-tags">Tags</Label>
            <Input id="seo-tags" className="mt-1.5" placeholder="music, lagos, tutorial" value={tags} onChange={(event) => setTags(event.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={!canSave}>Save SEO Settings</Button>
        </div>
      </main>
    </div>
  );
};

export default StudioSEO;
