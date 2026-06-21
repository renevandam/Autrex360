import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function AuditStart({ session, profile, onStart, onBack }) {
  const [locations, setLocations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: locs }, { data: tpls }] = await Promise.all([
        supabase.from("locations").select("id, name").order("name"),
        supabase.from("audit_templates").select("id, name, description, requires_location").eq("is_active", true).order("name"),
      ]);
      setLocations(locs || []);
      setTemplates(tpls || []);
      setLoading(false);
    }
    load();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const needsLocation = selectedTemplate ? selectedTemplate.requires_location !== false : true;

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    const { data: audit, error } = await supabase.from("audits").insert([{
      location_id: needsLocation ? locationId : null,
      template_id: templateId,
      organization_id: profile.organization_id,
      created_by: session.user.id,
      auditor_name: session.user.email,
      audit_date: new Date().toISOString().slice(0, 10),
      status: "draft",
    }]).select().single();
    setStarting(false);
    if (error || !audit) {
      alert("Could not create the audit: " + (error?.message || "unknown error"));
      return;
    }
    onStart({
      auditId: audit.id,
      locationId: needsLocation ? locationId : null,
      templateId,
      location: needsLocation ? locations.find((l) => l.id === locationId) : null,
      template: selectedTemplate,
    });
  }

  const s = {
    wrap: { fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 680, margin: "0 auto", background: "#fff", minHeight: "100vh" },
    header: { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" },
    page: { padding: "1.5rem 1.25rem" },
    label: { fontSize: 12, color: "#555", fontWeight: 500, marginBottom: 4, display: "block" },
    select: { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "white", marginBottom: 16, cursor: "pointer" },
    card: (selected) => ({ border: `1.5px solid ${selected ? "#1D9E75" : "#e0e0e0"}`, borderRadius: 10, padding: "12px 14px", background: selected ? "#E1F5EE" : "#fafafa", marginBottom: 8, cursor: "pointer", transition: "all 0.15s" }),
    startBtn: { width: "100%", padding: 12, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
    startBtnDisabled: { width: "100%", padding: 12, background: "#ccc", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  };

  const canStart = templateId && (!needsLocation || locationId);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#1D9E75", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-arrow-left" /> Dashboard
        </button>
        <div style={{ fontSize: 11, color: "#888" }}>{session.user.email}</div>
      </div>

      <div style={s.page}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Start new audit</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
          {needsLocation ? "Choose a template and location to start the audit." : "Choose a template to start the audit."}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>Loading...</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Template *</label>
              {templates.length === 0 ? (
                <div style={{ fontSize: 13, color: "#BA7517", background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 8, padding: "10px 12px" }}>
                  ⚠ No active templates yet. Create a template first.
                </div>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} style={s.card(templateId === tpl.id)} onClick={() => { setTemplateId(tpl.id); if (tpl.requires_location === false) setLocationId(""); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${templateId === tpl.id ? "#1D9E75" : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {templateId === tpl.id && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#1D9E75" }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: templateId === tpl.id ? "#085041" : "#333" }}>{tpl.name}</div>
                        {tpl.description && <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{tpl.description}</div>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {needsLocation && (
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Location *</label>
                {locations.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#BA7517", background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 8, padding: "10px 12px" }}>
                    ⚠ No locations yet. Add a location in the dashboard first.
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div key={loc.id} style={s.card(locationId === loc.id)} onClick={() => setLocationId(loc.id)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${locationId === loc.id ? "#1D9E75" : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {locationId === loc.id && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#1D9E75" }} />}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: locationId === loc.id ? "#085041" : "#333" }}>{loc.name}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <button
              style={canStart && !starting ? s.startBtn : s.startBtnDisabled}
              disabled={!canStart || starting}
              onClick={handleStart}
            >
              <i className="ti ti-clipboard-check" /> {starting ? "Creating audit..." : "Start audit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
