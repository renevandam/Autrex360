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
        supabase.from("audit_templates").select("id, name, description").eq("is_active", true).order("name"),
      ]);
      setLocations(locs || []);
      setTemplates(tpls || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    const { data: audit, error } = await supabase.from("audits").insert([{
      location_id: locationId,
      template_id: templateId,
      organization_id: profile.organization_id,
      auditor_name: session.user.email,
      audit_date: new Date().toISOString().slice(0, 10),
      status: "draft",
    }]).select().single();
    setStarting(false);
    if (error || !audit) {
      alert("Kon de audit niet aanmaken: " + (error?.message || "onbekende fout"));
      return;
    }
    onStart({
      auditId: audit.id,
      locationId, templateId,
      location: locations.find((l) => l.id === locationId),
      template: templates.find((t) => t.id === templateId),
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

  const canStart = locationId && templateId;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#1D9E75", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-arrow-left" /> Dashboard
        </button>
        <div style={{ fontSize: 11, color: "#888" }}>{session.user.email}</div>
      </div>

      <div style={s.page}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Nieuwe audit starten</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>Kies een locatie en template om de audit te starten.</div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>Laden...</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Locatie *</label>
              {locations.length === 0 ? (
                <div style={{ fontSize: 13, color: "#BA7517", background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 8, padding: "10px 12px" }}>
                  ⚠ Nog geen locaties. Voeg eerst een locatie toe in het dashboard.
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

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Template *</label>
              {templates.length === 0 ? (
                <div style={{ fontSize: 13, color: "#BA7517", background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 8, padding: "10px 12px" }}>
                  ⚠ Nog geen actieve templates. Maak eerst een template aan.
                </div>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} style={s.card(templateId === tpl.id)} onClick={() => setTemplateId(tpl.id)}>
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

            <button
              style={canStart && !starting ? s.startBtn : s.startBtnDisabled}
              disabled={!canStart || starting}
              onClick={handleStart}
            >
              <i className="ti ti-clipboard-check" /> {starting ? "Audit aanmaken..." : "Audit starten"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
