import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  MonitorUp,
  RefreshCw,
  Save,
  StopCircle,
  Video,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface StreamRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "canceled";
  visibility: string;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  thumbnail_url: string | null;
  viewer_count: number | null;
  ingest_url: string | null;
  playback_url: string | null;
  latency_mode: "low" | "normal";
  record_replay: boolean;
  peak_viewer_count: number;
  last_publish_at: string | null;
  last_publish_done_at: string | null;
  hls_ready: boolean | null;
}


const LiveStudio = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stream, setStream] = useState<StreamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [ingestUrl, setIngestUrl] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase.from("live_streams") as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        setStream(null);
        setLoading(false);
        return;
      }
      setStream(data as StreamRow);
      setIngestUrl(data.ingest_url ?? "");
      setPlaybackUrl(data.playback_url ?? "");
      setLoading(false);
    };
    load();
  }, [id]);

  // Realtime: reflect ingest updates written by the edge function.
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`studio-stream-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${id}` },
        (payload) => setStream((prev) => (prev ? { ...prev, ...(payload.new as StreamRow) } : prev)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const isOwner = user && stream && user.id === stream.creator_id;


  const revealKey = async () => {
    if (!stream) return;
    if (streamKey) {
      setShowKey((v) => !v);
      return;
    }
    const { data, error } = await (supabase.rpc as any)("get_stream_key", {
      p_stream_id: stream.id,
    });
    if (error) return toast.error(error.message);
    setStreamKey(data as string);
    setShowKey(true);
  };

  const rotateKey = async () => {
    if (!stream) return;
    if (!window.confirm("Rotate stream key? Any active broadcaster will be disconnected.")) return;
    const { data, error } = await (supabase.rpc as any)("rotate_stream_key", {
      p_stream_id: stream.id,
    });
    if (error) return toast.error(error.message);
    setStreamKey(data as string);
    setShowKey(true);
    toast.success("Stream key rotated");
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const saveEndpoints = async () => {
    if (!stream) return;
    setSaving(true);
    const { error } = await (supabase.from("live_streams") as any)
      .update({ ingest_url: ingestUrl || null, playback_url: playbackUrl || null })
      .eq("id", stream.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Endpoints saved");
  };

  const startBrowserPreview = async (mode: "camera" | "screen") => {
    try {
      const media =
        mode === "camera"
          ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          : await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      mediaStreamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => undefined);
      }
      setPreviewing(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to open capture device");
    }
  };

  const stopBrowserPreview = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewing(false);
  };

  useEffect(() => () => stopBrowserPreview(), []);

  const goLive = async () => {
    if (!stream) return;
    const { error } = await (supabase.from("live_streams") as any)
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", stream.id);
    if (error) return toast.error(error.message);
    toast.success("You're live");
    setStream({ ...stream, status: "live", started_at: new Date().toISOString() });
  };

  const endStream = async () => {
    if (!stream) return;
    if (!window.confirm("End this broadcast?")) return;
    const { error } = await (supabase.from("live_streams") as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", stream.id);
    if (error) return toast.error(error.message);
    stopBrowserPreview();
    toast.success("Broadcast ended");
    setStream({ ...stream, status: "ended", ended_at: new Date().toISOString() });
  };

  const updateSetting = async (patch: Partial<StreamRow>) => {
    if (!stream) return;
    setSaving(true);
    const { error } = await (supabase.from("live_streams") as any)
      .update(patch)
      .eq("id", stream.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setStream({ ...stream, ...patch });
  };

  const updateTitleDescription = async (e: FormEvent) => {
    e.preventDefault();
    if (!stream) return;
    const form = e.currentTarget as HTMLFormElement;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLInputElement).value.trim();
    if (!title) return toast.error("Title is required");
    await updateSetting({ title, description: description || null });
    toast.success("Saved");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Stream not found</h1>
          <Link to="/live" className="text-primary underline">Back to Live</Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Studio is for the creator only</h1>
          <Link to={`/live/${stream.id}`} className="text-primary underline">Open the viewer page</Link>
        </div>
      </div>
    );
  }

  const rtmpBase = ingestUrl?.trim() || "rtmp://your-ingest-host/live";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 pt-24 pb-16 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live studio</p>
            <h1 className="font-display font-bold text-2xl text-foreground">{stream.title}</h1>
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className={stream.status === "live" ? "text-red-500 font-semibold" : "text-foreground"}>
                {stream.status.toUpperCase()}
              </span>
              {stream.viewer_count ? ` • ${stream.viewer_count} watching` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="rounded-full">
              <Link to={`/live/${stream.id}`}>Viewer page</Link>
            </Button>
            {stream.status !== "live" && stream.status !== "ended" && (
              <Button onClick={goLive} className="rounded-full gap-1.5">
                <CircleDot size={16} /> Go live
              </Button>
            )}
            {stream.status === "live" && (
              <Button onClick={endStream} variant="destructive" className="rounded-full gap-1.5">
                <StopCircle size={16} /> End stream
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Browser broadcast preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
                  {!previewing && (
                    <div className="absolute text-muted-foreground text-sm">
                      Start a preview to capture your camera or screen
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!previewing ? (
                    <>
                      <Button onClick={() => startBrowserPreview("camera")} className="rounded-full gap-1.5" size="sm">
                        <Camera size={14} /> Camera + mic
                      </Button>
                      <Button
                        onClick={() => startBrowserPreview("screen")}
                        variant="outline"
                        className="rounded-full gap-1.5"
                        size="sm"
                      >
                        <MonitorUp size={14} /> Share screen
                      </Button>
                    </>
                  ) : (
                    <Button onClick={stopBrowserPreview} variant="outline" size="sm" className="rounded-full gap-1.5">
                      <StopCircle size={14} /> Stop preview
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Local preview only. To send this to viewers you need a WHIP ingest endpoint configured below (browser
                  broadcast) or OBS pointed at your RTMP URL.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Video size={16} /> OBS / RTMP ingest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">RTMP server URL</label>
                  <div className="flex gap-2">
                    <Input readOnly value={rtmpBase} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(rtmpBase, "RTMP URL")}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Stream key (keep secret)</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={showKey && streamKey ? streamKey : "•••••••••••••••••••••••••"}
                      className="font-mono text-xs"
                    />
                    <Button size="icon" variant="outline" onClick={revealKey}>
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    {streamKey && showKey && (
                      <Button size="icon" variant="outline" onClick={() => copy(streamKey, "Stream key")}>
                        <Copy size={14} />
                      </Button>
                    )}
                    <Button size="icon" variant="outline" onClick={rotateKey} title="Rotate key">
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Setup in OBS Studio:</p>
                  <p>1. Settings → Stream → Service: <span className="font-mono">Custom</span></p>
                  <p>2. Server: paste the RTMP URL above</p>
                  <p>3. Stream key: paste the key above</p>
                  <p>4. Click <span className="font-mono">Start Streaming</span> in OBS, then <span className="font-mono">Go live</span> here.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ingest health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">HLS output</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      stream.hls_ready ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <CircleDot size={10} className={stream.hls_ready ? "fill-current" : ""} />
                    {stream.hls_ready ? "Ready" : "Idle"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground">{stream.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last publish</span>
                  <span className="font-mono text-xs">
                    {stream.last_publish_at ? new Date(stream.last_publish_at).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last publish end</span>
                  <span className="font-mono text-xs">
                    {stream.last_publish_done_at ? new Date(stream.last_publish_done_at).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recording replay</span>
                  <span>{stream.record_replay ? "on" : "off"}</span>
                </div>
                <p className="pt-2 border-t border-border text-[11px] text-muted-foreground">
                  Updates automatically when the ingest server calls the auth webhook on publish/publish_done.
                  If "Last publish" stays empty after you start OBS, check the ingest server logs.
                </p>
              </CardContent>
            </Card>

            <Card>

              <CardHeader>
                <CardTitle className="text-base">Stream details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={updateTitleDescription} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Title</label>
                    <Input name="title" defaultValue={stream.title} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <Input name="description" defaultValue={stream.description ?? ""} />
                  </div>
                  <Button type="submit" size="sm" className="rounded-full w-full gap-1.5" disabled={saving}>
                    <Save size={14} /> Save details
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ingest &amp; playback endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">RTMP ingest URL</label>
                  <Input
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    placeholder="rtmp://your-host/live"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">HLS playback URL</label>
                  <Input
                    value={playbackUrl}
                    onChange={(e) => setPlaybackUrl(e.target.value)}
                    placeholder="https://your-host/hls/stream.m3u8"
                    className="font-mono text-xs"
                  />
                </div>
                <Button size="sm" onClick={saveEndpoints} disabled={saving} className="rounded-full w-full">
                  {saving ? "Saving…" : "Save endpoints"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Point these at your own media server (nginx-rtmp + HLS output) or a managed provider.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Save replay as video</p>
                    <p className="text-xs text-muted-foreground">Publish an on-demand video after the broadcast ends.</p>
                  </div>
                  <Switch
                    checked={stream.record_replay}
                    onCheckedChange={(v) => updateSetting({ record_replay: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Low latency mode</p>
                    <p className="text-xs text-muted-foreground">Reduces delay but requires provider support.</p>
                  </div>
                  <Switch
                    checked={stream.latency_mode === "low"}
                    onCheckedChange={(v) => updateSetting({ latency_mode: v ? "low" : "normal" })}
                  />
                </div>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  Peak viewers: <span className="text-foreground font-semibold">{stream.peak_viewer_count}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveStudio;
