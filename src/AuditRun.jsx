import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";

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
function SignaturePad({ label, sublabel }) {
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
    <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
      <div style={{ fontSize:13,fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:11,color:"#888" }}>{sublabel}</div>
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

// ── Answer input per type ─────────────────────────────────
function AnswerInput({ item, options, value, onChange, photo, onPhoto }) {
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

  if (type === "yes_no") {
    return (
      <div style={{ display:"flex",gap:6,marginTop:7 }}>
        {["Ja","Nee"].map((lbl) => (
          <button key={lbl} onClick={() => onChange(lbl)} style={{ padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:500,cursor:"pointer", border: value===lbl?"2px solid #1D9E75":"1.5px solid #bbb", background:value===lbl?"#E1F5EE":"white", color:value===lbl?"#085041":"#555" }}>{lbl}</button>
        ))}
      </div>
    );
  }

  if (type === "yes_no_na") {
    return (
      <div style={{ display:"flex",gap:6,marginTop:7 }}>
        {["Ja","Nee","N/A"].map((lbl) => (
          <button key={lbl} onClick={() => onChange(lbl)} style={{ padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:500,cursor:"pointer", border: value===lbl?"2px solid #1D9E75":"1.5px solid #bbb", background:value===lbl?"#E1F5EE":"white", color:value===lbl?"#085041":"#555" }}>{lbl}</button>
        ))}
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
    const pct = value||0;
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
      </div>
    );
  }

  // text (default)
  return (
    <input type="text" value={value||""} onChange={(e)=>onChange(e.target.value)} placeholder="Voer een antwoord in" style={{ border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"inherit",marginTop:7,width:"100%" }} />
  );
}

// ── Main AuditRun ─────────────────────────────────────────
export default function AuditRun({ session, locationId, templateId, location, template, onBack }) {
  const [sections, setSections] = useState([]);
  const [itemOptions, setItemOptions] = useState({}); // itemId -> [options]
  const [responses, setResponses] = useState({});
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("audit");
  const [addrVerified, setAddrVerified] = useState(false);
  const [addrChanged, setAddrChanged] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [locData, setLocData] = useState({ name: location?.name||"", street: "", city: "", detail: "" });
  const [editDraft, setEditDraft] = useState({ ...locData });
  const [sliderVal, setSliderVal] = useState(50);
  const [sliderRemark, setSliderRemark] = useState("");

  useEffect(() => {
    async function load() {
      // Load full location details
      const { data: loc } = await supabase.from("locations").select("*").eq("id", locationId).single();
      if (loc) setLocData({ name: loc.name, street: loc.street||"", city: `${loc.postal_code||""} ${loc.city||""}`.trim(), detail: loc.location_detail||"" });

      // Load sections + items
      const { data: secs } = await supabase.from("template_sections").select("*").eq("template_id", templateId).order("sort_order");
      if (!secs || secs.length === 0) { setSections([]); setLoading(false); return; }

      const { data: itemsRaw } = await supabase.from("template_items").select("*, answer_sets(id,name)").in("section_id", secs.map((s) => s.id)).order("sort_order");

      // Load options for items that have an answer_set
      const setIds = [...new Set((itemsRaw||[]).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];
      let optionsMap = {};
      if (setIds.length > 0) {
        const { data: opts } = await supabase.from("answer_options").select("*").in("set_id", setIds).order("sort_order");
        (opts||[]).forEach((o) => { optionsMap[o.set_id] = optionsMap[o.set_id]||[]; optionsMap[o.set_id].push(o); });
      }

      // Group items by section
      const grouped = {};
      (itemsRaw||[]).forEach((item) => { grouped[item.section_id] = grouped[item.section_id]||[]; grouped[item.section_id].push(item); });

      // Build itemOptions map by itemId
      const itemOpts = {};
      (itemsRaw||[]).forEach((item) => { if (item.answer_set_id) itemOpts[item.id] = optionsMap[item.answer_set_id]||[]; else itemOpts[item.id] = []; });

      const sectionsWithItems = secs.map((s) => ({ ...s, items: grouped[s.id]||[] }));
      setSections(sectionsWithItems);
      setItemOptions(itemOpts);
      setLoading(false);
    }
    load();
  }, [locationId, templateId]);

  useEffect(() => { setEditDraft({ ...locData }); }, [locData]);

  const allItems = sections.flatMap((s) => s.items);
  const answered = allItems.filter((i) => responses[i.id] !== undefined && responses[i.id] !== null && responses[i.id] !== "");
  const progress = allItems.length > 0 ? Math.round((answered.length / allItems.length) * 100) : 0;

  // Score: only items with score-type answer sets
  const scoreItems = allItems.filter((i) => (i.answer_type === "score" || !i.answer_type) && (itemOptions[i.id]||[]).some((o) => o.score !== null));
  const scoredAnswers = scoreItems.filter((i) => responses[i.id]);
  const naAnswers = scoredAnswers.filter((i) => {
    const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]);
    return opt?.label?.toLowerCase() === "n/a";
  });
  const relevantMax = (scoreItems.length - naAnswers.length) * 5;
  const achieved = scoredAnswers.filter((i) => {
    const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]);
    return opt && opt.label?.toLowerCase() !== "n/a";
  }).reduce((sum, i) => { const opt = (itemOptions[i.id]||[]).find((o) => o.id === responses[i.id]); return sum + (opt?.score||0); }, 0);
  const pct = relevantMax > 0 ? Math.round((achieved / relevantMax) * 100) : 0;

  function setResponse(id, val) { setResponses((p) => ({ ...p, [id]: val })); }

  const sliderColor = sliderVal<25?"#A32D2D":sliderVal<50?"#BA7517":sliderVal<75?"#3B6D11":"#0F6E56";

  if (loading) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"2rem",textAlign:"center",color:"#aaa" }}>
      <i className="ti ti-loader-2" style={{ fontSize:32,display:"block",marginBottom:8 }} />Audit laden...
    </div>
  );

  if (sections.length === 0) return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",padding:"2rem",textAlign:"center" }}>
      <div style={{ fontSize:16,fontWeight:600,marginBottom:8 }}>Geen secties gevonden</div>
      <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>Dit template heeft nog geen secties en vragen. Voeg ze toe via Templates in het dashboard.</div>
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
          <div style={{ fontSize:13,display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #eee" }}><span style={{ color:"#888" }}>Locatie</span><span style={{ fontWeight:500 }}>{locData.name}</span></div>
          <div style={{ fontSize:13,display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #eee" }}><span style={{ color:"#888" }}>Template</span><span style={{ fontWeight:500 }}>{template?.name}</span></div>
          <div style={{ fontSize:13,display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #eee" }}><span style={{ color:"#888" }}>Vragen beantwoord</span><span style={{ fontWeight:500 }}>{answered.length}/{allItems.length}</span></div>
          {relevantMax > 0 && <div style={{ fontSize:13,display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #eee" }}><span style={{ color:"#888" }}>Score</span><span style={{ fontWeight:500,color:pctColor(pct) }}>{pct}% ({achieved}/{relevantMax} pt)</span></div>}
          <div style={{ fontSize:13,display:"flex",justifyContent:"space-between",padding:"5px 0" }}><span style={{ color:"#888" }}>Beschikbare ruimte</span><span style={{ fontWeight:500,color:sliderColor }}>{sliderVal}% vrij</span></div>
        </div>
        <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
          <button onClick={onBack} style={{ padding:"9px 18px",background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer" }}>
            <i className="ti ti-home" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"system-ui,sans-serif",maxWidth:680,margin:"0 auto",background:"#fff",minHeight:"100vh" }}>
      {/* HEADER */}
      <div style={{ padding:"1rem 1.25rem",borderBottom:"0.5px solid #eee" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
          <button onClick={onBack} style={{ fontSize:13,color:"#1D9E75",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
            <i className="ti ti-arrow-left" /> Dashboard
          </button>
          <div style={{ fontSize:11,color:"#888" }}>{session.user.email}</div>
        </div>
        <div style={{ fontSize:15,fontWeight:600 }}>{template?.name}</div>
        <div style={{ fontSize:12,color:"#888",marginTop:1 }}>{locData.name}</div>
      </div>

      {/* PROGRESS */}
      <div style={{ padding:"10px 1.25rem",background:"#f9f9f9",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:12,color:"#888" }}>{answered.length} / {allItems.length} vragen beantwoord</div>
        <div style={{ textAlign:"right" }}>
          {relevantMax > 0 ? <>
            <div style={{ fontSize:20,fontWeight:600,color:pctColor(pct) }}>{pct}%</div>
            <div style={{ fontSize:11,color:"#aaa" }}>{achieved} / {relevantMax} pt</div>
          </> : <div style={{ fontSize:12,color:"#aaa" }}>Score: —</div>}
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
          <div style={{ fontSize:12,color:"#888",lineHeight:1.6 }}>{locData.street}<br />{locData.city}{locData.detail && <><br />{locData.detail}</>}</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:10,paddingTop:10,borderTop:"0.5px solid #eee",flexWrap:"wrap" }}>
            <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
              <input type="checkbox" checked={addrVerified} onChange={(e) => { setAddrVerified(e.target.checked); if(e.target.checked){setEditOpen(false);setAddrChanged(false);} }} style={{ width:15,height:15,accentColor:"#1D9E75" }} />
              <span style={{ fontSize:12 }}>Adres is correct en actueel</span>
            </label>
            <button onClick={() => { if(!editOpen){setEditDraft({...locData});setAddrVerified(false);setAddrChanged(true);} setEditOpen((v)=>!v); }} style={{ fontSize:11,color:editOpen?"#633806":"#185FA5",border:`0.5px solid ${editOpen?"#EF9F27":"#378ADD"}`,borderRadius:6,padding:"4px 9px",background:editOpen?"#FAEEDA":"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
              <i className={`ti ${editOpen?"ti-x":"ti-pencil"}`} style={{ fontSize:12 }} /> {editOpen?"Sluiten":"Adres aanpassen"}
            </button>
          </div>
          {editOpen && (
            <div style={{ marginTop:10,background:"white",border:"0.5px solid #EF9F27",borderRadius:8,padding:10 }}>
              {[["Bedrijfsnaam","name"],["Straat","street"],["Postcode & stad","city"],["Locatiedetail","detail"]].map(([lbl,key]) => (
                <div key={key}>
                  <div style={{ fontSize:11,color:"#888",marginBottom:3,marginTop:7 }}>{lbl}</div>
                  <input value={editDraft[key]} onChange={(e)=>setEditDraft((d)=>({...d,[key]:e.target.value}))} onBlur={()=>{setLocData({...editDraft});setAddrChanged(true);}} style={{ width:"100%",border:"0.5px solid #ddd",borderRadius:6,padding:"6px 9px",fontSize:12,fontFamily:"inherit",background:"white" }} />
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
      {sections.map((section) => (
        <div key={section.id} style={sec}>
          <div style={secTitle}><i className="ti ti-list" /> {section.name}</div>
          <div style={card}>
            {section.items.map((item, idx) => (
              <div key={item.id} style={{ padding:"10px 0",borderBottom:idx===section.items.length-1?"none":"0.5px solid #e8e8e8",paddingBottom:idx===section.items.length-1?0:10 }}>
                <div style={{ fontSize:13,marginBottom:2 }}>{item.label}</div>
                {item.sub_label && <div style={{ fontSize:11,color:"#aaa" }}>{item.sub_label}</div>}
                <AnswerInput
                  item={item}
                  options={itemOptions[item.id]||[]}
                  value={responses[item.id]}
                  onChange={(val) => setResponse(item.id, val)}
                  photo={photos[item.id]}
                  onPhoto={() => setPhotos((p) => ({ ...p, [item.id]: true }))}
                />
                {photos[item.id]
                  ? <div style={{ fontSize:11,color:"#0F6E56",marginTop:6,display:"flex",alignItems:"center",gap:4 }}><i className="ti ti-photo-check" /> 1 foto toegevoegd</div>
                  : <button style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#888",border:"0.5px dashed #ccc",borderRadius:6,padding:"4px 8px",background:"none",cursor:"pointer",marginTop:6 }} onClick={() => setPhotos((p) => ({ ...p, [item.id]: true }))}><i className="ti ti-camera" /> Foto toevoegen</button>
                }
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* SLIDER */}
      <div style={sec}>
        <div style={secTitle}><i className="ti ti-arrows-maximize" /> Ruimte voor groei</div>
        <div style={card}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
            <div><div style={{ fontSize:13,fontWeight:500 }}>Beschikbare capaciteit</div><div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>Schat het percentage vrije opslagruimte</div></div>
            <div style={{ fontSize:20,fontWeight:600,color:sliderColor }}>{sliderVal}%</div>
          </div>
          <div style={{ position:"relative",height:7,borderRadius:4,background:"linear-gradient(to right,#E24B4A 0%,#EF9F27 30%,#639922 65%,#1D9E75 100%)",marginBottom:6 }}>
            <input type="range" min={0} max={100} value={sliderVal} onChange={(e)=>setSliderVal(Number(e.target.value))} style={{ WebkitAppearance:"none",appearance:"none",width:"100%",position:"absolute",top:"50%",transform:"translateY(-50%)",left:0,height:7,background:"transparent",cursor:"pointer" }} />
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa",marginTop:3 }}>
            <span>0% vrij</span><span>50%</span><span>100% vrij</span>
          </div>
          <textarea value={sliderRemark} onChange={(e)=>setSliderRemark(e.target.value)} rows={2} placeholder="Toelichting..." style={{ width:"100%",border:"0.5px solid #ddd",borderRadius:8,padding:"7px 10px",fontSize:12,fontFamily:"inherit",background:"white",resize:"none",marginTop:10 }} />
        </div>
      </div>

      {/* HANDTEKENINGEN */}
      <div style={sec}>
        <div style={secTitle}><i className="ti ti-writing-sign" /> Handtekeningen</div>
        <div style={card}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.875rem" }}>
            <SignaturePad label="Auditor" sublabel="Naam en handtekening" />
            <SignaturePad label="Lokale contactpersoon" sublabel="Naam en handtekening" />
          </div>
        </div>
      </div>

      {/* SUBMIT */}
      <div style={{ padding:"1rem 1.25rem" }}>
        <button style={{ width:"100%",padding:11,background:"#1D9E75",color:"white",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={() => setView("success")}>
          <i className="ti ti-send" /> Audit indienen
        </button>
      </div>
    </div>
  );
}
