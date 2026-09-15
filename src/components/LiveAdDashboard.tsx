import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  advertiser_name: string;
  ad_type: string;
  status: string;
  cpm_cents: number;
  budget_cents: number;
  spent_cents: number;
  impressions_last_hour: number;
  impressions_total: number;
  clicks_total: number;
  live_impressions_last_hour: number;
  midroll_impressions_last_hour: number;
}

interface Placement {
  video_id: string;
  title: string;
  creator_name: string | null;
  duration: number;
  midroll_eligible: boolean;
  impressions_last_hour: number;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Admin view of ad delivery happening right now, including live-stream breaks. */
const LiveAdDashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      (supabase as any).rpc("get_live_ad_overview"),
      (supabase as any).rpc("get_live_ad_placements"),
    ]);
    setCampaigns((c.data ?? []) as Campaign[]);
    setPlacements((p.data ?? []) as Placement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const impressionsHour = campaigns.reduce((s, c) => s + Number(c.impressions_last_hour), 0);
  const liveHour = campaigns.reduce((s, c) => s + Number(c.live_impressions_last_hour), 0);
  const spend = campaigns.reduce((s, c) => s + Number(c.spent_cents), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active campaigns", value: campaigns.filter((c) => c.status === "active").length.toString() },
          { label: "Impressions (1h)", value: impressionsHour.toLocaleString() },
          { label: "Live-stream ads (1h)", value: liveHour.toLocaleString() },
          { label: "Total spend", value: money(spend) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Ads running now
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Impr. (1h)</TableHead>
                  <TableHead>Impr. total</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead className="text-right">Spend / Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No campaigns delivering yet.
                    </TableCell>
                  </TableRow>
                )}
                {campaigns.map((c) => (
                  <TableRow key={c.campaign_id}>
                    <TableCell className="font-medium">{c.campaign_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.advertiser_name}</TableCell>
                    <TableCell>{c.ad_type === "mid_roll" ? "Mid-roll" : "Pre-roll"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{Number(c.impressions_last_hour).toLocaleString()}</TableCell>
                    <TableCell>{Number(c.impressions_total).toLocaleString()}</TableCell>
                    <TableCell>{Number(c.clicks_total).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {money(Number(c.spent_cents))} / {money(Number(c.budget_cents))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Videos carrying ads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>Mid-roll</TableHead>
                <TableHead className="text-right">Impr. (1h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No monetized videos eligible for ads yet.
                  </TableCell>
                </TableRow>
              )}
              {placements.map((p) => (
                <TableRow key={p.video_id}>
                  <TableCell className="font-medium max-w-[280px] truncate">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.creator_name ?? "Creator"}</TableCell>
                  <TableCell>
                    {Math.floor(Number(p.duration) / 60)}m {Number(p.duration) % 60}s
                  </TableCell>
                  <TableCell>
                    {p.midroll_eligible ? (
                      <Badge variant="default">Mid-roll on</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Pre-roll only</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{Number(p.impressions_last_hour).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveAdDashboard;
