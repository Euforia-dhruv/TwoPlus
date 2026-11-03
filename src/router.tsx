import { Suspense, lazy, type ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/lib/org";
import { myHomePath } from "@/lib/member-api";
import { NotFound, Privacy, Terms } from "@/pages/DocPages";

// Each surface is its own chunk. One bundle meant a member on a phone
// downloaded the platform admin console and the whole staff workspace before
// their workout appeared. DocPages stays eager: the 404 can be reached from
// anywhere and is 5 KB.
const Dashboard = lazy(() => import("./App"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const Marketing = lazy(() => import("@/pages/Marketing"));
const Member = lazy(() => import("@/pages/Member"));

// Shown while auth or the organization row resolves. Reads the design tokens so
// it is painted by whichever language the workspace uses, never a fixed olive.
function Splash({ text }: { text: string }) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <span>{text}</span>
    </div>
  );
}

// Signed-in users land on the dashboard; anyone else goes to login.
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Splash text="Loading" />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Decide where a signed-in user belongs: member app or staff workspace.
function HomeRedirect() {
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    myHomePath().then((path) => {
      if (!cancelled) setTarget(path);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!target) return <Splash text="Loading" />;
  return <Navigate to={target} replace />;
}

// Onboarding is for owners with no organization yet.
function RequireNoOrg({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { org, loading: orgLoading } = useOrg();
  if (authLoading || orgLoading) return <Splash text="Loading" />;
  if (!session) return <Navigate to="/login" replace />;
  // While the post-registration initialization screen is running, keep the
  // owner on it even though the workspace row already exists.
  const initializing = sessionStorage.getItem("twoplus-initializing") === "1";
  if (org && !initializing) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    // One boundary for every lazy surface: a chunk is a network request the
    // first time a route is opened, and an empty flash looks like a broken page.
    <Suspense fallback={<Splash text="Loading" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        {/* Spec name for the same control center. */}
        <Route path="/admin" element={<Navigate to="/super-admin" replace />} />
        <Route
          path="/onboarding"
          element={
            <RequireNoOrg>
              <Onboarding />
            </RequireNoOrg>
          }
        />
        {/* Public front door. Signed-in visitors are sent on to the workspace. */}
        <Route path="/" element={<Marketing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/home" element={<RequireAuth><HomeRedirect /></RequireAuth>} />
        <Route path="/member" element={<RequireAuth><Member /></RequireAuth>} />
        {/* Two-level workspace nav: /app/:category/:module drives both rails. */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Navigate to="/app/overview/overview" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/app/:category/:module"
          element={
            <RequireAuth>
              {/* Owners without an org bounce to onboarding inside DashboardShell */}
              <DashboardShell />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function DashboardShell() {
  const { org, loading } = useOrg();
  if (loading) return <Splash text="Loading workspace" />;
  if (!org) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}
