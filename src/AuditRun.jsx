import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { exportAuditToPdf } from "./lib/exportPdf";
import { saveAuditSnapshot, getAuditSnapshot, queueResponse, queueStockRow, countPending } from "./lib/offlineStore";
import { syncAuditToServer } from "./lib/offlineSync";

function pctColor(pct) {
  if (pct < 20) return "#A32D2D";
  if (pct < 40) return "#C04A1A";
  if (pct < 60) return "#BA7517";
  if (pct < 80) return "#3B6D11";
  return "#085041";
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
      <div style={{ fontSize:12,color:"#555",fontWeight:500 }}>{label || "Handtekening"}</div>
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Volledige naam" style={{ border:"0.5px solid #ccc",borderRadius:8,padding:"6px 10px",fontSize:13,fontFamily:"inherit",background:"white",width:"100%" }} />
      <div ref={wrapRef} style={{ position:"relative",height:110,border:hasSig?"1.5px solid #1D9E75":"1.5px dashed #ccc",borderRadius:8,overflow:"hidden",cursor:"crosshair",background:"white" }}>
        <canvas ref={canvasRef} style={{ position:"absolute",top:0,left:0,touchAction:"none" }} onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
        {!hasSig && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#aaa",pointerEvents:"none",gap:5 }}><i className="ti ti-pencil" /> Teken hier</div>}
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <button onClick={clear} style={{ fontSize:11,color:"#888",border:"0.5px solid #ddd",borderRadius:6,padding:"3px 9px",background:"none",cursor:"pointer" }}><i className="ti ti-trash" /> Wissen</button>
        <span style={{ fontSize:11,color:hasSig?"#0F6E56":"#aaa" }}>{hasSig?<><i className="ti ti-check" /> Ondertekend</>:"Niet ondertekend"}</span>
      </div>
      <div style={{ fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:4 }}><i className="ti ti-calendar" /> {new Date().toLocaleDateString("nl-NL")}</div>
    </div>
  );
}

// ── Stock take table ──────────────────────────────────────
function StockTakeTable({ item, auditId, isOffline, snapshotStockRows }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const maxRows = item.stock_max_rows || 5;
  const col1 = item.stock_col1_label || "Artikelnummer";
  const col2 = item.stock_col2_label || "Binlocatie";
  const col3 = item.stock_col3_label || "Aantal";
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
            });
        }
        return currentRows;
      });
    }, 500);
  }

  if (loading) return <div style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>Tabel laden...</div>;

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
        <span style={{ fontSize:13,color:"#555" }}>Akkoord</span>
      </label>
    );
  }

  if (type === "number") {
    return (
      <input type="number" value={value||""} onChange={(e)=>onChange(e.target.value)} placeholder="Voer een getal in" style={{ border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"inherit",marginTop:7,width:140 }} />
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

  // text (default)
  return (
    <input type="text" value={value||""} onChange={(e)=>onChange(e.target.value)} placeholder="Voer een antwoord in" style={{ border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"inherit",marginTop:7,width:"100%" }} />
  );
}

// ── Main AuditRun ─────────────────────────────────────────
export default function AuditRun({ session, auditId, locationId, templateId, location, template, onBack }) {
  const [sections, setSections] = useState([]);
  const [itemOptions, setItemOptions] = useState({});
  const [responses, setResponses] = useState({});
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("audit");
  const [addrVerified, setAddrVerified] = useState(false);
  const [addrChanged, setAddrChanged] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [locData, setLocData] = useState({ name: location?.name||"", street: "", city: "", detail: "" });
  const [editDraft, setEditDraft] = useState({ ...locData });
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [snapshotStockRows, setSnapshotStockRows] = useState([]);
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
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

      const { data: loc } = await supabase.from("locations").select("*").eq("id", locationId).single();
      if (loc) {
        const d = { name: loc.name, street: loc.street||"", city: `${loc.postal_code||""} ${loc.city||""}`.trim(), detail: loc.location_detail||"" };
        setLocData(d); setEditDraft(d);
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

  // Downloads everything needed to run this audit with zero network connectivity
  async function handleDownloadOffline() {
    if (downloadingOffline || !auditId) return;
    setDownloadingOffline(true);
    try {
      const itemIds = sections.flatMap((s) => s.items.map((i) => i.id));
      const { data: stockRows } = itemIds.length
        ? await supabase.from("stock_checks").select("*").in("item_id", itemIds).eq("audit_id", auditId)
        : { data: [] };
      await saveAuditSnapshot(auditId, {
        locData,
        sections,
        itemOptions,
        responses,
        stockRows: stockRows || [],
        addrVerified,
      });
      setHasOfflineSnapshot(true);
    } catch (e) {
      alert("Downloaden voor offline gebruik is mislukt: " + e.message);
    }
    setDownloadingOffline(false);
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

  // Score
  const itemWeight = (i) => i.weight ? Number(i.weight) : 1;
  const scoreItems = allItems.filter((i) => (i.answer_type === "score" || !i.answer_type) && (itemOptions[i.id]||[]).length > 0);
  const naAnswers = scoreItems.filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt?.is_na; });
  const itemMaxScore = (i) => Math.max(0, ...((itemOptions[i.id]||[]).filter((o) => !o.is_na && o.score !== null).map((o) => o.score)));
  const relevantMax = scoreItems.filter((i) => !naAnswers.includes(i)).reduce((sum, i) => sum + itemMaxScore(i) * itemWeight(i), 0);
  const achieved = scoreItems.filter((i) => responses[i.id]).filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt && !opt.is_na; }).reduce((sum,i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return sum+(opt?.score||0)*itemWeight(i); }, 0);
  const pct = relevantMax > 0 ? Math.round((achieved / relevantMax) * 100) : 0;
  const actionItems = allItems.filter((i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return opt?.is_action_item; });

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
      alert("Kon de PDF niet genereren: " + e.message);
    }
    setExportingPdf(false);
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    if (auditId) {
      await supabase.from("audits").update({
        status: "submitted",
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
      <i className="ti ti-loader-2" style={{ fontSize:32,display:"block",marginBottom:8 }} />Audit laden...
    </div>
  );

  if (isOffline && sections.length === 0) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"2rem",textAlign:"center" }}>
      <i className="ti ti-wifi-off" style={{ fontSize:36,color:"#EF9F27",display:"block",marginBottom:10 }} />
      <div style={{ fontSize:16,fontWeight:600,marginBottom:8 }}>Geen verbinding en geen offline versie</div>
      <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>Deze audit is nog niet gedownload voor offline gebruik. Ga terug naar wifi/4G en download de audit eerst.</div>
      <button onClick={onBack} style={{ padding:"8px 16px",background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer" }}>Terug naar dashboard</button>
    </div>
  );

  if (sections.length === 0) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"2rem",textAlign:"center" }}>
      <div style={{ fontSize:16,fontWeight:600,marginBottom:8 }}>Geen secties gevonden</div>
      <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>Dit template heeft nog geen secties en vragen.</div>
      <button onClick={onBack} style={{ padding:"8px 16px",background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer" }}>Terug naar dashboard</button>
    </div>
  );

  if (view === "success") return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",background:"#fff",minHeight:"100vh" }}>
      <div style={{ padding:"1rem 1.25rem",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:17,fontWeight:500,display:"flex",alignItems:"center",gap:8 }}><i className="ti ti-clipboard-check" style={{ color:"#1D9E75" }} /> Autrex360</div>
        <span style={{ fontSize:11,background:"#E1F5EE",color:"#0F6E56",padding:"3px 10px",borderRadius:20 }}>Ingediend</span>
      </div>
      <div style={{ padding:"2.5rem 1.25rem",textAlign:"center" }}>
        <div style={{ width:60,height:60,borderRadius:"50%",background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem" }}>
          <i className="ti ti-check" style={{ fontSize:30,color:"#0F6E56" }} />
        </div>
        <h2 style={{ fontSize:19,fontWeight:500,marginBottom:7 }}>Audit ingediend</h2>
        <p style={{ fontSize:13,color:"#888",marginBottom:"1.5rem" }}>De audit voor {locData.name} is verstuurd.</p>
        <div style={{ background:"#f9f9f9",border:"0.5px solid #eee",borderRadius:10,padding:"1rem",textAlign:"left",marginBottom:"1rem" }}>
          <div style={{ fontSize:11,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8 }}>Samenvatting</div>
          {[
            ["Locatie", locData.name],
            ["Template", template?.name],
            ["Beantwoord", `${answered.length}/${countableItems.length} vragen`],
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
              <i className="ti ti-file-type-pdf" /> {exportingPdf ? "Genereren..." : "PDF"}
            </button>
            <div style={{ fontSize:11,color:"#888" }}>{session.user.email}</div>
          </div>
        </div>
        <div style={{ fontSize:15,fontWeight:600 }}>{template?.name}</div>
        <div style={{ fontSize:12,color:"#888",marginTop:1 }}>{locData.name}</div>
      </div>

      {/* Offline status bar */}
      <div style={{ padding:"8px 1.25rem",background:isOffline?"#FAEEDA":"#F0F7F4",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
        <div style={{ fontSize:12,color:isOffline?"#633806":"#0F6E56",display:"flex",alignItems:"center",gap:6 }}>
          <i className={`ti ${isOffline ? "ti-wifi-off" : "ti-wifi"}`} />
          {isOffline ? "Offline — wijzigingen worden lokaal opgeslagen" : "Online"}
          {pendingCount > 0 && <span style={{ fontWeight:600 }}> · {pendingCount} niet gesynchroniseerd</span>}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {!isOffline && (
            <button onClick={handleDownloadOffline} disabled={downloadingOffline} style={{ fontSize:11,color:"#378ADD",border:"0.5px solid #378ADD",borderRadius:6,padding:"4px 9px",background:"none",cursor:downloadingOffline?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className="ti ti-download" /> {downloadingOffline ? "Downloaden..." : hasOfflineSnapshot ? "Opnieuw downloaden" : "Download voor offline gebruik"}
            </button>
          )}
          {pendingCount > 0 && !isOffline && (
            <button onClick={handleSync} disabled={syncing} style={{ fontSize:11,color:"white",border:"none",borderRadius:6,padding:"4px 9px",background:"#1D9E75",cursor:syncing?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className="ti ti-refresh" /> {syncing ? "Synchroniseren..." : "Synchroniseer nu"}
            </button>
          )}
        </div>
      </div>
      {syncResult && (
        <div style={{ padding:"6px 1.25rem", fontSize:11, color: syncResult.error ? "#A32D2D" : "#0F6E56", background: syncResult.error ? "#FCEBEB" : "#F0F7F4", borderBottom:"0.5px solid #eee" }}>
          {syncResult.error ? `Sync mislukt: ${syncResult.error}` : `${syncResult.synced} wijziging(en) gesynchroniseerd${syncResult.failed > 0 ? `, ${syncResult.failed} mislukt` : ""}.`}
        </div>
      )}

      <div style={{ padding:"10px 1.25rem",background:"#f9f9f9",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:12,color:"#888" }}>{answered.length} / {countableItems.length} vragen beantwoord</div>
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

      {/* LOCATIE */}
      <div style={sec}>
        <div style={secTitle}><i className="ti ti-building-warehouse" /> Locatiegegevens</div>
        <div style={{ background:"#f9f9f9",border:"1px solid #e0e0e0",borderRadius:10,padding:"0.875rem 1rem" }}>
          <div style={{ fontSize:14,fontWeight:600,marginBottom:3 }}>{locData.name}</div>
          <div style={{ fontSize:12,color:"#888",lineHeight:1.6 }}>{locData.street}<br />{locData.city}{locData.detail&&<><br />{locData.detail}</>}</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:10,paddingTop:10,borderTop:"0.5px solid #eee",flexWrap:"wrap" }}>
            <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
              <input type="checkbox" checked={addrVerified} onChange={(e)=>{ const checked=e.target.checked; setAddrVerified(checked); if(checked){setEditOpen(false);setAddrChanged(false);} saveAddressState(checked, locData); }} style={{ width:15,height:15,accentColor:"#1D9E75" }} />
              <span style={{ fontSize:12 }}>Adres is correct en actueel</span>
            </label>
            <button onClick={()=>{ if(!editOpen){setEditDraft({...locData});setAddrVerified(false);setAddrChanged(true);} setEditOpen((v)=>!v); }} style={{ fontSize:11,color:editOpen?"#633806":"#185FA5",border:`0.5px solid ${editOpen?"#EF9F27":"#378ADD"}`,borderRadius:6,padding:"4px 9px",background:editOpen?"#FAEEDA":"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className={`ti ${editOpen?"ti-x":"ti-pencil"}`} style={{ fontSize:12 }} /> {editOpen?"Sluiten":"Adres aanpassen"}
            </button>
          </div>
          {editOpen && (
            <div style={{ marginTop:10,background:"white",border:"0.5px solid #EF9F27",borderRadius:8,padding:10 }}>
              {[["Bedrijfsnaam","name"],["Straat","street"],["Postcode & stad","city"],["Locatiedetail","detail"]].map(([lbl,key]) => (
                <div key={key}>
                  <div style={{ fontSize:11,color:"#888",marginBottom:3,marginTop:7 }}>{lbl}</div>
                  <input value={editDraft[key]} onChange={(e)=>setEditDraft((d)=>({...d,[key]:e.target.value}))} onBlur={()=>{ const updated={...editDraft}; setLocData(updated); setAddrChanged(true); saveAddressState(false, updated); }} style={{ width:"100%",border:"0.5px solid #ddd",borderRadius:6,padding:"6px 9px",fontSize:12,fontFamily:"inherit",background:"white" }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:8,fontSize:11,display:"flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:6,background:addrVerified?"#E1F5EE":addrChanged?"#FAEEDA":"#f0f0f0",color:addrVerified?"#0F6E56":addrChanged?"#633806":"#aaa" }}>
            <i className={`ti ${addrVerified?"ti-circle-check":addrChanged?"ti-alert-triangle":"ti-circle-dashed"}`} />
            {addrVerified?"Bevestigd":addrChanged?"Adres aangepast":"Nog niet geverifieerd"}
          </div>
        </div>
      </div>

      {/* DYNAMIC SECTIONS */}
      {sections.map((section) => {
        const visibleItems = section.items.filter(isVisible);
        if (visibleItems.length === 0) return null;
        return (
        <div key={section.id} style={sec}>
          <div style={secTitle}><i className="ti ti-list" /> {section.name}</div>
          <div style={card}>
            {visibleItems.map((item, idx) => (
              <div key={item.id} style={{ padding:"10px 0",borderBottom:idx===visibleItems.length-1?"none":"0.5px solid #e8e8e8",paddingBottom:idx===visibleItems.length-1?0:10 }}>
                {item.answer_type !== "signature" && (
                  <>
                    <div style={{ fontSize:13,marginBottom:2 }}>{item.label}</div>
                    {item.sub_label && <div style={{ fontSize:11,color:"#aaa" }}>{item.sub_label}</div>}
                  </>
                )}
                {item.answer_type === "stock_take" ? (
                  <StockTakeTable item={item} auditId={auditId} isOffline={isOffline} snapshotStockRows={snapshotStockRows} />
                ) : (
                  <AnswerInput
                    item={item}
                    options={itemOptions[item.id]||[]}
                    value={responses[item.id]}
                    onChange={(val) => setResponse(item.id, val)}
                  />
                )}
                {item.answer_type !== "signature" && item.answer_type !== "stock_take" && (
                  photos[item.id]
                    ? <div style={{ fontSize:11,color:"#0F6E56",marginTop:6,display:"flex",alignItems:"center",gap:4 }}><i className="ti ti-photo-check" /> 1 foto toegevoegd</div>
                    : <button style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#888",border:"0.5px dashed #ccc",borderRadius:6,padding:"4px 8px",background:"none",cursor:"pointer",marginTop:6 }} onClick={()=>setPhotos((p)=>({...p,[item.id]:true}))}><i className="ti ti-camera" /> Foto toevoegen</button>
                )}
              </div>
            ))}
          </div>
        </div>
        );
      })}

      {/* SUBMIT */}
      <div style={{ padding:"1rem 1.25rem" }}>
        {isOffline ? (
          <div style={{ fontSize:12,color:"#888",textAlign:"center",padding:"10px",background:"#f5f5f5",borderRadius:8 }}>
            <i className="ti ti-wifi-off" /> Indienen vereist een verbinding. Synchroniseer eerst zodra je weer online bent.
          </div>
        ) : pendingCount > 0 ? (
          <div style={{ fontSize:12,color:"#633806",textAlign:"center",padding:"10px",background:"#FAEEDA",borderRadius:8 }}>
            <i className="ti ti-alert-triangle" /> Er staan nog {pendingCount} wijziging(en) klaar om te synchroniseren. Synchroniseer eerst voor je indient.
          </div>
        ) : (
          <button disabled={submitting} style={{ width:"100%",padding:11,background:submitting?"#9ccab8":"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:submitting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={handleSubmit}>
            <i className="ti ti-send" /> {submitting ? "Bezig met indienen..." : "Audit indienen"}
          </button>
        )}
      </div>
    </div>
  );
}
