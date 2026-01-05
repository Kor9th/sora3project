import { useEffect, useMemo, useState } from "react";
import { login, signup } from "../api/authClient";

export default function Auth({ onAuthed }) {
  // FORCE signup on first load
  const [mode, setMode] = useState("signup");

  useEffect(() => {
    setMode("signup");
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const passwordOk = useMemo(() => password.length >= 8, [password]);
  const confirmOk = mode === "login" || password === confirm;

  const canSubmit = emailOk && passwordOk && confirmOk && !busy;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        await signup(email.trim(), password);
        setMode("login");
        setConfirm("");
        setMessage("Account created — please log in.");
        return;
      }

      const token = await login(email.trim(), password);
      localStorage.setItem("access_token", token.access_token);
      onAuthed({ email });
    } catch (err) {
      setError(err?.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrap">
      <div className="authCard">
        {/* HEADER */}
        <div className="authHeader">
          <h1>Marketing Video Generator</h1>

          {/* ✅ ADDED CONTENT */}
          <p className="muted">
            Create AI-powered marketing videos with your own assets.
          </p>

          <ul className="authBenefits">
            {/* <li>Generate videos in seconds</li>
            <li>Upload product images</li>
            <li>Download instantly</li> */}
          </ul>
        </div>

        {/* TABS */}
        <div className="authTabs">
          <button
            className={mode === "signup" ? "tab active" : "tab"}
            onClick={() => setMode("signup")}
            type="button"
            disabled={busy}
          >
            Sign up
          </button>
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => setMode("login")}
            type="button"
            disabled={busy}
          >
            Log in
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={submit} className="authForm">
          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          <div>
            <div className="label">Email</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
          </div>

          <div>
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={busy}
            />
          </div>

          {mode === "signup" && (
            <div>
              <div className="label">Confirm password</div>
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

          <button className="btn btnPrimary" disabled={!canSubmit} type="submit">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
