import { useEffect, useState } from "react";
import { Radio, CalendarClock, Circle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LiveStream {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "canceled";
  scheduled_for: string | null;
}

const Live = () => {
  const [streams, setStreams] = useState<LiveStream[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.from("live_streams") as any)
        .select("id, creator_id, title, description, status, scheduled_for")
        .in("status", ["scheduled", "live"])
        .eq("visibility", "public")
        .order("scheduled_for", { ascending: true })
        .limit(20);
      setStreams((data ?? []) as LiveStream[]);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Radio size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl text-foreground">Live</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streams.map((stream) => (
            <Card key={stream.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="line-clamp-1">{stream.title}</span>
                  {stream.status === "live" ? (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <Circle size={10} className="fill-current" /> LIVE
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarClock size={12} /> Scheduled
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{stream.description ?? "No description yet."}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {streams.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No active or scheduled streams yet.
          </div>
        )}
      </main>
    </div>
  );
};

export default Live;
