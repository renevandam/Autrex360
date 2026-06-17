import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

const NAV = [
  { id: "home",       label: "Dashboard",   icon: "ti-home" },
  { id: "locations",  label: "Locaties",    icon: "ti-building-warehouse" },
  { id: "answersets", label: "Antwoordsets", icon: "ti-list-check" },
  { id: "templates",  label: "Templates",   icon: "ti-file-description" },
  { id: "audits",     label: "Audits",      icon: "ti-clipboard-check" },
];

const ANSWER_TYPES = [
  { value: "score",     label: "Antwoordset" },
  { value: "checkbox",  label: "Checkbox" },
  { value: "yes_no",    label: "Ja / Nee" },
  { value: "yes_no_na", label: "Ja / Nee / N/A" },
  { value: "number",    label: "Getal" },
  { value: "text",      label: "Tekst" },
  { value: "slider",    label: "Slider (0-100%)" },
  { value: "signature", label: "Handtekening" },
];

const OPTION_COLORS = ["#E24B4A","#E07B3A","#EF9F27","#639922","#1D9E75","#378ADD","#888"];

const s = {
  wrap:    { fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 680, margin: "0 auto", background: "#fff", minHeight: "100vh" },
  header:  { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo:    { fontSize: 17, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 },
  nav:     { display: "flex", borderBottom: "0.5px solid #eee", background: "#fafafa", overflowX: "auto" },
  navBtn:  (active) => ({ flexShrink: 0, padding: "10px 8px", fontSize: 11, fontWeight: 500, cursor: "pointer", background: "none", border: "none", borderBottom: active ? "2px solid #1D9E75" : "2px solid transparent", color: active ? "#1D9E75" : "#888", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }),
  page:    { padding: "1.25rem" },
  card:    { border: "1px solid #e0e0e0", borderRadius: 10, padding: "1rem", background: "#fafafa", marginBottom: 10 },
  row:     { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  badge:   (c) => ({ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: c + "22", color: c, fontWeight: 500 }),
  btn:     (primary) => ({ padding: primary ? "8px 14px" : "6px 12px", background: primary ? "#1D9E75" : "white", color: primary ? "white" : "#555", border: primary ? "none" : "1px solid #ddd", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }),
  btnSm:   { padding: "4px 9px", background: "white", color: "#555", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
  btnDanger: { padding: "4px 9px", background: "white", color: "#A32D2D", border: "1px solid #E24B4A", borderRadius: 6, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
  input:   { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", background: "white", marginTop: 4 },
  select:  { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", background: "white", marginTop: 4 },
  label:   { fontSize: 12, color: "#555", fontWeight: 500 },
  sTitle:  { fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" },
  empty:   { textAlign: "center", padding: "2rem", color: "#aaa", fontSize: 13 },
  backBtn: { fontSize: 13, color: "#1D9E75", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12 },
};

// ── Home ─────────────────────────────────────────────────
function Home({ onNav, locCount, tplCount, auditCount, onNewAudit }) {
  return (
    <div style={s.page}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Welkom terug 👋</div>
        <div style={{ fontSize: 13, color: "#888" }}>Hier is een overzicht van je Autrex360 omgeving.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "1.5rem" }}>
        {[
          { label: "Locaties", count: locCount, icon: "ti-building-warehouse", color: "#378ADD", nav: "locations" },
          { label: "Templates", count: tplCount, icon: "ti-file-description", color: "#EF9F27", nav: "templates" },
          { label: "Audits", count: auditCount, icon: "ti-clipboard-list", color: "#1D9E75", nav: "audits" },
        ].map((item) => (
          <div key={item.label} onClick={() => onNav(item.nav)} style={{ ...s.card, cursor: "pointer", textAlign: "center", padding: "1rem 0.5rem" }}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 22, color: item.color }} />
            <div style={{ fontSize: 22, fontWeight: 700, margin: "4px 0", color: "#333" }}>{item.count}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{item.label}</div>
          </div>
        ))}
      </div>
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Snel starten</div>
        <button style={s.btn(true)} onClick={onNewAudit}><i className="ti ti-plus" /> Nieuwe audit starten</button>
      </div>
    </div>
  );
}

// ── Locations ────────────────────────────────────────────
function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", street: "", postal_code: "", city: "", country: "NL", location_detail: "", contact_name: "", contact_email: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("locations").select("*").order("name");
    setLocations(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await supabase.from("locations").insert([form]);
    setForm({ name: "", street: "", postal_code: "", city: "", country: "NL", location_detail: "", contact_name: "", contact_email: "" });
    setShowForm(false);
    await load();
    setSaving(false);
  }
  async function remove(id) {
    if (!confirm("Locatie verwijderen?")) return;
    await supabase.from("locations").delete().eq("id", id);
    await load();
  }

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Locaties ({locations.length})</span>
        <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
          <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
        </button>
      </div>
      {showForm && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#1D9E75" }}>Nieuwe locatie</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Bedrijfsnaam *","name"],["Straat & huisnummer","street"],["Postcode","postal_code"],["Stad","city"],["Locatiedetail","location_detail"],["Contactpersoon","contact_name"],["E-mail contactpersoon","contact_email"]].map(([lbl, key]) => (
              <div key={key} style={key === "name" || key === "contact_email" ? { gridColumn: "1 / -1" } : {}}>
                <div style={s.label}>{lbl}</div>
                <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={s.input} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!form.name || saving}><i className="ti ti-check" /> {saving ? "Opslaan..." : "Opslaan"}</button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Annuleren</button>
          </div>
        </div>
      )}
      {loading ? <div style={s.empty}>Laden...</div>
        : locations.length === 0 ? <div style={s.empty}><i className="ti ti-building-warehouse" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Nog geen locaties.</div>
        : locations.map((loc) => (
          <div key={loc.id} style={s.card}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{loc.street}, {loc.postal_code} {loc.city} {loc.location_detail && `· ${loc.location_detail}`}</div>
                {loc.contact_name && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}><i className="ti ti-user" style={{ fontSize: 12 }} /> {loc.contact_name} {loc.contact_email && `· ${loc.contact_email}`}</div>}
              </div>
              <button onClick={() => remove(loc.id)} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Answer Set Detail ─────────────────────────────────────
function AnswerSetDetail({ set, onBack }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: "", value: "", score: "", color: OPTION_COLORS[0] });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("answer_options").select("*").eq("set_id", set.id).order("sort_order");
    setOptions(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [set.id]);

  async function addOption() {
    if (!form.label.trim()) return;
    await supabase.from("answer_options").insert([{ set_id: set.id, label: form.label, value: form.value || form.label.toLowerCase().replace(/\s+/g, "_"), score: form.score !== "" ? parseInt(form.score) : null, color: form.color, sort_order: options.length }]);
    setForm({ label: "", value: "", score: "", color: OPTION_COLORS[options.length % OPTION_COLORS.length] });
    setAdding(false);
    await load();
  }

  async function removeOption(id) {
    await supabase.from("answer_options").delete().eq("id", id);
    await load();
  }

  function startEdit(opt) {
    setEditingId(opt.id);
    setEditForm({ label: opt.label, score: opt.score !== null ? String(opt.score) : "", color: opt.color || OPTION_COLORS[0] });
  }
  function cancelEdit() { setEditingId(null); setEditForm({}); }
  async function saveEdit() {
    if (!editForm.label?.trim()) return;
    await supabase.from("answer_options").update({
      label: editForm.label,
      score: editForm.score !== "" ? parseInt(editForm.score) : null,
      color: editForm.color,
    }).eq("id", editingId);
    setEditingId(null); setEditForm({});
    await load();
  }

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={onBack}><i className="ti ti-arrow-left" /> Alle antwoordsets</button>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{set.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Beheer de opties in deze antwoordset</div>
      </div>

      {loading ? <div style={s.empty}>Laden...</div> : (
        <div style={s.card}>
          {options.length === 0 && <div style={{ fontSize: 12, color: "#bbb", padding: "6px 0 10px" }}>Nog geen opties. Voeg de eerste toe!</div>}
          {options.map((opt, idx) => (
            editingId === opt.id ? (
              <div key={opt.id} style={{ marginTop: idx === 0 ? 0 : 8, marginBottom: 8, background: "white", border: "1px solid #1D9E75", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={s.label}>Label *</div>
                    <input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} style={s.input} autoFocus />
                  </div>
                  <div>
                    <div style={s.label}>Score (optioneel)</div>
                    <input type="number" value={editForm.score} onChange={(e) => setEditForm((f) => ({ ...f, score: e.target.value }))} style={s.input} placeholder="bijv. 3" />
                  </div>
                  <div>
                    <div style={s.label}>Kleur</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {OPTION_COLORS.map((c) => (
                        <div key={c} onClick={() => setEditForm((f) => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: editForm.color === c ? "2.5px solid #333" : "2px solid transparent" }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button style={s.btn(true)} onClick={saveEdit}><i className="ti ti-check" /> Opslaan</button>
                  <button style={s.btn(false)} onClick={cancelEdit}>Annuleren</button>
                </div>
              </div>
            ) : (
              <div key={opt.id} style={{ padding: "8px 0", borderBottom: idx < options.length - 1 ? "0.5px solid #eee" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: opt.color || "#ccc", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</span>
                  {opt.score !== null && <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{opt.score} pt</span>}
                </div>
                <button onClick={() => startEdit(opt)} style={{ fontSize: 11, color: "#888", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-pencil" /></button>
                <button onClick={() => removeOption(opt.id)} style={{ fontSize: 11, color: "#ccc", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-x" /></button>
              </div>
            )
          ))}

          {adding ? (
            <div style={{ marginTop: 12, background: "white", border: "0.5px solid #ddd", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={s.label}>Label *</div>
                  <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} style={s.input} placeholder="bijv. Satisfactory" autoFocus />
                </div>
                <div>
                  <div style={s.label}>Score (optioneel)</div>
                  <input type="number" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} style={s.input} placeholder="bijv. 3" />
                </div>
                <div>
                  <div style={s.label}>Kleur</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {OPTION_COLORS.map((c) => (
                      <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2.5px solid #333" : "2px solid transparent" }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button style={s.btn(true)} onClick={addOption}><i className="ti ti-check" /> Toevoegen</button>
                <button style={s.btn(false)} onClick={() => setAdding(false)}>Annuleren</button>
              </div>
            </div>
          ) : (
            <button style={{ ...s.btnSm, marginTop: options.length > 0 ? 10 : 0 }} onClick={() => setAdding(true)}><i className="ti ti-plus" /> Optie toevoegen</button>
          )}
        </div>
      )}

      {options.length > 0 && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#f9f9f9", border: "0.5px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Voorbeeld</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {options.map((opt) => (
              <span key={opt.id} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${opt.color || "#ccc"}`, background: (opt.color || "#ccc") + "22", color: opt.color || "#555", fontWeight: 500 }}>
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Answer Sets list ──────────────────────────────────────
function AnswerSets() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("answer_sets").select("*, answer_options(count)").order("name");
    setSets(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("answer_sets").insert([{ name }]).select().single();
    setName(""); setShowForm(false);
    await load();
    setSaving(false);
    if (data) setSelected(data);
  }

  async function remove(id) {
    if (!confirm("Antwoordset verwijderen?")) return;
    await supabase.from("answer_sets").delete().eq("id", id);
    await load();
  }

  if (selected) return <AnswerSetDetail set={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Antwoordsets ({sets.length})</span>
        <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
          <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#1D9E75" }}>Nieuwe antwoordset</div>
          <div style={s.label}>Naam *</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={s.input} placeholder="bijv. Compliance Score, Frequentie, Conditie" autoFocus />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!name.trim() || saving}><i className="ti ti-check" /> {saving ? "Opslaan..." : "Aanmaken"}</button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Annuleren</button>
          </div>
        </div>
      )}

      {loading ? <div style={s.empty}>Laden...</div>
        : sets.length === 0 ? (
          <div style={s.empty}>
            <i className="ti ti-list-check" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
            Nog geen antwoordsets. Maak er een aan!<br />
            <span style={{ fontSize: 11, marginTop: 4, display: "block" }}>Antwoordsets zijn herbruikbare knoppen voor je vragen.</span>
          </div>
        ) : sets.map((set) => (
          <div key={set.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => setSelected(set)}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{set.name}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                  {set.answer_options?.[0]?.count || 0} opties
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={(e) => { e.stopPropagation(); remove(set.id); }} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>
                <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Template Detail ───────────────────────────────────────
function TemplateDetail({ template, onBack }) {
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState({});
  const [answerSets, setAnswerSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [newItemForms, setNewItemForms] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({});

  async function load() {
    setLoading(true);
    const [{ data: secData }, { data: setsData }] = await Promise.all([
      supabase.from("template_sections").select("*").eq("template_id", template.id).order("sort_order"),
      supabase.from("answer_sets").select("*").order("name"),
    ]);
    setSections(secData || []);
    setAnswerSets(setsData || []);
    if (secData && secData.length > 0) {
      const { data: itemData } = await supabase.from("template_items").select("*, answer_sets(name)").in("section_id", secData.map((s) => s.id)).order("sort_order");
      const grouped = {};
      (itemData || []).forEach((it) => { grouped[it.section_id] = grouped[it.section_id] || []; grouped[it.section_id].push(it); });
      setItems(grouped);
    } else { setItems({}); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [template.id]);

  async function addSection() {
    if (!newSectionName.trim()) return;
    await supabase.from("template_sections").insert([{ template_id: template.id, name: newSectionName, sort_order: sections.length }]);
    setNewSectionName(""); setAddingSection(false); await load();
  }
  async function removeSection(id) {
    if (!confirm("Sectie en alle vragen verwijderen?")) return;
    await supabase.from("template_sections").delete().eq("id", id); await load();
  }

  function toggleItemForm(sectionId) {
    setNewItemForms((f) => ({ ...f, [sectionId]: { label: "", sub_label: "", answer_type: "score", answer_set_id: "", ...(f[sectionId] || {}), open: !f[sectionId]?.open } }));
  }
  function updateItemForm(sectionId, field, value) {
    setNewItemForms((f) => ({ ...f, [sectionId]: { ...(f[sectionId] || { label: "", sub_label: "", answer_type: "score", answer_set_id: "" }), [field]: value, open: true } }));
  }

  async function addItem(sectionId) {
    const form = newItemForms[sectionId];
    if (!form?.label?.trim()) return;
    await supabase.from("template_items").insert([{
      section_id: sectionId,
      label: form.label,
      sub_label: form.sub_label || null,
      answer_type: form.answer_type || "score",
      answer_set_id: form.answer_type === "score" && form.answer_set_id ? form.answer_set_id : null,
      sort_order: (items[sectionId] || []).length,
    }]);
    setNewItemForms((f) => ({ ...f, [sectionId]: { label: "", sub_label: "", answer_type: "score", answer_set_id: "", open: false } }));
    await load();
  }
  async function removeItem(id) {
    if (!confirm("Vraag verwijderen?")) return;
    await supabase.from("template_items").delete().eq("id", id); await load();
  }

  function startEdit(item) {
    setEditingItemId(item.id);
    setEditForm({ label: item.label, sub_label: item.sub_label || "", answer_type: item.answer_type || "score", answer_set_id: item.answer_set_id || "" });
  }
  function cancelEdit() { setEditingItemId(null); setEditForm({}); }
  async function saveEdit() {
    if (!editForm.label?.trim()) return;
    await supabase.from("template_items").update({
      label: editForm.label,
      sub_label: editForm.sub_label || null,
      answer_type: editForm.answer_type || "score",
      answer_set_id: editForm.answer_type === "score" && editForm.answer_set_id ? editForm.answer_set_id : null,
    }).eq("id", editingItemId);
    setEditingItemId(null); setEditForm({});
    await load();
  }

  function answerTypeLabel(type, setName) {
    const found = ANSWER_TYPES.find((t) => t.value === type);
    if (type === "score" && setName) return setName;
    return found?.label || type;
  }

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={onBack}><i className="ti ti-arrow-left" /> Alle templates</button>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{template.name}</div>
        {template.description && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{template.description}</div>}
      </div>

      {loading ? <div style={s.empty}>Laden...</div> : (
        <>
          {sections.map((section) => (
            <div key={section.id} style={{ ...s.card, marginBottom: 14 }}>
              <div style={s.row}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{section.name}</div>
                <button onClick={() => removeSection(section.id)} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>
              </div>
              <div style={{ marginTop: 10 }}>
                {(items[section.id] || []).map((item, idx) => (
                  editingItemId === item.id ? (
                    <div key={item.id} style={{ marginTop: idx === 0 ? 0 : 8, background: "white", border: "1px solid #1D9E75", borderRadius: 8, padding: 10 }}>
                      <div style={s.label}>Vraag *</div>
                      <input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} style={s.input} autoFocus />
                      <div style={{ ...s.label, marginTop: 8 }}>Toelichting (optioneel)</div>
                      <input value={editForm.sub_label} onChange={(e) => setEditForm((f) => ({ ...f, sub_label: e.target.value }))} style={s.input} />
                      <div style={{ ...s.label, marginTop: 8 }}>Antwoordtype</div>
                      <select value={editForm.answer_type} onChange={(e) => setEditForm((f) => ({ ...f, answer_type: e.target.value }))} style={s.select}>
                        {ANSWER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {editForm.answer_type === "score" && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>Antwoordset</div>
                          <select value={editForm.answer_set_id} onChange={(e) => setEditForm((f) => ({ ...f, answer_set_id: e.target.value }))} style={s.select}>
                            <option value="">— Kies een antwoordset —</option>
                            {answerSets.map((as) => <option key={as.id} value={as.id}>{as.name}</option>)}
                          </select>
                        </>
                      )}
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button style={s.btn(true)} onClick={saveEdit}><i className="ti ti-check" /> Opslaan</button>
                        <button style={s.btn(false)} onClick={cancelEdit}>Annuleren</button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} style={{ padding: "8px 0", borderTop: idx === 0 ? "none" : "0.5px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{item.label}</div>
                        {item.sub_label && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{item.sub_label}</div>}
                        <span style={{ fontSize: 11, marginTop: 4, display: "inline-block", padding: "2px 7px", borderRadius: 10, background: "#f0f0f0", color: "#888" }}>
                          {answerTypeLabel(item.answer_type, item.answer_sets?.name)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => startEdit(item)} style={{ fontSize: 11, color: "#888", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-pencil" /></button>
                        <button onClick={() => removeItem(item.id)} style={{ fontSize: 11, color: "#ccc", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-x" /></button>
                      </div>
                    </div>
                  )
                ))}
                {(items[section.id] || []).length === 0 && <div style={{ fontSize: 12, color: "#bbb", padding: "6px 0" }}>Nog geen vragen.</div>}
              </div>

              {newItemForms[section.id]?.open ? (
                <div style={{ marginTop: 10, background: "white", border: "0.5px solid #ddd", borderRadius: 8, padding: 10 }}>
                  <div style={s.label}>Vraag *</div>
                  <input value={newItemForms[section.id]?.label || ""} onChange={(e) => updateItemForm(section.id, "label", e.target.value)} style={s.input} placeholder="bijv. Stellingen vrij van schade" />
                  <div style={{ ...s.label, marginTop: 8 }}>Toelichting (optioneel)</div>
                  <input value={newItemForms[section.id]?.sub_label || ""} onChange={(e) => updateItemForm(section.id, "sub_label", e.target.value)} style={s.input} placeholder="bijv. Geen verbogen staanders" />
                  <div style={{ ...s.label, marginTop: 8 }}>Antwoordtype</div>
                  <select value={newItemForms[section.id]?.answer_type || "score"} onChange={(e) => updateItemForm(section.id, "answer_type", e.target.value)} style={s.select}>
                    {ANSWER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {(newItemForms[section.id]?.answer_type === "score" || !newItemForms[section.id]?.answer_type) && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>Antwoordset</div>
                      <select value={newItemForms[section.id]?.answer_set_id || ""} onChange={(e) => updateItemForm(section.id, "answer_set_id", e.target.value)} style={s.select}>
                        <option value="">— Kies een antwoordset —</option>
                        {answerSets.map((as) => <option key={as.id} value={as.id}>{as.name}</option>)}
                      </select>
                      {answerSets.length === 0 && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 4 }}>⚠ Nog geen antwoordsets. Maak er eerst een aan bij "Antwoordsets".</div>}
                    </>
                  )}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button style={s.btn(true)} onClick={() => addItem(section.id)}><i className="ti ti-check" /> Toevoegen</button>
                    <button style={s.btn(false)} onClick={() => toggleItemForm(section.id)}>Annuleren</button>
                  </div>
                </div>
              ) : (
                <button style={{ ...s.btnSm, marginTop: 10 }} onClick={() => toggleItemForm(section.id)}><i className="ti ti-plus" /> Vraag toevoegen</button>
              )}
            </div>
          ))}

          {sections.length === 0 && <div style={s.empty}><i className="ti ti-list" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />Nog geen secties.</div>}

          {addingSection ? (
            <div style={{ ...s.card, border: "1px solid #1D9E75" }}>
              <div style={s.label}>Sectienaam</div>
              <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} style={s.input} placeholder="bijv. Racking & Opslag" autoFocus />
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button style={s.btn(true)} onClick={addSection}><i className="ti ti-check" /> Toevoegen</button>
                <button style={s.btn(false)} onClick={() => { setAddingSection(false); setNewSectionName(""); }}>Annuleren</button>
              </div>
            </div>
          ) : (
            <button style={s.btn(true)} onClick={() => setAddingSection(true)}><i className="ti ti-plus" /> Sectie toevoegen</button>
          )}
        </>
      )}
    </div>
  );
}

// ── Templates list ─────────────────────────────────────────
function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("audit_templates").select("*").order("name");
    setTemplates(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await supabase.from("audit_templates").insert([{ ...form, is_active: true }]);
    setForm({ name: "", description: "" }); setShowForm(false);
    await load(); setSaving(false);
  }
  async function remove(id) {
    if (!confirm("Template verwijderen?")) return;
    await supabase.from("audit_templates").delete().eq("id", id); await load();
  }

  if (selected) return <TemplateDetail template={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Templates ({templates.length})</span>
        <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
          <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
        </button>
      </div>
      {showForm && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#1D9E75" }}>Nieuw template</div>
          <div style={{ marginBottom: 10 }}>
            <div style={s.label}>Naam *</div>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={s.input} placeholder="bijv. Warehouse Compliance Q3" />
          </div>
          <div>
            <div style={s.label}>Omschrijving</div>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={s.input} placeholder="Optionele toelichting" />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!form.name || saving}><i className="ti ti-check" /> {saving ? "Opslaan..." : "Opslaan"}</button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Annuleren</button>
          </div>
        </div>
      )}
      {loading ? <div style={s.empty}>Laden...</div>
        : templates.length === 0 ? <div style={s.empty}><i className="ti ti-file-description" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Nog geen templates.</div>
        : templates.map((tpl) => (
          <div key={tpl.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => setSelected(tpl)}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                {tpl.description && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{tpl.description}</div>}
                <div style={{ marginTop: 6 }}>
                  <span style={s.badge(tpl.is_active ? "#1D9E75" : "#aaa")}>{tpl.is_active ? "Actief" : "Inactief"}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={(e) => { e.stopPropagation(); remove(tpl.id); }} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>
                <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Audits ───────────────────────────────────────────────
function Audits({ onNewAudit }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("audits").select("*, locations(name)").order("created_at", { ascending: false });
    setAudits(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const statusColor = { draft: "#EF9F27", submitted: "#1D9E75" };
  const statusLabel = { draft: "Concept", submitted: "Ingediend" };

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Audits ({audits.length})</span>
        <button style={s.btn(true)} onClick={onNewAudit}><i className="ti ti-plus" /> Nieuwe audit</button>
      </div>
      {loading ? <div style={s.empty}>Laden...</div>
        : audits.length === 0 ? <div style={s.empty}><i className="ti ti-clipboard-list" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Nog geen audits.</div>
        : audits.map((audit) => (
          <div key={audit.id} style={s.card}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{audit.locations?.name || "Onbekende locatie"}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  <i className="ti ti-calendar" style={{ fontSize: 12 }} /> {new Date(audit.audit_date).toLocaleDateString("nl-NL")}
                  {audit.auditor_name && <> · {audit.auditor_name}</>}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <span style={s.badge(statusColor[audit.status] || "#aaa")}>{statusLabel[audit.status] || audit.status}</span>
                  {audit.score_pct !== null && <span style={s.badge("#378ADD")}>{audit.score_pct}%</span>}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Dashboard main ────────────────────────────────────────
export default function Dashboard({ session, onStartAudit }) {
  const [page, setPage] = useState("home");
  const [locCount, setLocCount] = useState(0);
  const [tplCount, setTplCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);

  useEffect(() => {
    supabase.from("locations").select("id", { count: "exact", head: true }).then(({ count }) => setLocCount(count || 0));
    supabase.from("audit_templates").select("id", { count: "exact", head: true }).then(({ count }) => setTplCount(count || 0));
    supabase.from("audits").select("id", { count: "exact", head: true }).then(({ count }) => setAuditCount(count || 0));
  }, [page]);

  async function handleLogout() { await supabase.auth.signOut(); }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.logo}><i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>{session.user.email}</span>
          <button onClick={handleLogout} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer" }}>Uitloggen</button>
        </div>
      </div>
      <nav style={s.nav}>
        {NAV.map((item) => (
          <button key={item.id} style={s.navBtn(page === item.id)} onClick={() => setPage(item.id)}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} />{item.label}
          </button>
        ))}
      </nav>
      {page === "home"       && <Home onNav={setPage} locCount={locCount} tplCount={tplCount} auditCount={auditCount} onNewAudit={onStartAudit} />}
      {page === "locations"  && <Locations />}
      {page === "answersets" && <AnswerSets />}
      {page === "templates"  && <Templates />}
      {page === "audits"     && <Audits onNewAudit={onStartAudit} />}
    </div>
  );
}
