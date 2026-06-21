import { useState } from "react";
import { supabase } from "./lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  const input = {
    width: "100%", border: "1px solid #ddd", borderRadius: 8,
    padding: "10px 12px", fontSize: 14, fontFamily: "inherit",
    background: "white", outline: "none", marginTop: 4,
  };

  if (mode === "forgot") return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 400, margin: "80px auto", padding: "0 1.5rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Reset your password</div>
      </div>

      {resetSent ? (
        <div style={{ textAlign: "center" }}>
          <i className="ti ti-mail-check" style={{ fontSize: 36, color: "#1D9E75", display: "block", marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Email sent</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Check your inbox for a link to reset your password.</div>
          <button onClick={() => { setMode("login"); setResetSent(false); }} style={{ fontSize: 13, color: "#1D9E75", border: "none", background: "none", cursor: "pointer" }}>
            <i className="ti ti-arrow-left" /> Back to login
          </button>
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required style={input} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ padding: "11px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <button type="button" onClick={() => setMode("login")} style={{ fontSize: 13, color: "#888", border: "none", background: "none", cursor: "pointer" }}>
            <i className="ti ti-arrow-left" /> Back to login
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 400, margin: "80px auto", padding: "0 1.5rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Log in to continue</div>
      </div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Email address</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com" required style={input}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required style={input}
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ padding: "11px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Logging in..." : "Log in"}
        </button>
        <button type="button" onClick={() => setMode("forgot")} style={{ fontSize: 13, color: "#888", border: "none", background: "none", cursor: "pointer", textAlign: "center" }}>
          Forgot password?
        </button>
      </form>
    </div>
  );
}
