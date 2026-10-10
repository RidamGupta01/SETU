import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { 
  Activity, 
  TrendingUp, 
  ThumbsUp, 
  AlertTriangle, 
  Brain, 
  Settings, 
  ArrowRightLeft, 
  UserCheck 
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "AI Routing Accuracy Analytics · SahayogBhopal" },
      { name: "description", content: "Real-time accuracy and override reports for the AI photo-analysis and routing engine." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user } = useAuth();

  // Queries
  const { data: complaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ["complaints-analytics"],
    queryFn: async () => {
      return await api.complaints.getAll();
    },
  });

  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ["audit-logs-analytics"],
    queryFn: async () => {
      return await api.auditLogs.getAll();
    },
  });

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">Only Nodal Admins can access the AI analytics dashboard.</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  // 1. Identify all complaints that were ever auto-routed by AI.
  // A complaint was auto-routed if it has a log with note containing "Auto-routed"
  const autoRoutedComplaints = complaints.filter((c: any) => {
    const hasAutoRouteLog = auditLogs.some((log: any) => 
      log.entityId === c._id && 
      log.note && 
      log.note.includes("Auto-routed to")
    );
    return hasAutoRouteLog;
  });

  const totalAutoRouted = autoRoutedComplaints.length;

  // 2. Identify of those, how many were subsequently manually reassigned.
  const overriddenComplaints = autoRoutedComplaints.filter((c: any) => {
    const hasOverrideLog = auditLogs.some((log: any) => 
      log.entityId === c._id && 
      log.note && 
      log.note.includes("Manually reassigned from")
    );
    return hasOverrideLog;
  });

  const totalOverridden = overriddenComplaints.length;
  const accuracyRate = totalAutoRouted > 0 
    ? ((totalAutoRouted - totalOverridden) / totalAutoRouted) * 100 
    : 100;

  // 3. Category distribution
  const categoryStats: Record<string, { total: number; overridden: number }> = {};
  autoRoutedComplaints.forEach((c: any) => {
    const cat = c.aiCategory || "other";
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, overridden: 0 };
    }
    categoryStats[cat].total += 1;
    
    const isOverridden = auditLogs.some((log: any) => 
      log.entityId === c._id && 
      log.note && 
      log.note.includes("Manually reassigned from")
    );
    if (isOverridden) {
      categoryStats[cat].overridden += 1;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        
        {/* Header */}
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Brain className="h-8 w-8 text-secondary" /> AI Routing Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor classification accuracy, audit override metrics, and tune routing confidence thresholds.
          </p>
        </div>

        {loadingComplaints || loadingAudit ? (
          <div className="flex py-20 justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-r-2" />
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            
            {/* Stat Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              
              <Card 
                title="AI Routing Accuracy" 
                value={`${accuracyRate.toFixed(1)}%`}
                desc="Percentage of auto-routed complaints that were not overridden by humans"
                icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              />

              <Card 
                title="Total Auto-Routed" 
                value={totalAutoRouted}
                desc="Complaints automatically assigned to departments by vision-analysis"
                icon={<Brain className="h-5 w-5 text-secondary" />}
              />

              <Card 
                title="Human Overrides" 
                value={totalOverridden}
                desc="Auto-routed assignments manually reassigned by departmental officers"
                icon={<ArrowRightLeft className="h-5 w-5 text-amber-500" />}
              />

              <Card 
                title="Active Triages" 
                value={complaints.filter((c: any) => c.aiReviewStatus === 'needs_review').length}
                desc="Low-confidence complaints waiting in the Nodal Admin triage queue"
                icon={<Settings className="h-5 w-5 text-blue-500" />}
              />

            </div>

            {/* Analysis Detail */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Category Accuracy Breakdown */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-base font-bold text-foreground mb-4">Accuracy by AI Category</h3>
                <div className="space-y-4">
                  {Object.entries(categoryStats).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-6 text-center">No auto-routed complaints data yet.</p>
                  ) : (
                    Object.entries(categoryStats).map(([cat, stats]) => {
                      const catAccuracy = ((stats.total - stats.overridden) / stats.total) * 100;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground capitalize">{cat.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">
                              {catAccuracy.toFixed(0)}% ({stats.total - stats.overridden}/{stats.total})
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                catAccuracy >= 85 ? "bg-green-500" : catAccuracy >= 70 ? "bg-amber-500" : "bg-destructive"
                              }`} 
                              style={{ width: `${catAccuracy}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Triage & Override Insights */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-foreground">Routing Engine Performance</h3>
                
                <div className="flex gap-4 items-start p-4 rounded-lg bg-secondary/5 border border-secondary/10">
                  <UserCheck className="h-6 w-6 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Accuracy Feedback Loop</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      If the human override rate remains high, consider raising the threshold in the environment variables (e.g. set <code>AI_CONFIDENCE_THRESHOLD=0.85</code>). This ensures fewer complaints are misrouted, albeit placing more in the manual triage queue.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                  <ThumbsUp className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Operational Efficiency</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      AI has saved approximately <strong>{(totalAutoRouted * 15).toFixed(0)} minutes</strong> of manual triage work (estimating 15 minutes overhead to review and manually assign each citizen complaint).
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Card({ title, value, desc, icon }: { title: string; value: string | number; desc: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-extrabold text-foreground">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
      </div>
    </div>
  );
}
