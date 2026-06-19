import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { exportAuditToPdf } from "./lib/exportPdf";

const NAV = [
  { id: "home",       label: "Dashboard",   icon: "ti-home" },
  { id: "locations",  label: "Locaties",    icon: "ti-building-warehouse" },
  { id: "answersets", label: "Antwoordsets", icon: "ti-list-check" },
  { id: "templates",  label: "Templates",   icon: "ti-file-description" },
  { id: "audits",     label: "Audits",      icon: "ti-clipboard-check" },
  { id: "users",      label: "Gebruikers",  icon: "ti-users" },
];

const ANSWER_TYPES = [
  { value: "score",      label: "Antwoordset" },
  { value: "checkbox",   label: "Checkbox" },
  { value: "number",     label: "Getal" },
  { value: "text",       label: "Tekst" },
  { value: "slider",     label: "Slider (0-100%)" },
  { value: "signature",  label: "Handtekening" },
  { value: "stock_take", label: "Stock take (tabel)" },
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
function Locations({ profile, canManage }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", street: "", postal_code: "", city: "", country: "NL", location_detail: "", contact_name: "", contact_email: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("locations").select("*").order("name");
    setLocations(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await supabase.from("locations").insert([{ ...form, organization_id: profile.organization_id }]);
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

  const visibleLocations = locations.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q);
  });

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Locaties ({visibleLocations.length})</span>
        {canManage && (
          <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
            <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
          </button>
        )}
      </div>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#aaa" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 32 }}
          placeholder="Zoek op naam of stad..."
        />
      </div>
      {showForm && canManage && (
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
        : visibleLocations.length === 0 ? <div style={s.empty}><i className="ti ti-building-warehouse" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />{search.trim() ? "Geen locaties gevonden voor deze zoekterm." : "Nog geen locaties."}</div>
        : visibleLocations.map((loc) => (
          <div key={loc.id} style={s.card}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{loc.street}, {loc.postal_code} {loc.city} {loc.location_detail && `· ${loc.location_detail}`}</div>
                {loc.contact_name && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}><i className="ti ti-user" style={{ fontSize: 12 }} /> {loc.contact_name} {loc.contact_email && `· ${loc.contact_email}`}</div>}
              </div>
              {canManage && <button onClick={() => remove(loc.id)} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>}
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Answer Set Detail ─────────────────────────────────────
function AnswerSetDetail({ set, canManage, onBack }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: "", value: "", score: "", color: OPTION_COLORS[0], is_action_item: false, is_na: false });
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
    await supabase.from("answer_options").insert([{
      set_id: set.id, label: form.label,
      value: form.value || form.label.toLowerCase().replace(/\s+/g, "_"),
      score: form.is_na ? null : (form.score !== "" ? parseInt(form.score) : null),
      color: form.color, sort_order: options.length,
      is_action_item: form.is_action_item, is_na: form.is_na,
    }]);
    setForm({ label: "", value: "", score: "", color: OPTION_COLORS[options.length % OPTION_COLORS.length], is_action_item: false, is_na: false });
    setAdding(false);
    await load();
  }

  async function removeOption(id) {
    await supabase.from("answer_options").delete().eq("id", id);
    await load();
  }

  function startEdit(opt) {
    setEditingId(opt.id);
    setEditForm({ label: opt.label, score: opt.score !== null ? String(opt.score) : "", color: opt.color || OPTION_COLORS[0], is_action_item: !!opt.is_action_item, is_na: !!opt.is_na });
  }
  function cancelEdit() { setEditingId(null); setEditForm({}); }
  async function saveEdit() {
    if (!editForm.label?.trim()) return;
    await supabase.from("answer_options").update({
      label: editForm.label,
      score: editForm.is_na ? null : (editForm.score !== "" ? parseInt(editForm.score) : null),
      color: editForm.color,
      is_action_item: editForm.is_action_item,
      is_na: editForm.is_na,
    }).eq("id", editingId);
    setEditingId(null); setEditForm({});
    await load();
  }

  function FlagCheckboxes({ data, setData }) {
    return (
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16, marginTop: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#555" }}>
          <input type="checkbox" checked={data.is_action_item} onChange={(e) => setData((f) => ({ ...f, is_action_item: e.target.checked }))} style={{ accentColor: "#E24B4A" }} />
          Actiepunt (Immediate Action)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#555" }}>
          <input type="checkbox" checked={data.is_na} onChange={(e) => setData((f) => ({ ...f, is_na: e.target.checked }))} style={{ accentColor: "#378ADD" }} />
          Telt niet mee (N/A)
        </label>
      </div>
    );
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
                    <div style={s.label}>Score {editForm.is_na && "(uitgeschakeld - N/A)"}</div>
                    <input type="number" disabled={editForm.is_na} value={editForm.score} onChange={(e) => setEditForm((f) => ({ ...f, score: e.target.value }))} style={{ ...s.input, opacity: editForm.is_na ? 0.5 : 1 }} placeholder="bijv. 3" />
                  </div>
                  <div>
                    <div style={s.label}>Kleur</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {OPTION_COLORS.map((c) => (
                        <div key={c} onClick={() => setEditForm((f) => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: editForm.color === c ? "2.5px solid #333" : "2px solid transparent" }} />
                      ))}
                    </div>
                  </div>
                  <FlagCheckboxes data={editForm} setData={setEditForm} />
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
                  {opt.is_action_item && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D", fontWeight: 500 }}>Actiepunt</span>}
                  {opt.is_na && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "#E6F1FB", color: "#0C447C", fontWeight: 500 }}>N/A</span>}
                </div>
                {canManage && <button onClick={() => startEdit(opt)} style={{ fontSize: 11, color: "#888", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-pencil" /></button>}
                {canManage && <button onClick={() => removeOption(opt.id)} style={{ fontSize: 11, color: "#ccc", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-x" /></button>}
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
                  <div style={s.label}>Score {form.is_na && "(uitgeschakeld - N/A)"}</div>
                  <input type="number" disabled={form.is_na} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} style={{ ...s.input, opacity: form.is_na ? 0.5 : 1 }} placeholder="bijv. 3" />
                </div>
                <div>
                  <div style={s.label}>Kleur</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {OPTION_COLORS.map((c) => (
                      <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2.5px solid #333" : "2px solid transparent" }} />
                    ))}
                  </div>
                </div>
                <FlagCheckboxes data={form} setData={setForm} />
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button style={s.btn(true)} onClick={addOption}><i className="ti ti-check" /> Toevoegen</button>
                <button style={s.btn(false)} onClick={() => setAdding(false)}>Annuleren</button>
              </div>
            </div>
          ) : (
            canManage && <button style={{ ...s.btnSm, marginTop: options.length > 0 ? 10 : 0 }} onClick={() => setAdding(true)}><i className="ti ti-plus" /> Optie toevoegen</button>
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
function AnswerSets({ profile, canManage }) {
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
    const { data } = await supabase.from("answer_sets").insert([{ name, organization_id: profile.organization_id }]).select().single();
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

  if (selected) return <AnswerSetDetail set={selected} canManage={canManage} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Antwoordsets ({sets.length})</span>
        {canManage && (
          <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
            <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
          </button>
        )}
      </div>

      {showForm && canManage && (
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
                {canManage && <button onClick={(e) => { e.stopPropagation(); remove(set.id); }} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>}
                <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Template Detail ───────────────────────────────────────
function TemplateDetail({ template, canManage, onBack }) {
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState({});
  const [answerSets, setAnswerSets] = useState([]);
  const [optionsBySet, setOptionsBySet] = useState({}); // setId -> [options]
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
    if (setsData && setsData.length > 0) {
      const { data: optData } = await supabase.from("answer_options").select("*").in("set_id", setsData.map((s) => s.id)).order("sort_order");
      const grouped = {};
      (optData || []).forEach((o) => { grouped[o.set_id] = grouped[o.set_id] || []; grouped[o.set_id].push(o); });
      setOptionsBySet(grouped);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [template.id]);

  // Get the options available for a given item (for "depends on this answer" pickers)
  function optionsForItem(itemId, sectionId) {
    const item = (items[sectionId] || []).find((i) => i.id === itemId);
    if (!item || !item.answer_set_id) return [];
    return optionsBySet[item.answer_set_id] || [];
  }

  async function addSection() {
    if (!newSectionName.trim()) return;
    await supabase.from("template_sections").insert([{ template_id: template.id, name: newSectionName, sort_order: sections.length }]);
    setNewSectionName(""); setAddingSection(false); await load();
  }
  async function removeSection(id) {
    if (!confirm("Sectie en alle vragen verwijderen?")) return;
    await supabase.from("template_sections").delete().eq("id", id); await load();
  }

  const defaultItemForm = { label: "", sub_label: "", answer_type: "score", answer_set_id: "", weight: "1", depends_on_item_id: "", depends_on_value: "", stock_col1_label: "Artikelnummer", stock_col2_label: "Binlocatie", stock_col3_label: "Aantal", stock_max_rows: "5" };

  function toggleItemForm(sectionId) {
    setNewItemForms((f) => ({ ...f, [sectionId]: { ...defaultItemForm, ...(f[sectionId] || {}), open: !f[sectionId]?.open } }));
  }
  function updateItemForm(sectionId, field, value) {
    setNewItemForms((f) => {
      const current = f[sectionId] || defaultItemForm;
      const updated = { ...current, [field]: value, open: true };
      if (field === "depends_on_item_id") updated.depends_on_value = ""; // reset trigger value when target question changes
      return { ...f, [sectionId]: updated };
    });
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
      weight: form.weight ? parseFloat(form.weight) : 1,
      depends_on_item_id: form.depends_on_item_id || null,
      depends_on_value: form.depends_on_item_id && form.depends_on_value ? form.depends_on_value : null,
      stock_col1_label: form.stock_col1_label || "Artikelnummer",
      stock_col2_label: form.stock_col2_label || "Binlocatie",
      stock_col3_label: form.stock_col3_label || "Aantal",
      stock_max_rows: form.stock_max_rows ? parseInt(form.stock_max_rows) : 5,
      sort_order: (items[sectionId] || []).length,
    }]);
    setNewItemForms((f) => ({ ...f, [sectionId]: { ...defaultItemForm, open: false } }));
    await load();
  }
  async function removeItem(id) {
    if (!confirm("Vraag verwijderen?")) return;
    await supabase.from("template_items").delete().eq("id", id); await load();
  }

  function startEdit(item) {
    setEditingItemId(item.id);
    setEditForm({
      label: item.label, sub_label: item.sub_label || "", answer_type: item.answer_type || "score", answer_set_id: item.answer_set_id || "",
      weight: item.weight !== null && item.weight !== undefined ? String(item.weight) : "1",
      depends_on_item_id: item.depends_on_item_id || "", depends_on_value: item.depends_on_value || "",
      stock_col1_label: item.stock_col1_label || "Artikelnummer",
      stock_col2_label: item.stock_col2_label || "Binlocatie",
      stock_col3_label: item.stock_col3_label || "Aantal",
      stock_max_rows: item.stock_max_rows !== null && item.stock_max_rows !== undefined ? String(item.stock_max_rows) : "5",
      _sectionId: item.section_id,
    });
  }
  function cancelEdit() { setEditingItemId(null); setEditForm({}); }
  async function saveEdit() {
    if (!editForm.label?.trim()) return;
    await supabase.from("template_items").update({
      label: editForm.label,
      sub_label: editForm.sub_label || null,
      answer_type: editForm.answer_type || "score",
      answer_set_id: editForm.answer_type === "score" && editForm.answer_set_id ? editForm.answer_set_id : null,
      weight: editForm.weight ? parseFloat(editForm.weight) : 1,
      depends_on_item_id: editForm.depends_on_item_id || null,
      depends_on_value: editForm.depends_on_item_id && editForm.depends_on_value ? editForm.depends_on_value : null,
      stock_col1_label: editForm.stock_col1_label || "Artikelnummer",
      stock_col2_label: editForm.stock_col2_label || "Binlocatie",
      stock_col3_label: editForm.stock_col3_label || "Aantal",
      stock_max_rows: editForm.stock_max_rows ? parseInt(editForm.stock_max_rows) : 5,
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
                {canManage && <button onClick={() => removeSection(section.id)} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>}
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
                      {editForm.answer_type === "stock_take" && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>Kolom 1 (tekst)</div>
                          <input value={editForm.stock_col1_label} onChange={(e) => setEditForm((f) => ({ ...f, stock_col1_label: e.target.value }))} style={s.input} placeholder="bijv. Artikelnummer" />
                          <div style={{ ...s.label, marginTop: 8 }}>Kolom 2 (tekst)</div>
                          <input value={editForm.stock_col2_label} onChange={(e) => setEditForm((f) => ({ ...f, stock_col2_label: e.target.value }))} style={s.input} placeholder="bijv. Binlocatie" />
                          <div style={{ ...s.label, marginTop: 8 }}>Kolom 3 (aantal)</div>
                          <input value={editForm.stock_col3_label} onChange={(e) => setEditForm((f) => ({ ...f, stock_col3_label: e.target.value }))} style={s.input} placeholder="bijv. Aantal" />
                          <div style={{ ...s.label, marginTop: 8 }}>Max. aantal rijen</div>
                          <input type="number" min="1" max="20" value={editForm.stock_max_rows} onChange={(e) => setEditForm((f) => ({ ...f, stock_max_rows: e.target.value }))} style={s.input} />
                        </>
                      )}
                      <div style={{ ...s.label, marginTop: 8 }}>Weging</div>
                      <input type="number" step="0.5" min="0.5" value={editForm.weight} onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))} style={s.input} placeholder="1 = normaal, 2 = dubbel belang" />
                      <div style={{ ...s.label, marginTop: 8 }}>Alleen tonen als... (optioneel)</div>
                      <select value={editForm.depends_on_item_id} onChange={(e) => setEditForm((f) => ({ ...f, depends_on_item_id: e.target.value, depends_on_value: "" }))} style={s.select}>
                        <option value="">— Altijd tonen —</option>
                        {(items[section.id] || []).filter((it) => it.id !== item.id).map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
                      </select>
                      {editForm.depends_on_item_id && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>...dit antwoord gegeven is</div>
                          <select value={editForm.depends_on_value} onChange={(e) => setEditForm((f) => ({ ...f, depends_on_value: e.target.value }))} style={s.select}>
                            <option value="">— Kies een antwoord —</option>
                            {optionsForItem(editForm.depends_on_item_id, section.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                          </select>
                          {optionsForItem(editForm.depends_on_item_id, section.id).length === 0 && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 4 }}>⚠ Deze vraag heeft geen antwoordset met opties.</div>}
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
                        <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, display: "inline-block", padding: "2px 7px", borderRadius: 10, background: "#f0f0f0", color: "#888" }}>
                            {answerTypeLabel(item.answer_type, item.answer_sets?.name)}
                          </span>
                          {item.weight && item.weight !== 1 && (
                            <span style={{ fontSize: 11, display: "inline-block", padding: "2px 7px", borderRadius: 10, background: "#FAEEDA", color: "#633806", fontWeight: 500 }}>
                              Weging ×{item.weight}
                            </span>
                          )}
                          {item.depends_on_item_id && (
                            <span style={{ fontSize: 11, display: "inline-block", padding: "2px 7px", borderRadius: 10, background: "#E6F1FB", color: "#0C447C", fontWeight: 500 }}>
                              <i className="ti ti-git-branch" style={{ fontSize: 10 }} /> Voorwaardelijk
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => startEdit(item)} style={{ fontSize: 11, color: "#888", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-pencil" /></button>
                          <button onClick={() => removeItem(item.id)} style={{ fontSize: 11, color: "#ccc", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-x" /></button>
                        </div>
                      )}
                    </div>
                  )
                ))}
                {(items[section.id] || []).length === 0 && <div style={{ fontSize: 12, color: "#bbb", padding: "6px 0" }}>Nog geen vragen.</div>}
              </div>

              {canManage && (newItemForms[section.id]?.open ? (
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
                  {newItemForms[section.id]?.answer_type === "stock_take" && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>Kolom 1 (tekst)</div>
                      <input value={newItemForms[section.id]?.stock_col1_label ?? "Artikelnummer"} onChange={(e) => updateItemForm(section.id, "stock_col1_label", e.target.value)} style={s.input} placeholder="bijv. Artikelnummer" />
                      <div style={{ ...s.label, marginTop: 8 }}>Kolom 2 (tekst)</div>
                      <input value={newItemForms[section.id]?.stock_col2_label ?? "Binlocatie"} onChange={(e) => updateItemForm(section.id, "stock_col2_label", e.target.value)} style={s.input} placeholder="bijv. Binlocatie" />
                      <div style={{ ...s.label, marginTop: 8 }}>Kolom 3 (aantal)</div>
                      <input value={newItemForms[section.id]?.stock_col3_label ?? "Aantal"} onChange={(e) => updateItemForm(section.id, "stock_col3_label", e.target.value)} style={s.input} placeholder="bijv. Aantal" />
                      <div style={{ ...s.label, marginTop: 8 }}>Max. aantal rijen</div>
                      <input type="number" min="1" max="20" value={newItemForms[section.id]?.stock_max_rows ?? "5"} onChange={(e) => updateItemForm(section.id, "stock_max_rows", e.target.value)} style={s.input} />
                    </>
                  )}
                  <div style={{ ...s.label, marginTop: 8 }}>Weging</div>
                  <input type="number" step="0.5" min="0.5" value={newItemForms[section.id]?.weight || "1"} onChange={(e) => updateItemForm(section.id, "weight", e.target.value)} style={s.input} placeholder="1 = normaal, 2 = dubbel belang" />
                  <div style={{ ...s.label, marginTop: 8 }}>Alleen tonen als... (optioneel)</div>
                  <select value={newItemForms[section.id]?.depends_on_item_id || ""} onChange={(e) => updateItemForm(section.id, "depends_on_item_id", e.target.value)} style={s.select}>
                    <option value="">— Altijd tonen —</option>
                    {(items[section.id] || []).map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
                  </select>
                  {newItemForms[section.id]?.depends_on_item_id && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>...dit antwoord gegeven is</div>
                      <select value={newItemForms[section.id]?.depends_on_value || ""} onChange={(e) => updateItemForm(section.id, "depends_on_value", e.target.value)} style={s.select}>
                        <option value="">— Kies een antwoord —</option>
                        {optionsForItem(newItemForms[section.id]?.depends_on_item_id, section.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      {optionsForItem(newItemForms[section.id]?.depends_on_item_id, section.id).length === 0 && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 4 }}>⚠ Deze vraag heeft geen antwoordset met opties.</div>}
                    </>
                  )}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button style={s.btn(true)} onClick={() => addItem(section.id)}><i className="ti ti-check" /> Toevoegen</button>
                    <button style={s.btn(false)} onClick={() => toggleItemForm(section.id)}>Annuleren</button>
                  </div>
                </div>
              ) : (
                <button style={{ ...s.btnSm, marginTop: 10 }} onClick={() => toggleItemForm(section.id)}><i className="ti ti-plus" /> Vraag toevoegen</button>
              ))}
            </div>
          ))}

          {sections.length === 0 && <div style={s.empty}><i className="ti ti-list" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />Nog geen secties.</div>}

          {canManage && (addingSection ? (
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
          ))}
        </>
      )}
    </div>
  );
}

// ── Templates list ─────────────────────────────────────────
function Templates({ profile, canManage }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("audit_templates").select("*").order("name");
    setTemplates(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await supabase.from("audit_templates").insert([{ ...form, is_active: true, organization_id: profile.organization_id }]);
    setForm({ name: "", description: "" }); setShowForm(false);
    await load(); setSaving(false);
  }
  async function remove(id) {
    if (!confirm("Template verwijderen?")) return;
    await supabase.from("audit_templates").delete().eq("id", id); await load();
  }

  if (selected) return <TemplateDetail template={selected} canManage={canManage} onBack={() => { setSelected(null); load(); }} />;

  const visibleTemplates = templates.filter((t) => !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Templates ({visibleTemplates.length})</span>
        {canManage && (
          <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
            <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
          </button>
        )}
      </div>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#aaa" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 32 }}
          placeholder="Zoek op templatenaam..."
        />
      </div>
      {showForm && canManage && (
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
        : visibleTemplates.length === 0 ? <div style={s.empty}><i className="ti ti-file-description" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />{search.trim() ? "Geen templates gevonden voor deze zoekterm." : "Nog geen templates."}</div>
        : visibleTemplates.map((tpl) => (
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
                {canManage && <button onClick={(e) => { e.stopPropagation(); remove(tpl.id); }} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>}
                <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Audits ───────────────────────────────────────────────
function Audits({ onNewAudit, onResumeAudit, canDelete, canArchive }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [linkModal, setLinkModal] = useState(null); // { auditId } | null
  const [linkEmail, setLinkEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [linkSaving, setLinkSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("audits").select("*, locations(id,name), audit_templates(id,name)").order("created_at", { ascending: false });
    setAudits(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generateLink() {
    if (!linkEmail.trim() || linkSaving) return;
    setLinkSaving(true);
    const { data } = await supabase.from("audit_links").insert([{
      audit_id: linkModal.auditId,
      allowed_email: linkEmail.trim().toLowerCase(),
      status: "open",
    }]).select().single();
    if (data) {
      const url = `${window.location.origin}/audit/${data.token}`;
      setGeneratedLink(url);
    }
    setLinkSaving(false);
  }

  async function handleExport(id) {
    if (exportingId) return;
    setExportingId(id);
    try {
      await exportAuditToPdf(id);
    } catch (e) {
      alert("Kon de PDF niet genereren: " + e.message);
    }
    setExportingId(null);
  }

  async function remove(id) {
    if (!confirm("Deze audit en alle bijbehorende antwoorden permanent verwijderen?")) return;
    await supabase.from("audit_responses").delete().eq("audit_id", id);
    await supabase.from("stock_checks").delete().eq("audit_id", id);
    await supabase.from("signatures").delete().eq("audit_id", id);
    await supabase.from("audits").delete().eq("id", id);
    await load();
  }

  async function toggleArchive(id, archived) {
    await supabase.from("audits").update({ archived }).eq("id", id);
    await load();
  }

  const statusColor = { draft: "#EF9F27", submitted: "#1D9E75" };
  const statusLabel = { draft: "Concept", submitted: "Ingediend" };
  const visibleAudits = audits
    .filter((a) => !!a.archived === showArchived)
    .filter((a) => !search.trim() || (a.audit_templates?.name || "").toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Audits ({visibleAudits.length})</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.btn(false)} onClick={() => setShowArchived((v) => !v)}>
            <i className={`ti ${showArchived ? "ti-clipboard-check" : "ti-archive"}`} /> {showArchived ? "Actieve audits" : "Gearchiveerd"}
          </button>
          <button style={s.btn(true)} onClick={onNewAudit}><i className="ti ti-plus" /> Nieuwe audit</button>
        </div>
      </div>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#aaa" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 32 }}
          placeholder="Zoek op templatenaam..."
        />
      </div>
      {loading ? <div style={s.empty}>Laden...</div>
        : visibleAudits.length === 0 ? <div style={s.empty}><i className={`ti ${showArchived ? "ti-archive" : "ti-clipboard-list"}`} style={{ fontSize: 32, display: "block", marginBottom: 8 }} />{showArchived ? "Geen gearchiveerde audits." : search.trim() ? "Geen audits gevonden voor deze zoekterm." : "Nog geen audits."}</div>
        : visibleAudits.map((audit) => (
          <div
            key={audit.id}
            style={{ ...s.card, cursor: !showArchived && audit.status === "draft" ? "pointer" : "default" }}
            onClick={() => { if (!showArchived && audit.status === "draft" && onResumeAudit) onResumeAudit(audit); }}
          >
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {audit.audit_templates?.name || "Audit"}
                  <span style={{ color: "#bbb", fontWeight: 400 }}> – </span>
                  {audit.locations?.name || "Onbekende locatie"}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  <i className="ti ti-calendar" style={{ fontSize: 12 }} /> {new Date(audit.audit_date).toLocaleDateString("nl-NL")}
                  {audit.created_at && <> · <i className="ti ti-clock" style={{ fontSize: 12 }} /> {new Date(audit.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</>}
                  {audit.auditor_name && <> · {audit.auditor_name}</>}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <span style={s.badge(statusColor[audit.status] || "#aaa")}>{statusLabel[audit.status] || audit.status}</span>
                  {audit.score_pct !== null && <span style={s.badge("#378ADD")}>{audit.score_pct}%</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setLinkModal({ auditId: audit.id }); setLinkEmail(""); setGeneratedLink(null); }} style={{ fontSize: 12, color: "#888", border: "none", background: "none", cursor: "pointer" }} title="Genereer externe link">
                  <i className="ti ti-link" />
                </button>
                <button onClick={() => handleExport(audit.id)} disabled={exportingId === audit.id} style={{ fontSize: 12, color: "#378ADD", border: "none", background: "none", cursor: exportingId === audit.id ? "not-allowed" : "pointer" }} title="Exporteer als PDF">
                  <i className={`ti ${exportingId === audit.id ? "ti-loader-2" : "ti-file-type-pdf"}`} />
                </button>
                {canArchive && (
                  <button onClick={() => toggleArchive(audit.id, !audit.archived)} style={{ fontSize: 12, color: "#aaa", border: "none", background: "none", cursor: "pointer" }} title={audit.archived ? "Terugzetten" : "Archiveren"}>
                    <i className={`ti ${audit.archived ? "ti-archive-off" : "ti-archive"}`} />
                  </button>
                )}
                {canDelete && <button onClick={() => remove(audit.id)} style={{ fontSize: 12, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>}
                {!showArchived && audit.status === "draft" && <i className="ti ti-chevron-right" style={{ color: "#ccc" }} />}
              </div>
            </div>
          </div>
        ))}

      {/* Link generation modal */}
      {linkModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 20, width: "100%", maxWidth: 400 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#09325A", marginBottom: 4 }}>Externe auditlink genereren</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>De ontvanger moet dit e-mailadres invoeren om de audit te openen.</div>
            {!generatedLink ? (
              <>
                <div style={s.label}>E-mailadres ontvanger *</div>
                <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generateLink()} style={s.input} placeholder="naam@bedrijf.nl" autoFocus />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button style={s.btn(true)} onClick={generateLink} disabled={!linkEmail.trim() || linkSaving}>
                    <i className="ti ti-link" /> {linkSaving ? "Genereren..." : "Genereer link"}
                  </button>
                  <button style={s.btn(false)} onClick={() => setLinkModal(null)}>Annuleren</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#1D9E75", fontWeight: 600, marginBottom: 8 }}><i className="ti ti-circle-check" /> Link gegenereerd!</div>
                <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "10px 12px", fontSize: 11, wordBreak: "break-all", color: "#333", marginBottom: 12 }}>{generatedLink}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btn(true)} onClick={() => { navigator.clipboard.writeText(generatedLink); }}>
                    <i className="ti ti-copy" /> Kopiëren
                  </button>
                  <button style={s.btn(false)} onClick={() => setLinkModal(null)}>Sluiten</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard main ────────────────────────────────────────
// ── Change password modal ───────────────────────────────────
function ChangePasswordModal({ email, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function save() {
    setError(null);
    if (!currentPassword) { setError("Vul je huidige wachtwoord in."); return; }
    if (password.length < 6) { setError("Nieuw wachtwoord moet minimaal 6 tekens zijn."); return; }
    if (password !== confirm) { setError("Wachtwoorden komen niet overeen."); return; }
    setSaving(true);
    // Verify the current password by re-authenticating, since an active session
    // alone isn't proof of identity (e.g. an unattended device on the work floor)
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      setSaving(false);
      setError("Huidig wachtwoord is onjuist.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "white", borderRadius: 12, padding: 20, width: "100%", maxWidth: 380 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#09325A", marginBottom: 12 }}>Wachtwoord wijzigen</div>
        {success ? (
          <>
            <div style={{ fontSize: 13, color: "#1D9E75", marginBottom: 16 }}><i className="ti ti-circle-check" /> Wachtwoord succesvol gewijzigd.</div>
            <button style={s.btn(true)} onClick={onClose}>Sluiten</button>
          </>
        ) : (
          <>
            <div style={s.label}>Huidig wachtwoord</div>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={s.input} placeholder="Je huidige wachtwoord" autoFocus />
            <div style={{ ...s.label, marginTop: 10 }}>Nieuw wachtwoord</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={s.input} placeholder="Minimaal 6 tekens" />
            <div style={{ ...s.label, marginTop: 10 }}>Bevestig nieuw wachtwoord</div>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} style={s.input} placeholder="Herhaal nieuw wachtwoord" />
            {error && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 8 }}>{error}</div>}
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button style={s.btn(true)} onClick={save} disabled={saving || !currentPassword || !password || !confirm}>
                <i className="ti ti-check" /> {saving ? "Opslaan..." : "Opslaan"}
              </button>
              <button style={s.btn(false)} onClick={onClose}>Annuleren</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const ROLE_LABEL = { admin: "Admin", manager: "Manager", auditor: "Auditor", viewer: "Viewer" };
const CAN_MANAGE = ["admin", "manager"]; // who can create/edit/delete locations, templates, answer sets
const CAN_DELETE_AUDIT = ["admin"];
const CAN_ARCHIVE_AUDIT = ["admin", "manager"];

function navForRole(role) {
  let nav = NAV;
  if (role === "viewer" || role === "auditor") nav = nav.filter((n) => n.id !== "answersets"); // only admin/manager manage answer sets
  if (role !== "admin") nav = nav.filter((n) => n.id !== "users"); // only admins manage users
  return nav;
}

// ── Users ────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "auditor", label: "Auditor" },
  { value: "viewer", label: "Viewer" },
];

function Users({ profile, session }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", role: "auditor" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/list-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: profile.organization_id, requesterId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, fullName: form.fullName, role: form.role,
          organizationId: profile.organization_id, requesterId: session.user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      setForm({ email: "", fullName: "", role: "auditor" });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function updateRole(userId, newRole) {
    setError(null);
    try {
      const res = await fetch("/api/manage-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRole", targetUserId: userId, newRole, organizationId: profile.organization_id, requesterId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeUser(userId) {
    if (!confirm("Deze gebruiker permanent verwijderen?")) return;
    setError(null);
    try {
      const res = await fetch("/api/manage-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", targetUserId: userId, organizationId: profile.organization_id, requesterId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Gebruikers ({users.length})</span>
        <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
          <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Sluiten" : "Toevoegen"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {showForm && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#1D9E75" }}>Nieuwe gebruiker</div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>De gebruiker ontvangt een e-mail met een beveiligde link om zelf een wachtwoord in te stellen.</div>
          <div style={s.label}>E-mailadres *</div>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={s.input} placeholder="naam@bedrijf.nl" />
          <div style={{ ...s.label, marginTop: 8 }}>Volledige naam</div>
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} style={s.input} placeholder="Optioneel" />
          <div style={{ ...s.label, marginTop: 8 }}>Rol</div>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={s.select}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!form.email.trim() || saving}>
              <i className="ti ti-mail" /> {saving ? "Versturen..." : "Uitnodiging versturen"}
            </button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Annuleren</button>
          </div>
        </div>
      )}

      {loading ? <div style={s.empty}>Laden...</div>
        : users.length === 0 ? <div style={s.empty}><i className="ti ti-users" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Nog geen gebruikers.</div>
        : users.map((u) => (
          <div key={u.id} style={s.card}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name || u.email || "Onbekend"}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{u.email}</div>
                {u.must_change_password && (
                  <span style={{ fontSize: 10, fontWeight: 500, display: "inline-block", marginTop: 4, padding: "2px 7px", borderRadius: 10, background: "#FAEEDA", color: "#633806" }}>
                    <i className="ti ti-clock" style={{ fontSize: 10 }} /> Uitnodiging nog niet geactiveerd
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} disabled={u.id === session.user.id} style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "4px 8px", background: "white" }}>
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {u.id !== session.user.id && (
                  <button onClick={() => removeUser(u.id)} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-trash" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

export default function Dashboard({ session, profile, onStartAudit, onResumeAudit }) {
  const [page, setPage] = useState("home");
  const [locCount, setLocCount] = useState(0);
  const [tplCount, setTplCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const canManage = CAN_MANAGE.includes(profile?.role);
  const canDeleteAudit = CAN_DELETE_AUDIT.includes(profile?.role);
  const canArchiveAudit = CAN_ARCHIVE_AUDIT.includes(profile?.role);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
          {profile?.role && <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: "#E6F1FB", color: "#0C447C" }}>{ROLE_LABEL[profile.role] || profile.role}</span>}
          <button onClick={() => setShowPasswordModal(true)} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer" }} title="Wachtwoord wijzigen">
            <i className="ti ti-key" />
          </button>
          <button onClick={handleLogout} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer" }}>Uitloggen</button>
        </div>
      </div>
      {showPasswordModal && <ChangePasswordModal email={session.user.email} onClose={() => setShowPasswordModal(false)} />}
      <nav style={s.nav}>
        {navForRole(profile?.role).map((item) => (
          <button key={item.id} style={s.navBtn(page === item.id)} onClick={() => setPage(item.id)}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} />{item.label}
          </button>
        ))}
      </nav>
      {page === "home"       && <Home onNav={setPage} locCount={locCount} tplCount={tplCount} auditCount={auditCount} onNewAudit={onStartAudit} />}
      {page === "locations"  && <Locations profile={profile} canManage={canManage} />}
      {page === "answersets" && <AnswerSets profile={profile} canManage={canManage} />}
      {page === "templates"  && <Templates profile={profile} canManage={canManage} />}
      {page === "audits"     && <Audits onNewAudit={onStartAudit} onResumeAudit={onResumeAudit} canDelete={canDeleteAudit} canArchive={canArchiveAudit} />}
      {page === "users"      && <Users profile={profile} session={session} />}
    </div>
  );
}
