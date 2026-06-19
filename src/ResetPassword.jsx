import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase puts the recovery token in the URL hash and exchanges it for a
  // session automatically; we just wait for that session to be available.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setReady(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Wachtwoord moet minimaal 6 tekens zijn."); return; }
    if (password !== confirm) { setError("Wachtwoorden komen niet overeen."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  }

  const input = {
    width: "100%", border: "1px solid #ddd", borderRadius: 8,
    padding: "10px 12px", fontSize: 14, fontFamily: "inherit",
    background: "white", outline: "none", marginTop: 4,
  };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 400, margin: "80px auto", padding: "0 1.5rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Nieuw wachtwoord instellen</div>
      </div>

      {!ready ? (
        <div style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />Link verifiëren...
        </div>
      ) : success ? (
        <div style={{ textAlign: "center" }}>
          <i className="ti ti-circle-check" style={{ fontSize: 36, color: "#1D9E75", display: "block", marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Wachtwoord ingesteld</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Je kunt nu inloggen met je nieuwe wachtwoord.</div>
          <a href="/" style={{ fontSize: 13, color: "#1D9E75", textDecoration: "none" }}>
            <i className="ti ti-arrow-left" /> Naar inloggen
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Nieuw wachtwoord</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimaal 6 tekens" required style={input} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Bevestig wachtwoord</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Herhaal wachtwoord" required style={input} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ padding: "11px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Opslaan..." : "Wachtwoord instellen"}
          </button>
        </form>
      )}
    </div>
  );
}
