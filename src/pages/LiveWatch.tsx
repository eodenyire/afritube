import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Hls from "hls.js";
import { Circle, DollarSign, Radio, Send, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface LiveStream {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "canceled";
  scheduled_for: string | null;
  started_at: string | null;
  replay_video_id: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
  viewer_count: number | null;
  peak_viewer_count: number | null;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_super_chat: boolean;
  amount_usd: number | null;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  offset: number;
}

const REACTION_EMOJIS = ["❤️", "🔥", "👏", "😂", "🎉", "🙌"];

const LiveWatch = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [creatorName, setCreatorName] = useState<string>("Creator");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [superAmount, setSuperAmount] = useState("5");
  const [superMessage, setSuperMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [floating, setFloating] = useState<FloatingReaction[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const profileCacheRef = useRef<Map<string, { display_name: string | null; avatar_url: string | null }>>(new Map());

  const isOwner = user && stream && user.id === stream.creator_id;

  // Load stream + profile
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase.from("live_streams") as any)
        .select("id, creator_id, title, description, status, scheduled_for, started_at, replay_video_id, playback_url, thumbnail_url, viewer_count, peak_viewer_count")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        setStream(null);
        setLoading(false);
        return;
      }
      setStream(data as LiveStream);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.creator_id)
        .maybeSingle();
      setCreatorName((profile as any)?.display_name ?? "Creator");
      setLoading(false);
    };
    load();
  }, [id]);

  // Load initial chat + enrich with profiles
  const enrichWithProfiles = async (messages: ChatMessage[]): Promise<ChatMessage[]> => {
    const missing = Array.from(
      new Set(messages.map((m) => m.user_id).filter((uid) => uid && !profileCacheRef.current.has(uid))),
    );
    if (missing.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", missing);
      (data ?? []).forEach((p: any) => {
        profileCacheRef.current.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url });
      });
    }
    return messages.map((m) => {
      const p = profileCacheRef.current.get(m.user_id);
      return { ...m, display_name: p?.display_name ?? "Viewer", avatar_url: p?.avatar_url ?? null };
    });
  };

  useEffect(() => {
    if (!stream?.id) return;
    const loadChat = async () => {
      const { data } = await ((supabase as any).from("live_chat_messages"))
        .select("id, user_id, message, is_super_chat, amount_usd, created_at")
        .eq("stream_id", stream.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = ((data ?? []) as ChatMessage[]).reverse();
      const enriched = await enrichWithProfiles(rows);
      setChatMessages(enriched);
    };
    loadChat();
  }, [stream?.id]);

  // Realtime: chat + reactions + stream row updates
  useEffect(() => {
    if (!stream?.id) return;

    const chatChannel = supabase
      .channel(`live-chat-${stream.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `stream_id=eq.${stream.id}` },
        async (payload) => {
          const row = payload.new as ChatMessage;
          const [enriched] = await enrichWithProfiles([row]);
          setChatMessages((prev) => [...prev, enriched].slice(-200));
        },
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`live-reactions-${stream.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_reactions", filter: `stream_id=eq.${stream.id}` },
        (payload) => {
          const row = payload.new as { id: string; emoji: string };
          setFloating((prev) => [
            ...prev.slice(-30),
            { id: row.id, emoji: row.emoji, offset: Math.random() * 80 + 10 },
          ]);
          setTimeout(() => {
            setFloating((prev) => prev.filter((f) => f.id !== row.id));
          }, 3500);
        },
      )
      .subscribe();

    const streamChannel = supabase
      .channel(`live-stream-${stream.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${stream.id}` },
        (payload) => {
          setStream((prev) => (prev ? { ...prev, ...(payload.new as LiveStream) } : prev));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(reactionChannel);
      supabase.removeChannel(streamChannel);
    };
  }, [stream?.id]);

  // Presence viewer count
  useEffect(() => {
    if (!stream?.id) return;
    const key = user?.id ?? `anon-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(`live-presence-${stream.id}`, { config: { presence: { key } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ joined_at: new Date().toISOString() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id, user?.id]);

  // Persist viewer count for owner every 20s + track peak
  useEffect(() => {
    if (!isOwner || !stream?.id) return;
    const interval = window.setInterval(async () => {
      const patch: any = { viewer_count: viewerCount };
      if (viewerCount > (stream.peak_viewer_count ?? 0)) {
        patch.peak_viewer_count = viewerCount;
      }
      await (supabase.from("live_streams") as any).update(patch).eq("id", stream.id);
    }, 20000);
    return () => window.clearInterval(interval);
  }, [isOwner, stream?.id, stream?.peak_viewer_count, viewerCount]);

  // HLS attach
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.playback_url || stream.status !== "live") return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream.playback_url;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(stream.playback_url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    }
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [stream?.playback_url, stream?.status]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const streamStatusLabel = useMemo(() => {
    if (!stream) return "";
    if (stream.status === "live") return "LIVE";
    if (stream.status === "scheduled") return "Scheduled";
    if (stream.status === "ended") return "Ended";
    return "Canceled";
  }, [stream]);

  const sendChatMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Sign in to chat");
      navigate("/auth");
      return;
    }
    if (!stream?.id) return;
    const message = chatInput.trim();
    if (!message) return;

    setSending(true);
    const { error } = await ((supabase as any).from("live_chat_messages")).insert({
      stream_id: stream.id,
      user_id: user.id,
      message,
      is_super_chat: false,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setChatInput("");
  };

  const sendReaction = async (emoji: string) => {
    if (!user) {
      toast.error("Sign in to react");
      return;
    }
    if (!stream?.id) return;
    await (supabase.from("stream_reactions") as any).insert({
      stream_id: stream.id,
      user_id: user.id,
      emoji,
    });
  };

  const sendSuperChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Sign in to send super chats");
      navigate("/auth");
      return;
    }
    if (!stream?.id) return;
    const amount = Number(superAmount);
    const message = superMessage.trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setSending(true);
    // NOTE: real charging happens once Stripe payments are enabled (Phase 6).
    // For now we record the intent so the pinned message appears in chat.
    const [{ error: superChatError }, { error: chatMirrorError }] = await Promise.all([
      ((supabase as any).from("live_super_chats")).insert({
        stream_id: stream.id,
        user_id: user.id,
        amount_usd: amount,
        message: message || null,
      }),
      ((supabase as any).from("live_chat_messages")).insert({
        stream_id: stream.id,
        user_id: user.id,
        message: message || `Super Chat: $${amount.toFixed(2)}`,
        is_super_chat: true,
        amount_usd: amount,
      }),
    ]);
    setSending(false);
    if (superChatError || chatMirrorError) {
      toast.error(superChatError?.message ?? chatMirrorError?.message ?? "Failed to send");
      return;
    }
    setSuperMessage("");
    toast.success("Super chat sent");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">Loading stream…</div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold text-foreground">Stream not found</h1>
          <Link to="/live">
            <Button className="rounded-full">Back to Live</Button>
          </Link>
        </div>
      </div>
    );
  }

  const showPlayer = stream.status === "live" && stream.playback_url;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-border">
            {showPlayer ? (
              <video ref={videoRef} className="w-full h-full object-contain" controls autoPlay playsInline />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 gap-3">
                {stream.thumbnail_url && (
                  <img src={stream.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                )}
                <Radio size={40} className="text-primary relative z-10" />
                <p className="text-lg font-display font-semibold text-foreground relative z-10">
                  {stream.status === "scheduled" && "Stream hasn't started yet"}
                  {stream.status === "live" && !stream.playback_url && "Waiting for broadcaster to connect…"}
                  {stream.status === "ended" && "Broadcast has ended"}
                  {stream.status === "canceled" && "Stream was canceled"}
                </p>
                {stream.status === "scheduled" && stream.scheduled_for && (
                  <p className="text-sm text-muted-foreground relative z-10">
                    Starts {new Date(stream.scheduled_for).toLocaleString()}
                  </p>
                )}
                {stream.status === "ended" && stream.replay_video_id && (
                  <Link to={`/watch/${stream.replay_video_id}`} className="text-sm font-semibold text-primary hover:underline relative z-10">
                    Watch replay
                  </Link>
                )}
              </div>
            )}

            {/* Live status chip */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                  stream.status === "live" ? "bg-red-500 text-white" : "bg-black/70 text-white"
                }`}
              >
                <Circle size={8} className={stream.status === "live" ? "fill-current" : ""} />
                {streamStatusLabel}
              </span>
              {stream.status === "live" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/70 text-white text-xs px-2 py-1">
                  <Users size={12} /> {viewerCount || stream.viewer_count || 0}
                </span>
              )}
            </div>

            {/* Floating reactions */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
              {floating.map((f) => (
                <span
                  key={f.id}
                  className="absolute bottom-4 text-3xl animate-[floatUp_3.5s_ease-out_forwards]"
                  style={{ left: `${f.offset}%` }}
                >
                  {f.emoji}
                </span>
              ))}
            </div>
          </div>

          {/* Reaction bar */}
          {stream.status === "live" && (
            <div className="flex items-center gap-2 flex-wrap">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 transition-colors text-lg"
                  title="Send reaction"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <h1 className="font-display font-bold text-xl text-foreground">{stream.title}</h1>
            <Link to={`/creator/${stream.creator_id}`} className="text-sm text-muted-foreground hover:text-primary">
              By {creatorName}
            </Link>
            {stream.description && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{stream.description}</p>
            )}
            {isOwner && (
              <div className="mt-4">
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to={`/live/studio/${stream.id}`}>Open studio</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Live Chat</span>
                <span className="text-xs text-muted-foreground font-normal">{chatMessages.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={chatScrollRef} className="h-[360px] overflow-y-auto space-y-2 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Be the first to say something.</p>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-2 text-sm ${
                        message.is_super_chat ? "bg-primary/15 border border-primary/30" : "bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        {message.avatar_url ? (
                          <img src={message.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted" />
                        )}
                        <span className="text-xs font-semibold text-foreground">{message.display_name}</span>
                        {message.is_super_chat && message.amount_usd && (
                          <span className="text-xs font-bold text-primary">💰 ${Number(message.amount_usd).toFixed(2)}</span>
                        )}
                      </div>
                      <p className="text-foreground break-words">{message.message}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendChatMessage} className="mt-3 space-y-2">
                <Textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  className="min-h-[60px]"
                  placeholder={user ? "Say something…" : "Sign in to chat"}
                  maxLength={600}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage(e as any);
                    }
                  }}
                />
                <Button type="submit" size="sm" className="rounded-full w-full gap-1.5" disabled={sending || !chatInput.trim()}>
                  <Send size={14} /> Send
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Super Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendSuperChat} className="space-y-2">
                <div className="flex gap-2">
                  {[2, 5, 10, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSuperAmount(String(amt))}
                      className={`flex-1 rounded-full text-xs font-semibold py-1.5 border transition-colors ${
                        Number(superAmount) === amt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={superAmount}
                  onChange={(event) => setSuperAmount(event.target.value)}
                  placeholder="Custom amount (USD)"
                />
                <Input
                  value={superMessage}
                  onChange={(event) => setSuperMessage(event.target.value)}
                  placeholder="Highlighted message (optional)"
                  maxLength={300}
                />
                <Button type="submit" variant="secondary" className="rounded-full w-full gap-1.5" disabled={sending}>
                  <DollarSign size={14} /> Send super chat
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Payments go live once Stripe is enabled for the platform.
                </p>
              </form>
            </CardContent>
          </Card>
        </aside>
      </main>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { opacity: 1; transform: translateY(-30px) scale(1.1); }
          100% { transform: translateY(-320px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveWatch;
