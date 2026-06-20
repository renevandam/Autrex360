import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";

const s = {
  wrap: { fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 600, margin: "0 auto", padding: "0 0 3rem 0", background: "#f7f8fa", minHeight: "100vh" },
  header: { background: "#09325A", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 },
  logo: { color: "white", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 8 },
  card: { background: "white", borderRadius: 12, padding: "20px 20px", margin: "16px 16px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  label: { fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  input: { width: "100%", border: "1px solid #e0e0e0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" },
  btn: (primary) => ({ padding: "10px 18px", background: primary ? "#1D9E75" : "white", color: primary ? "white" : "#555", border: primary ? "none" : "1px solid #ddd", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }),
  secTitle: { fontSize: 13, fontWeight: 700, color: "#09325A", padding: "14px 16px 6px", display: "flex", alignItems: "center", gap: 6 },
};

// ── AnswerInput (simplified, no save-on-change — saves on submit) ──
// ── Info icon with click-to-show popover (not included in reports/PDF) ──
function InfoIcon({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 5 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid #aaa", background: open ? "#378ADD" : "none", color: open ? "white" : "#aaa", fontSize: 10, fontWeight: 600, lineHeight: 1, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}
      >
        i
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{ position: "absolute", top: 20, left: 0, zIndex: 999, background: "#333", color: "white", fontSize: 12, lineHeight: 1.4, padding: "8px 10px", borderRadius: 8, minWidth: 200, maxWidth: 260, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            {text}
          </div>
        </>
      )}
    </span>
  );
}

function AnswerInput({ item, options, value, onChange }) {
  const type = item.answer_type;
  if (type === "score") {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
        {options.map((opt) => (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", border: value === opt.id ? `2px solid ${opt.color || "#1D9E75"}` : "1.5px solid #ddd", background: value === opt.id ? (opt.color || "#1D9E75") + "22" : "white", color: value === opt.id ? (opt.color || "#1D9E75") : "#555" }}>
            {opt.label}
          </button>
        ))}
      </div>
    );
  }
  if (type === "checkbox") {
    return (
      <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={value === "true"} onChange={(e) => onChange(String(e.target.checked))} style={{ width: 16, height: 16, accentColor: "#1D9E75" }} />
        <span style={{ fontSize: 13, color: "#555" }}>Ja</span>
      </div>
    );
  }
  if (type === "number") {
    return <input type="number" value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ ...s.input, marginTop: 7, width: 140 }} />;
  }
  if (type === "text") {
    return <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...s.input, marginTop: 7, resize: "vertical" }} />;
  }
  if (type === "slider") {
    return (
      <div style={{ marginTop: 10 }}>
        <input type="range" min={0} max={100} value={value || 0} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", accentColor: "#1D9E75" }} />
        <div style={{ textAlign: "center", fontSize: 13, color: "#555", marginTop: 4 }}>{value || 0}%</div>
      </div>
    );
  }
  return null;
}

// ── Stock take table (read existing rows + fill in col3) ──
function PublicStockTake({ item, auditId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef({});
  const maxRows = item.stock_max_rows || 5;

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("stock_checks").select("*").eq("audit_id", auditId).eq("item_id", item.id).order("row_order");
      let loaded = (data || []).sort((a, b) => a.row_order - b.row_order);
      while (loaded.length < maxRows) loaded = [...loaded, { id: null, row_order: loaded.length, col1_value: "", col2_value: "", col3_value: "" }];
      setRows(loaded.slice(0, maxRows));
      setLoading(false);
    }
    load();
  }, [auditId, item.id, maxRows]);

  function updateCell(rowIdx, field, value) {
    setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r));
    clearTimeout(saveTimers.current[rowIdx]);
    saveTimers.current[rowIdx] = setTimeout(async () => {
      setRows((currentRows) => {
        const row = currentRows[rowIdx];
        const payload = { audit_id: auditId, item_id: item.id, row_order: rowIdx, col1_value: row.col1_value || null, col2_value: row.col2_value || null, col3_value: row.col3_value || null };
        supabase.from("stock_checks").upsert({ ...payload, [field]: value }, { onConflict: "audit_id,item_id,row_order" });
        return currentRows;
      });
    }, 600);
  }

  if (loading) return <div style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>Laden...</div>;

  const col1 = item.stock_col1_label || "Kolom 1";
  const col2 = item.stock_col2_label || "Kolom 2";
  const col3 = item.stock_col3_label || "Aantal";

  return (
    <div style={{ marginTop: 8, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{[col1, col2, col3].map((h) => <th key={h} style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textAlign: "left", padding: "5px 6px", borderBottom: "0.5px solid #eee" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td style={{ padding: "3px 4px" }}><input value={row.col1_value || ""} onChange={(e) => updateCell(idx, "col1_value", e.target.value)} style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 5, padding: "5px 7px", fontSize: 12 }} /></td>
              <td style={{ padding: "3px 4px" }}><input value={row.col2_value || ""} onChange={(e) => updateCell(idx, "col2_value", e.target.value)} style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 5, padding: "5px 7px", fontSize: 12 }} /></td>
              <td style={{ padding: "3px 4px", width: 90 }}><input type="number" value={row.col3_value || ""} onChange={(e) => updateCell(idx, "col3_value", e.target.value)} style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 5, padding: "5px 7px", fontSize: 12, textAlign: "center" }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PublicAudit({ token }) {
  const [phase, setPhase] = useState("loading"); // loading | verify | audit | submitted | closed | error
  const [link, setLink] = useState(null);
  const [audit, setAudit] = useState(null);
  const [sections, setSections] = useState([]);
  const [itemOptions, setItemOptions] = useState({});
  const [responses, setResponses] = useState({});
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimers = useRef({});
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const autoCollapsedOnce = useRef({});
  const sectionRefs = useRef({});

  useEffect(() => {
    async function load() {
      // Look up the link by token
      const { data: linkData } = await supabase.from("audit_links").select("*").eq("token", token).single();
      if (!linkData) { setPhase("error"); return; }
      if (linkData.status === "closed") { setPhase("closed"); return; }
      setLink(linkData);

      // Load audit + template data
      const { data: auditData } = await supabase.from("audits").select("*, locations(*), audit_templates(id,name)").eq("id", linkData.audit_id).single();
      if (!auditData) { setPhase("error"); return; }
      setAudit(auditData);

      const { data: secs } = await supabase.from("template_sections").select("*").eq("template_id", auditData.template_id).order("sort_order");
      if (!secs || secs.length === 0) { setSections([]); setPhase("verify"); return; }
      const { data: items } = await supabase.from("template_items").select("*, answer_sets(id,name)").in("section_id", secs.map((s) => s.id)).order("sort_order");
      const setIds = [...new Set((items || []).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];
      let optionsMap = {};
      if (setIds.length > 0) {
        const { data: opts } = await supabase.from("answer_options").select("*").in("set_id", setIds).order("sort_order");
        (opts || []).forEach((o) => { optionsMap[o.set_id] = optionsMap[o.set_id] || []; optionsMap[o.set_id].push(o); });
      }
      const grouped = {};
      (items || []).forEach((it) => { grouped[it.section_id] = grouped[it.section_id] || []; grouped[it.section_id].push(it); });
      const itemOpts = {};
      (items || []).forEach((it) => { itemOpts[it.id] = it.answer_set_id ? (optionsMap[it.answer_set_id] || []) : []; });
      setSections(secs.map((s) => ({ ...s, items: grouped[s.id] || [] })));
      setItemOptions(itemOpts);

      // Load any previously saved responses
      const { data: saved } = await supabase.from("audit_responses").select("item_id, response").eq("audit_id", linkData.audit_id);
      if (saved && saved.length > 0) {
        const restored = {};
        saved.forEach((r) => { restored[r.item_id] = r.response; });
        setResponses(restored);
      }

      setPhase("verify");
    }
    load();
  }, [token]);

  function verifyEmail() {
    if (!email.trim()) { setEmailError("Vul je e-mailadres in."); return; }
    if (email.trim().toLowerCase() !== link.allowed_email.toLowerCase()) {
      setEmailError("Dit e-mailadres komt niet overeen met de uitnodiging.");
      return;
    }
    setEmailError(null);
    setPhase("audit");
  }

  function setResponse(id, val) {
    setResponses((p) => ({ ...p, [id]: val }));
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      await supabase.from("audit_responses").upsert(
        { audit_id: link.audit_id, item_id: id, response: typeof val === "boolean" ? String(val) : String(val ?? "") },
        { onConflict: "audit_id,item_id" }
      );
    }, 500);
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!confirm("Audit indienen? Dit kan niet ongedaan worden gemaakt.")) return;
    setSubmitting(true);
    await supabase.from("audits").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", link.audit_id);
    await supabase.from("audit_links").update({ status: "closed" }).eq("id", link.id);
    setSubmitting(false);
    setPhase("submitted");
  }

  function isVisible(item) {
    if (!item.depends_on_item_id) return true;
    return responses[item.depends_on_item_id] === item.depends_on_value;
  }

  // Per-section progress for the sticky nav bar
  function sectionProgress(section) {
    const visibleItems = section.items.filter(isVisible).filter((i) => i.answer_type !== "signature" && i.answer_type !== "stock_take");
    if (visibleItems.length === 0) return { answered: 0, total: 0, complete: true };
    const ans = visibleItems.filter((i) => responses[i.id] !== undefined && responses[i.id] !== null && responses[i.id] !== "");
    return { answered: ans.length, total: visibleItems.length, complete: ans.length === visibleItems.length };
  }

  function scrollToSection(sectionId) {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const yOffset = -56; // account for sticky nav bar height
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setActiveSectionId(sectionId);
  }

  function toggleSection(sectionId) {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  // Auto-collapse a section the first time it becomes fully answered
  useEffect(() => {
    sections.forEach((sec) => {
      const prog = sectionProgress(sec);
      if (prog.total > 0 && prog.complete && !autoCollapsedOnce.current[sec.id]) {
        autoCollapsedOnce.current[sec.id] = true;
        setCollapsedSections((prev) => ({ ...prev, [sec.id]: true }));
      }
    });
  }, [responses, sections]);

  useEffect(() => {
    function onScroll() {
      const sectionEntries = Object.entries(sectionRefs.current);
      let current = null;
      for (const [id, el] of sectionEntries) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 110) current = id;
      }
      if (current) setActiveSectionId(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  // ── Render phases ──
  if (phase === "loading") return (
    <div style={{ textAlign: "center", padding: "4rem", color: "#aaa", fontFamily: "system-ui,sans-serif" }}>
      <i className="ti ti-loader-2" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Audit laden...
    </div>
  );

  if (phase === "error") return (
    <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui,sans-serif" }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 40, color: "#E24B4A", display: "block", marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 600 }}>Link niet gevonden</div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>Deze auditlink bestaat niet of is verlopen.</div>
    </div>
  );

  if (phase === "closed") return (
    <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui,sans-serif" }}>
      <i className="ti ti-lock" style={{ fontSize: 40, color: "#EF9F27", display: "block", marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 600 }}>Audit gesloten</div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>Deze audit is al ingediend en kan niet meer worden geopend.</div>
    </div>
  );

  if (phase === "submitted") return (
    <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui,sans-serif" }}>
      <i className="ti ti-circle-check" style={{ fontSize: 48, color: "#1D9E75", display: "block", marginBottom: 12 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: "#09325A" }}>Audit ingediend!</div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>Bedankt voor het invullen. Je kunt dit venster sluiten.</div>
    </div>
  );

  if (phase === "verify") return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.logo}><i className="ti ti-clipboard-check" /> Autrex360</div>
      </div>
      <div style={s.card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#09325A", marginBottom: 4 }}>{audit?.locations?.name || "Audit"}</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{audit?.audit_templates?.name}</div>
        <div style={s.label}>Bevestig je e-mailadres om te beginnen</div>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifyEmail()}
          style={s.input} placeholder="jouw@emailadres.nl" autoFocus
        />
        {emailError && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 6 }}>{emailError}</div>}
        <button style={{ ...s.btn(true), marginTop: 14, width: "100%", justifyContent: "center" }} onClick={verifyEmail}>
          <i className="ti ti-arrow-right" /> Doorgaan
        </button>
      </div>
    </div>
  );

  if (phase === "audit") return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.logo}><i className="ti ti-clipboard-check" /> Autrex360</div>
      </div>

      {/* Location info */}
      <div style={s.card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#09325A" }}>{audit?.locations?.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
          {audit?.locations?.street && `${audit.locations.street}, `}
          {audit?.locations?.postal_code} {audit?.locations?.city}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{audit?.audit_templates?.name}</div>
      </div>

      {/* Sticky section navigation */}
      {sections.filter((sec) => sec.items.filter(isVisible).length > 0).length > 1 && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#f7f8fa", borderBottom: "1px solid #e8e8e8", display: "flex", gap: 6, padding: "8px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {sections.filter((sec) => sec.items.filter(isVisible).length > 0).map((sec) => {
            const prog = sectionProgress(sec);
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 11px", borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                  border: isActive ? "1.5px solid #1D9E75" : "1px solid #ddd",
                  background: isActive ? "#E1F5EE" : "white",
                  color: isActive ? "#085041" : "#555",
                  cursor: "pointer",
                }}
              >
                {prog.complete
                  ? <i className="ti ti-circle-check" style={{ color: "#1D9E75", fontSize: 13 }} />
                  : <span style={{ fontSize: 10, color: "#aaa" }}>{prog.answered}/{prog.total}</span>
                }
                {sec.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const visibleItems = section.items.filter(isVisible);
        if (visibleItems.length === 0) return null;
        const prog = sectionProgress(section);
        const collapsed = !!collapsedSections[section.id];
        return (
          <div key={section.id} ref={(el) => { sectionRefs.current[section.id] = el; }}>
            <div style={{ ...s.secTitle, cursor: "pointer", justifyContent: "space-between" }} onClick={() => toggleSection(section.id)}>
              <span><i className="ti ti-list" /> {section.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {prog.complete
                  ? <i className="ti ti-circle-check" style={{ color: "#1D9E75", fontSize: 14 }} />
                  : <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>{prog.answered}/{prog.total}</span>
                }
                <i className={`ti ${collapsed ? "ti-chevron-down" : "ti-chevron-up"}`} style={{ fontSize: 15, color: "#aaa" }} />
              </span>
            </div>
            {!collapsed && (
            <div style={s.card}>
              {visibleItems.map((item, idx) => (
                <div key={item.id} style={{ padding: "10px 0", borderBottom: idx === visibleItems.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                  {item.answer_type !== "signature" && (
                    <>
                      <div style={{ fontSize: 13, marginBottom: 2 }}>{item.label}<InfoIcon text={item.info_text} /></div>
                      {item.sub_label && <div style={{ fontSize: 11, color: "#aaa" }}>{item.sub_label}</div>}
                    </>
                  )}
                  {item.answer_type === "stock_take" ? (
                    <PublicStockTake item={item} auditId={link.audit_id} />
                  ) : (
                    <AnswerInput item={item} options={itemOptions[item.id] || []} value={responses[item.id]} onChange={(val) => setResponse(item.id, val)} />
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        );
      })}

      {/* Submit */}
      <div style={{ padding: "16px 16px 0" }}>
        <button disabled={submitting} onClick={handleSubmit} style={{ ...s.btn(true), width: "100%", justifyContent: "center", padding: 12, fontSize: 14 }}>
          <i className="ti ti-send" /> {submitting ? "Indienen..." : "Audit indienen"}
        </button>
        <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 8 }}>
          Na indiening kan de audit niet meer worden gewijzigd.
        </div>
      </div>
    </div>
  );

  return null;
}
