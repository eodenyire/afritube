import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload as UploadIcon, Video, Music, BookOpen, ImagePlus, FileText, X, Loader2 } from "lucide-react";
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
import { usePlaylist, type Playlist } from "@/hooks/usePlaylist";

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
  const { createPlaylist, addVideoToPlaylist } = usePlaylist();
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistTarget, setPlaylistTarget] = useState<string>("none");
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const MAX_THUMBNAIL_SEEK_TIME_SECONDS = 1;
  const THUMBNAIL_JPEG_QUALITY = 0.85;
  const THUMBNAIL_TIMEOUT_MS = 8000;

  useEffect(() => {
    const fetchPlaylists = async () => {
      setPlaylistLoading(true);
      const { data } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setPlaylists((data ?? []) as Playlist[]);
      setPlaylistLoading(false);
    };

    fetchPlaylists();
  }, [userId]);

  const createVideoThumbnail = (file: File): Promise<File | null> =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const url = URL.createObjectURL(file);
      let settled = false;
      let thumbnailTimeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.pause();
        video.removeAttribute("src");
        video.load();
      };

      const finish = (result: File | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(thumbnailTimeoutId);
        cleanup();
        resolve(result);
      };

      thumbnailTimeoutId = setTimeout(() => {
        console.warn("Thumbnail generation timeout after", THUMBNAIL_TIMEOUT_MS, "ms");
        finish(null);
      }, THUMBNAIL_TIMEOUT_MS);

      const captureFrame = () => {
        if (!video.videoWidth || !video.videoHeight) {
          console.warn("Video dimensions not available:", { width: video.videoWidth, height: video.videoHeight });
          finish(null);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.warn("Failed to get canvas 2D context");
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn("Canvas toBlob returned null");
              finish(null);
              return;
            }
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const thumbFile = new File([blob], `${baseName}-thumbnail.jpg`, { type: "image/jpeg" });
            console.log("Thumbnail generated successfully:", { name: thumbFile.name, size: thumbFile.size });
            finish(thumbFile);
          },
          "image/jpeg",
          THUMBNAIL_JPEG_QUALITY,
        );
      };

      const scheduleCapture = () => {
        const videoWithFrameCallback = video as HTMLVideoElement & {
          requestVideoFrameCallback?: (callback: () => void) => number;
        };
        if (videoWithFrameCallback.requestVideoFrameCallback) {
          videoWithFrameCallback.requestVideoFrameCallback(() => captureFrame());
        } else {
          // Use a short delay (~2 frames at 30fps) to ensure the decoded frame is rendered
          setTimeout(captureFrame, 50);
        }
      };

      // Use preload="auto" so the browser buffers frame data, not just metadata.
      // This is key for reliable frame capture from local files.
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      // loadeddata fires once the current playback position has frame data available,
      // which is the earliest safe point to seek and then capture a frame.
      video.addEventListener("loadeddata", () => {
        const safeDuration = Number.isFinite(video.duration) ? video.duration : 0;
        const targetTime = Math.min(safeDuration / 2, MAX_THUMBNAIL_SEEK_TIME_SECONDS);
        console.log("Video data loaded:", { duration: safeDuration, targetTime });
        if (targetTime > 0) {
          // Register the seeked listener before setting currentTime to avoid a race.
          const onSeeked = () => {
            console.log("Video seeked to:", video.currentTime);
            scheduleCapture();
          };
          video.addEventListener("seeked", onSeeked, { once: true });
          try {
            video.currentTime = targetTime;
          } catch (error) {
            console.warn("Thumbnail seek failed; capturing first frame instead.", error);
            video.removeEventListener("seeked", onSeeked);
            scheduleCapture();
          }
        } else {
          scheduleCapture();
        }
      }, { once: true });

      video.addEventListener("error", (e) => {
        console.error("Video element error:", e);
        finish(null);
      }, { once: true });
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
    if (playlistTarget === "create_new" && !newPlaylistTitle.trim()) {
      toast({
        title: "Playlist name required",
        description: "Enter a name for your new playlist.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      console.log("Starting video upload:", { fileName: videoFile.name, size: videoFile.size });
      const duration = await getFileDuration(videoFile, "video");
      console.log("Video duration:", duration);

      const videoPath = `${userId}/${Date.now()}-${videoFile.name}`;
      console.log("Uploading video to:", videoPath);
      const { error: vErr } = await supabase.storage.from("videos").upload(videoPath, videoFile);
      if (vErr) throw new Error(`Video upload failed: ${vErr.message}`);
      const videoUrl = supabase.storage.from("videos").getPublicUrl(videoPath).data.publicUrl;
      console.log("Video uploaded successfully:", videoUrl);

      let thumbnailUrl: string | null = null;
      console.log("Generating thumbnail...");
      const finalThumbFile = thumbFile ?? await createVideoThumbnail(videoFile);
      if (!finalThumbFile) {
        console.warn("Thumbnail generation failed or skipped");
        toast({
          title: "Thumbnail skipped",
          description: "We couldn't auto-generate a thumbnail. You can upload one later.",
        });
      } else {
        console.log("Uploading thumbnail:", { name: finalThumbFile.name, size: finalThumbFile.size });
        const thumbPath = `${userId}/${Date.now()}-${finalThumbFile.name}`;
        const { error: tErr } = await supabase.storage.from("thumbnails").upload(thumbPath, finalThumbFile);
        if (tErr) throw new Error(`Thumbnail upload failed: ${tErr.message}`);
        thumbnailUrl = supabase.storage.from("thumbnails").getPublicUrl(thumbPath).data.publicUrl;
        console.log("Thumbnail uploaded successfully:", thumbnailUrl);
      }

      let subtitleUrl: string | null = null;
      if (subtitleFile) {
        if (!subtitleFile.name.toLowerCase().endsWith(".srt")) {
          throw new Error("Subtitle file must be an .srt file.");
        }
        try {
          const subtitlePath = `${userId}/${Date.now()}-${subtitleFile.name}`;
          console.log("Uploading subtitles:", { name: subtitleFile.name, size: subtitleFile.size });
          const { error: sErr } = await supabase.storage.from("subtitles").upload(subtitlePath, subtitleFile, {
            contentType: "application/x-subrip",
          });
          if (sErr) throw new Error(sErr.message);
          subtitleUrl = supabase.storage.from("subtitles").getPublicUrl(subtitlePath).data.publicUrl;
          console.log("Subtitles uploaded successfully:", subtitleUrl);
        } catch (subtitleError: any) {
          subtitleUrl = null;
          console.error("Subtitle upload error:", subtitleError);
          toast({
            title: "Subtitles skipped",
            description: subtitleError?.message || "Subtitle upload failed, but your video will still be published.",
            variant: "destructive",
          });
        }
      }

      console.log("Saving video to database:", { title, thumbnailUrl, subtitleUrl });
      const videoPayload: {
        user_id: string;
        title: string;
        description: string | null;
        video_url: string;
        thumbnail_url: string | null;
        category: string;
        duration: number;
        subtitle_url?: string | null;
      } = {
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        category,
        duration,
      };
      if (subtitleUrl) {
        videoPayload.subtitle_url = subtitleUrl;
      }

      let { data: createdVideo, error: dbErr } = await supabase.from("videos").insert(videoPayload).select("id").single();
      if (dbErr?.message?.includes("subtitle_url")) {
        const { subtitle_url, ...fallbackPayload } = videoPayload;
        ({ data: createdVideo, error: dbErr } = await supabase.from("videos").insert(fallbackPayload).select("id").single());
        if (!dbErr) {
          toast({
            title: "Video uploaded",
            description: "Your video was published, but subtitle metadata could not be saved.",
            variant: "destructive",
          });
        }
      }
      if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`);
      console.log("Video saved to database successfully");

      let targetPlaylistId: string | null = null;
      if (playlistTarget === "create_new") {
        targetPlaylistId = await createPlaylist(newPlaylistTitle.trim(), undefined, undefined, "custom");
      } else if (playlistTarget !== "none") {
        targetPlaylistId = playlistTarget;
      }

      if (targetPlaylistId && createdVideo?.id) {
        const added = await addVideoToPlaylist(targetPlaylistId, createdVideo.id);
        if (!added) {
          toast({
            title: "Video uploaded",
            description: "Your video was published, but could not be added to the playlist.",
            variant: "destructive",
          });
        }
      }

      toast({ title: "Video uploaded! 🎬", description: "Your video is now live on AfriTube." });
      navigate("/");
    } catch (err: any) {
      console.error("Video upload error:", err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <FileDropZone accept="video/*" label="Upload your video" icon={<Video size={32} />} file={videoFile} onFileSelect={setVideoFile} onClear={() => setVideoFile(null)} />
      <FileDropZone accept="image/*" label="Upload thumbnail (optional, auto-generated if omitted)" icon={<ImagePlus size={32} />} file={thumbFile} onFileSelect={setThumbFile} onClear={() => setThumbFile(null)} />
      <FileDropZone
        accept=".srt,text/plain,application/x-subrip"
        label="Upload subtitles (.srt, optional)"
        icon={<FileText size={32} />}
        file={subtitleFile}
        onFileSelect={setSubtitleFile}
        onClear={() => setSubtitleFile(null)}
      />
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
        <div>
          <Label>Add to playlist (optional)</Label>
          <Select value={playlistTarget} onValueChange={setPlaylistTarget}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={playlistLoading ? "Loading playlists..." : "Choose a playlist"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Do not add</SelectItem>
              {playlists.map((playlist) => (
                <SelectItem key={playlist.id} value={playlist.id}>
                  {playlist.title}
                </SelectItem>
              ))}
              <SelectItem value="create_new">Create new playlist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {playlistTarget === "create_new" && (
          <div>
            <Label htmlFor="new-playlist-title">New playlist name</Label>
            <Input
              id="new-playlist-title"
              placeholder="e.g. Summer Vlog Series"
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>
        )}
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

  const createAudioCoverArt = (title: string, artist: string): Promise<File> =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback: create a simple colored canvas
        resolve(new File([canvas.toDataURL()], "cover.jpg", { type: "image/jpeg" }));
        return;
      }

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 300, 300);
      gradient.addColorStop(0, "#FF6B35");
      gradient.addColorStop(1, "#004E89");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 300);

      // Add music note icon
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "bold 120px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♪", 150, 100);

      // Add title
      ctx.fillStyle = "white";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(title.substring(0, 20), 150, 200);

      // Add artist
      ctx.font = "14px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(artist.substring(0, 25), 150, 230);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(new File([], "cover.jpg", { type: "image/jpeg" }));
            return;
          }
          const coverFile = new File([blob], "audio-cover.jpg", { type: "image/jpeg" });
          console.log("Audio cover art generated:", { name: coverFile.name, size: coverFile.size });
          resolve(coverFile);
        },
        "image/jpeg",
        0.85,
      );
    });

  const handleSubmit = async () => {
    if (!audioFile || !title.trim()) {
      toast({ title: "Missing fields", description: "Title and audio file are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      console.log("Starting audio upload:", { fileName: audioFile.name, size: audioFile.size });
      const duration = await getFileDuration(audioFile);
      console.log("Audio duration:", duration);

      const audioPath = `${userId}/${Date.now()}-${audioFile.name}`;
      console.log("Uploading audio to:", audioPath);
      const { error: aErr } = await supabase.storage.from("audio").upload(audioPath, audioFile);
      if (aErr) throw new Error(`Audio upload failed: ${aErr.message}`);
      const audioUrl = supabase.storage.from("audio").getPublicUrl(audioPath).data.publicUrl;
      console.log("Audio uploaded successfully:", audioUrl);

      let coverUrl: string | null = null;
      const finalCoverFile = coverFile ?? await createAudioCoverArt(title, artistName || "Unknown Artist");
      if (finalCoverFile) {
        console.log("Uploading cover art:", { name: finalCoverFile.name, size: finalCoverFile.size });
        const coverPath = `${userId}/${Date.now()}-${finalCoverFile.name}`;
        const { error: cErr } = await supabase.storage.from("thumbnails").upload(coverPath, finalCoverFile);
        if (cErr) throw new Error(`Cover upload failed: ${cErr.message}`);
        coverUrl = supabase.storage.from("thumbnails").getPublicUrl(coverPath).data.publicUrl;
        console.log("Cover art uploaded successfully:", coverUrl);
      }

      console.log("Saving audio to database:", { title, coverUrl });
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
      if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`);
      console.log("Audio saved to database successfully");

      toast({ title: "Track uploaded! 🎵", description: "Your music is now streaming on AfriTube." });
      navigate("/");
    } catch (err: any) {
      console.error("Audio upload error:", err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <FileDropZone accept="audio/*" label="Upload your track" icon={<Music size={32} />} file={audioFile} onFileSelect={setAudioFile} onClear={() => setAudioFile(null)} />
      <FileDropZone accept="image/*" label="Upload cover art (optional, auto-generated if omitted)" icon={<ImagePlus size={32} />} file={coverFile} onFileSelect={setCoverFile} onClear={() => setCoverFile(null)} />
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

  const createBlogCoverImage = (title: string, category: string): Promise<File> =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(new File([], "cover.jpg", { type: "image/jpeg" }));
        return;
      }

      // Create a gradient background based on category
      const categoryColors: Record<string, [string, string]> = {
        "Fashion": ["#FF1493", "#FFB6C1"],
        "Art & Culture": ["#8B4513", "#DEB887"],
        "Technology": ["#1E90FF", "#87CEEB"],
        "Food": ["#FF8C00", "#FFD700"],
        "Travel": ["#228B22", "#90EE90"],
        "Music": ["#9932CC", "#DDA0DD"],
        "Sports": ["#DC143C", "#FF6347"],
        "Opinion": ["#4169E1", "#6495ED"],
        "Lifestyle": ["#FF69B4", "#FFB6C1"],
        "General": ["#696969", "#A9A9A9"],
      };

      const [color1, color2] = categoryColors[category] || categoryColors["General"];
      const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 630);

      // Add semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, 1200, 630);

      // Add title
      ctx.fillStyle = "white";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxWidth = 1100;
      const words = title.split(" ");
      let line = "";
      let y = 200;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + (line ? " " : "") + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, 600, y);
          line = words[i];
          y += 60;
        } else {
          line = testLine;
        }
      }
      if (line) ctx.fillText(line, 600, y);

      // Add category badge
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(50, 50, 200, 50);
      ctx.fillStyle = color1;
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(category, 70, 75);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(new File([], "cover.jpg", { type: "image/jpeg" }));
            return;
          }
          const coverFile = new File([blob], "blog-cover.jpg", { type: "image/jpeg" });
          console.log("Blog cover image generated:", { name: coverFile.name, size: coverFile.size });
          resolve(coverFile);
        },
        "image/jpeg",
        0.85,
      );
    });

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      console.log("Starting blog upload:", { title, category });
      let coverUrl: string | null = null;
      const finalCoverFile = coverFile ?? await createBlogCoverImage(title, category);
      if (finalCoverFile && finalCoverFile.size > 0) {
        console.log("Uploading cover image:", { name: finalCoverFile.name, size: finalCoverFile.size });
        const coverPath = `${userId}/${Date.now()}-${finalCoverFile.name}`;
        const { error: cErr } = await supabase.storage.from("blog-images").upload(coverPath, finalCoverFile);
        if (cErr) throw new Error(`Cover upload failed: ${cErr.message}`);
        coverUrl = supabase.storage.from("blog-images").getPublicUrl(coverPath).data.publicUrl;
        console.log("Cover image uploaded successfully:", coverUrl);
      }

      console.log("Saving blog to database:", { title, coverUrl });
      const { error: dbErr } = await supabase.from("blog_posts").insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || null,
        cover_url: coverUrl,
        category,
      });
      if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`);
      console.log("Blog saved to database successfully");

      toast({ title: "Blog published! ✍️", description: "Your story is now live on AfriTube." });
      navigate("/");
    } catch (err: any) {
      console.error("Blog upload error:", err);
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <FileDropZone accept="image/*" label="Upload cover image (optional, auto-generated if omitted)" icon={<ImagePlus size={32} />} file={coverFile} onFileSelect={setCoverFile} onClear={() => setCoverFile(null)} />
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
