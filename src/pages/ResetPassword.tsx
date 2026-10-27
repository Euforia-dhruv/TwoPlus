import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthLayout } from "./AuthLayout";

function passwordProblem(pw: string): string {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Mix letters and numbers.";
  return "";
}

// Reached from the recovery email link. The link lands here with a recovery
// session in the URL hash (detected automatically by supabase-js).
export default function ResetPassword() {
  const { session, loading: sessionLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear a lingering recovery hash so a refresh cannot replay it.
    if (window.location.hash.includes("type=recovery")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords do not match.");
    setError("");
    setLoading(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({
        password,
      });
      if (updateError) {
        setError(
          updateError.message.includes("should be different")
            ? "Choose a password you haven't used before."
            : updateError.message,
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sessionLoading) {
    return (
      <AuthLayout title="Set a new password" subtitle="Verifying your reset link…">
        <p className="auth-alt">Please wait…</p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can sign in with your new password.">
        <div className="auth-alert success" role="status">
          Your password has been changed.
        </div>
        <div className="auth-alt">
          <Link className="auth-link" to="/login">Go to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password for your account."
      footer={
        <>
          Link expired?{" "}
          <Link className="auth-link" to="/forgot-password">Request a new one</Link>
        </>
      }
    >
      {!session ? (
        <div className="auth-alert" role="alert" style={{ marginTop: 26 }}>
          This reset link is invalid or has expired. Request a new one to
          continue.
        </div>
      ) : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {error && <div className="auth-alert" role="alert">{error}</div>}
          <label className="auth-field">
            New password
            <span className="auth-input-wrap">
              <input
                className="input"
                type={reveal ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
              <button
                type="button"
                className="auth-reveal"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide password" : "Show password"}
              >
                {reveal ? "HIDE" : "SHOW"}
              </button>
            </span>
          </label>
          <label className="auth-field">
            Confirm new password
            <input
              className="input"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
            />
          </label>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
