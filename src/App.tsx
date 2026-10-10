import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuickReportWidget } from "@/components/QuickReportWidget";
import { reportLovableError } from "@/lib/lovable-error-reporting";

const queryClient = new QueryClient();
const Home = lazy(() => import("@/routes").then((m) => ({ default: m.Home })));
const AuthPage = lazy(() => import("@/routes/auth").then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() =>
  import("@/routes/dashboard").then((m) => ({ default: m.DashboardPage })),
);
const ReportPage = lazy(() => import("@/routes/report").then((m) => ({ default: m.ReportPage })));
const ComplaintsPage = lazy(() =>
  import("@/routes/reports").then((m) => ({ default: m.ComplaintsPage })),
);
const CoordinationPage = lazy(() =>
  import("@/routes/coordination").then((m) => ({ default: m.CoordinationPage })),
);
const AnalyticsPage = lazy(() =>
  import("@/routes/analytics").then((m) => ({ default: m.AnalyticsPage })),
);

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(error);
    reportLovableError(error, { boundary: "react_router_error_boundary" });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong. Try refreshing or head back home.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
              <Link className="rounded-md border border-input px-4 py-2 text-sm" to="/">
                Go home
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          to="/"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary>
          <Suspense
            fallback={
              <div className="p-8 text-center text-sm text-muted-foreground">Loading page…</div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/reports" element={<ComplaintsPage />} />
              <Route path="/coordination" element={<CoordinationPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <QuickReportWidget />
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
