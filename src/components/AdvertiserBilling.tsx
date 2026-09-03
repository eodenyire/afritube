import { useCallback, useEffect, useState } from "react";
import { Bell, Download, FileText, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  advertiserId: string;
  creditsCents: number;
  thresholdCents: number;
  emailAlerts: boolean;
  onRefresh: () => void;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

interface StatementRow {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  spend_cents: number;
}

interface LedgerRow {
  created_at: string;
  kind: string;
  amount_cents: number;
  reference: string | null;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const AdvertiserBilling = ({ advertiserId, creditsCents, thresholdCents, emailAlerts, onRefresh }: Props) => {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState((thresholdCents / 100).toFixed(2));
  const [email, setEmail] = useState(emailAlerts);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [start, setStart] = useState(isoDay(new Date(Date.now() - 29 * 864e5)));
  const [end, setEnd] = useState(isoDay(new Date()));
  const [statement, setStatement] = useState<StatementRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const loadNotifications = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("advertiser_notifications")
      .select("*")
      .eq("advertiser_id", advertiserId)
      .order("created_at", { ascending: false })
      .limit(15);
    setNotifications((data ?? []) as NotificationRow[]);
  }, [advertiserId]);

  const loadStatement = useCallback(async () => {
    setLoadingStatement(true);
    const p_start = new Date(`${start}T00:00:00.000Z`).toISOString();
    const p_end = new Date(`${end}T23:59:59.999Z`).toISOString();
    const [{ data: rows }, { data: tx }] = await Promise.all([
      (supabase as any).rpc("get_advertiser_billing_statement", { p_start, p_end }),
      (supabase as any).rpc("get_advertiser_ledger", { p_start, p_end }),
    ]);
    setStatement((rows ?? []) as StatementRow[]);
    setLedger((tx ?? []) as LedgerRow[]);
    setLoadingStatement(false);
  }, [start, end]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const savePrefs = async () => {
    setSavingPrefs(true);
    const { error } = await (supabase as any)
      .from("advertisers")
      .update({
        low_balance_threshold_cents: Math.max(0, Math.round(Number(threshold || 0) * 100)),
        low_balance_email_alerts: email,
      })
      .eq("id", advertiserId);
    setSavingPrefs(false);
    if (error) {
      toast({ title: "Could not save alert settings", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Alert settings saved" });
    onRefresh();
  };

  const markRead = async (id: string) => {
    await (supabase as any).from("advertiser_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    loadNotifications();
  };

  const totals = statement.reduce(
    (acc, r) => ({
      impressions: acc.impressions + Number(r.impressions),
      clicks: acc.clicks + Number(r.clicks),
      spend: acc.spend + Number(r.spend_cents),
    }),
    { impressions: 0, clicks: 0, spend: 0 },
  );
  const topups = ledger.filter((l) => l.amount_cents > 0).reduce((s, l) => s + l.amount_cents, 0);
  const spends = ledger.filter((l) => l.amount_cents < 0).reduce((s, l) => s + l.amount_cents, 0);

  const downloadCsv = () => {
    const lines: string[] = [];
    lines.push(`AfriTube billing statement,${start} to ${end}`);
    lines.push("");
    lines.push("Campaign,Impressions,Clicks,Spend (USD)");
    statement.forEach((r) =>
      lines.push(`"${r.campaign_name.replace(/"/g, '""')}",${r.impressions},${r.clicks},${(r.spend_cents / 100).toFixed(2)}`),
    );
    lines.push(`TOTAL,${totals.impressions},${totals.clicks},${(totals.spend / 100).toFixed(2)}`);
    lines.push("");
    lines.push("Balance changes");
    lines.push("Date,Type,Amount (USD),Reference");
    ledger.forEach((l) =>
      lines.push(
        `${new Date(l.created_at).toISOString()},${l.kind},${(l.amount_cents / 100).toFixed(2)},"${l.reference ?? ""}"`,
      ),
    );
    lines.push(`Top-ups,,${(topups / 100).toFixed(2)},`);
    lines.push(`Spend,,${(spends / 100).toFixed(2)},`);
    lines.push(`Closing balance,,${(creditsCents / 100).toFixed(2)},`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afritube-statement-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const rows = statement
      .map(
        (r) =>
          `<tr><td>${r.campaign_name}</td><td>${r.impressions}</td><td>${r.clicks}</td><td>${money(r.spend_cents)}</td></tr>`,
      )
      .join("");
    const ledgerRows = ledger
      .map(
        (l) =>
          `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.kind}</td><td>${money(l.amount_cents)}</td><td>${l.reference ?? ""}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><title>AfriTube statement ${start} to ${end}</title>
      <style>body{font-family:system-ui,sans-serif;padding:32px;color:#1c1917}
      h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e7e5e4}
      tfoot td{font-weight:600}</style></head><body>
      <h1>AfriTube billing statement</h1>
      <p>${start} to ${end}</p>
      <h2>Campaign performance</h2>
      <table><thead><tr><th>Campaign</th><th>Impressions</th><th>Clicks</th><th>Spend</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No activity</td></tr>'}</tbody>
      <tfoot><tr><td>Total</td><td>${totals.impressions}</td><td>${totals.clicks}</td><td>${money(totals.spend)}</td></tr></tfoot></table>
      <h2>Balance changes</h2>
      <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reference</th></tr></thead>
      <tbody>${ledgerRows || '<tr><td colspan="4">No transactions</td></tr>'}</tbody>
      <tfoot><tr><td>Closing balance</td><td></td><td>${money(creditsCents)}</td><td></td></tr></tfoot></table>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast({ title: "Allow pop-ups to export PDF", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const low = creditsCents < thresholdCents;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" /> Balance & low-balance alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Current balance</p>
            <p className="text-3xl font-bold">{money(creditsCents)}</p>
            {low && (
              <Badge variant="destructive" className="mt-2">
                Below threshold
              </Badge>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Alert me below (USD)</Label>
            <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={email} onCheckedChange={setEmail} id="email-alerts" />
              <Label htmlFor="email-alerts">Also email me</Label>
            </div>
            <Button className="rounded-full" onClick={savePrefs} disabled={savingPrefs}>
              {savingPrefs && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save alert settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${n.read_at ? "opacity-60" : "bg-muted/40"}`}
            >
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read_at && (
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Billing statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button variant="outline" className="rounded-full" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={downloadPdf}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>

          {loadingStatement ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No activity in this range.
                    </TableCell>
                  </TableRow>
                )}
                {statement.map((r) => (
                  <TableRow key={r.campaign_id}>
                    <TableCell className="font-medium">{r.campaign_name}</TableCell>
                    <TableCell>{r.impressions}</TableCell>
                    <TableCell>{r.clicks}</TableCell>
                    <TableCell className="text-right">{money(r.spend_cents)}</TableCell>
                  </TableRow>
                ))}
                {statement.length > 0 && (
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="font-semibold">{totals.impressions}</TableCell>
                    <TableCell className="font-semibold">{totals.clicks}</TableCell>
                    <TableCell className="text-right font-semibold">{money(totals.spend)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground">
            Top-ups {money(topups)} · Spend {money(spends)} · Closing balance {money(creditsCents)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvertiserBilling;
