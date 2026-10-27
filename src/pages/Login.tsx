import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setInfo("Please confirm your email first. Check your inbox for the verification link.");
        } else if (error.message.includes("Invalid login credentials")) {
          setFormError("Incorrect email or password.");
        } else {
          setFormError(error.message);
        }
        return;
      }
      if (data.session) navigate("/", { replace: true });
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your gym workspace."
      footer={
        <>
          New to HeyGym? <Link className="auth-link" to="/signup">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && <div className="auth-alert" role="alert">{formError}</div>}
        {info && <div className="auth-alert success" role="status">{info}</div>}
        <label className="auth-field">
          Email address
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gym.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && <span className="auth-field-error">{errors.email}</span>}
        </label>
        <label className="auth-field">
          Password
          <span className="auth-input-wrap">
            <input
              className="input"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
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
          {errors.password && <span className="auth-field-error">{errors.password}</span>}
        </label>
        <div className="auth-row">
          <span />
          <Link className="auth-link" to="/forgot-password">Forgot password?</Link>
        </div>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
