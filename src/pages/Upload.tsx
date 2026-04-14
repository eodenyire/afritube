import { useState, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload as UploadIcon, Video, Music, BookOpen, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const videoCategories = ["General", "Music", "Comedy", "Tech", "Food", "Travel", "Education", "Sports", "Fashion", "Documentary"];
const audioGenres = ["General", "Afrobeats", "Amapiano", "Highlife", "Afro-pop", "Gospel", "Hip-Hop", "R&B", "Reggae", "Traditional"];
const blogCategories = ["General", "Fashion", "Art & Culture", "Technology", "Food", "Travel", "Music", "Sports", "Opinion", "Lifestyle"];

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center px-4 text-center">
          <UploadIcon size={48} className="text-muted-foreground mb-4" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Sign in to upload</h2>
          <p className="text-muted-foreground mb-6">You need an account to upload content on AfriTube.</p>
          <Button onClick={() => navigate("/auth")} className="bg-gradient-gold text-primary-foreground rounded-full px-8">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-3xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Upload Content</h1>
          <p className="text-muted-foreground mb-8">Share your videos, music, and stories with Africa and the world.</p>

          <Tabs defaultValue="video" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-secondary">
              <TabsTrigger value="video" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <Video size={16} /> Video
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <Music size={16} /> Audio
              </TabsTrigger>
              <TabsTrigger value="blog" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <BookOpen size={16} /> Blog
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video">
              <VideoUploadForm userId={user.id} />
            </TabsContent>
            <TabsContent value="audio">
              <AudioUploadForm userId={user.id} />
            </TabsContent>
            <TabsContent value="blog">
              <BlogUploadForm userId={user.id} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Shared file drop zone ─── */
function FileDropZone({ accept, label, icon, file, onFileSelect, onClear }: {
  accept: string;
  label: string;
  icon: React.ReactNode;
  file: File | null;
  onFileSelect: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
  };

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/50"}`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      {file ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {icon}
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-3 text-muted-foreground">{icon}</div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">Click to browse or drag & drop</p>
        </>
      )}
    </div>
  );
}

/* ─── Video Upload ─── */
function VideoUploadForm({ userId }: { userId: string }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const MAX_THUMBNAIL_SEEK_TIME_SECONDS = 1;
  const THUMBNAIL_JPEG_QUALITY = 0.85;

  const createVideoThumbnail = (file: File): Promise<File | null> =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const url = URL.createObjectURL(file);
      let settled = false;
      let captured = false;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.removeAttribute("src");
        video.load();
      };

      const finish = (result: File | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      video.preload = "metadata";
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const safeDuration = Number.isFinite(video.duration) ? video.duration : 0;
        const targetTime = Math.min(safeDuration / 2, MAX_THUMBNAIL_SEEK_TIME_SECONDS);
        video.currentTime = targetTime;
      };

      const captureFrame = () => {
        if (captured) return;
        captured = true;
        if (!video.videoWidth || !video.videoHeight) {
          finish(null);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              finish(null);
              return;
            }
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const thumbFile = new File([blob], `${baseName}-thumbnail.jpg`, { type: "image/jpeg" });
            finish(thumbFile);
          },
          "image/jpeg",
          THUMBNAIL_JPEG_QUALITY,
        );
      };

      video.onseeked = captureFrame;
      video.onloadeddata = () => {
        if (video.currentTime === 0) captureFrame();
      };

      video.onerror = () => finish(null);
    });

  const getFileDuration = (file: File, type: "video" | "audio"): Promise<number> =>
    new Promise((resolve) => {
      const el = document.createElement(type) as HTMLVideoElement | HTMLAudioElement;
      const url = URL.createObjectURL(file);
      el.src = url;
      el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(el.duration)); };
      el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    });

  const handleSubmit = async () => {
    if (!videoFile || !title.trim()) {
      toast({ title: "Missing fields", description: "Title and video file are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const duration = await getFileDuration(videoFile, "video");

      const videoPath = `${userId}/${Date.now()}-${videoFile.name}`;
      const { error: vErr } = await supabase.storage.from("videos").upload(videoPath, videoFile);
      if (vErr) throw vErr;
      const videoUrl = supabase.storage.from("videos").getPublicUrl(videoPath).data.publicUrl;

      let thumbnailUrl: string | null = null;
      const finalThumbFile = thumbFile ?? await createVideoThumbnail(videoFile);
      if (finalThumbFile) {
        const thumbPath = `${userId}/${Date.now()}-${finalThumbFile.name}`;
        const { error: tErr } = await supabase.storage.from("thumbnails").upload(thumbPath, finalThumbFile);
        if (tErr) throw tErr;
        thumbnailUrl = supabase.storage.from("thumbnails").getPublicUrl(thumbPath).data.publicUrl;
      }

      const { error: dbErr } = await supabase.from("videos").insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        category,
        duration,
      });
      if (dbErr) throw dbErr;

      toast({ title: "Video uploaded! 🎬", description: "Your video is now live on AfriTube." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <FileDropZone accept="video/*" label="Upload your video" icon={<Video size={32} />} file={videoFile} onFileSelect={setVideoFile} onClear={() => setVideoFile(null)} />
      <FileDropZone accept="image/*" label="Upload thumbnail (optional, auto-generated if omitted)" icon={<ImagePlus size={32} />} file={thumbFile} onFileSelect={setThumbFile} onClear={() => setThumbFile(null)} />
      <div className="space-y-4">
        <div>
          <Label htmlFor="v-title">Title</Label>
          <Input id="v-title" placeholder="Enter video title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="v-desc">Description</Label>
          <Textarea id="v-desc" placeholder="Describe your video..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5" rows={4} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{videoCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={uploading} className="w-full bg-gradient-gold text-primary-foreground font-semibold rounded-full hover:opacity-90">
        {uploading ? <><Loader2 size={18} className="animate-spin mr-2" /> Uploading...</> : <><UploadIcon size={18} className="mr-2" /> Publish Video</>}
      </Button>
    </div>
  );
}

/* ─── Audio Upload ─── */
function AudioUploadForm({ userId }: { userId: string }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("General");

  const getFileDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const el = document.createElement("audio");
      const url = URL.createObjectURL(file);
      el.src = url;
      el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(el.duration)); };
      el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    });

  const handleSubmit = async () => {
    if (!audioFile || !title.trim()) {
      toast({ title: "Missing fields", description: "Title and audio file are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const duration = await getFileDuration(audioFile);

      const audioPath = `${userId}/${Date.now()}-${audioFile.name}`;
      const { error: aErr } = await supabase.storage.from("audio").upload(audioPath, audioFile);
      if (aErr) throw aErr;
      const audioUrl = supabase.storage.from("audio").getPublicUrl(audioPath).data.publicUrl;

      let coverUrl: string | null = null;
      if (coverFile) {
        const coverPath = `${userId}/${Date.now()}-${coverFile.name}`;
        const { error: cErr } = await supabase.storage.from("thumbnails").upload(coverPath, coverFile);
        if (cErr) throw cErr;
        coverUrl = supabase.storage.from("thumbnails").getPublicUrl(coverPath).data.publicUrl;
      }

      const { error: dbErr } = await supabase.from("audio_tracks").insert({
        user_id: userId,
        title: title.trim(),
        artist_name: artistName.trim() || null,
        description: description.trim() || null,
        audio_url: audioUrl,
        cover_url: coverUrl,
        genre,
        duration,
      });
      if (dbErr) throw dbErr;

      toast({ title: "Track uploaded! 🎵", description: "Your music is now streaming on AfriTube." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <FileDropZone accept="audio/*" label="Upload your track" icon={<Music size={32} />} file={audioFile} onFileSelect={setAudioFile} onClear={() => setAudioFile(null)} />
      <FileDropZone accept="image/*" label="Upload cover art (optional)" icon={<ImagePlus size={32} />} file={coverFile} onFileSelect={setCoverFile} onClear={() => setCoverFile(null)} />
      <div className="space-y-4">
        <div>
          <Label htmlFor="a-title">Title</Label>
          <Input id="a-title" placeholder="Track title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="a-artist">Artist Name</Label>
          <Input id="a-artist" placeholder="Your artist name" value={artistName} onChange={e => setArtistName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="a-desc">Description</Label>
          <Textarea id="a-desc" placeholder="About this track..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5" rows={3} />
        </div>
        <div>
          <Label>Genre</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{audioGenres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={uploading} className="w-full bg-gradient-gold text-primary-foreground font-semibold rounded-full hover:opacity-90">
        {uploading ? <><Loader2 size={18} className="animate-spin mr-2" /> Uploading...</> : <><UploadIcon size={18} className="mr-2" /> Publish Track</>}
      </Button>
    </div>
  );
}

/* ─── Blog Upload ─── */
function BlogUploadForm({ userId }: { userId: string }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        const coverPath = `${userId}/${Date.now()}-${coverFile.name}`;
        const { error: cErr } = await supabase.storage.from("blog-images").upload(coverPath, coverFile);
        if (cErr) throw cErr;
        coverUrl = supabase.storage.from("blog-images").getPublicUrl(coverPath).data.publicUrl;
      }

      const { error: dbErr } = await supabase.from("blog_posts").insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || null,
        cover_url: coverUrl,
        category,
      });
      if (dbErr) throw dbErr;

      toast({ title: "Blog published! ✍️", description: "Your story is now live on AfriTube." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <FileDropZone accept="image/*" label="Upload cover image (optional)" icon={<ImagePlus size={32} />} file={coverFile} onFileSelect={setCoverFile} onClear={() => setCoverFile(null)} />
      <div className="space-y-4">
        <div>
          <Label htmlFor="b-title">Title</Label>
          <Input id="b-title" placeholder="Blog post title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="b-excerpt">Excerpt</Label>
          <Input id="b-excerpt" placeholder="Short summary (shown in previews)" value={excerpt} onChange={e => setExcerpt(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="b-content">Content</Label>
          <Textarea id="b-content" placeholder="Write your story..." value={content} onChange={e => setContent(e.target.value)} className="mt-1.5" rows={10} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{blogCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={uploading} className="w-full bg-gradient-gold text-primary-foreground font-semibold rounded-full hover:opacity-90">
        {uploading ? <><Loader2 size={18} className="animate-spin mr-2" /> Publishing...</> : <><UploadIcon size={18} className="mr-2" /> Publish Blog Post</>}
      </Button>
    </div>
  );
}

export default Upload;
