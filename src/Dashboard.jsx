import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { exportAuditToPdf } from "./lib/exportPdf";

const NAV = [
  { id: "home",       label: "Dashboard",   icon: "ti-home" },
  { id: "locations",  label: "Locations",   icon: "ti-building-warehouse" },
  { id: "answersets", label: "Answer Sets", icon: "ti-list-check" },
  { id: "templates",  label: "Templates",   icon: "ti-file-description" },
  { id: "audits",     label: "Audits",      icon: "ti-clipboard-check" },
  { id: "users",      label: "Users",       icon: "ti-users" },
  { id: "org",        label: "Organization",icon: "ti-building" },
];

const ANSWER_TYPES = [
  { value: "score",      label: "Answer set" },
  { value: "checkbox",   label: "Checkbox" },
  { value: "number",     label: "Number" },
  { value: "text",       label: "Text" },
  { value: "slider",     label: "Slider (0-100%)" },
  { value: "signature",  label: "Signature" },
  { value: "stock_take", label: "Stock take (table)" },
  { value: "datetime",   label: "Date/Time" },
];

const DATETIME_MODES = [
  { value: "date",     label: "Date" },
  { value: "time",     label: "Time" },
  { value: "datetime", label: "Date and time" },
];

const OPTION_COLORS = ["#E24B4A","#E07B3A","#EF9F27","#639922","#1D9E75","#378ADD","#888"];

const s = {
  wrap:    { fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 680, margin: "0 auto", background: "#fff", minHeight: "100vh" },
  header:  { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
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
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Welcome back 👋</div>
        <div style={{ fontSize: 13, color: "#888" }}>Here's an overview of your Autrex360 environment.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "1.5rem" }}>
        {[
          { label: "Locations", count: locCount, icon: "ti-building-warehouse", color: "#378ADD", nav: "locations" },
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
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Quick start</div>
        <button style={s.btn(true)} onClick={onNewAudit}><i className="ti ti-plus" /> Start new audit</button>
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
    if (!confirm("Delete this location?")) return;
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
        <span>Locations ({visibleLocations.length})</span>
        {canManage && (
          <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
            <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Close" : "Add"}
          </button>
        )}
      </div>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#aaa" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 32 }}
          placeholder="Search by name or city..."
        />
      </div>
      {showForm && canManage && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#1D9E75" }}>New location</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Company name *","name"],["Street & number","street"],["Postal code","postal_code"],["City","city"],["Location detail","location_detail"],["Contact person","contact_name"],["Contact email","contact_email"]].map(([lbl, key]) => (
              <div key={key} style={key === "name" || key === "contact_email" ? { gridColumn: "1 / -1" } : {}}>
                <div style={s.label}>{lbl}</div>
                <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={s.input} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!form.name || saving}><i className="ti ti-check" /> {saving ? "Saving..." : "Save"}</button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={s.empty}>Laden...</div>
        : visibleLocations.length === 0 ? <div style={s.empty}><i className="ti ti-building-warehouse" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />{search.trim() ? "No locations found for this search." : "No locations yet."}</div>
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
          Doesn't count (N/A)
        </label>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={onBack}><i className="ti ti-arrow-left" /> All answer sets</button>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{set.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Beheer de opties in deze antwoordset</div>
      </div>

      {loading ? <div style={s.empty}>Laden...</div> : (
        <div style={s.card}>
          {options.length === 0 && <div style={{ fontSize: 12, color: "#bbb", padding: "6px 0 10px" }}>No options yet. Add the first one!</div>}
          {options.map((opt, idx) => (
            editingId === opt.id ? (
              <div key={opt.id} style={{ marginTop: idx === 0 ? 0 : 8, marginBottom: 8, background: "white", border: "1px solid #1D9E75", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={s.label}>Label *</div>
                    <input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} style={s.input} autoFocus />
                  </div>
                  <div>
                    <div style={s.label}>Score {editForm.is_na && "(disabled - N/A)"}</div>
                    <input type="number" disabled={editForm.is_na} value={editForm.score} onChange={(e) => setEditForm((f) => ({ ...f, score: e.target.value }))} style={{ ...s.input, opacity: editForm.is_na ? 0.5 : 1 }} placeholder="e.g. 3" />
                  </div>
                  <div>
                    <div style={s.label}>Color</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {OPTION_COLORS.map((c) => (
                        <div key={c} onClick={() => setEditForm((f) => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: editForm.color === c ? "2.5px solid #333" : "2px solid transparent" }} />
                      ))}
                    </div>
                  </div>
                  <FlagCheckboxes data={editForm} setData={setEditForm} />
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button style={s.btn(true)} onClick={saveEdit}><i className="ti ti-check" /> Save</button>
                  <button style={s.btn(false)} onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div key={opt.id} style={{ padding: "8px 0", borderBottom: idx < options.length - 1 ? "0.5px solid #eee" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: opt.color || "#ccc", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</span>
                  {opt.score !== null && <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{opt.score} pt</span>}
                  {opt.is_action_item && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D", fontWeight: 500 }}>Action item</span>}
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
                  <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} style={s.input} placeholder="e.g. Satisfactory" autoFocus />
                </div>
                <div>
                  <div style={s.label}>Score {form.is_na && "(disabled - N/A)"}</div>
                  <input type="number" disabled={form.is_na} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} style={{ ...s.input, opacity: form.is_na ? 0.5 : 1 }} placeholder="e.g. 3" />
                </div>
                <div>
                  <div style={s.label}>Color</div>
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
                <button style={s.btn(false)} onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            canManage && <button style={{ ...s.btnSm, marginTop: options.length > 0 ? 10 : 0 }} onClick={() => setAdding(true)}><i className="ti ti-plus" /> Add option</button>
          )}
        </div>
      )}

      {options.length > 0 && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#f9f9f9", border: "0.5px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Preview</div>
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
    if (!confirm("Delete this answer set?")) return;
    await supabase.from("answer_sets").delete().eq("id", id);
    await load();
  }

  if (selected) return <AnswerSetDetail set={selected} canManage={canManage} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Answer Sets ({sets.length})</span>
        {canManage && (
          <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
            <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Close" : "Add"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#1D9E75" }}>New answer set</div>
          <div style={s.label}>Name *</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={s.input} placeholder="e.g. Compliance Score, Frequency, Condition" autoFocus />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!name.trim() || saving}><i className="ti ti-check" /> {saving ? "Saving..." : "Create"}</button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={s.empty}>Laden...</div>
        : sets.length === 0 ? (
          <div style={s.empty}>
            <i className="ti ti-list-check" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
            No answer sets yet. Create one!<br />
            <span style={{ fontSize: 11, marginTop: 4, display: "block" }}>Answer sets are reusable buttons for your questions.</span>
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
  const [requiresLocation, setRequiresLocation] = useState(template.requires_location !== false);

  async function toggleRequiresLocation(checked) {
    setRequiresLocation(checked);
    await supabase.from("audit_templates").update({ requires_location: checked }).eq("id", template.id);
  }

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
    if (!confirm("Delete this section and all its questions?")) return;
    await supabase.from("template_sections").delete().eq("id", id); await load();
  }

  async function moveSection(sectionId, direction) {
    const idx = sections.findIndex((s) => s.id === sectionId);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const current = sections[idx];
    const target = sections[targetIdx];
    // Swap sort_order values between the two sections
    await Promise.all([
      supabase.from("template_sections").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("template_sections").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    await load();
  }

  const defaultItemForm = { label: "", sub_label: "", info_text: "", answer_type: "score", answer_set_id: "", weight: "1", depends_on_item_id: "", depends_on_value: "", stock_col1_label: "Artikelnummer", stock_col2_label: "Binlocatie", stock_col3_label: "Aantal", stock_max_rows: "5", datetime_mode: "date" };

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
      info_text: form.info_text || null,
      answer_type: form.answer_type || "score",
      answer_set_id: form.answer_type === "score" && form.answer_set_id ? form.answer_set_id : null,
      weight: form.weight ? parseFloat(form.weight) : 1,
      depends_on_item_id: form.depends_on_item_id || null,
      depends_on_value: form.depends_on_item_id && form.depends_on_value ? form.depends_on_value : null,
      stock_col1_label: form.stock_col1_label || "Artikelnummer",
      stock_col2_label: form.stock_col2_label || "Binlocatie",
      stock_col3_label: form.stock_col3_label || "Aantal",
      stock_max_rows: form.stock_max_rows ? parseInt(form.stock_max_rows) : 5,
      datetime_mode: form.datetime_mode || "date",
      sort_order: (items[sectionId] || []).length,
    }]);
    setNewItemForms((f) => ({ ...f, [sectionId]: { ...defaultItemForm, open: false } }));
    await load();
  }
  async function removeItem(id) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("template_items").delete().eq("id", id); await load();
  }

  async function moveItem(sectionId, itemId, direction) {
    const sectionItems = items[sectionId] || [];
    const idx = sectionItems.findIndex((i) => i.id === itemId);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sectionItems.length) return;
    const current = sectionItems[idx];
    const target = sectionItems[targetIdx];
    await Promise.all([
      supabase.from("template_items").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("template_items").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    await load();
  }

  function startEdit(item) {
    setEditingItemId(item.id);
    setEditForm({
      label: item.label, sub_label: item.sub_label || "", info_text: item.info_text || "", answer_type: item.answer_type || "score", answer_set_id: item.answer_set_id || "",
      weight: item.weight !== null && item.weight !== undefined ? String(item.weight) : "1",
      depends_on_item_id: item.depends_on_item_id || "", depends_on_value: item.depends_on_value || "",
      stock_col1_label: item.stock_col1_label || "Artikelnummer",
      stock_col2_label: item.stock_col2_label || "Binlocatie",
      stock_col3_label: item.stock_col3_label || "Aantal",
      stock_max_rows: item.stock_max_rows !== null && item.stock_max_rows !== undefined ? String(item.stock_max_rows) : "5",
      datetime_mode: item.datetime_mode || "date",
      _sectionId: item.section_id,
    });
  }
  function cancelEdit() { setEditingItemId(null); setEditForm({}); }
  async function saveEdit() {
    if (!editForm.label?.trim()) return;
    await supabase.from("template_items").update({
      label: editForm.label,
      sub_label: editForm.sub_label || null,
      info_text: editForm.info_text || null,
      answer_type: editForm.answer_type || "score",
      answer_set_id: editForm.answer_type === "score" && editForm.answer_set_id ? editForm.answer_set_id : null,
      weight: editForm.weight ? parseFloat(editForm.weight) : 1,
      depends_on_item_id: editForm.depends_on_item_id || null,
      depends_on_value: editForm.depends_on_item_id && editForm.depends_on_value ? editForm.depends_on_value : null,
      stock_col1_label: editForm.stock_col1_label || "Artikelnummer",
      stock_col2_label: editForm.stock_col2_label || "Binlocatie",
      stock_col3_label: editForm.stock_col3_label || "Aantal",
      stock_max_rows: editForm.stock_max_rows ? parseInt(editForm.stock_max_rows) : 5,
      datetime_mode: editForm.datetime_mode || "date",
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
      <button style={s.backBtn} onClick={onBack}><i className="ti ti-arrow-left" /> All templates</button>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{template.name}</div>
        {template.description && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{template.description}</div>}
        {canManage && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={requiresLocation} onChange={(e) => toggleRequiresLocation(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#1D9E75" }} />
            <span style={{ fontSize: 12, color: "#555" }}>Requires location when starting an audit</span>
          </div>
        )}
      </div>

      {loading ? <div style={s.empty}>Laden...</div> : (
        <>
          {sections.map((section, secIdx) => (
            <div key={section.id} style={{ ...s.card, marginBottom: 14 }}>
              <div style={s.row}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{section.name}</div>
                {canManage && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button onClick={() => moveSection(section.id, -1)} disabled={secIdx === 0} style={{ fontSize: 13, color: secIdx === 0 ? "#ddd" : "#888", border: "none", background: "none", cursor: secIdx === 0 ? "default" : "pointer" }}><i className="ti ti-chevron-up" /></button>
                    <button onClick={() => moveSection(section.id, 1)} disabled={secIdx === sections.length - 1} style={{ fontSize: 13, color: secIdx === sections.length - 1 ? "#ddd" : "#888", border: "none", background: "none", cursor: secIdx === sections.length - 1 ? "default" : "pointer" }}><i className="ti ti-chevron-down" /></button>
                    <button onClick={() => removeSection(section.id)} style={{ fontSize: 11, color: "#aaa", border: "none", background: "none", cursor: "pointer", marginLeft: 4 }}><i className="ti ti-trash" /></button>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10 }}>
                {(items[section.id] || []).map((item, idx) => (
                  editingItemId === item.id ? (
                    <div key={item.id} style={{ marginTop: idx === 0 ? 0 : 8, background: "white", border: "1px solid #1D9E75", borderRadius: 8, padding: 10 }}>
                      <div style={s.label}>Question *</div>
                      <input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} style={s.input} autoFocus />
                      <div style={{ ...s.label, marginTop: 8 }}>Description (optional)</div>
                      <input value={editForm.sub_label} onChange={(e) => setEditForm((f) => ({ ...f, sub_label: e.target.value }))} style={s.input} />
                      <div style={{ ...s.label, marginTop: 8 }}>Info text (optional, via (i) icon)</div>
                      <textarea value={editForm.info_text} onChange={(e) => setEditForm((f) => ({ ...f, info_text: e.target.value }))} rows={2} style={{ ...s.input, resize: "vertical" }} placeholder="Extra explanation, standard reference, or example that stays hidden until the auditor clicks it" />
                      <div style={{ ...s.label, marginTop: 8 }}>Answer type</div>
                      <select value={editForm.answer_type} onChange={(e) => setEditForm((f) => ({ ...f, answer_type: e.target.value }))} style={s.select}>
                        {ANSWER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {editForm.answer_type === "score" && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>Antwoordset</div>
                          <select value={editForm.answer_set_id} onChange={(e) => setEditForm((f) => ({ ...f, answer_set_id: e.target.value }))} style={s.select}>
                            <option value="">— Choose an answer set —</option>
                            {answerSets.map((as) => <option key={as.id} value={as.id}>{as.name}</option>)}
                          </select>
                        </>
                      )}
                      {editForm.answer_type === "stock_take" && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>Column 1 (text)</div>
                          <input value={editForm.stock_col1_label} onChange={(e) => setEditForm((f) => ({ ...f, stock_col1_label: e.target.value }))} style={s.input} placeholder="e.g. Item number" />
                          <div style={{ ...s.label, marginTop: 8 }}>Column 2 (text)</div>
                          <input value={editForm.stock_col2_label} onChange={(e) => setEditForm((f) => ({ ...f, stock_col2_label: e.target.value }))} style={s.input} placeholder="e.g. Bin location" />
                          <div style={{ ...s.label, marginTop: 8 }}>Column 3 (quantity)</div>
                          <input value={editForm.stock_col3_label} onChange={(e) => setEditForm((f) => ({ ...f, stock_col3_label: e.target.value }))} style={s.input} placeholder="e.g. Quantity" />
                          <div style={{ ...s.label, marginTop: 8 }}>Max. number of rows</div>
                          <input type="number" min="1" max="20" value={editForm.stock_max_rows} onChange={(e) => setEditForm((f) => ({ ...f, stock_max_rows: e.target.value }))} style={s.input} />
                        </>
                      )}
                      {editForm.answer_type === "datetime" && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>Type</div>
                          <select value={editForm.datetime_mode} onChange={(e) => setEditForm((f) => ({ ...f, datetime_mode: e.target.value }))} style={s.select}>
                            {DATETIME_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </>
                      )}
                      <div style={{ ...s.label, marginTop: 8 }}>Weight</div>
                      <input type="number" step="0.5" min="0.5" value={editForm.weight} onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))} style={s.input} placeholder="1 = normal, 2 = double importance" />
                      <div style={{ ...s.label, marginTop: 8 }}>Only show if... (optional)</div>
                      <select value={editForm.depends_on_item_id} onChange={(e) => setEditForm((f) => ({ ...f, depends_on_item_id: e.target.value, depends_on_value: "" }))} style={s.select}>
                        <option value="">— Always show —</option>
                        {(items[section.id] || []).filter((it) => it.id !== item.id).map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
                      </select>
                      {editForm.depends_on_item_id && (
                        <>
                          <div style={{ ...s.label, marginTop: 8 }}>...this answer was given</div>
                          <select value={editForm.depends_on_value} onChange={(e) => setEditForm((f) => ({ ...f, depends_on_value: e.target.value }))} style={s.select}>
                            <option value="">— Choose an answer —</option>
                            {optionsForItem(editForm.depends_on_item_id, section.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                          </select>
                          {optionsForItem(editForm.depends_on_item_id, section.id).length === 0 && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 4 }}>⚠ This question has no answer set with options.</div>}
                        </>
                      )}
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button style={s.btn(true)} onClick={saveEdit}><i className="ti ti-check" /> Save</button>
                        <button style={s.btn(false)} onClick={cancelEdit}>Cancel</button>
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
                              Weight ×{item.weight}
                            </span>
                          )}
                          {item.depends_on_item_id && (
                            <span style={{ fontSize: 11, display: "inline-block", padding: "2px 7px", borderRadius: 10, background: "#E6F1FB", color: "#0C447C", fontWeight: 500 }}>
                              <i className="ti ti-git-branch" style={{ fontSize: 10 }} /> Conditional
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                          <button onClick={() => moveItem(section.id, item.id, -1)} disabled={idx === 0} style={{ fontSize: 12, color: idx === 0 ? "#ddd" : "#888", border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer" }}><i className="ti ti-chevron-up" /></button>
                          <button onClick={() => moveItem(section.id, item.id, 1)} disabled={idx === (items[section.id] || []).length - 1} style={{ fontSize: 12, color: idx === (items[section.id] || []).length - 1 ? "#ddd" : "#888", border: "none", background: "none", cursor: idx === (items[section.id] || []).length - 1 ? "default" : "pointer" }}><i className="ti ti-chevron-down" /></button>
                          <button onClick={() => startEdit(item)} style={{ fontSize: 11, color: "#888", border: "none", background: "none", cursor: "pointer", marginLeft: 2 }}><i className="ti ti-pencil" /></button>
                          <button onClick={() => removeItem(item.id)} style={{ fontSize: 11, color: "#ccc", border: "none", background: "none", cursor: "pointer" }}><i className="ti ti-x" /></button>
                        </div>
                      )}
                    </div>
                  )
                ))}
                {(items[section.id] || []).length === 0 && <div style={{ fontSize: 12, color: "#bbb", padding: "6px 0" }}>No questions yet.</div>}
              </div>

              {canManage && (newItemForms[section.id]?.open ? (
                <div style={{ marginTop: 10, background: "white", border: "0.5px solid #ddd", borderRadius: 8, padding: 10 }}>
                  <div style={s.label}>Question *</div>
                  <input value={newItemForms[section.id]?.label || ""} onChange={(e) => updateItemForm(section.id, "label", e.target.value)} style={s.input} placeholder="e.g. Racking free of damage" />
                  <div style={{ ...s.label, marginTop: 8 }}>Description (optional)</div>
                  <input value={newItemForms[section.id]?.sub_label || ""} onChange={(e) => updateItemForm(section.id, "sub_label", e.target.value)} style={s.input} placeholder="e.g. No bent uprights" />
                  <div style={{ ...s.label, marginTop: 8 }}>Info text (optional, via (i) icon)</div>
                  <textarea value={newItemForms[section.id]?.info_text || ""} onChange={(e) => updateItemForm(section.id, "info_text", e.target.value)} rows={2} style={{ ...s.input, resize: "vertical" }} placeholder="Extra explanation, standard reference, or example that stays hidden until the auditor clicks it" />
                  <div style={{ ...s.label, marginTop: 8 }}>Answer type</div>
                  <select value={newItemForms[section.id]?.answer_type || "score"} onChange={(e) => updateItemForm(section.id, "answer_type", e.target.value)} style={s.select}>
                    {ANSWER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {(newItemForms[section.id]?.answer_type === "score" || !newItemForms[section.id]?.answer_type) && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>Antwoordset</div>
                      <select value={newItemForms[section.id]?.answer_set_id || ""} onChange={(e) => updateItemForm(section.id, "answer_set_id", e.target.value)} style={s.select}>
                        <option value="">— Choose an answer set —</option>
                        {answerSets.map((as) => <option key={as.id} value={as.id}>{as.name}</option>)}
                      </select>
                      {answerSets.length === 0 && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 4 }}>⚠ No answer sets yet. Create one first under "Answer Sets".</div>}
                    </>
                  )}
                  {newItemForms[section.id]?.answer_type === "stock_take" && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>Column 1 (text)</div>
                      <input value={newItemForms[section.id]?.stock_col1_label ?? "Artikelnummer"} onChange={(e) => updateItemForm(section.id, "stock_col1_label", e.target.value)} style={s.input} placeholder="e.g. Item number" />
                      <div style={{ ...s.label, marginTop: 8 }}>Column 2 (text)</div>
                      <input value={newItemForms[section.id]?.stock_col2_label ?? "Binlocatie"} onChange={(e) => updateItemForm(section.id, "stock_col2_label", e.target.value)} style={s.input} placeholder="e.g. Bin location" />
                      <div style={{ ...s.label, marginTop: 8 }}>Column 3 (quantity)</div>
                      <input value={newItemForms[section.id]?.stock_col3_label ?? "Aantal"} onChange={(e) => updateItemForm(section.id, "stock_col3_label", e.target.value)} style={s.input} placeholder="e.g. Quantity" />
                      <div style={{ ...s.label, marginTop: 8 }}>Max. number of rows</div>
                      <input type="number" min="1" max="20" value={newItemForms[section.id]?.stock_max_rows ?? "5"} onChange={(e) => updateItemForm(section.id, "stock_max_rows", e.target.value)} style={s.input} />
                    </>
                  )}
                  {newItemForms[section.id]?.answer_type === "datetime" && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>Type</div>
                      <select value={newItemForms[section.id]?.datetime_mode ?? "date"} onChange={(e) => updateItemForm(section.id, "datetime_mode", e.target.value)} style={s.select}>
                        {DATETIME_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </>
                  )}
                  <div style={{ ...s.label, marginTop: 8 }}>Weight</div>
                  <input type="number" step="0.5" min="0.5" value={newItemForms[section.id]?.weight || "1"} onChange={(e) => updateItemForm(section.id, "weight", e.target.value)} style={s.input} placeholder="1 = normal, 2 = double importance" />
                  <div style={{ ...s.label, marginTop: 8 }}>Only show if... (optional)</div>
                  <select value={newItemForms[section.id]?.depends_on_item_id || ""} onChange={(e) => updateItemForm(section.id, "depends_on_item_id", e.target.value)} style={s.select}>
                    <option value="">— Always show —</option>
                    {(items[section.id] || []).map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
                  </select>
                  {newItemForms[section.id]?.depends_on_item_id && (
                    <>
                      <div style={{ ...s.label, marginTop: 8 }}>...this answer was given</div>
                      <select value={newItemForms[section.id]?.depends_on_value || ""} onChange={(e) => updateItemForm(section.id, "depends_on_value", e.target.value)} style={s.select}>
                        <option value="">— Choose an answer —</option>
                        {optionsForItem(newItemForms[section.id]?.depends_on_item_id, section.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      {optionsForItem(newItemForms[section.id]?.depends_on_item_id, section.id).length === 0 && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 4 }}>⚠ This question has no answer set with options.</div>}
                    </>
                  )}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button style={s.btn(true)} onClick={() => addItem(section.id)}><i className="ti ti-check" /> Toevoegen</button>
                    <button style={s.btn(false)} onClick={() => toggleItemForm(section.id)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button style={{ ...s.btnSm, marginTop: 10 }} onClick={() => toggleItemForm(section.id)}><i className="ti ti-plus" /> Add question</button>
              ))}
            </div>
          ))}

          {sections.length === 0 && <div style={s.empty}><i className="ti ti-list" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />No sections yet.</div>}

          {canManage && (addingSection ? (
            <div style={{ ...s.card, border: "1px solid #1D9E75" }}>
              <div style={s.label}>Section name</div>
              <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} style={s.input} placeholder="e.g. Racking & Storage" autoFocus />
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button style={s.btn(true)} onClick={addSection}><i className="ti ti-check" /> Toevoegen</button>
                <button style={s.btn(false)} onClick={() => { setAddingSection(false); setNewSectionName(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button style={s.btn(true)} onClick={() => setAddingSection(true)}><i className="ti ti-plus" /> Add section</button>
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
  const [form, setForm] = useState({ name: "", description: "", requires_location: true });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [duplicatingId, setDuplicatingId] = useState(null);

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
    setForm({ name: "", description: "", requires_location: true }); setShowForm(false);
    await load(); setSaving(false);
  }
  async function remove(id) {
    if (!confirm("Delete this template?")) return;
    await supabase.from("audit_templates").delete().eq("id", id); await load();
  }

  async function duplicateTemplate(tpl) {
    setDuplicatingId(tpl.id);
    try {
      // 1. Copy the template itself
      const { data: newTpl, error: tplError } = await supabase.from("audit_templates").insert([{
        name: `${tpl.name} (kopie)`,
        description: tpl.description,
        organization_id: tpl.organization_id,
        is_active: tpl.is_active,
        requires_location: tpl.requires_location,
      }]).select().single();
      if (tplError || !newTpl) throw tplError || new Error("Could not create template");

      // 2. Copy all sections, keeping a map of old->new section id so items can be re-linked
      const { data: oldSections } = await supabase.from("template_sections").select("*").eq("template_id", tpl.id).order("sort_order");
      const sectionIdMap = {};
      for (const sec of oldSections || []) {
        const { data: newSec } = await supabase.from("template_sections").insert([{
          template_id: newTpl.id, name: sec.name, sort_order: sec.sort_order,
        }]).select().single();
        if (newSec) sectionIdMap[sec.id] = newSec.id;
      }

      // 3. Copy all items per section, re-linking section_id and depends_on_item_id
      const oldSectionIds = (oldSections || []).map((s) => s.id);
      const { data: oldItems } = oldSectionIds.length
        ? await supabase.from("template_items").select("*").in("section_id", oldSectionIds).order("sort_order")
        : { data: [] };
      const itemIdMap = {};
      // Insert items first without depends_on_item_id (target might not exist yet), then patch it in a second pass
      for (const item of oldItems || []) {
        const { id, section_id, depends_on_item_id, answer_sets, ...rest } = item;
        const { data: newItem } = await supabase.from("template_items").insert([{
          ...rest,
          section_id: sectionIdMap[section_id],
        }]).select().single();
        if (newItem) itemIdMap[item.id] = newItem.id;
      }
      // Second pass: fix up depends_on_item_id references to point at the new copied items
      for (const item of oldItems || []) {
        if (item.depends_on_item_id && itemIdMap[item.id] && itemIdMap[item.depends_on_item_id]) {
          await supabase.from("template_items").update({ depends_on_item_id: itemIdMap[item.depends_on_item_id] }).eq("id", itemIdMap[item.id]);
        }
      }

      await load();
    } catch (e) {
      alert("Duplication failed: " + (e.message || "unknown error"));
    }
    setDuplicatingId(null);
  }

  if (selected) return <TemplateDetail template={selected} canManage={canManage} onBack={() => { setSelected(null); load(); }} />;

  const visibleTemplates = templates.filter((t) => !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Templates ({visibleTemplates.length})</span>
        {canManage && (
          <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
            <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Close" : "Add"}
          </button>
        )}
      </div>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#aaa" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 32 }}
          placeholder="Search by template name..."
        />
      </div>
      {showForm && canManage && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#1D9E75" }}>New template</div>
          <div style={{ marginBottom: 10 }}>
            <div style={s.label}>Name *</div>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={s.input} placeholder="e.g. Warehouse Compliance Q3" />
          </div>
          <div>
            <div style={s.label}>Description</div>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={s.input} placeholder="Optional description" />
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.requires_location} onChange={(e) => setForm((f) => ({ ...f, requires_location: e.target.checked }))} style={{ width: 15, height: 15, accentColor: "#1D9E75" }} />
            <span style={{ fontSize: 12, color: "#555" }}>Requires location when starting an audit</span>
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 3, marginLeft: 23 }}>Turn off for internal checklists that aren't tied to a specific location.</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!form.name || saving}><i className="ti ti-check" /> {saving ? "Saving..." : "Save"}</button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={s.empty}>Laden...</div>
        : visibleTemplates.length === 0 ? <div style={s.empty}><i className="ti ti-file-description" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />{search.trim() ? "No templates found for this search." : "No templates yet."}</div>
        : visibleTemplates.map((tpl) => (
          <div key={tpl.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => setSelected(tpl)}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                {tpl.description && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{tpl.description}</div>}
                <div style={{ marginTop: 6 }}>
                  <span style={s.badge(tpl.is_active ? "#1D9E75" : "#aaa")}>{tpl.is_active ? "Active" : "Inactive"}</span>
                  {tpl.requires_location === false && <span style={s.badge("#888")}>No location</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); duplicateTemplate(tpl); }} disabled={duplicatingId === tpl.id} style={{ fontSize: 11, color: "#378ADD", border: "none", background: "none", cursor: duplicatingId === tpl.id ? "not-allowed" : "pointer" }} title="Duplicate">
                    <i className={`ti ${duplicatingId === tpl.id ? "ti-loader-2" : "ti-copy"}`} />
                  </button>
                )}
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
function Audits({ session, onNewAudit, onResumeAudit, canDelete, canArchive, onViewReport, canApproveQA }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | draft | submitted | pending | approved | rejected
  const [exportingId, setExportingId] = useState(null);
  const [linkModal, setLinkModal] = useState(null); // { auditId } | null
  const [linkEmail, setLinkEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [linkSaving, setLinkSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [qaModal, setQaModal] = useState(null); // { auditId } | null
  const [qaNote, setQaNote] = useState("");
  const [qaSaving, setQaSaving] = useState(false);

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
      alert("Could not generate PDF: " + e.message);
    }
    setExportingId(null);
  }

  async function remove(id) {
    if (!confirm("Permanently delete this audit and all its responses?")) return;
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

  async function handleQaDecision(decision) {
    if (!qaModal || qaSaving) return;
    setQaSaving(true);
    await supabase.from("audits").update({
      qa_status: decision,
      qa_note: qaNote || null,
      qa_reviewed_by: session.user.id,
      qa_reviewed_at: new Date().toISOString(),
    }).eq("id", qaModal.auditId);
    setQaSaving(false);
    setQaModal(null);
    setQaNote("");
    await load();
  }

  const statusColor = { draft: "#EF9F27", submitted: "#1D9E75" };
  const statusLabel = { draft: "Draft", submitted: "Submitted" };
  const qaStatusColor = { pending: "#EF9F27", approved: "#1D9E75", rejected: "#E24B4A" };
  const qaStatusLabel = { pending: "QA: pending", approved: "QA: approved", rejected: "QA: rejected" };

  const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "pending", label: "QA: pending" },
    { value: "approved", label: "QA: approved" },
    { value: "rejected", label: "QA: rejected" },
  ];

  function matchesStatusFilter(audit) {
    if (statusFilter === "all") return true;
    if (statusFilter === "draft") return audit.status === "draft";
    // "submitted" means submitted AND no QA process applies, to avoid overlapping with the QA filters
    if (statusFilter === "submitted") return audit.status === "submitted" && (!audit.qa_status || audit.qa_status === "not_required");
    return audit.qa_status === statusFilter;
  }

  const visibleAudits = audits
    .filter((a) => !!a.archived === showArchived)
    .filter((a) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (a.audit_templates?.name || "").toLowerCase().includes(q) || (a.locations?.name || "").toLowerCase().includes(q);
    })
    .filter(matchesStatusFilter);

  return (
    <div style={s.page}>
      <div style={s.sTitle}>
        <span>Audits ({visibleAudits.length})</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.btn(false)} onClick={() => setShowArchived((v) => !v)}>
            <i className={`ti ${showArchived ? "ti-clipboard-check" : "ti-archive"}`} /> {showArchived ? "Active audits" : "Archived"}
          </button>
          <button style={s.btn(true)} onClick={onNewAudit}><i className="ti ti-plus" /> New audit</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            style={{
              flexShrink: 0, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
              padding: "6px 12px", borderRadius: 20,
              border: statusFilter === f.value ? "1.5px solid #1D9E75" : "1px solid #ddd",
              background: statusFilter === f.value ? "#E1F5EE" : "white",
              color: statusFilter === f.value ? "#085041" : "#555",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#aaa" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 32 }}
          placeholder="Search by template or location..."
        />
      </div>
      {loading ? <div style={s.empty}>Laden...</div>
        : visibleAudits.length === 0 ? <div style={s.empty}><i className={`ti ${showArchived ? "ti-archive" : "ti-clipboard-list"}`} style={{ fontSize: 32, display: "block", marginBottom: 8 }} />{showArchived ? "No archived audits." : search.trim() || statusFilter !== "all" ? "No audits found for these filter(s)." : "No audits yet."}</div>
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
                  {audit.locations?.name && (
                    <>
                      <span style={{ color: "#bbb", fontWeight: 400 }}> – </span>
                      {audit.locations.name}
                    </>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  <i className="ti ti-calendar" style={{ fontSize: 12 }} /> {new Date(audit.audit_date).toLocaleDateString("nl-NL")}
                  {audit.created_at && <> · <i className="ti ti-clock" style={{ fontSize: 12 }} /> {new Date(audit.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</>}
                  {audit.auditor_name && <> · {audit.auditor_name}</>}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={s.badge(statusColor[audit.status] || "#aaa")}>{statusLabel[audit.status] || audit.status}</span>
                  {audit.score_pct !== null && <span style={s.badge("#378ADD")}>{audit.score_pct}%</span>}
                  {audit.qa_status && audit.qa_status !== "not_required" && (
                    <span style={s.badge(qaStatusColor[audit.qa_status] || "#aaa")}>{qaStatusLabel[audit.qa_status] || audit.qa_status}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                {canApproveQA && audit.qa_status === "pending" && (
                  <button onClick={() => { setQaModal({ auditId: audit.id }); setQaNote(""); }} style={{ fontSize: 12, color: "#EF9F27", border: "none", background: "none", cursor: "pointer" }} title="QA review">
                    <i className="ti ti-clipboard-check" />
                  </button>
                )}
                <button onClick={() => onViewReport && onViewReport(audit.id)} style={{ fontSize: 12, color: "#1D9E75", border: "none", background: "none", cursor: "pointer" }} title="View report">
                  <i className="ti ti-eye" />
                </button>
                <button onClick={() => { setLinkModal({ auditId: audit.id }); setLinkEmail(""); setGeneratedLink(null); }} style={{ fontSize: 12, color: "#888", border: "none", background: "none", cursor: "pointer" }} title="Generate external link">
                  <i className="ti ti-link" />
                </button>
                <button onClick={() => handleExport(audit.id)} disabled={exportingId === audit.id} style={{ fontSize: 12, color: "#378ADD", border: "none", background: "none", cursor: exportingId === audit.id ? "not-allowed" : "pointer" }} title="Export as PDF">
                  <i className={`ti ${exportingId === audit.id ? "ti-loader-2" : "ti-file-type-pdf"}`} />
                </button>
                {canArchive && (
                  <button onClick={() => toggleArchive(audit.id, !audit.archived)} style={{ fontSize: 12, color: "#aaa", border: "none", background: "none", cursor: "pointer" }} title={audit.archived ? "Restore" : "Archive"}>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "#09325A", marginBottom: 4 }}>Generate external audit link</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>The recipient must enter this email address to open the audit.</div>
            {!generatedLink ? (
              <>
                <div style={s.label}>Recipient's email address *</div>
                <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generateLink()} style={s.input} placeholder="name@company.com" autoFocus />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button style={s.btn(true)} onClick={generateLink} disabled={!linkEmail.trim() || linkSaving}>
                    <i className="ti ti-link" /> {linkSaving ? "Generating..." : "Generate link"}
                  </button>
                  <button style={s.btn(false)} onClick={() => setLinkModal(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#1D9E75", fontWeight: 600, marginBottom: 8 }}><i className="ti ti-circle-check" /> Link generated!</div>
                <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "10px 12px", fontSize: 11, wordBreak: "break-all", color: "#333", marginBottom: 12 }}>{generatedLink}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btn(true)} onClick={() => { navigator.clipboard.writeText(generatedLink); }}>
                    <i className="ti ti-copy" /> Copy
                  </button>
                  <button style={s.btn(false)} onClick={() => setLinkModal(null)}>Sluiten</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QA approval modal */}
      {qaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 20, width: "100%", maxWidth: 400 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#09325A", marginBottom: 4 }}>Review audit</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Approve or reject this audit, with an optional note.</div>
            <div style={s.label}>Note (optional)</div>
            <textarea value={qaNote} onChange={(e) => setQaNote(e.target.value)} rows={3} style={{ ...s.input, resize: "vertical" }} placeholder="Explanation for your decision" />
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button style={{ ...s.btn(true), background: "#1D9E75" }} onClick={() => handleQaDecision("approved")} disabled={qaSaving}>
                <i className="ti ti-check" /> Goedkeuren
              </button>
              <button style={{ ...s.btn(true), background: "#E24B4A" }} onClick={() => handleQaDecision("rejected")} disabled={qaSaving}>
                <i className="ti ti-x" /> Afkeuren
              </button>
              <button style={s.btn(false)} onClick={() => setQaModal(null)}>Cancel</button>
            </div>
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
    if (!currentPassword) { setError("Enter your current password."); return; }
    if (password.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    // Verify the current password by re-authenticating, since an active session
    // alone isn't proof of identity (e.g. an unattended device on the work floor)
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      setSaving(false);
      setError("Current password is incorrect.");
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
        <div style={{ fontSize: 15, fontWeight: 700, color: "#09325A", marginBottom: 12 }}>Change password</div>
        {success ? (
          <>
            <div style={{ fontSize: 13, color: "#1D9E75", marginBottom: 16 }}><i className="ti ti-circle-check" /> Password successfully changed.</div>
            <button style={s.btn(true)} onClick={onClose}>Sluiten</button>
          </>
        ) : (
          <>
            <div style={s.label}>Current password</div>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={s.input} placeholder="Your current password" autoFocus />
            <div style={{ ...s.label, marginTop: 10 }}>New password</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={s.input} placeholder="Minimum 6 characters" />
            <div style={{ ...s.label, marginTop: 10 }}>Confirm new password</div>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} style={s.input} placeholder="Repeat new password" />
            {error && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 8 }}>{error}</div>}
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button style={s.btn(true)} onClick={save} disabled={saving || !currentPassword || !password || !confirm}>
                <i className="ti ti-check" /> {saving ? "Saving..." : "Save"}
              </button>
              <button style={s.btn(false)} onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Organization settings ───────────────────────────────────
function OrganizationSettings({ profile }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", qa_approval_enabled: false, primary_color: "#0B6EC1" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const logoInputRef = useRef(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("organizations").select("*").eq("id", profile.organization_id).single();
    if (data) {
      setOrg(data);
      setForm({ name: data.name || "", address: data.address || "", qa_approval_enabled: !!data.qa_approval_enabled, primary_color: data.primary_color || "#0B6EC1" });
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const { error: updateError } = await supabase.from("organizations").update({
      name: form.name,
      address: form.address,
      qa_approval_enabled: form.qa_approval_enabled,
      primary_color: form.primary_color,
    }).eq("id", profile.organization_id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    await load();
  }

  const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

  async function handleLogoUpload(file) {
    if (!file) return;
    setError(null);
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, or SVG files are allowed for the logo.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError("The logo can be a maximum of 2 MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name?.split(".").pop() || "png";
      const path = `${profile.organization_id}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("organization-logos").upload(path, file, {
        contentType: file.type || "image/png",
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("organization-logos").getPublicUrl(path);
      await supabase.from("organizations").update({ logo_url: urlData.publicUrl }).eq("id", profile.organization_id);
      await load();
    } catch (e) {
      setError("Logo upload failed: " + e.message);
    }
    setUploadingLogo(false);
  }

  if (loading) return <div style={s.empty}>Laden...</div>;

  return (
    <div style={s.page}>
      <div style={s.sTitle}><span>Organization</span></div>

      {error && (
        <div style={{ fontSize: 12, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{error}</div>
      )}
      {success && (
        <div style={{ fontSize: 12, color: "#0F6E56", background: "#E1F5EE", border: "1px solid #1D9E75", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>Saved.</div>
      )}

      <div style={s.card}>
        <div style={s.label}>Logo</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          {org?.logo_url ? (
            <img src={org.logo_url} style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, border: "1px solid #eee", background: "#fafafa" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 8, border: "1px dashed #ddd", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc" }}>
              <i className="ti ti-building" style={{ fontSize: 24 }} />
            </div>
          )}
          <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} style={s.btn(false)}>
            <i className="ti ti-upload" /> {uploadingLogo ? "Uploading..." : "Upload logo"}
          </button>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml" style={{ display: "none" }} onChange={(e) => { handleLogoUpload(e.target.files[0]); e.target.value = ""; }} />
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 14 }}>
          PNG, JPG, or SVG, max. 2 MB. Note: an SVG logo will show in the app, but can't be embedded in the PDF report — use PNG or JPG for PDF display.
        </div>

        <div style={s.label}>Company name</div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={s.input} placeholder="e.g. Outpath Solutions" />

        <div style={{ ...s.label, marginTop: 10 }}>Address</div>
        <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} style={{ ...s.input, resize: "vertical" }} placeholder="Street, postal code, city" />

        <div style={{ ...s.label, marginTop: 10 }}>Brand color</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} style={{ width: 44, height: 32, border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
          <span style={{ fontSize: 12, color: "#888" }}>{form.primary_color}</span>
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Used as the main color in PDF and online reports.</div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "0.5px solid #eee" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Workflow</div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={form.qa_approval_enabled} onChange={(e) => setForm((f) => ({ ...f, qa_approval_enabled: e.target.checked }))} style={{ width: 15, height: 15, accentColor: "#1D9E75", marginTop: 2 }} />
            <span style={{ fontSize: 12, color: "#555" }}>
              QA approval required<br />
              <span style={{ fontSize: 11, color: "#aaa" }}>Submitted audits must first be approved by an admin/manager before they are final.</span>
            </span>
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={s.btn(true)} onClick={save} disabled={saving}>
            <i className="ti ti-check" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
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
  if (role !== "admin") nav = nav.filter((n) => n.id !== "users" && n.id !== "org"); // only admins manage users and org settings
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
    if (!confirm("Permanently delete this user?")) return;
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
        <span>Users ({users.length})</span>
        <button style={s.btn(true)} onClick={() => setShowForm((v) => !v)}>
          <i className={`ti ${showForm ? "ti-x" : "ti-plus"}`} /> {showForm ? "Close" : "Add"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#A32D2D", background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {showForm && (
        <div style={{ ...s.card, border: "1px solid #1D9E75", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#1D9E75" }}>New user</div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>The user will receive an email with a secure link to set their own password.</div>
          <div style={s.label}>E-mailadres *</div>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={s.input} placeholder="name@company.com" />
          <div style={{ ...s.label, marginTop: 8 }}>Full name</div>
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} style={s.input} placeholder="Optional" />
          <div style={{ ...s.label, marginTop: 8 }}>Role</div>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={s.select}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={s.btn(true)} onClick={save} disabled={!form.email.trim() || saving}>
              <i className="ti ti-mail" /> {saving ? "Sending..." : "Send invitation"}
            </button>
            <button style={s.btn(false)} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={s.empty}>Laden...</div>
        : users.length === 0 ? <div style={s.empty}><i className="ti ti-users" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />No users yet.</div>
        : users.map((u) => (
          <div key={u.id} style={s.card}>
            <div style={s.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name || u.email || "Unknown"}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{u.email}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                  <i className="ti ti-clock" style={{ fontSize: 11 }} /> Last login: {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleString("nl-NL", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Never logged in"}
                </div>
                {u.must_change_password && (
                  <span style={{ fontSize: 10, fontWeight: 500, display: "inline-block", marginTop: 4, padding: "2px 7px", borderRadius: 10, background: "#FAEEDA", color: "#633806" }}>
                    <i className="ti ti-clock" style={{ fontSize: 10 }} /> Invitation not yet activated
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

export default function Dashboard({ session, profile, onStartAudit, onResumeAudit, onViewReport }) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 11, color: "#888", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</span>
          {profile?.role && <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: "#E6F1FB", color: "#0C447C", flexShrink: 0 }}>{ROLE_LABEL[profile.role] || profile.role}</span>}
          <button onClick={() => setShowPasswordModal(true)} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer", flexShrink: 0 }} title="Change password">
            <i className="ti ti-key" />
          </button>
          <button onClick={handleLogout} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer", flexShrink: 0 }}>Log out</button>
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
      {page === "audits"     && <Audits session={session} onNewAudit={onStartAudit} onResumeAudit={onResumeAudit} canDelete={canDeleteAudit} canArchive={canArchiveAudit} onViewReport={onViewReport} canApproveQA={canArchiveAudit} />}
      {page === "users"      && <Users profile={profile} session={session} />}
      {page === "org"        && <OrganizationSettings profile={profile} />}
    </div>
  );
}
