import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resolveCreativeUrl } from "@/lib/adCreative";

interface PendingCampaign {
  id: string;
  name: string;
  ad_type: string;
  headline: string | null;
  creative_url: string;
  click_url: string | null;
  budget_cents: number;
  cpm_cents: number;
  target_categories: string[];
  created_at: string;
  advertisers: { company_name: string; contact_email: string } | null;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const AdminCampaignReview = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingCampaign[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("ad_campaigns")
      .select("*, advertisers(company_name, contact_email)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });
    const list = (data ?? []) as PendingCampaign[];
    setRows(list);
    setLoading(false);

    const resolved: Record<string, string> = {};
    await Promise.all(
      list.map(async (c) => {
        const url = await resolveCreativeUrl(c.creative_url);
        if (url) resolved[c.id] = url;
      }),
    );
    setPreviews(resolved);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await (supabase as any).rpc("review_ad_campaign", {
      p_campaign_id: id,
      p_approve: approve,
      p_note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Review failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approve ? "Campaign approved" : "Campaign rejected" });
    load();
  };

  return (
    <Card className="mb-8 border-primary/40">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone size={18} className="text-primary" /> Campaign review
          </CardTitle>
          <Badge variant="secondary" className="rounded-full">
            {rows.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No campaigns waiting for review.</p>
        ) : (
          rows.map((c) => {
            const preview = previews[c.id];
            const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(c.creative_url);
            return (
              <div key={c.id} className="rounded-xl border p-4 grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                  {preview ? (
                    isVideo ? (
                      <video src={preview} controls muted className="w-full h-full object-contain" />
                    ) : (
                      <img src={preview} alt={`${c.name} creative`} className="w-full h-full object-contain" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">No preview</span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{c.name}</p>
                    <Badge variant="outline">{c.ad_type.replace("_", "-")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.advertisers?.company_name ?? "Unknown advertiser"} · {c.advertisers?.contact_email ?? ""}
                  </p>
                  <p className="text-sm">
                    Budget {money(c.budget_cents)} · CPM {money(c.cpm_cents)} ·{" "}
                    {c.target_categories?.length ? c.target_categories.join(", ") : "All categories"}
                  </p>
                  {c.headline && <p className="text-sm italic">“{c.headline}”</p>}
                  {c.click_url && (
                    <a href={c.click_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                      {c.click_url}
                    </a>
                  )}
                  <Input
                    placeholder="Review note (optional, shared with the advertiser)"
                    value={notes[c.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-full gap-1"
                      disabled={busy === c.id}
                      onClick={() => review(c.id, true)}
                    >
                      <Check size={14} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full gap-1"
                      disabled={busy === c.id}
                      onClick={() => review(c.id, false)}
                    >
                      <X size={14} /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCampaignReview;
