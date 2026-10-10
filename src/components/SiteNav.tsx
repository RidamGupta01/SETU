import { Link } from "@tanstack/react-router";
import { useAuth, ROLE_LABEL } from "@/hooks/useAuth";
import { MapPin, LogOut } from "lucide-react";

export function SiteNav() {
  const { user, role, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elegant)]">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-primary">SahayogBhopal</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Civic Coordination</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavLink to="/">Live Map</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/coordination">Coordination</NavLink>
          <NavLink to="/report">Report Issue</NavLink>
          {user && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <NavLink to="/analytics">Analytics</NavLink>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {role && (
                <span className="hidden rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-secondary sm:inline">
                  {ROLE_LABEL[role]}
                </span>
              )}
              <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:inline">
                {user.email}
              </span>
              <button
                onClick={() => {
                  logout(); 
                  window.location.href = '/';
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
      activeProps={{ className: "rounded-md px-3 py-1.5 bg-muted text-primary font-semibold" }}
    >
      {children}
    </Link>
  );
}