import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordProblem(pw: string): string {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw))
    return "Mix letters and numbers.";
  return "";
}

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [gymName, setGymName] = useState("");
  const [terms, setTerms] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.name = "Enter your full name.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    const pwProblem = passwordProblem(password);
    if (pwProblem) next.password = pwProblem;
    if (confirm !== password) next.confirm = "Passwords do not match.";
    if (gymName.trim().length < 2) next.gym = "Enter your gym or business name.";
    if (!terms) next.terms = "Please accept the terms to continue.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), gym_name: gymName.trim() },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setFormError("An account with this email already exists. Try signing in.");
        } else {
          setFormError(error.message);
        }
        return;
      }
      if (data.session) {
        // Email confirmation disabled (common in local dev) — go straight to onboarding.
        navigate("/onboarding", { replace: true });
      } else {
        setNotice(
          "Account created. Check your inbox to verify your email, then sign in.",
        );
      }
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your gym workspace in a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link className="auth-link" to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && <div className="auth-alert" role="alert">{formError}</div>}
        {notice && <div className="auth-alert success" role="status">{notice}</div>}
        <label className="auth-field">
          Full name
          <input
            className="input"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          {errors.name && <span className="auth-field-error">{errors.name}</span>}
        </label>
        <label className="auth-field">
          Email address
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gym.com"
          />
          {errors.email && <span className="auth-field-error">{errors.email}</span>}
        </label>
        <label className="auth-field">
          Gym / business name
          <input
            className="input"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            placeholder="e.g. CoreFit Studio"
          />
          {errors.gym && <span className="auth-field-error">{errors.gym}</span>}
        </label>
        <label className="auth-field">
          Password
          <span className="auth-input-wrap">
            <input
              className="input"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
        <label className="auth-field">
          Confirm password
          <input
            className="input"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
          />
          {errors.confirm && <span className="auth-field-error">{errors.confirm}</span>}
        </label>
        <label className="auth-check">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <span>
            I agree to the terms of service and privacy policy.
            {errors.terms && (
              <span className="auth-field-error" style={{ display: "block" }}>
                {errors.terms}
              </span>
            )}
          </span>
        </label>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
