import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { MapPin, ShieldCheck, Building2, Wrench, User as UserIcon, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { DEPARTMENTS } from "@/lib/bhopal-data";
import { api, setToken } from "@/lib/api";

export const Route = createFileRoute("/auth")({ 
  head: () => ({
    meta: [
      { title: "Sign in · SahayogBhopal" },
      { name: "description", content: "Sign in or create a SahayogBhopal citizen or officer account." },
    ],
  }),
  component: AuthPage,
});

type RoleChoice = "citizen" | "officer" | "dept_admin";

const ROLE_TIERS: {
  value: RoleChoice;
  label: string;
  tagline: string;
  desc: string;
  icon: typeof UserIcon;
  needsDept: boolean;
}[] = [
  {
    value: "citizen",
    label: "Citizen",
    tagline: "Tier 1 · Public",
    desc: "Report potholes, pollution and blockages you see around Bhopal.",
    icon: UserIcon,
    needsDept: false,
  },
  {
    value: "officer",
    label: "Field Officer",
    tagline: "Tier 2 · Department staff",
    desc: "Handle assigned issues on the ground and update status from the field.",
    icon: Wrench,
    needsDept: true,
  },
  {
    value: "dept_admin",
    label: "Department Admin",
    tagline: "Tier 3 · Department head",
    desc: "Schedule works, coordinate with other departments, assign officers.",
    icon: Building2,
    needsDept: true,
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<RoleChoice>("citizen");
  const [department, setDepartment] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const activeTier = ROLE_TIERS.find((r) => r.value === role)!;
  const { user, loading } = useAuth();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && activeTier.needsDept && !department) {
      toast.error("Please select your department.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await api.auth.register({
          email,
          password,
          fullName,
          role,
          department: activeTier.needsDept ? department : null,
        });
        setToken(res.token);
        toast.success(`Welcome, ${fullName || "friend"} — your ${activeTier.label} account is ready.`);
      } else {
        const res = await api.auth.login({ email, password });
        setToken(res.token);
        toast.success("Welcome back.");
      }
      // Force a full page reload to the dashboard so useAuth() refetches with the new token
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.05fr_1fr] md:items-start md:py-16">
        <div className="hidden md:block md:pt-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <MapPin className="h-3.5 w-3.5" /> Bhopal civic access
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-primary">
            One city. Four roles. One map.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            SahayogBhopal layers civic access so the right person acts on the
            right problem — from a citizen reporting a pothole to a department
            head resolving a clash with the traffic wing.
          </p>

          <ul className="mt-8 space-y-3">
            <TierRow icon={ShieldCheck} title="Super Admin" sub="City-wide coordination. Granted, not requested." />
            <TierRow icon={Building2}   title="Department Admin" sub="Owns one department's schedule and clashes." />
            <TierRow icon={Wrench}      title="Field Officer" sub="Executes assigned issues on the ground." />
            <TierRow icon={UserIcon}    title="Citizen" sub="Reports what they see — anyone can join." />
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:p-8">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setStep(1); }}
                className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${
                  mode === m ? "bg-background text-primary shadow" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <Stepper step={step} />
          )}

          {mode === "signup" && step === 1 ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Which access tier are you signing up for?
              </p>
              {ROLE_TIERS.map((t) => {
                const Icon = t.icon;
                const selected = role === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setRole(t.value)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? "border-secondary bg-secondary/5 ring-2 ring-secondary/40"
                        : "border-border hover:border-secondary/60 hover:bg-muted/40"
                    }`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-secondary text-secondary-foreground" : "bg-muted text-primary"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-primary">{t.label}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.tagline}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{t.desc}</span>
                    </span>
                    {selected && <Check className="mt-1 h-4 w-4 text-secondary" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-secondary"
              >
                Continue as {activeTier.label} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <activeTier.icon className="h-4 w-4 text-secondary" />
                      <div className="leading-tight">
                        <div className="text-xs font-semibold text-primary">{activeTier.label}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{activeTier.tagline}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> change
                    </button>
                  </div>
                  <Field label="Full name">
                    <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                  </Field>
                  {activeTier.needsDept && (
                    <Field label="Department">
                      <select
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select department…</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </>
              )}
              <Field label="Email">
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Password">
                <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
              </Field>
              <button
                disabled={busy}
                className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-secondary disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : `Create ${activeTier.label} account`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
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

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
      <span className={`flex items-center gap-1.5 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</span>
        Role
      </span>
      <span className="h-px flex-1 bg-border" />
      <span className={`flex items-center gap-1.5 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
        Details
      </span>
    </div>
  );
}

function TierRow({ icon: Icon, title, sub }: { icon: typeof UserIcon; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </li>
  );
}