import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ReportItem {
  id: string;
  target_type: string;
  reason: string;
  status: string;
}

const Moderation = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      return;
    }

    const load = async () => {
      const { data } = await (supabase.from("moderation_reports") as any)
        .select("id, target_type, reason, status")
        .order("created_at", { ascending: false })
        .limit(50);
      setReports((data ?? []) as ReportItem[]);
    };

    load();
  }, [user, isAdmin, navigate]);

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await (supabase.from("moderation_reports") as any)
      .update({ status, reviewed_at: new Date().toISOString(), reviewer_id: user?.id })
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    setReports((prev) => prev.map((report) => (report.id === id ? { ...report, status } : report)));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl text-foreground">Moderation</h1>
        </div>

        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-base">{report.target_type} report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{report.reason}</p>
                <Select value={report.status} onValueChange={(value) => handleStatusChange(report.id, value)}>
                  <SelectTrigger className="max-w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No moderation reports found.
          </div>
        )}
      </main>
    </div>
  );
};

export default Moderation;
