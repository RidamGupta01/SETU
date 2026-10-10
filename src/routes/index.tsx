import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { api, API_URL } from "@/lib/api";
import { SiteNav } from "@/components/SiteNav";
import { BhopalMap } from "@/components/BhopalMap";
import { BHOPAL_AREAS, aqiColor, useLiveBhopalData } from "@/lib/bhopal-data";
import heroImg from "@/assets/bhopal-hero.jpg";
import { AlertTriangle, Wind, Route as RouteIcon, Users, ArrowRight, Activity } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const qc = useQueryClient();
  const liveAreas = useLiveBhopalData();
  const [mapFilters, setMapFilters] = useState({
    showAqi: true,
    showReports: true,
    showWorks: true,
  });

  // Socket.io integration for real-time updates
  useEffect(() => {
    // Extract base URL from API_URL (remove /api)
    const baseUrl = API_URL.replace('/api', '');
    const socket = io(baseUrl);

    socket.on('ISSUE_CREATED', () => {
      qc.invalidateQueries({ queryKey: ["reports-summary"] });
    });
    
    socket.on('ISSUE_UPDATED', () => {
      qc.invalidateQueries({ queryKey: ["reports-summary"] });
    });

    socket.on('ISSUE_REASSIGNED', () => {
      qc.invalidateQueries({ queryKey: ["reports-summary"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);

  const reports = useQuery({
    queryKey: ["reports-summary"],
    queryFn: async () => {
      return await api.issues.getAll();
    },
  });

  const works = useQuery({
    queryKey: ["works-summary"],
    queryFn: async () => {
      return await api.works.getAll();
    },
  });

  const avgAqi = Math.round(
    BHOPAL_AREAS.reduce((s, a) => s + a.aqi, 0) / BHOPAL_AREAS.length,
  );
  const worstAqi = [...BHOPAL_AREAS].sort((a, b) => b.aqi - a.aqi)[0];

  const clashes = detectClashes(works.data ?? []);

  const markers = [
    ...(reports.data ?? []).map((r: any) => ({
      lat: r.location?.coordinates[1] as number | null, // GeoJSON is [lng, lat]
      lng: r.location?.coordinates[0] as number | null,
      color: "oklch(0.60 0.22 30)",
      label: r.title + (r.clusterId && r.clusterId !== r._id ? ' (Duplicate)' : ''),
      kind: "report" as const,
    })),
    ...(works.data ?? []).map((w: any) => ({
      lat: w.lat as number | null,
      lng: w.lng as number | null,
      color: "oklch(0.78 0.16 68)",
      label: `${w.department}: ${w.title}`,
      kind: "work" as const,
    })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <img
          src={heroImg}
          alt="Aerial view of Bhopal at dusk"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          width={1024}
          height={1024}
        />
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-90" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Live civic intelligence · Bhopal
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              One city. One map. <span className="text-accent">Zero silos.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
              SahayogBhopal unifies citizen reports, live air-quality, road
              condition and every department's scheduled work — so Bhopal
              stops digging the same road twice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition-transform hover:scale-[1.02]"
              >
                Report an issue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/coordination"
                className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
              >
                Department view
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto -mt-10 max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<Wind className="h-4 w-4" />} label="City avg AQI" value={String(avgAqi)} note={`Peak: ${worstAqi.name} ${worstAqi.aqi}`} tone="warn" />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Open citizen reports" value={String((reports.data ?? []).filter((r: any) => r.status !== "resolved").length)} note="Awaiting action" />
          <StatCard icon={<RouteIcon className="h-4 w-4" />} label="Scheduled works" value={String((works.data ?? []).length)} note={`${clashes.length} inter-dept clash${clashes.length === 1 ? "" : "es"}`} tone={clashes.length ? "warn" : "ok"} />
          <StatCard icon={<Users className="h-4 w-4" />} label="Departments online" value="6" note="PWD · BMC · Traffic · PCB · Elec · Water" />
        </div>
      </section>

      {/* MAP + PANEL */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-3">
          <SectionHead icon={<Activity className="h-4 w-4" />} title="Live Bhopal map" subtitle="Click any area marker for live telemetry" />
          
          <div className="flex flex-wrap gap-2 mb-2">
            <FilterToggle 
              active={mapFilters.showAqi} 
              onClick={() => setMapFilters(f => ({ ...f, showAqi: !f.showAqi }))}
              label="AQI Heatmap" 
            />
            <FilterToggle 
              active={mapFilters.showReports} 
              onClick={() => setMapFilters(f => ({ ...f, showReports: !f.showReports }))}
              label="Citizen Reports" 
            />
            <FilterToggle 
              active={mapFilters.showWorks} 
              onClick={() => setMapFilters(f => ({ ...f, showWorks: !f.showWorks }))}
              label="Scheduled Works" 
            />
          </div>

          <BhopalMap markers={markers} areas={liveAreas} filters={mapFilters} />
        </div>

        <div className="flex flex-col gap-6">
          {/* AQI table */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Air quality by area
            </h3>
            <div className="mt-3 divide-y divide-border">
              {[...BHOPAL_AREAS].sort((a, b) => b.aqi - a.aqi).slice(0, 6).map((a) => (
                <div key={a.name} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                    style={{ background: aqiColor(a.aqi) }}
                  >
                    {a.aqi} · {a.aqiCategory}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clashes */}
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
              <AlertTriangle className="h-4 w-4 text-accent-foreground" />
              Inter-department clashes
            </h3>
            {clashes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No overlapping works detected right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {clashes.map((c, i) => (
                  <li key={i} className="rounded-md bg-background/60 p-3">
                    <div className="font-semibold text-primary">{c.area}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.departments.join(" ✕ ")} working on overlapping dates
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/coordination"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
            >
              Open coordination board <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recent reports */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <SectionHead icon={<AlertTriangle className="h-4 w-4" />} title="Recent citizen reports" subtitle="Latest issues submitted from the ground" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(reports.data ?? []).slice(0, 6).map((r: any) => (
            <div key={r._id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                <span>{r.category}</span>
                <StatusPill status={r.status} />
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{r.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{r.area}</div>
              {r.aiSummary && <div className="mt-2 text-xs italic text-muted-foreground border-l-2 border-accent pl-2">{r.aiSummary}</div>}
            </div>
          ))}
          {(reports.data ?? []).length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No reports yet. <Link to="/report" className="font-semibold text-secondary hover:underline">Be the first to report</Link>.
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border/60 bg-primary py-6 text-center text-xs text-primary-foreground/80">
        SahayogBhopal · Built for the Bhopal Smart-City hackathon
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, note, tone = "default" }: {
  icon: React.ReactNode; label: string; value: string; note?: string; tone?: "default" | "warn" | "ok";
}) {
  const toneClass =
    tone === "warn" ? "border-accent/60 bg-accent/10"
    : tone === "ok" ? "border-emerald-400/40 bg-emerald-50"
    : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 shadow-[var(--shadow-card)] ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-2 text-3xl font-bold text-primary">{value}</div>
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

function SectionHead({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
          {icon} {title}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-accent text-accent-foreground",
    assigned: "bg-secondary text-secondary-foreground",
    in_progress: "bg-secondary text-secondary-foreground",
    resolved: "bg-emerald-600 text-white",
    scheduled: "bg-secondary text-secondary-foreground",
    ongoing: "bg-accent text-accent-foreground",
    completed: "bg-emerald-600 text-white",
    delayed: "bg-destructive text-destructive-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-muted text-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function detectClashes(
  works: Array<{ area: string; department: string; startsOn: string; endsOn: string }>,
) {
  const byArea: Record<string, typeof works> = {};
  for (const w of works) (byArea[w.area] ||= []).push(w);
  const out: { area: string; departments: string[] }[] = [];
  for (const [area, list] of Object.entries(byArea)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.department === b.department) continue;
        if (a.startsOn <= b.endsOn && b.startsOn <= a.endsOn) {
          out.push({ area, departments: [a.department, b.department] });
        }
      }
    }
  }
  return out;
}

function FilterToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${
        active 
          ? "bg-secondary text-secondary-foreground border-secondary" 
          : "bg-transparent text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
