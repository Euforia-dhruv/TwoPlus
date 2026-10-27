import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: rpcError } = await getSupabase().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      // Deliberately do not reveal whether the account exists.
      if (rpcError && !rpcError.message.includes("rate")) {
        setError(rpcError.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <>
          Remembered it? <Link className="auth-link" to="/login">Back to sign in</Link>
        </>
      }
    >
      {sent ? (
        <div className="auth-alert success" role="status" style={{ marginTop: 26 }}>
          If an account exists for {email.trim()}, a reset link is on its way.
          Check your inbox (and spam folder).
        </div>
      ) : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {error && <div className="auth-alert" role="alert">{error}</div>}
          <label className="auth-field">
            Email address
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gym.com"
              autoFocus
            />
            {error && <span className="auth-field-error">{error}</span>}
          </label>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
