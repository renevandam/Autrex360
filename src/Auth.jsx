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
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Wachtwoord opnieuw instellen</div>
      </div>

      {resetSent ? (
        <div style={{ textAlign: "center" }}>
          <i className="ti ti-mail-check" style={{ fontSize: 36, color: "#1D9E75", display: "block", marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>E-mail verstuurd</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Controleer je inbox voor een link om je wachtwoord opnieuw in te stellen.</div>
          <button onClick={() => { setMode("login"); setResetSent(false); }} style={{ fontSize: 13, color: "#1D9E75", border: "none", background: "none", cursor: "pointer" }}>
            <i className="ti ti-arrow-left" /> Terug naar inloggen
          </button>
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>E-mailadres</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@bedrijf.nl" required style={input} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ padding: "11px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Versturen..." : "Verstuur resetlink"}
          </button>
          <button type="button" onClick={() => setMode("login")} style={{ fontSize: 13, color: "#888", border: "none", background: "none", cursor: "pointer" }}>
            <i className="ti ti-arrow-left" /> Terug naar inloggen
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
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Inloggen om verder te gaan</div>
      </div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>E-mailadres</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@bedrijf.nl" required style={input}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Wachtwoord</label>
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
          {loading ? "Bezig..." : "Inloggen"}
        </button>
        <button type="button" onClick={() => setMode("forgot")} style={{ fontSize: 13, color: "#888", border: "none", background: "none", cursor: "pointer", textAlign: "center" }}>
          Wachtwoord vergeten?
        </button>
      </form>
    </div>
  );
}
