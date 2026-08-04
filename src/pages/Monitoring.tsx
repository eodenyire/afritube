import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Activity, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StreamEvent {
  id: string;
  stream_id: string | null;
  stream_key_hint: string | null;
  event_type: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const EVENT_LABELS: Record<string, string> = {
  ingest_publish: "Ingest publish",
  ingest_publish_done: "Ingest stopped",
  ingest_auth_failed: "Ingest rejected",
  replay_upload: "Replay upload",
  replay_failed: "Replay failed",
};

const Monitoring = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("stream_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Could not load events", description: error.message, variant: "destructive" });
    }
    setEvents((data ?? []) as StreamEvent[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const channel = supabase
      .channel("stream-events-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_events" },
        (payload) => {
          const row = payload.new as StreamEvent;
          setEvents((prev) => [row, ...prev].slice(0, 200));
          if (row.status === "error") {
            toast({
              title: `${EVENT_LABELS[row.event_type] ?? row.event_type} failed`,
              description: row.error_message ?? "Unknown error",
              variant: "destructive",
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, load, toast]);

  const failures = useMemo(() => events.filter((e) => e.status === "error"), [events]);
  const lastFailure = failures[0];
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
    return events.filter((e) => new Date(e.created_at).getTime() > cutoff);
  }, [events]);
  const errorRate = last24h.length
    ? Math.round((last24h.filter((e) => e.status === "error").length / last24h.length) * 100)
    : 0;

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center">
          <h1 className="text-2xl font-display font-bold">Admins only</h1>
          <p className="text-muted-foreground mt-2">This monitoring dashboard is restricted.</p>
        </div>
      </div>
    );
  }

  const renderTable = (rows: StreamEvent[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Stream ID</TableHead>
          <TableHead>Last error</TableHead>
          <TableHead className="text-right">Attempted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
              No events recorded yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{EVENT_LABELS[e.event_type] ?? e.event_type}</TableCell>
            <TableCell>
              <Badge variant={e.status === "error" ? "destructive" : "secondary"}>{e.status}</Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {e.stream_id ?? <span className="text-muted-foreground">{e.stream_key_hint ?? "—"}</span>}
            </TableCell>
            <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
              {e.error_message ?? "—"}
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">
              {relative(e.created_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20 max-w-[1200px] mx-auto px-4 md:px-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Streaming health</h1>
            <p className="text-muted-foreground text-sm">
              Live ingest and replay upload monitoring with realtime failure alerts.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Events (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{last24h.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Error rate (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${errorRate > 0 ? "text-destructive" : ""}`}>{errorRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {lastFailure ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Last failure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastFailure ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-destructive">
                    {EVENT_LABELS[lastFailure.event_type] ?? lastFailure.event_type}
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    {lastFailure.error_message ?? "Unknown error"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {lastFailure.stream_id ?? lastFailure.stream_key_hint ?? "unknown stream"}
                  </p>
                  <p className="text-xs text-muted-foreground">{relative(lastFailure.created_at)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No failures recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="failures">
              <TabsList>
                <TabsTrigger value="failures">Failures ({failures.length})</TabsTrigger>
                <TabsTrigger value="all">All events</TabsTrigger>
              </TabsList>
              <TabsContent value="failures" className="mt-4">
                {renderTable(failures)}
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                {renderTable(events)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Monitoring;
