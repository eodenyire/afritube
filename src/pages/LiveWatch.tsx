import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Circle, DollarSign, Send } from "lucide-react";
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
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_super_chat: boolean;
  amount_usd: number | null;
  created_at: string;
}

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

  const loadChatMessages = async (streamId: string) => {
    const { data } = await ((supabase as any).from("live_chat_messages"))
      .select("id, user_id, message, is_super_chat, amount_usd, created_at")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: false })
      .limit(100);
    setChatMessages(((data ?? []) as ChatMessage[]).reverse());
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase.from("live_streams") as any)
        .select("id, creator_id, title, description, status, scheduled_for, started_at, replay_video_id")
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
      setCreatorName(profile?.display_name ?? "Creator");
      await loadChatMessages(data.id);
      setLoading(false);
    };

    load();
  }, [id]);

  useEffect(() => {
    if (!stream?.id) return;
    const intervalId = window.setInterval(() => {
      loadChatMessages(stream.id).then();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [stream?.id]);

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

    if (error) {
      toast.error(error.message);
      return;
    }
    setChatInput("");
    await loadChatMessages(stream.id);
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
    const [{ error: superChatError }, { error: chatMirrorError }] = await Promise.all([
      ((supabase as any).from("live_super_chats")).insert({
        stream_id: stream.id,
        viewer_id: user.id,
        creator_id: stream.creator_id,
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
      toast.error(superChatError?.message ?? chatMirrorError?.message ?? "Failed to send super chat");
      return;
    }
    setSuperMessage("");
    await loadChatMessages(stream.id);
    toast.success("Super chat sent");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">Loading stream...</div>
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1300px] mx-auto px-4 md:px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card min-h-[420px] flex flex-col items-center justify-center text-center p-8">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-secondary">
              <Circle size={10} className={stream.status === "live" ? "fill-current text-red-500" : "text-muted-foreground"} />
              {streamStatusLabel}
            </p>
            <h1 className="mt-4 font-display font-bold text-2xl text-foreground">{stream.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">By {creatorName}</p>
            {stream.description && (
              <p className="mt-4 text-sm text-muted-foreground max-w-2xl whitespace-pre-wrap">
                {stream.description}
              </p>
            )}
            {stream.replay_video_id && (
              <Link to={`/watch/${stream.replay_video_id}`} className="mt-5 text-sm font-semibold text-primary hover:underline">
                Watch replay
              </Link>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] overflow-y-auto space-y-2 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-2 text-sm ${
                        message.is_super_chat ? "bg-primary/15 border border-primary/30" : "bg-secondary"
                      }`}
                    >
                      <p className="font-medium text-foreground">
                        {message.is_super_chat && message.amount_usd ? `💰 $${Number(message.amount_usd).toFixed(2)} ` : ""}
                        {message.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendChatMessage} className="mt-3 space-y-2">
                <Textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  className="min-h-[70px]"
                  placeholder={user ? "Say something..." : "Sign in to chat"}
                  maxLength={600}
                />
                <Button type="submit" size="sm" className="rounded-full w-full gap-1.5" disabled={sending || !chatInput.trim()}>
                  <Send size={14} /> Send message
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
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={superAmount}
                  onChange={(event) => setSuperAmount(event.target.value)}
                  placeholder="Amount (USD)"
                />
                <Input
                  value={superMessage}
                  onChange={(event) => setSuperMessage(event.target.value)}
                  placeholder="Highlight message (optional)"
                  maxLength={300}
                />
                <Button type="submit" variant="secondary" className="rounded-full w-full gap-1.5" disabled={sending}>
                  <DollarSign size={14} /> Send super chat
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default LiveWatch;
