import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  campaign_id: string;
  campaign_name: string;
  status: string;
  impressions: number;
  clicks: number;
  videos_reached: number;
  spend_cents: number;
  budget_cents: number;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const AdvertiserAnalytics = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc("get_advertiser_campaign_analytics");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" /> Campaign analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Videos reached</TableHead>
                <TableHead className="text-right">Spend / Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No campaign activity yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const imp = Number(r.impressions);
                const clicks = Number(r.clicks);
                return (
                  <TableRow key={r.campaign_id}>
                    <TableCell className="font-medium">{r.campaign_name}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{imp.toLocaleString()}</TableCell>
                    <TableCell>{clicks.toLocaleString()}</TableCell>
                    <TableCell>{imp ? `${((clicks / imp) * 100).toFixed(1)}%` : "—"}</TableCell>
                    <TableCell>{Number(r.videos_reached).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {money(Number(r.spend_cents))} / {money(r.budget_cents)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvertiserAnalytics;
