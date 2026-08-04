import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Megaphone, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Advertiser {
  id: string;
  company_name: string;
  contact_email: string;
  website: string | null;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  ad_type: string;
  headline: string | null;
  creative_url: string;
  click_url: string | null;
  budget_cents: number;
  spent_cents: number;
  cpm_cents: number;
  target_categories: string[];
  status: string;
  created_at: string;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const AdsManager = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  const [form, setForm] = useState({
    name: "",
    ad_type: "pre_roll",
    headline: "",
    creative_url: "",
    click_url: "",
    budget: "50",
    cpm: "5",
    categories: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: adv } = await (supabase as any)
      .from("advertisers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setAdvertiser((adv as Advertiser) ?? null);
    if (adv) {
      const { data: camps } = await (supabase as any)
        .from("ad_campaigns")
        .select("*")
        .eq("advertiser_id", adv.id)
        .order("created_at", { ascending: false });
      setCampaigns((camps ?? []) as Campaign[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createAdvertiser = async () => {
    if (!user || !company.trim() || !email.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from("advertisers").insert({
      user_id: user.id,
      company_name: company.trim(),
      contact_email: email.trim(),
      website: website.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not create account", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Advertiser account created" });
    load();
  };

  const createCampaign = async () => {
    if (!advertiser) return;
    if (!form.name.trim() || !form.creative_url.trim()) {
      toast({ title: "Name and creative URL are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("ad_campaigns").insert({
      advertiser_id: advertiser.id,
      name: form.name.trim(),
      ad_type: form.ad_type,
      headline: form.headline.trim() || null,
      creative_url: form.creative_url.trim(),
      click_url: form.click_url.trim() || null,
      budget_cents: Math.round(Number(form.budget || 0) * 100),
      cpm_cents: Math.round(Number(form.cpm || 0) * 100),
      target_categories: form.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      status: "pending_review",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not create campaign", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Campaign submitted for review" });
    setForm({ ...form, name: "", headline: "", creative_url: "", click_url: "", categories: "" });
    load();
  };

  const toggleCampaign = async (c: Campaign) => {
    const next = c.status === "active" ? "paused" : c.status === "paused" ? "active" : c.status;
    if (next === c.status) return;
    await (supabase as any).from("ad_campaigns").update({ status: next }).eq("id", c.id);
    load();
  };

  const totals = useMemo(
    () => ({
      spend: campaigns.reduce((s, c) => s + c.spent_cents, 0),
      budget: campaigns.reduce((s, c) => s + c.budget_cents, 0),
      active: campaigns.filter((c) => c.status === "active").length,
    }),
    [campaigns],
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20 max-w-[1100px] mx-auto px-4 md:px-6 space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Ads manager
          </p>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Run ads on AfriTube</h1>
          <p className="text-muted-foreground text-sm">
            Ads run only on monetized creators' videos. Creators earn 55% of every impression.
          </p>
        </header>

        {!advertiser ? (
          <Card>
            <CardHeader>
              <CardTitle>Create your advertiser account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Website (optional)</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <Button className="rounded-full" onClick={createAdvertiser} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Active campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totals.active}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{money(totals.spend)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{money(totals.budget)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" /> New campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Campaign name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Placement</Label>
                  <Select value={form.ad_type} onValueChange={(v) => setForm({ ...form, ad_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_roll">Pre-roll</SelectItem>
                      <SelectItem value="mid_roll">Mid-roll</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Creative URL (mp4 or image)</Label>
                  <Input
                    value={form.creative_url}
                    onChange={(e) => setForm({ ...form, creative_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Click-through URL</Label>
                  <Input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Headline</Label>
                  <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Budget (USD)</Label>
                  <Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPM bid (USD per 1000 impressions)</Label>
                  <Input value={form.cpm} onChange={(e) => setForm({ ...form, cpm: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Target categories (comma separated, blank = all)</Label>
                  <Textarea
                    rows={2}
                    value={form.categories}
                    onChange={(e) => setForm({ ...form, categories: e.target.value })}
                    placeholder="Music, Tech, Comedy"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button className="rounded-full" onClick={createCampaign} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit for review
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Spend / Budget</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No campaigns yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.ad_type.replace("_", "-")}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {money(c.spent_cents)} / {money(c.budget_cents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(c.status === "active" || c.status === "paused") && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggleCampaign(c)}>
                              {c.status === "active" ? "Pause" : "Resume"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdsManager;
