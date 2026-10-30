import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/lib/org";
import Dashboard from "./App";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import SuperAdmin from "@/pages/SuperAdmin";

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

// Onboarding is for owners with no organization yet.
function RequireNoOrg({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { org, loading: orgLoading } = useOrg();
  if (authLoading || orgLoading) return <Splash text="Loading" />;
  if (!session) return <Navigate to="/login" replace />;
  if (org) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
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
      <Route
        path="/"
        element={
          <RequireAuth>
            {/* Owners without an org bounce to onboarding inside DashboardShell */}
            <DashboardShell />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function DashboardShell() {
  const { org, loading } = useOrg();
  if (loading) return <Splash text="Loading workspace" />;
  if (!org) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}
