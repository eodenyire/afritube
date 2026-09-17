import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, Megaphone, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/earnings";
import { toast } from "sonner";

interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  ad_type: string;
  status: string;
  impressions: number;
  impressions_last_hour: number;
  creator_share_cents: number;
}

interface VideoRow {
  video_id: string;
  title: string;
  duration: number;
  midroll_eligible: boolean;
  impressions: number;
}

interface Application {
  id: string;
  status: string;
  review_note: string | null;
  created_at: string;
}

/** Creator-facing view: application status plus live ad activity on their content. */
const CreatorMonetizationPanel = ({ onApplied }: { onApplied?: () => void }) => {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [totals, setTotals] = useState<{ impressions_total: number; impressions_today: number; creator_share_cents: number } | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [dash, app] = await Promise.all([
      (supabase as any).rpc("get_creator_ad_dashboard"),
      (supabase as any)
        .from("monetization_applications")
        .select("id, status, review_note, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const data = dash.data ?? {};
    setCampaigns((data.campaigns ?? []) as CampaignRow[]);
    setVideos((data.videos ?? []) as VideoRow[]);
    setTotals(data.totals ?? null);
    setApplication((app.data ?? null) as Application | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const apply = async () => {
    setApplying(true);
    const { error } = await (supabase as any).rpc("apply_for_monetization", { _note: note || null });
    setApplying(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted for review");
    setNote("");
    load();
    onApplied?.();
  };

  const midrollCount = videos.filter((v) => v.midroll_eligible).length;

  return (
    <Card className="mb-8 border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone size={18} className="text-primary" /> Ad Monetization
          </CardTitle>
          <Button size="icon" variant="outline" className="rounded-full" onClick={load} aria-label="Refresh">
            <RefreshCw size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Application state */}
        {!application || application.status === "rejected" ? (
          <div className="rounded-xl bg-secondary/60 p-4 space-y-2">
            <p className="text-sm text-foreground font-medium">
              {application?.status === "rejected" ? "Your last application was not approved" : "Apply to earn from ads"}
            </p>
            {application?.review_note && (
              <p className="text-xs text-muted-foreground">Reviewer note: {application.review_note}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Tell us about your channel (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button size="sm" className="rounded-full gap-1" onClick={apply} disabled={applying}>
                <Send size={14} /> Apply for monetization
              </Button>
            </div>
          </div>
        ) : application.status === "pending" ? (
          <div className="rounded-xl bg-secondary/60 p-4">
            <p className="text-sm text-foreground">
              Your application is under review. Submitted {new Date(application.created_at).toLocaleDateString()}.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-primary/10 p-4">
            <p className="text-sm text-foreground">Monetization approved — you can switch ads on above.</p>
          </div>
        )}

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-xs text-muted-foreground">Active campaigns</p>
            <p className="text-lg font-semibold text-foreground">
              {campaigns.filter((c) => c.status === "active").length}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-xs text-muted-foreground">Views today</p>
            <p className="text-lg font-semibold text-foreground">{totals?.impressions_today ?? 0}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-xs text-muted-foreground">Total ad views</p>
            <p className="text-lg font-semibold text-foreground">{totals?.impressions_total ?? 0}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="text-xs text-muted-foreground">Your ad share</p>
            <p className="text-lg font-semibold text-primary">{formatCents(totals?.creator_share_cents ?? 0)}</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
          </div>
        )}

        {/* Campaigns */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Activity size={14} className="text-primary" /> Campaigns running on your content
          </h3>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ads have run on your content yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Views (1h)</TableHead>
                  <TableHead>Total views</TableHead>
                  <TableHead className="text-right">Your share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.campaign_id}>
                    <TableCell className="font-medium">{c.campaign_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full">{c.ad_type}</Badge>
                    </TableCell>
                    <TableCell>{c.impressions_last_hour}</TableCell>
                    <TableCell>{c.impressions}</TableCell>
                    <TableCell className="text-right">{formatCents(c.creator_share_cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Mid-roll eligible videos */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Mid-roll ready videos <span className="text-muted-foreground font-normal">({midrollCount} of {videos.length})</span>
          </h3>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload videos over 8 minutes to carry mid-roll ads.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Mid-roll</TableHead>
                  <TableHead className="text-right">Ad views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.slice(0, 12).map((v) => (
                  <TableRow key={v.video_id}>
                    <TableCell className="font-medium max-w-[280px] truncate">{v.title}</TableCell>
                    <TableCell>
                      {Math.floor((v.duration ?? 0) / 60)}m {(v.duration ?? 0) % 60}s
                    </TableCell>
                    <TableCell>
                      {v.midroll_eligible ? (
                        <Badge className="rounded-full">Eligible</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Too short</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{v.impressions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatorMonetizationPanel;
