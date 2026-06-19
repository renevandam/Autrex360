import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import AuthPage from "./Auth.jsx";
import Dashboard from "./Dashboard.jsx";
import AuditStart from "./AuditStart.jsx";
import AuditRun from "./AuditRun.jsx";
import PublicAudit from "./PublicAudit.jsx";
import ResetPassword from "./ResetPassword.jsx";

// Detect /audit/:token in the URL path — works without any router library
function getAuditToken() {
  const match = window.location.pathname.match(/^\/audit\/([a-f0-9]{64})$/i);
  return match ? match[1] : null;
}

function isResetPasswordRoute() {
  return window.location.pathname === "/reset-password";
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [screen, setScreen] = useState("dashboard");
  const [auditParams, setAuditParams] = useState(null);

  // If the URL is a public audit link, skip auth entirely
  const publicToken = getAuditToken();
  if (publicToken) return <PublicAudit token={publicToken} />;

  // Password reset link from email - also skips normal auth flow
  if (isResetPasswordRoute()) return <ResetPassword />;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!session) { setProfile(null); setProfileLoading(false); return; }
      setProfileLoading(true);
      const { data } = await supabase.from("user_profiles").select("organization_id, role, full_name").eq("id", session.user.id).single();
      setProfile(data || null);
      setProfileLoading(false);
    }
    loadProfile();
  }, [session]);

  if (!session) return <AuthPage />;

  if (profileLoading) return (
    <div style={{ fontFamily: "system-ui,sans-serif", textAlign: "center", padding: "3rem", color: "#aaa" }}>
      <i className="ti ti-loader-2" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Laden...
    </div>
  );

  if (!profile) return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Geen organisatie gekoppeld</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Je account is nog niet aan een organisatie toegewezen. Neem contact op met je beheerder.</div>
      <button onClick={() => supabase.auth.signOut()} style={{ padding: "8px 16px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Uitloggen</button>
    </div>
  );

  if (screen === "dashboard") return (
    <Dashboard
      session={session}
      profile={profile}
      onStartAudit={() => setScreen("start")}
      onResumeAudit={(audit) => {
        setAuditParams({
          auditId: audit.id,
          locationId: audit.location_id,
          templateId: audit.template_id,
          location: audit.locations,
          template: audit.audit_templates,
        });
        setScreen("run");
      }}
    />
  );

  if (screen === "start") return (
    <AuditStart
      session={session}
      profile={profile}
      onBack={() => setScreen("dashboard")}
      onStart={(params) => { setAuditParams(params); setScreen("run"); }}
    />
  );

  if (screen === "run" && auditParams) return (
    <AuditRun
      session={session}
      profile={profile}
      auditId={auditParams.auditId}
      locationId={auditParams.locationId}
      templateId={auditParams.templateId}
      location={auditParams.location}
      template={auditParams.template}
      onBack={() => { setAuditParams(null); setScreen("dashboard"); }}
    />
  );

  return null;
}
