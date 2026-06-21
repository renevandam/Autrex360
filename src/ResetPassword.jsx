import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function ResetPassword({ forced }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(!!forced); // already have a session if we got here via the forced app flow

  // Supabase puts the recovery token in the URL hash and exchanges it for a
  // session automatically; we just wait for that session to be available.
  // Not needed when forced=true, since App.jsx already confirmed a session exists.
  useEffect(() => {
    if (forced) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setReady(!!session);
    });
    return () => subscription.unsubscribe();
  }, [forced]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { data: userData, error } = await supabase.auth.updateUser({ password });
    if (!error && userData?.user?.id) {
      // Clear the forced-change flag now that a real password has been set
      await supabase.from("user_profiles").update({ must_change_password: false }).eq("id", userData.user.id);
    }
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
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{forced ? "Set your password to continue" : "Set new password"}</div>
      </div>

      {!ready ? (
        <div style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />Verifying link...
        </div>
      ) : success ? (
        <div style={{ textAlign: "center" }}>
          <i className="ti ti-circle-check" style={{ fontSize: 36, color: "#1D9E75", display: "block", marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Password set</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
            {forced ? "You will now continue to your environment." : "You can now log in with your new password."}
          </div>
          {forced ? (
            <button onClick={() => window.location.href = "/"} style={{ padding: "9px 18px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
              <i className="ti ti-arrow-right" /> Continue
            </button>
          ) : (
            <a href="/" style={{ fontSize: 13, color: "#1D9E75", textDecoration: "none" }}>
              <i className="ti ti-arrow-left" /> Go to login
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required style={input} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required style={input} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ padding: "11px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : "Set password"}
          </button>
        </form>
      )}
    </div>
  );
}
