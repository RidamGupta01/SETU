import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { useAuth, ROLE_LABEL } from "@/hooks/useAuth";
import { ShieldCheck, Building2, Wrench, User as UserIcon, MapPin, AlertTriangle, Calendar, FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · SahayogBhopal" },
      { name: "description", content: "Your SahayogBhopal control panel — role-specific views for citizens, officers and department admins." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, role, department, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user || !role) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">Loading your panel…</div>
      </div>
    );
  }

  const roleIcon =
    role === "super_admin" || role === "admin" ? ShieldCheck
    : role === "dept_admin" ? Building2
    : role === "officer" ? Wrench
    : UserIcon;
  const RoleIcon = roleIcon;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elegant)]">
              <RoleIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Signed in as
              </div>
              <h1 className="text-xl font-bold text-primary">
                {ROLE_LABEL[role]}{department ? ` · ${department}` : ""}
              </h1>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <MapPin className="h-3.5 w-3.5" /> Open live map
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {role === "citizen" && <CitizenPanel />}
          {role === "officer" && <OfficerPanel department={department} />}
          {role === "dept_admin" && <DeptAdminPanel department={department} />}
          {(role === "super_admin" || role === "admin") && <SuperAdminPanel />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, to, icon: Icon }: { title: string; desc: string; to: string; icon: typeof MapPin }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 hover:border-secondary/60"
    >
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-secondary/15 group-hover:text-secondary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="text-sm font-semibold text-primary">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}

function CitizenPanel() {
  return (
    <>
      <Card to="/report" icon={AlertTriangle} title="Report an issue" desc="Log potholes, pollution or blockages near you." />
      <Card to="/reports" icon={FileText} title="Track my reports" desc="See status updates and which department is on it." />
      <Card to="/" icon={MapPin} title="Live city map" desc="Air quality, road condition and congestion by area." />
    </>
  );
}

function OfficerPanel({ department }: { department: string | null }) {
  return (
    <>
      <Card to="/reports" icon={AlertTriangle} title={department ? `${department} queue` : "Assigned reports"} desc="Issues routed to your department." />
      <Card to="/coordination" icon={Calendar} title="Field schedule" desc="Works planned for the week and clash alerts." />
      <Card to="/" icon={MapPin} title="Ground view" desc="Live map with your department layer highlighted." />
    </>
  );
}

function DeptAdminPanel({ department }: { department: string | null }) {
  return (
    <>
      <Card to="/coordination" icon={Calendar} title="Plan department works" desc={department ? `Schedule ${department} projects and detect clashes.` : "Schedule projects and detect clashes."} />
      <Card to="/reports" icon={FileText} title="Department inbox" desc="Assign officers, resolve escalations." />
      <Card to="/" icon={MapPin} title="Coverage map" desc="Where your teams are active right now." />
    </>
  );
}

function SuperAdminPanel() {
  return (
    <>
      <Card to="/coordination" icon={Calendar} title="City-wide coordination" desc="All departments' works on one timeline with clash flags." />
      <Card to="/reports" icon={FileText} title="All reports" desc="Every citizen report across Bhopal." />
      <Card to="/" icon={MapPin} title="Bhopal command view" desc="Full pollution, road and congestion map." />
    </>
  );
}