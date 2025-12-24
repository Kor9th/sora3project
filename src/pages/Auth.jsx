import { useMemo, useState } from "react";
import { login, signup } from "../api/authClient";

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(form.email), [form.email]);
  const passwordOk = useMemo(() => form.password.length >= 8, [form.password]);
  const confirmOk = useMemo(
    () => mode === "login" || form.password === form.confirmPassword,
    [mode, form.password, form.confirmPassword]
  );

  const canSubmit = emailOk && passwordOk && confirmOk && !busy;

async function submit(e) {
  e.preventDefault();
  if (!canSubmit) return;

  setServerError("");
  setBusy(true);

  try {
    const email = form.email.trim();

    if (mode === "signup") {
      await signup(email, form.password);

      setMode("login");
      setForm((prev) => ({ ...prev, confirmPassword: "" }));

      setServerError("Account created — please log in.");
      return;
    }

    const token = await login(email, form.password);
    localStorage.setItem("access_token", token.access_token);
    localStorage.setItem("token_type", token.token_type || "bearer");

    onAuthed({ email });
  } catch (err) {
    setServerError(err?.message || "Something went wrong");
  } finally {
    setBusy(false);
  }
}


  return (
    <div className="authWrap">
      <div className="authCard">
        <div className="authHeader">
          <h1>Marketing Video Generator</h1>
          <p className="muted">
            {mode === "login"
              ? "Log in to generate videos."
              : "Create an account to get started."}
          </p>
        </div>

        <div className="authTabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => {
              setMode("login");
              setServerError("");
            }}
            type="button"
            disabled={busy}
          >
            Log in
          </button>
          <button
            className={mode === "signup" ? "tab active" : "tab"}
            onClick={() => {
              setMode("signup");
              setServerError("");
            }}
            type="button"
            disabled={busy}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="authForm">
          {serverError && (
            <div className="fieldHint warn" style={{ marginTop: 0 }}>
              {serverError}
            </div>
          )}

          <div>
            <div className="label">Email</div>
            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              disabled={busy}
            />
            {!emailOk && form.email.length > 0 && (
              <div className="fieldHint warn">Enter a valid email.</div>
            )}
          </div>

          <div>
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={busy}
            />
            {!passwordOk && form.password.length > 0 && (
              <div className="fieldHint warn">Password must be 8+ characters.</div>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <div className="label">Confirm password</div>
              <input
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={busy}
              />
              {!confirmOk && form.confirmPassword.length > 0 && (
                <div className="fieldHint warn">Passwords don’t match.</div>
              )}
            </div>
          )}

          <button className="btn btnPrimary" disabled={!canSubmit} type="submit">
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
