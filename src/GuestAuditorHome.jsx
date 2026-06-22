import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function GuestAuditorHome({ session, onOpenAudit }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    // Only audits explicitly assigned to this account are ever visible here,
    // enforced both by this query and by the RLS policy on the audits table itself.
    const { data } = await supabase
      .from("audit_assignments")
      .select("audit_id, audits(id, status, audit_date, created_at, location_id, template_id, locations(name), audit_templates(name))")
      .eq("user_id", session.user.id)
      .order("assigned_at", { ascending: false });
    setAssignments(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleLogout() { await supabase.auth.signOut(); }

  const statusLabel = { draft: "Draft", submitted: "Submitted" };
  const statusColor = { draft: "#EF9F27", submitted: "#1D9E75" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 680, margin: "0 auto", background: "#fff", minHeight: "100vh" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 17, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>{session.user.email}</span>
          <button onClick={handleLogout} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer" }}>Log out</button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 1.25rem" }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Your assigned audits</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>You only have access to the audits assigned to you below.</div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>Loading...</div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>
            <i className="ti ti-clipboard-list" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
            No audits have been assigned to you yet.
          </div>
        ) : (
          assignments.map(({ audit_id, audits: audit }) => audit && (
            <div
              key={audit_id}
              onClick={() => onOpenAudit(audit)}
              style={{ border: "1px solid #e0e0e0", borderRadius: 10, padding: "0.875rem 1rem", marginBottom: 10, cursor: "pointer", background: "#fafafa" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {audit.audit_templates?.name || "Audit"}
                    {audit.locations?.name && <span style={{ color: "#aaa", fontWeight: 400 }}> – {audit.locations.name}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                    <i className="ti ti-calendar" style={{ fontSize: 12 }} /> {new Date(audit.audit_date).toLocaleDateString("en-US")}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: statusColor[audit.status] + "22", color: statusColor[audit.status] }}>
                      {statusLabel[audit.status] || audit.status}
                    </span>
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
