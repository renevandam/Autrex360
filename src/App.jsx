import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import AuthPage from "./Auth.jsx";
import Dashboard from "./Dashboard.jsx";
import AuditStart from "./AuditStart.jsx";
import AuditRun from "./AuditRun.jsx";
import AuditReport from "./AuditReport.jsx";
import PublicAudit from "./PublicAudit.jsx";
import ResetPassword from "./ResetPassword.jsx";
import GuestAuditorHome from "./GuestAuditorHome.jsx";

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
  const [reportAuditId, setReportAuditId] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Routes that bypass auth entirely. Computed before the hooks so the
  // hook order stays identical on every render (rules of hooks), but the
  // effects below skip their work when auth isn't needed.
  const publicToken = getAuditToken();
  const resetRoute = isResetPasswordRoute();
  const skipAuth = Boolean(publicToken) || resetRoute;

  useEffect(() => {
    if (skipAuth) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, [skipAuth]);

  useEffect(() => {
    if (skipAuth) return;
    let cancelled = false;

    async function loadProfile() {
      if (!session) {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      setProfileError(null);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("organization_id, role, full_name, must_change_password")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      // Distinguish "the server didn't answer" from "this user genuinely has
      // no profile". Without this, an outage (e.g. a paused database) shows
      // the misleading "No organization linked" screen.
      if (error) {
        setProfileError(error);
        setProfile(null);
      } else {
        setProfile(data || null);
      }
      setProfileLoading(false);
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [session, skipAuth, retryCount]);

  // If the URL is a public audit link, skip auth entirely
  if (publicToken) return <PublicAudit token={publicToken} />;

  // Password reset link from email - also skips normal auth flow
  if (resetRoute) return <ResetPassword />;

  if (!session) return <AuthPage />;

  if (profileLoading) return (
    <div style={{ fontFamily: "system-ui,sans-serif", textAlign: "center", padding: "3rem", color: "#aaa" }}>
      <i className="ti ti-loader-2" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Loading...
    </div>
  );

  // The query failed rather than returning an empty result: this is a
  // connection or server problem, not an account problem.
  if (profileError) return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
      <i className="ti ti-cloud-off" style={{ fontSize: 36, color: "#E24B4A", display: "block", marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Geen verbinding met de server</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Je account is in orde, maar je gegevens konden niet worden opgehaald. Controleer je internetverbinding en probeer het opnieuw.
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setRetryCount((n) => n + 1)} style={{ padding: "8px 16px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
          <i className="ti ti-refresh" /> Opnieuw proberen
        </button>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: "8px 16px", background: "white", color: "#555", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
          Uitloggen
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#bbb", marginTop: 16 }}>{profileError.message}</div>
    </div>
  );

  // Force a fresh password to be set before anything else, even if the
  // user somehow ended up logged in without going through the reset link.
  // The metadata check is a safety valve: if the profile flag could not be
  // cleared (e.g. an RLS policy blocks it), the user would otherwise be stuck
  // on this screen forever, having already set a valid password.
  const passwordAlreadySet = Boolean(session.user?.user_metadata?.password_set_at);
  if (profile?.must_change_password && !passwordAlreadySet) return <ResetPassword forced />;

  if (!profile) return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No organization linked</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Your account hasn't been assigned to an organization yet. Contact your administrator.</div>
      <button onClick={() => supabase.auth.signOut()} style={{ padding: "8px 16px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Log out</button>
    </div>
  );

  // Guest auditors get a completely separate, minimal flow: only their
  // assigned audits, nothing else from the app (no locations, templates, etc.)
  if (profile.role === "guest_auditor") {
    if (screen === "run" && auditParams) return (
      <AuditRun
        session={session}
        profile={profile}
        auditId={auditParams.auditId}
        locationId={auditParams.locationId}
        templateId={auditParams.templateId}
        location={auditParams.location}
        template={auditParams.template}
        readOnly={auditParams.readOnly}
        onBack={() => { setAuditParams(null); setScreen("dashboard"); }}
      />
    );
    return (
      <GuestAuditorHome
        session={session}
        onOpenAudit={(audit) => {
          setAuditParams({
            auditId: audit.id,
            locationId: audit.location_id,
            templateId: audit.template_id,
            location: audit.locations,
            template: audit.audit_templates,
            readOnly: audit.status === "submitted", // submitted audits are view-only for guest auditors
          });
          setScreen("run");
        }}
      />
    );
  }

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
      onViewReport={(auditId) => { setReportAuditId(auditId); setScreen("report"); }}
    />
  );

  if (screen === "report" && reportAuditId) return (
    <AuditReport
      auditId={reportAuditId}
      onBack={() => { setReportAuditId(null); setScreen("dashboard"); }}
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
