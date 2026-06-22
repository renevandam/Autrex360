import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { exportAuditToPdf } from "./lib/exportPdf";
import { exportAuditToPrintForm } from "./lib/exportPrintForm";
import { saveAuditSnapshot, getAuditSnapshot, queueResponse, queueStockRow, countPending } from "./lib/offlineStore";
import { syncAuditToServer } from "./lib/offlineSync";
import { uploadAuditPhoto, getPhotosForItem, deleteAuditPhoto } from "./lib/photoStorage";

function pctColor(pct) {
  if (pct < 20) return "#A32D2D";
  if (pct < 40) return "#C04A1A";
  if (pct < 60) return "#BA7517";
  if (pct < 80) return "#3B6D11";
  return "#085041";
}

// Current date/time formatted for the matching HTML input type
function nowForMode(mode) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (mode === "time") return timePart;
  if (mode === "datetime") return `${datePart}T${timePart}`;
  return datePart; // "date"
}

const card = { border: "1px solid #e0e0e0", borderRadius: 10, padding: "0.875rem 1rem", background: "#fafafa" };
const sec = { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee" };
const secTitle = { fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: 6 };

// ── Signature pad ─────────────────────────────────────────
function SignaturePad({ label }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hasSig, setHasSig] = useState(false);
  const [name, setName] = useState("");
  const drawing = useRef(false);
  const initialized = useRef(false);
  const ctx = useRef(null);

  function initCanvas() {
    const wrap = wrapRef.current; const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const w = wrap.getBoundingClientRect().width || wrap.offsetWidth;
    if (w < 10) return;
    const r = window.devicePixelRatio || 1;
    canvas.width = w * r; canvas.height = 110 * r;
    canvas.style.width = w + "px"; canvas.style.height = "110px";
    const c = canvas.getContext("2d");
    c.setTransform(1,0,0,1,0,0); c.scale(r,r);
    c.strokeStyle = "#111"; c.lineWidth = 2.2; c.lineCap = "round"; c.lineJoin = "round";
    ctx.current = c; initialized.current = true;
  }
  useEffect(() => { const t = [50,150,300,600].map((d) => setTimeout(initCanvas,d)); return () => t.forEach(clearTimeout); }, []);
  function ensureInit() { if (!initialized.current) initCanvas(); }
  function getPos(e) { ensureInit(); const rect = canvasRef.current.getBoundingClientRect(); const src = e.touches?e.touches[0]:e; return {x:src.clientX-rect.left,y:src.clientY-rect.top}; }
  function onStart(e) { e.preventDefault(); ensureInit(); drawing.current=true; const p=getPos(e); ctx.current.beginPath(); ctx.current.moveTo(p.x,p.y); }
  function onMove(e) { if(!drawing.current)return; e.preventDefault(); const p=getPos(e); ctx.current.lineTo(p.x,p.y); ctx.current.stroke(); if(!hasSig)setHasSig(true); }
  function onEnd() { drawing.current=false; }
  function clear() { if(initialized.current&&ctx.current){const r=window.devicePixelRatio||1;ctx.current.clearRect(0,0,canvasRef.current.width/r,canvasRef.current.height/r);} setHasSig(false); }

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:7,marginTop:8 }}>
      <div style={{ fontSize:12,color:"#555",fontWeight:500 }}>{label || "Signature"}</div>
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" style={{ border:"0.5px solid #ccc",borderRadius:8,padding:"6px 10px",fontSize:13,fontFamily:"inherit",background:"white",width:"100%" }} />
      <div ref={wrapRef} style={{ position:"relative",height:110,border:hasSig?"1.5px solid #1D9E75":"1.5px dashed #ccc",borderRadius:8,overflow:"hidden",cursor:"crosshair",background:"white" }}>
        <canvas ref={canvasRef} style={{ position:"absolute",top:0,left:0,touchAction:"none" }} onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
        {!hasSig && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#aaa",pointerEvents:"none",gap:5 }}><i className="ti ti-pencil" /> Sign here</div>}
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <button onClick={clear} style={{ fontSize:11,color:"#888",border:"0.5px solid #ddd",borderRadius:6,padding:"3px 9px",background:"none",cursor:"pointer" }}><i className="ti ti-trash" /> Clear</button>
        <span style={{ fontSize:11,color:hasSig?"#0F6E56":"#aaa" }}>{hasSig?<><i className="ti ti-check" /> Signed</>:"Not signed"}</span>
      </div>
      <div style={{ fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:4 }}><i className="ti ti-calendar" /> {new Date().toLocaleDateString("en-US")}</div>
    </div>
  );
}

// ── Stock take table ──────────────────────────────────────
// ── Info icon with click-to-show popover (not included in reports/PDF) ──
// ── Photo upload: camera capture or file picker, with thumbnails + lightbox ──
function PhotoUpload({ auditId, itemId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [error, setError] = useState(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      if (!auditId) { setLoading(false); return; }
      const data = await getPhotosForItem(auditId, itemId);
      setPhotos(data);
      setLoading(false);
    }
    load();
  }, [auditId, itemId]);

  async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0 || !auditId) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const newPhoto = await uploadAuditPhoto(auditId, itemId, file);
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch (e) {
      setError("Upload failed: " + e.message);
    }
    setUploading(false);
  }

  async function handleDelete(photo) {
    if (!confirm("Delete this photo?")) return;
    await deleteAuditPhoto(photo.id, photo.storage_path);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {error && <div style={{ fontSize: 11, color: "#E24B4A", marginBottom: 6 }}>{error}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {photos.map((photo) => (
          <div key={photo.id} style={{ position: "relative", width: 52, height: 52 }}>
            <img
              src={photo.url}
              onClick={() => setLightboxUrl(photo.url)}
              style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid #ddd" }}
            />
            <button
              onClick={() => handleDelete(photo)}
              style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "#E24B4A", color: "white", border: "none", fontSize: 10, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888", border: "0.5px dashed #ccc", borderRadius: 6, padding: "4px 8px", background: "none", cursor: uploading ? "not-allowed" : "pointer" }}
        >
          <i className="ti ti-camera" /> {uploading ? "Uploading..." : "Camera"}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888", border: "0.5px dashed #ccc", borderRadius: 6, padding: "4px 8px", background: "none", cursor: uploading ? "not-allowed" : "pointer" }}
        >
          <i className="ti ti-photo" /> File
        </button>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={lightboxUrl} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

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

function StockTakeTable({ item, auditId, isOffline, snapshotStockRows, onSavedOnline }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const maxRows = item.stock_max_rows || 5;
  const col1 = item.stock_col1_label || "Item number";
  const col2 = item.stock_col2_label || "Bin location";
  const col3 = item.stock_col3_label || "Quantity";
  const saveTimers = useRef({});
  const pendingValues = useRef({}); // rowIdx -> latest {field: value} not yet flushed

  useEffect(() => {
    async function load() {
      if (!auditId) { setLoading(false); return; }
      let data;
      if (isOffline) {
        // Use whatever was bundled in the offline snapshot, no network call
        data = (snapshotStockRows || []).filter((r) => r.item_id === item.id);
      } else {
        const res = await supabase.from("stock_checks").select("*").eq("audit_id", auditId).eq("item_id", item.id).order("row_order");
        data = res.data;
      }
      let loaded = (data || []).sort((a, b) => a.row_order - b.row_order);
      // Pad with empty rows up to maxRows so there's always something to fill in
      while (loaded.length < maxRows) {
        loaded = [...loaded, { id: null, row_order: loaded.length, col1_value: "", col2_value: "", col3_value: "" }];
      }
      setRows(loaded.slice(0, maxRows));
      setLoading(false);
    }
    load();
  }, [auditId, item.id, maxRows, isOffline]);

  function updateCell(rowIdx, field, value) {
    setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r));
    if (!auditId) return;
    pendingValues.current[rowIdx] = { ...(pendingValues.current[rowIdx] || {}), [field]: value };
    clearTimeout(saveTimers.current[rowIdx]);
    saveTimers.current[rowIdx] = setTimeout(async () => {
      const pending = pendingValues.current[rowIdx] || {};
      delete pendingValues.current[rowIdx];
      // Read current row state at flush time (not at keystroke time) to merge with whatever else changed
      setRows((currentRows) => {
        const row = { ...currentRows[rowIdx], ...pending };
        const values = {
          col1_value: row.col1_value || null,
          col2_value: row.col2_value || null,
          col3_value: row.col3_value || null,
        };
        if (isOffline) {
          // No network at all - write to the local queue, synced later by the auditor
          queueStockRow(auditId, item.id, rowIdx, values);
        } else {
          // True upsert on the (audit_id, item_id, row_order) unique constraint
          supabase.from("stock_checks")
            .upsert({ audit_id: auditId, item_id: item.id, row_order: rowIdx, ...values }, { onConflict: "audit_id,item_id,row_order" })
            .select()
            .single()
            .then(({ data }) => {
              if (data) setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, id: data.id } : r));
              if (onSavedOnline) onSavedOnline();
            });
        }
        return currentRows;
      });
    }, 500);
  }

  if (loading) return <div style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>Loading table...</div>;

  return (
    <div style={{ marginTop: 8, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {[col1, col2, col3].map((h) => (
              <th key={h} style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textAlign: "left", padding: "5px 6px", borderBottom: "0.5px solid #eee" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td style={{ padding: "4px 4px" }}>
                <input value={row.col1_value || ""} onChange={(e) => updateCell(idx, "col1_value", e.target.value)} style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 5, padding: "5px 7px", fontSize: 12, background: "white" }} />
              </td>
              <td style={{ padding: "4px 4px" }}>
                <input value={row.col2_value || ""} onChange={(e) => updateCell(idx, "col2_value", e.target.value)} style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 5, padding: "5px 7px", fontSize: 12, background: "white" }} />
              </td>
              <td style={{ padding: "4px 4px", width: 90 }}>
                <input type="number" value={row.col3_value || ""} onChange={(e) => updateCell(idx, "col3_value", e.target.value)} style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 5, padding: "5px 7px", fontSize: 12, background: "white", textAlign: "center" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Answer input per type ─────────────────────────────────
function AnswerInput({ item, options, value, onChange }) {
  const type = item.answer_type || "score";

  // Auto-fill datetime questions with the current moment the first time they're shown.
  // Placed unconditionally at the top, per React's rules of hooks - the type check happens inside.
  useEffect(() => {
    if (type === "datetime" && (value === undefined || value === null || value === "")) {
      onChange(nowForMode(item.datetime_mode || "date"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  if (type === "score" && options.length > 0) {
    return (
      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginTop:7 }}>
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button key={opt.id} onClick={() => onChange(opt.id)} style={{
              padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",
              border: selected ? `2px solid ${opt.color||"#888"}` : "1.5px solid #bbb",
              background: selected ? (opt.color||"#888")+"22" : "white",
              color: selected ? opt.color||"#555" : "#555",
            }}>{opt.label}</button>
          );
        })}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <label style={{ display:"flex",alignItems:"center",gap:8,marginTop:8,cursor:"pointer" }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ width:16,height:16,accentColor:"#1D9E75" }} />
        <span style={{ fontSize:13,color:"#555" }}>Agree</span>
      </label>
    );
  }

  if (type === "number") {
    return (
      <input type="number" value={value||""} onChange={(e)=>onChange(e.target.value)} placeholder="Enter a number" style={{ border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"inherit",marginTop:7,width:140 }} />
    );
  }

  if (type === "slider") {
    const pct = value || 0;
    const color = pct<25?"#A32D2D":pct<50?"#BA7517":pct<75?"#3B6D11":"#0F6E56";
    return (
      <div style={{ marginTop:8 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
          <span style={{ fontSize:12,color:"#888" }}>0%</span>
          <span style={{ fontSize:14,fontWeight:600,color }}>{pct}%</span>
          <span style={{ fontSize:12,color:"#888" }}>100%</span>
        </div>
        <div style={{ position:"relative",height:7,borderRadius:4,background:"linear-gradient(to right,#E24B4A,#EF9F27,#639922,#1D9E75)" }}>
          <input type="range" min={0} max={100} value={pct} onChange={(e)=>onChange(Number(e.target.value))} style={{ WebkitAppearance:"none",appearance:"none",width:"100%",position:"absolute",top:"50%",transform:"translateY(-50%)",left:0,height:7,background:"transparent",cursor:"pointer" }} />
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa",marginTop:3 }}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
    );
  }

  if (type === "signature") {
    return <SignaturePad label={item.label} />;
  }

  if (type === "datetime") {
    const mode = item.datetime_mode || "date";
    const htmlType = mode === "time" ? "time" : mode === "datetime" ? "datetime-local" : "date";
    return (
      <input
        type={htmlType}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ border:"1px solid #ddd", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"inherit", marginTop:7, width: mode === "date" ? 160 : mode === "time" ? 130 : 210 }}
      />
    );
  }

  // text (default)
  return (
    <input type="text" value={value||""} onChange={(e)=>onChange(e.target.value)} placeholder="Enter an answer" style={{ border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"inherit",marginTop:7,width:"100%" }} />
  );
}

// ── Main AuditRun ─────────────────────────────────────────
export default function AuditRun({ session, profile, auditId, locationId, templateId, location, template, onBack }) {
  const [sections, setSections] = useState([]);
  const [itemOptions, setItemOptions] = useState({});
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("audit");
  const [addrVerified, setAddrVerified] = useState(false);
  const [addrChanged, setAddrChanged] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [locData, setLocData] = useState({ name: location?.name||"", street: "", city: "", detail: "" });
  const [editDraft, setEditDraft] = useState({ ...locData });
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [printingForm, setPrintingForm] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [snapshotStockRows, setSnapshotStockRows] = useState([]);
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({}); // sectionId -> boolean
  const autoCollapsedOnce = useRef({}); // sectionId -> true once we've auto-collapsed it, so re-opening manually sticks
  const sectionRefs = useRef({});
  const navScrollRef = useRef(null);
  const saveTimers = useRef({});

  // Track browser online/offline state so the UI can react immediately
  useEffect(() => {
    function goOnline() { setIsOffline(false); }
    function goOffline() { setIsOffline(true); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Refresh the count of locally-queued, not-yet-synced changes
  async function refreshPendingCount() {
    if (!auditId) return;
    const count = await countPending(auditId);
    setPendingCount(count);
  }

  useEffect(() => {
    async function load() {
      // If we have no network at all, go straight to whatever was downloaded earlier
      if (isOffline && auditId) {
        const snapshot = await getAuditSnapshot(auditId);
        if (snapshot) {
          setLocData(snapshot.locData);
          setEditDraft(snapshot.locData);
          setSections(snapshot.sections);
          setItemOptions(snapshot.itemOptions);
          setSnapshotStockRows(snapshot.stockRows || []);
          setResponses(snapshot.responses || {});
          setAddrVerified(!!snapshot.addrVerified);
          setHasOfflineSnapshot(true);
          await refreshPendingCount();
          setLoading(false);
          return;
        }
        // No snapshot available and no network - nothing we can do
        setLoading(false);
        return;
      }

      if (locationId) {
        const { data: loc } = await supabase.from("locations").select("*").eq("id", locationId).single();
        if (loc) {
          const d = { name: loc.name, street: loc.street||"", city: `${loc.postal_code||""} ${loc.city||""}`.trim(), detail: loc.location_detail||"" };
          setLocData(d); setEditDraft(d);
        }
      }
      const { data: secs } = await supabase.from("template_sections").select("*").eq("template_id", templateId).order("sort_order");
      if (!secs || secs.length === 0) { setSections([]); setLoading(false); return; }
      const { data: itemsRaw } = await supabase.from("template_items").select("*, answer_sets(id,name)").in("section_id", secs.map((s) => s.id)).order("sort_order");
      const setIds = [...new Set((itemsRaw||[]).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];
      let optionsMap = {};
      if (setIds.length > 0) {
        const { data: opts } = await supabase.from("answer_options").select("*").in("set_id", setIds).order("sort_order");
        (opts||[]).forEach((o) => { optionsMap[o.set_id] = optionsMap[o.set_id]||[]; optionsMap[o.set_id].push(o); });
      }
      const grouped = {};
      (itemsRaw||[]).forEach((item) => { grouped[item.section_id] = grouped[item.section_id]||[]; grouped[item.section_id].push(item); });
      const itemOpts = {};
      (itemsRaw||[]).forEach((item) => { itemOpts[item.id] = item.answer_set_id ? (optionsMap[item.answer_set_id]||[]) : []; });
      setSections(secs.map((s) => ({ ...s, items: grouped[s.id]||[] })));
      setItemOptions(itemOpts);

      // Load any previously saved responses for this audit (resume a draft)
      if (auditId) {
        const { data: savedResponses } = await supabase.from("audit_responses").select("item_id, response").eq("audit_id", auditId);
        if (savedResponses && savedResponses.length > 0) {
          const restored = {};
          savedResponses.forEach((r) => { restored[r.item_id] = r.response; });
          setResponses(restored);
        }
        const { data: auditRow } = await supabase.from("audits").select("address_verified, address_override").eq("id", auditId).single();
        if (auditRow) {
          setAddrVerified(!!auditRow.address_verified);
          if (auditRow.address_override) {
            setLocData((prev) => ({ ...prev, ...auditRow.address_override }));
            setEditDraft((prev) => ({ ...prev, ...auditRow.address_override }));
            setAddrChanged(true);
          }
        }
        const existingSnapshot = await getAuditSnapshot(auditId);
        setHasOfflineSnapshot(!!existingSnapshot);
        await refreshPendingCount();
      }
      setLoading(false);
    }
    load();
  }, [locationId, templateId, auditId, isOffline]);

  // Builds and stores a fresh local snapshot. Used both for the explicit
  // "download" button and for silent background refreshes while online,
  // so the offline copy never goes stale once it has been created once.
  async function refreshSnapshot(currentResponses) {
    if (!auditId) return;
    const itemIds = sections.flatMap((s) => s.items.map((i) => i.id));
    const { data: stockRows } = itemIds.length
      ? await supabase.from("stock_checks").select("*").in("item_id", itemIds).eq("audit_id", auditId)
      : { data: [] };
    await saveAuditSnapshot(auditId, {
      locData,
      sections,
      itemOptions,
      responses: currentResponses,
      stockRows: stockRows || [],
      addrVerified,
    });
    setHasOfflineSnapshot(true);
  }

  // Downloads everything needed to run this audit with zero network connectivity
  async function handleDownloadOffline() {
    if (downloadingOffline || !auditId) return;
    setDownloadingOffline(true);
    try {
      await refreshSnapshot(responses);
    } catch (e) {
      alert("Downloading for offline use failed: " + e.message);
    }
    setDownloadingOffline(false);
  }

  // Keep the local snapshot in sync in the background, but only once the
  // auditor has actually created one - we shouldn't force a download nobody asked for.
  async function refreshSnapshotIfExists(currentResponses) {
    if (!auditId || isOffline) return;
    const existing = await getAuditSnapshot(auditId);
    if (existing) await refreshSnapshot(currentResponses);
  }

  // Pushes every locally-queued change to Supabase. Auditor triggers this manually.
  async function handleSync() {
    if (syncing || !auditId) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncAuditToServer(auditId);
      setSyncResult(result);
      await refreshPendingCount();
    } catch (e) {
      setSyncResult({ synced: 0, failed: 0, error: e.message });
    }
    setSyncing(false);
  }

  const rawItems = sections.flatMap((s) => s.items);

  // A question is visible if it has no condition, or its condition is currently met
  function isVisible(item) {
    if (!item.depends_on_item_id) return true;
    return responses[item.depends_on_item_id] === item.depends_on_value;
  }

  const allItems = rawItems.filter(isVisible);
  // exclude signature type from progress count
  const countableItems = allItems.filter((i) => i.answer_type !== "signature" && i.answer_type !== "stock_take");
  const answered = countableItems.filter((i) => responses[i.id] !== undefined && responses[i.id] !== null && responses[i.id] !== "");
  const progress = countableItems.length > 0 ? Math.round((answered.length / countableItems.length) * 100) : 0;

  // Per-section progress, used to drive the sticky nav bar checkmarks/counters
  function sectionProgress(section) {
    const visibleItems = section.items.filter(isVisible).filter((i) => i.answer_type !== "signature" && i.answer_type !== "stock_take");
    if (visibleItems.length === 0) return { answered: 0, total: 0, complete: true };
    const ans = visibleItems.filter((i) => responses[i.id] !== undefined && responses[i.id] !== null && responses[i.id] !== "");
    return { answered: ans.length, total: visibleItems.length, complete: ans.length === visibleItems.length };
  }

  function scrollToSection(sectionId) {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const yOffset = -96; // account for sticky header + nav bar height
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setActiveSectionId(sectionId);
  }

  function toggleSection(sectionId) {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  // Auto-collapse a section the first time it becomes fully answered.
  // Tracked via autoCollapsedOnce so manually re-opening it (e.g. to fix an answer) doesn't get immediately re-collapsed.
  useEffect(() => {
    sections.forEach((sec) => {
      const prog = sectionProgress(sec);
      if (prog.total > 0 && prog.complete && !autoCollapsedOnce.current[sec.id]) {
        autoCollapsedOnce.current[sec.id] = true;
        setCollapsedSections((prev) => ({ ...prev, [sec.id]: true }));
      }
    });
  }, [responses, sections]);

  // Track which section is currently in view, to highlight it in the sticky nav
  useEffect(() => {
    function onScroll() {
      const sectionEntries = Object.entries(sectionRefs.current);
      let current = null;
      for (const [id, el] of sectionEntries) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 140) current = id;
      }
      if (current) setActiveSectionId(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  // Score
  const itemWeight = (i) => i.weight ? Number(i.weight) : 1;
  const scoreItems = allItems.filter((i) => (i.answer_type === "score" || !i.answer_type) && (itemOptions[i.id]||[]).length > 0);
  const naAnswers = scoreItems.filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt?.is_na; });
  const itemMaxScore = (i) => Math.max(0, ...((itemOptions[i.id]||[]).filter((o) => !o.is_na && o.score !== null).map((o) => o.score)));
  const relevantMax = scoreItems.filter((i) => !naAnswers.includes(i)).reduce((sum, i) => sum + itemMaxScore(i) * itemWeight(i), 0);
  const achieved = scoreItems.filter((i) => responses[i.id]).filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt && !opt.is_na; }).reduce((sum,i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return sum+(opt?.score||0)*itemWeight(i); }, 0);
  const pct = relevantMax > 0 ? Math.round((achieved / relevantMax) * 100) : 0;
  const actionItems = allItems.filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt?.is_action_item; });

  // Per-section score, using the same weighting/NA logic as the overall score
  function sectionScore(section) {
    const items = section.items.filter(isVisible).filter((i) => (i.answer_type === "score" || !i.answer_type) && (itemOptions[i.id]||[]).length > 0);
    const na = items.filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt?.is_na; });
    const max = items.filter((i) => !na.includes(i)).reduce((sum, i) => sum + itemMaxScore(i) * itemWeight(i), 0);
    const ach = items.filter((i) => responses[i.id]).filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt && !opt.is_na; }).reduce((sum,i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return sum+(opt?.score||0)*itemWeight(i); }, 0);
    return { max, achieved: ach, pct: max > 0 ? Math.round((ach / max) * 100) : null };
  }

  function setResponse(id, val) {
    setResponses((p) => ({ ...p, [id]: val }));
    if (!auditId) return;
    const responseText = typeof val === "boolean" ? String(val) : String(val ?? "");
    if (isOffline) {
      // No network at all - write straight to the local queue, no debounce needed since IndexedDB writes are cheap
      queueResponse(auditId, id, responseText).then(refreshPendingCount);
      return;
    }
    // Debounce per-item so rapid changes (e.g. slider drag) don't spam the database
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      await supabase.from("audit_responses").upsert(
        { audit_id: auditId, item_id: id, response: responseText },
        { onConflict: "audit_id,item_id" }
      );
      // Keep any existing offline snapshot fresh, so going offline later never loses this answer
      clearTimeout(saveTimers.current.__snapshotRefresh);
      saveTimers.current.__snapshotRefresh = setTimeout(() => {
        setResponses((current) => { refreshSnapshotIfExists(current); return current; });
      }, 800);
    }, 500);
  }

  async function saveAddressState(verified, override) {
    if (!auditId) return;
    await supabase.from("audits").update({
      address_verified: verified,
      address_override: override && addrChanged ? override : null,
    }).eq("id", auditId);
  }

  async function handleExportPdf() {
    if (exportingPdf || !auditId) return;
    setExportingPdf(true);
    try {
      await exportAuditToPdf(auditId);
    } catch (e) {
      alert("Could not generate PDF: " + e.message);
    }
    setExportingPdf(false);
  }

  async function handlePrint() {
    if (printingForm || !auditId) return;
    setPrintingForm(true);
    try {
      if (isOffline) {
        const snapshot = await getAuditSnapshot(auditId);
        if (!snapshot) throw new Error("No offline snapshot available - download the audit while online first.");
        await exportAuditToPrintForm(auditId, {
          locData: snapshot.locData,
          templateName: template?.name,
          auditorName: session?.user?.email,
          auditDate: new Date().toISOString().slice(0, 10),
          sections: snapshot.sections,
          itemOptions: snapshot.itemOptions,
          organization: null, // org branding isn't part of the snapshot; falls back to a generic header
        });
      } else {
        await exportAuditToPrintForm(auditId);
      }
    } catch (e) {
      alert("Could not generate the print form: " + e.message);
    }
    setPrintingForm(false);
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    if (auditId) {
      // Check whether this organization requires QA approval before an audit counts as fully done
      let qaEnabled = false;
      if (profile?.organization_id) {
        const { data: org } = await supabase.from("organizations").select("qa_approval_enabled").eq("id", profile.organization_id).single();
        qaEnabled = !!org?.qa_approval_enabled;
      }
      await supabase.from("audits").update({
        status: "submitted",
        qa_status: qaEnabled ? "pending" : "not_required",
        score_achieved: relevantMax > 0 ? Math.round(achieved) : null,
        score_max: relevantMax > 0 ? Math.round(relevantMax) : null,
        score_pct: relevantMax > 0 ? pct : null,
        address_verified: addrVerified,
        capacity_pct: null,
        submitted_at: new Date().toISOString(),
      }).eq("id", auditId);
    }
    setSubmitting(false);
    setView("success");
  }

  if (loading) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"3rem",textAlign:"center",color:"#aaa" }}>
      <i className="ti ti-loader-2" style={{ fontSize:32,display:"block",marginBottom:8 }} />Loading audit...
    </div>
  );

  if (isOffline && sections.length === 0) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"2rem",textAlign:"center" }}>
      <i className="ti ti-wifi-off" style={{ fontSize:36,color:"#EF9F27",display:"block",marginBottom:10 }} />
      <div style={{ fontSize:16,fontWeight:600,marginBottom:8 }}>No connection and no offline version</div>
      <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>This audit has not been downloaded for offline use yet. Go back to wifi/4G and download the audit first.</div>
      <button onClick={onBack} style={{ padding:"8px 16px",background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer" }}>Back to dashboard</button>
    </div>
  );

  if (sections.length === 0) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"2rem",textAlign:"center" }}>
      <div style={{ fontSize:16,fontWeight:600,marginBottom:8 }}>No sections found</div>
      <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>This template has no sections and questions yet.</div>
      <button onClick={onBack} style={{ padding:"8px 16px",background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer" }}>Back to dashboard</button>
    </div>
  );

  if (view === "success") return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",background:"#fff",minHeight:"100vh" }}>
      <div style={{ padding:"1rem 1.25rem",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:17,fontWeight:500,display:"flex",alignItems:"center",gap:8 }}><i className="ti ti-clipboard-check" style={{ color:"#1D9E75" }} /> Autrex360</div>
        <span style={{ fontSize:11,background:"#E1F5EE",color:"#0F6E56",padding:"3px 10px",borderRadius:20 }}>Submitted</span>
      </div>
      <div style={{ padding:"2.5rem 1.25rem",textAlign:"center" }}>
        <div style={{ width:60,height:60,borderRadius:"50%",background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem" }}>
          <i className="ti ti-check" style={{ fontSize:30,color:"#0F6E56" }} />
        </div>
        <h2 style={{ fontSize:19,fontWeight:500,marginBottom:7 }}>Audit submitted</h2>
        <p style={{ fontSize:13,color:"#888",marginBottom:"1.5rem" }}>{locationId ? `The audit for ${locData.name} has been submitted.` : "The audit has been submitted."}</p>
        <div style={{ background:"#f9f9f9",border:"0.5px solid #eee",borderRadius:10,padding:"1rem",textAlign:"left",marginBottom:"1rem" }}>
          <div style={{ fontSize:11,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8 }}>Summary</div>
          {[
            ...(locationId ? [["Location", locData.name]] : []),
            ["Template", template?.name],
            ["Beantwoord", `${answered.length}/${countableItems.length} questions`],
            ...(relevantMax > 0 ? [["Score", `${pct}% (${Math.round(achieved*10)/10}/${Math.round(relevantMax*10)/10} pt)`]] : []),
          ].map(([lbl, val], i, arr) => (
            <div key={lbl} style={{ fontSize:13,display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<arr.length-1?"0.5px solid #eee":"none" }}>
              <span style={{ color:"#888" }}>{lbl}</span>
              <span style={{ fontWeight:500 }}>{val}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ padding:"9px 18px",background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer" }}>
          <i className="ti ti-home" /> Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",background:"#fff",minHeight:"100vh" }}>
      <div style={{ padding:"1rem 1.25rem",borderBottom:"0.5px solid #eee" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
          <button onClick={onBack} style={{ fontSize:13,color:"#1D9E75",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
            <i className="ti ti-arrow-left" /> Dashboard
          </button>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <button onClick={handleExportPdf} disabled={exportingPdf} style={{ fontSize:12,color:"#378ADD",border:"0.5px solid #378ADD",borderRadius:6,padding:"4px 9px",background:"none",cursor:exportingPdf?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className="ti ti-file-type-pdf" /> {exportingPdf ? "Generating..." : "PDF"}
            </button>
            <button onClick={handlePrint} disabled={printingForm} title="Printable blank form (paper fallback)" style={{ fontSize:12,color:"#888",border:"0.5px solid #ccc",borderRadius:6,padding:"4px 9px",background:"none",cursor:printingForm?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className="ti ti-printer" /> {printingForm ? "Generating..." : "Print"}
            </button>
            <div style={{ fontSize:11,color:"#888" }}>{session.user.email}</div>
          </div>
        </div>
        <div style={{ fontSize:15,fontWeight:600 }}>{template?.name}</div>
        {locationId && <div style={{ fontSize:12,color:"#888",marginTop:1 }}>{locData.name}</div>}
      </div>

      {/* Offline status bar */}
      <div style={{ padding:"8px 1.25rem",background:isOffline?"#FAEEDA":"#F0F7F4",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
        <div style={{ fontSize:12,color:isOffline?"#633806":"#0F6E56",display:"flex",alignItems:"center",gap:6 }}>
          <i className={`ti ${isOffline ? "ti-wifi-off" : "ti-wifi"}`} />
          {isOffline ? "Offline — changes are saved locally" : "Online"}
          {pendingCount > 0 && <span style={{ fontWeight:600 }}> · {pendingCount} not synced</span>}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {!isOffline && (
            <button onClick={handleDownloadOffline} disabled={downloadingOffline} style={{ fontSize:11,color:"#378ADD",border:"0.5px solid #378ADD",borderRadius:6,padding:"4px 9px",background:"none",cursor:downloadingOffline?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className="ti ti-download" /> {downloadingOffline ? "Downloading..." : hasOfflineSnapshot ? "Download again" : "Download for offline use"}
            </button>
          )}
          {pendingCount > 0 && !isOffline && (
            <button onClick={handleSync} disabled={syncing} style={{ fontSize:11,color:"white",border:"none",borderRadius:6,padding:"4px 9px",background:"#1D9E75",cursor:syncing?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className="ti ti-refresh" /> {syncing ? "Syncing..." : "Sync now"}
            </button>
          )}
        </div>
      </div>
      {syncResult && (
        <div style={{ padding:"6px 1.25rem", fontSize:11, color: syncResult.error ? "#A32D2D" : "#0F6E56", background: syncResult.error ? "#FCEBEB" : "#F0F7F4", borderBottom:"0.5px solid #eee" }}>
          {syncResult.error ? `Sync failed: ${syncResult.error}` : `${syncResult.synced} change(s) synced${syncResult.failed > 0 ? `, ${syncResult.failed} failed` : ""}.`}
        </div>
      )}

      <div style={{ padding:"10px 1.25rem",background:"#f9f9f9",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:12,color:"#888" }}>{answered.length} / {countableItems.length} questions answered</div>
        <div style={{ textAlign:"right" }}>
          {relevantMax > 0 ? <>
            <div style={{ fontSize:20,fontWeight:600,color:pctColor(pct) }}>{pct}%</div>
            <div style={{ fontSize:11,color:"#aaa" }}>{Math.round(achieved*10)/10} / {Math.round(relevantMax*10)/10} pt</div>
          </> : <div style={{ fontSize:12,color:"#aaa" }}>—</div>}
        </div>
      </div>
      <div style={{ height:3,background:"#eee" }}>
        <div style={{ height:3,background:"#1D9E75",width:progress+"%",transition:"width 0.3s" }} />
      </div>

      {/* Sticky section navigation */}
      {sections.filter((sec) => sec.items.filter(isVisible).length > 0).length > 1 && (
        <div ref={navScrollRef} style={{ position:"sticky", top:0, zIndex:50, background:"white", borderBottom:"1px solid #eee", display:"flex", gap:6, padding:"8px 1.25rem", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          {sections.filter((sec) => sec.items.filter(isVisible).length > 0).map((sec) => {
            const prog = sectionProgress(sec);
            const score = sectionScore(sec);
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                style={{
                  flexShrink: 0, display:"flex", alignItems:"center", gap:5,
                  padding:"6px 11px", borderRadius:20, fontSize:12, fontWeight:500, whiteSpace:"nowrap",
                  border: isActive ? "1.5px solid #1D9E75" : "1px solid #ddd",
                  background: isActive ? "#E1F5EE" : "white",
                  color: isActive ? "#085041" : "#555",
                  cursor:"pointer",
                }}
              >
                {prog.complete
                  ? <i className="ti ti-circle-check" style={{ color:"#1D9E75", fontSize:13 }} />
                  : <span style={{ fontSize:10, color:"#aaa" }}>{prog.answered}/{prog.total}</span>
                }
                {sec.name}
                {score.pct !== null && <span style={{ fontSize:10, fontWeight:600, color: pctColor(score.pct) }}>{score.pct}%</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* LOCATIE */}
      {locationId && (
        <div style={sec}>
          <div style={secTitle}><i className="ti ti-building-warehouse" /> Location details</div>
          <div style={{ background:"#f9f9f9",border:"1px solid #e0e0e0",borderRadius:10,padding:"0.875rem 1rem" }}>
            <div style={{ fontSize:14,fontWeight:600,marginBottom:3 }}>{locData.name}</div>
            <div style={{ fontSize:12,color:"#888",lineHeight:1.6 }}>{locData.street}<br />{locData.city}{locData.detail&&<><br />{locData.detail}</>}</div>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:10,paddingTop:10,borderTop:"0.5px solid #eee",flexWrap:"wrap" }}>
              <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
                <input type="checkbox" checked={addrVerified} onChange={(e)=>{ const checked=e.target.checked; setAddrVerified(checked); if(checked){setEditOpen(false);setAddrChanged(false);} saveAddressState(checked, locData); }} style={{ width:15,height:15,accentColor:"#1D9E75" }} />
                <span style={{ fontSize:12 }}>Address is correct and up to date</span>
              </label>
              <button onClick={()=>{ if(!editOpen){setEditDraft({...locData});setAddrVerified(false);setAddrChanged(true);} setEditOpen((v)=>!v); }} style={{ fontSize:11,color:editOpen?"#633806":"#185FA5",border:`0.5px solid ${editOpen?"#EF9F27":"#378ADD"}`,borderRadius:6,padding:"4px 9px",background:editOpen?"#FAEEDA":"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
                <i className={`ti ${editOpen?"ti-x":"ti-pencil"}`} style={{ fontSize:12 }} /> {editOpen?"Close":"Edit address"}
              </button>
            </div>
            {editOpen && (
              <div style={{ marginTop:10,background:"white",border:"0.5px solid #EF9F27",borderRadius:8,padding:10 }}>
                {[["Company name","name"],["Street","street"],["Postal code & city","city"],["Location detail","detail"]].map(([lbl,key]) => (
                  <div key={key}>
                    <div style={{ fontSize:11,color:"#888",marginBottom:3,marginTop:7 }}>{lbl}</div>
                    <input value={editDraft[key]} onChange={(e)=>setEditDraft((d)=>({...d,[key]:e.target.value}))} onBlur={()=>{ const updated={...editDraft}; setLocData(updated); setAddrChanged(true); saveAddressState(false, updated); }} style={{ width:"100%",border:"0.5px solid #ddd",borderRadius:6,padding:"6px 9px",fontSize:12,fontFamily:"inherit",background:"white" }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:8,fontSize:11,display:"flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:6,background:addrVerified?"#E1F5EE":addrChanged?"#FAEEDA":"#f0f0f0",color:addrVerified?"#0F6E56":addrChanged?"#633806":"#aaa" }}>
              <i className={`ti ${addrVerified?"ti-circle-check":addrChanged?"ti-alert-triangle":"ti-circle-dashed"}`} />
              {addrVerified?"Confirmed":addrChanged?"Address changed":"Not yet verified"}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC SECTIONS */}
      {sections.map((section) => {
        const visibleItems = section.items.filter(isVisible);
        if (visibleItems.length === 0) return null;
        const prog = sectionProgress(section);
        const score = sectionScore(section);
        const collapsed = !!collapsedSections[section.id];
        return (
        <div key={section.id} ref={(el) => { sectionRefs.current[section.id] = el; }} style={sec}>
          <div style={{ ...secTitle, cursor:"pointer", justifyContent:"space-between" }} onClick={() => toggleSection(section.id)}>
            <span><i className="ti ti-list" /> {section.name}</span>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              {score.pct !== null && <span style={{ fontSize:12, fontWeight:600, color: pctColor(score.pct) }}>{score.pct}%</span>}
              {prog.complete
                ? <i className="ti ti-circle-check" style={{ color:"#1D9E75", fontSize:14 }} />
                : <span style={{ fontSize:11, color:"#aaa", fontWeight:400 }}>{prog.answered}/{prog.total}</span>
              }
              <i className={`ti ${collapsed ? "ti-chevron-down" : "ti-chevron-up"}`} style={{ fontSize:15, color:"#aaa" }} />
            </span>
          </div>
          {!collapsed && (
          <div style={card}>
            {visibleItems.map((item, idx) => (
              <div key={item.id} style={{ padding:"10px 0",borderBottom:idx===visibleItems.length-1?"none":"0.5px solid #e8e8e8",paddingBottom:idx===visibleItems.length-1?0:10 }}>
                {item.answer_type !== "signature" && (
                  <>
                    <div style={{ fontSize:13,marginBottom:2 }}>{item.label}<InfoIcon text={item.info_text} /></div>
                    {item.sub_label && <div style={{ fontSize:11,color:"#aaa" }}>{item.sub_label}</div>}
                  </>
                )}
                {item.answer_type === "stock_take" ? (
                  <StockTakeTable item={item} auditId={auditId} isOffline={isOffline} snapshotStockRows={snapshotStockRows} onSavedOnline={() => {
                    clearTimeout(saveTimers.current.__snapshotRefresh);
                    saveTimers.current.__snapshotRefresh = setTimeout(() => {
                      setResponses((current) => { refreshSnapshotIfExists(current); return current; });
                    }, 800);
                  }} />
                ) : (
                  <AnswerInput
                    item={item}
                    options={itemOptions[item.id]||[]}
                    value={responses[item.id]}
                    onChange={(val) => setResponse(item.id, val)}
                  />
                )}
                {item.answer_type !== "signature" && item.answer_type !== "stock_take" && item.answer_type !== "datetime" && (
                  <PhotoUpload auditId={auditId} itemId={item.id} />
                )}
              </div>
            ))}
          </div>
          )}
        </div>
        );
      })}

      {/* SUBMIT */}
      <div style={{ padding:"1rem 1.25rem" }}>
        {isOffline ? (
          <div style={{ fontSize:12,color:"#888",textAlign:"center",padding:"10px",background:"#f5f5f5",borderRadius:8 }}>
            <i className="ti ti-wifi-off" /> Submitting requires a connection. Sync first once you are back online.
          </div>
        ) : pendingCount > 0 ? (
          <div style={{ fontSize:12,color:"#633806",textAlign:"center",padding:"10px",background:"#FAEEDA",borderRadius:8 }}>
            <i className="ti ti-alert-triangle" /> There are still {pendingCount} change(s) waiting to be synced. Sync first before submitting.
          </div>
        ) : (
          <button disabled={submitting} style={{ width:"100%",padding:11,background:submitting?"#9ccab8":"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:submitting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={handleSubmit}>
            <i className="ti ti-send" /> {submitting ? "Submitting..." : "Submit audit"}
          </button>
        )}
      </div>
    </div>
  );
}
