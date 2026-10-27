import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createOrganization } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/lib/org";
import { AuthLayout } from "./AuthLayout";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { org, loading: orgLoading, reload } = useOrg();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  );
  const tzOptions = timezone && !TIMEZONES.includes(timezone)
    ? [timezone, ...TIMEZONES]
    : TIMEZONES;
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Prefill from signup metadata when available.
  useEffect(() => {
    const meta = session?.user?.user_metadata as
      | { gym_name?: string; full_name?: string }
      | undefined;
    if (meta?.gym_name && !name) setName(meta.gym_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Already onboarded → straight to the dashboard. Also covers a retried
  // onboarding after a network drop (the RPC is idempotent per owner).
  useEffect(() => {
    if (!orgLoading && org) navigate("/", { replace: true });
  }, [org, orgLoading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Enter your gym's name.");
    if (phone.trim() && phone.trim().replace(/\D/g, "").length < 8)
      return setError("Enter a valid contact number.");
    setError("");
    setLoading(true);
    try {
      await createOrganization({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        timezone,
        branchName: branchName.trim() || undefined,
      });
      reload(); // OrgProvider picks up the new org → guard redirects to "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the gym.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Set up your gym"
      subtitle="This creates your private workspace. You can invite your team later."
    >
      <div className="onboarding-steps">
        ACCOUNT CREATED <i /> GYM SETUP <i /> DASHBOARD
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && <div className="auth-alert" role="alert">{error}</div>}
        <label className="auth-field">
          Gym / business name
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CoreFit Studio"
            autoFocus
          />
        </label>
        <label className="auth-field">
          Contact number
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
        </label>
        <label className="auth-field">
          Address
          <textarea
            className="input"
            style={{ minHeight: 70, paddingTop: 10, resize: "vertical" }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, area, city"
          />
        </label>
        <label className="auth-field">
          Timezone
          <select
            className="input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </label>
        <label className="auth-field">
          First branch name <span style={{ fontWeight: 400 }}>(optional)</span>
          <input
            className="input"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Main branch"
          />
        </label>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating your gym…" : "Create gym & open dashboard"}
        </button>
      </form>
    </AuthLayout>
  );
}
