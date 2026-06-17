import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import AuthPage from "./Auth.jsx";
import Dashboard from "./Dashboard.jsx";
import AuditStart from "./AuditStart.jsx";
import AuditRun from "./AuditRun.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("dashboard"); // dashboard | start | run
  const [auditParams, setAuditParams] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <AuthPage />;

  if (screen === "dashboard") return (
    <Dashboard
      session={session}
      onStartAudit={() => setScreen("start")}
    />
  );

  if (screen === "start") return (
    <AuditStart
      session={session}
      onBack={() => setScreen("dashboard")}
      onStart={(params) => { setAuditParams(params); setScreen("run"); }}
    />
  );

  if (screen === "run" && auditParams) return (
    <AuditRun
      session={session}
      locationId={auditParams.locationId}
      templateId={auditParams.templateId}
      location={auditParams.location}
      template={auditParams.template}
      onBack={() => { setAuditParams(null); setScreen("dashboard"); }}
    />
  );

  return null;
}
