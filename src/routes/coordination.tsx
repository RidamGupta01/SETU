import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { StatusPill } from "./index";
import { useAuth } from "@/hooks/useAuth";
import { BHOPAL_AREAS, DEPARTMENTS } from "@/lib/bhopal-data";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/coordination")({
  head: () => ({
    meta: [
      { title: "Department coordination · SahayogBhopal" },
      { name: "description", content: "Timeline of every department's roadworks so PWD, BMC, Traffic and others avoid clashing on the same street." },
    ],
  }),
  component: CoordinationPage,
});

function CoordinationPage() {
  const { user, isPrivileged } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: works = [] } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      return await api.works.getAll();
    },
  });

  const { data: pendingDeps = [] } = useQuery({
    queryKey: ["pendingDependencies"],
    queryFn: async () => {
      return await api.issues.getPendingDependencies();
    },
    enabled: isPrivileged,
  });

  const create = useMutation({
    mutationFn: async (payload: any) => {
      await api.works.create(payload);
    },
    onSuccess: () => {
      toast.success("Work scheduled");
      qc.invalidateQueries({ queryKey: ["works"] });
      qc.invalidateQueries({ queryKey: ["works-summary"] });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to schedule work"),
  });

  const byArea: Record<string, typeof works> = {};
  for (const w of works) (byArea[w.area] ||= []).push(w);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Department coordination</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every scheduled work, grouped by area. Overlapping departments are flagged in saffron.</p>
          </div>
          {isPrivileged && (
            <button onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-secondary">
              <Plus className="h-4 w-4" /> Schedule work
            </button>
          )}
        </div>

        {showForm && isPrivileged && <WorkForm onSubmit={(v) => create.mutate(v)} />}

        {/* Action Required: Cross-Department Dependencies */}
        {isPrivileged && pendingDeps.length > 0 && (
          <div className="mt-8 rounded-xl border border-destructive/50 bg-destructive/5 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Action Required: Pending Cross-Department Requests
            </h2>
            <div className="grid gap-3">
              {pendingDeps.map((dep: any) => (
                <div key={dep._id} className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                        Waiting on You
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        Requested by: {dep.dependentDepartment?.name || "Another Department"}
                      </span>
                    </div>
                    <h3 className="mt-1 font-bold text-primary">{dep.issueId?.title}</h3>
                    <p className="text-sm text-muted-foreground">Location: {dep.issueId?.area}</p>
                  </div>
                  {dep.estimatedTime && (
                    <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-secondary/10 px-3 py-2 text-sm font-semibold text-secondary">
                      <span>Expected turnaround:</span>
                      <span className="font-bold">{dep.estimatedTime}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {Object.keys(byArea).length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No works scheduled yet. Officers can add the first one above.
            </div>
          )}
          {Object.entries(byArea).map(([area, list]) => {
            const depts = new Set(list.map((l: any) => l.department));
            const clash = depts.size > 1 && hasOverlap(list);
            return (
              <div key={area} className={`rounded-xl border p-5 shadow-[var(--shadow-card)] ${clash ? "border-accent/70 bg-accent/10" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-primary">{area}</h2>
                  {clash && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                      <AlertTriangle className="h-3 w-3" /> CLASH: {[...depts].join(" ✕ ")}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {list.map((w: any) => (
                    <div key={w._id} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="rounded bg-secondary px-2 py-0.5 font-bold uppercase tracking-wider text-secondary-foreground">
                          {w.department}
                        </span>
                        <StatusPill status={w.status} />
                      </div>
                      <div className="mt-1.5 font-semibold text-foreground">{w.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.startsOn} → {w.endsOn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function hasOverlap(list: Array<{ department: string; startsOn: string; endsOn: string }>) {
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.department !== b.department && a.startsOn <= b.endsOn && b.startsOn <= a.endsOn) return true;
    }
  return false;
}

function WorkForm({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [form, setForm] = useState({
    department: DEPARTMENTS[0] as string,
    title: "",
    description: "",
    area: BHOPAL_AREAS[0].name,
    startsOn: new Date().toISOString().slice(0, 10),
    endsOn: new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const a = BHOPAL_AREAS.find((x) => x.name === form.area)!;
        onSubmit({ ...form, lat: a.lat, lng: a.lng });
      }}
      className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-3"
    >
      <Field label="Department">
        <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls}>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Area">
        <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputCls}>
          {BHOPAL_AREAS.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Title">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Milling, drain, cable…" />
      </Field>
      <Field label="Starts on">
        <input type="date" value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Ends on">
        <input type="date" value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} className={inputCls} />
      </Field>
      <div className="flex items-end">
        <button className="w-full rounded-md bg-accent py-2 text-sm font-bold text-accent-foreground">Save</button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}