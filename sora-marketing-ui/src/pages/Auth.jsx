import { useEffect, useMemo, useState } from "react";
import { login, signup } from "../api/authClient";

export default function Auth({ onAuthed }) {
  // SIGN UP FIRST
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode("signup");
  }, []);

  const isSignup = mode === "signup";

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (password.length < 8) return false;
    if (isSignup && password !== confirm) return false;
    return true;
  }, [email, password, confirm, isSignup]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setBusy(true);

    try {
      const cleanEmail = email.trim();

      if (isSignup) {
        await signup(cleanEmail, password);
        setMode("login");
        setConfirm("");
        return;
      }

      const token = await login(cleanEmail, password);
      const accessToken =
        token?.access_token || token?.token || (typeof token === "string" ? token : "");

      if (!accessToken) throw new Error("No access token returned");

      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("user_email", cleanEmail);

      onAuthed?.({ email: cleanEmail });
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrap">
      <div className="authCard">
        <div className="authHeader">
          <h1>Marketing Video Generator</h1>
          <p className="sub">
            {isSignup
              ? "Create an account to get started."
              : "Log in to generate videos."}
          </p>
        </div>

        <div className="authTabs">
          <button
            className={`tab ${isSignup ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            type="button"
            disabled={busy}
          >
            Sign up
          </button>

          <button
            className={`tab ${!isSignup ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
            type="button"
            disabled={busy}
          >
            Log in
          </button>
        </div>

        <form className="authForm" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              disabled={busy}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              disabled={busy}
            />
          </div>

          {isSignup && (
            <div>
              <label className="label">Confirm password</label>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={busy}
              />
            </div>
          )}

          {error && <div className="notice error">{error}</div>}

          <button className="btn btnPrimary" disabled={!canSubmit || busy}>
            {busy ? "Working…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
