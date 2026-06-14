import { useState, useEffect, useRef } from "react";

// ── Score helpers ─────────────────────────────────────────
const SCORES = { ia: 0, sat: 1, good: 3, exc: 5 };
const LABELS = { ia: "IA", sat: "Satisfactory", good: "Good", exc: "Excellent", na: "N/A" };

const BTN_COLORS = {
  ia:   { bg: "#FCEBEB", border: "#E24B4A", color: "#791F1F" },
  sat:  { bg: "#FAEEDA", border: "#EF9F27", color: "#633806" },
  good: { bg: "#EAF3DE", border: "#639922", color: "#27500A" },
  exc:  { bg: "#E1F5EE", border: "#1D9E75", color: "#085041" },
  na:   { bg: "#E6F1FB", border: "#378ADD", color: "#0C447C" },
};

function pctColor(pct) {
  if (pct === null) return "#888";
  if (pct < 40) return "#A32D2D";
  if (pct < 60) return "#BA7517";
  if (pct < 80) return "#3B6D11";
  return "#085041";
}

// ── Data ──────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "signage", title: "Signage & Labeling", icon: "ti-sign-left",
    items: [
      { id: "s1", label: "Gevaarlijke stoffen duidelijk gemarkeerd", sub: "ADR-labels zichtbaar en correct" },
      { id: "s2", label: "Looppadbordjes aanwezig en leesbaar", sub: "Gele markering op de vloer intact" },
      { id: "s3", label: "Nooduitgang bewegwijzering correct", sub: "Verlicht en onbelemmerd zichtbaar" },
    ],
  },
  {
    id: "racking", title: "Racking & Opslag", icon: "ti-stack-2",
    items: [
      { id: "r1", label: "Stellingen vrij van zichtbare schade", sub: "Geen verbogen staanders of beschadigde liggers" },
      { id: "r2", label: "Maximale belasting zichtbaar vermeld", sub: "SWL-bord aanwezig per sectie" },
      { id: "r3", label: "Stocking indicators op juiste hoogte", sub: "Kleurcodering conform bedrijfsstandaard" },
    ],
  },
  {
    id: "procedures", title: "Procedures", icon: "ti-file-check",
    items: [
      { id: "p1", label: "Ontvangstprocedure aantoonbaar gevolgd", sub: "Inkomende goederen gedocumenteerd" },
      { id: "p2", label: "Medewerkers op de hoogte van veiligheidsprotocol", sub: "Laatste training < 12 maanden geleden" },
    ],
  },
];

const ARTIKELEN = [
  { art: "ART-00421", omschrijving: "Palletwrap 500mm" },
  { art: "ART-01183", omschrijving: "Kartonnen doos 60x40x40" },
  { art: "ART-02047", omschrijving: "Barcode labels A4" },
  { art: "ART-03312", omschrijving: "Nylonband 12mm" },
  { art: "ART-04891", omschrijving: "Schuimhoek beschermer" },
];

const LOCATIES = ["A-01-03", "B-04-01", "C-02-05", "D-07-02", "E-03-04"];

const DEFAULT_LOCATION = {
  name: "Nexaro Logistics B.V.",
  street: "Maasvlakteplein 14",
  city: "3199 LK Rotterdam",
  detail: "Loods 7, Unit B",
};

// ── SignaturePad ──────────────────────────────────────────
function SignaturePad({ id, label, sublabel }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hasSig, setHasSig] = useState(false);
  const [name, setName] = useState("");
  const drawing = useRef(false);
  const initialized = useRef(false);
  const ctx = useRef(null);

  function initCanvas() {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const w = wrap.getBoundingClientRect().width || wrap.offsetWidth;
    if (w < 10) return;
    const r = window.devicePixelRatio || 1;
    canvas.width = w * r;
    canvas.height = 110 * r;
    canvas.style.width = w + "px";
    canvas.style.height = "110px";
    const c = canvas.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.scale(r, r);
    c.strokeStyle = "#111";
    c.lineWidth = 2.2;
    c.lineCap = "round";
    c.lineJoin = "round";
    ctx.current = c;
    initialized.current = true;
  }

  useEffect(() => {
    [50, 150, 300, 600].forEach((t) => setTimeout(initCanvas, t));
  }, []);

  function getPos(e) {
    if (!initialized.current) initCanvas();
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function onStart(e) {
    e.preventDefault();
    if (!initialized.current) initCanvas();
    drawing.current = true;
    const p = getPos(e);
    ctx.current.beginPath();
    ctx.current.moveTo(p.x, p.y);
  }

  function onMove(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.current.lineTo(p.x, p.y);
    ctx.current.stroke();
    if (!hasSig) setHasSig(true);
  }

  function onEnd() { drawing.current = false; }

  function clear() {
    if (initialized.current && ctx.current) {
      const r = window.devicePixelRatio || 1;
      ctx.current.clearRect(0, 0, canvasRef.current.width / r, canvasRef.current.height / r);
    }
    setHasSig(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#888" }}>{sublabel}</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Volledige naam"
        style={{ border: "0.5px solid #ddd", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", background: "white", width: "100%" }}
      />
      <div
        ref={wrapRef}
        style={{
          position: "relative", height: 110, border: hasSig ? "1.5px solid #1D9E75" : "1.5px dashed #ccc",
          borderRadius: 8, overflow: "hidden", cursor: "crosshair", background: "white",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, touchAction: "none" }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
        {!hasSig && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#aaa", pointerEvents: "none", gap: 5 }}>
            <i className="ti ti-pencil" /> Teken hier
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={clear} style={{ fontSize: 11, color: "#888", border: "0.5px solid #ddd", borderRadius: 6, padding: "3px 9px", background: "none", cursor: "pointer" }}>
          <i className="ti ti-trash" /> Wissen
        </button>
        <span style={{ fontSize: 11, color: hasSig ? "#0F6E56" : "#aaa" }}>
          {hasSig ? <><i className="ti ti-check" /> Ondertekend</> : "Niet ondertekend"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", gap: 4 }}>
        <i className="ti ti-calendar" /> 6 juni 2026 · Rotterdam
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const allItemIds = SECTIONS.flatMap((s) => s.items.map((i) => i.id));
  const initState = () => Object.fromEntries(allItemIds.map((id) => [id, null]));

  const [view, setView] = useState("audit"); // audit | success
  const [responses, setResponses] = useState(initState);
  const [photos, setPhotos] = useState({});
  const [sliderVal, setSliderVal] = useState(50);
  const [sliderRemark, setSliderRemark] = useState("");
  const [stockA, setStockA] = useState(ARTIKELEN.map(() => ""));
  const [stockB, setStockB] = useState(LOCATIES.map(() => ({ art: "", qty: "" })));
  const [stockTab, setStockTab] = useState("a");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(DEFAULT_LOCATION);
  const [addrVerified, setAddrVerified] = useState(false);
  const [addrChanged, setAddrChanged] = useState(false);

  // score
  const answered = Object.values(responses).filter((v) => v !== null);
  const relevant = answered.filter((v) => v !== "na");
  const achieved = relevant.reduce((s, v) => s + SCORES[v], 0);
  const maxPossible = relevant.length * 5;
  const pct = maxPossible > 0 ? Math.round((achieved / maxPossible) * 100) : null;
  const counts = { ia: 0, sat: 0, good: 0, exc: 0, na: 0 };
  answered.forEach((v) => counts[v]++);
  const progress = Math.round((answered.length / allItemIds.length) * 100);

  function setResponse(id, val) {
    setResponses((prev) => ({ ...prev, [id]: val }));
  }

  function toggleEdit() {
    if (!editOpen) {
      setEditDraft({ ...location });
      setAddrVerified(false);
      setAddrChanged(true);
    }
    setEditOpen((v) => !v);
  }

  function onVerifyChange(checked) {
    setAddrVerified(checked);
    if (checked) { setEditOpen(false); setAddrChanged(false); }
  }

  function applyEdit() {
    setLocation({ ...editDraft });
    setAddrChanged(true);
  }

  function reset() {
    setResponses(initState());
    setPhotos({});
    setSliderVal(50);
    setSliderRemark("");
    setStockA(ARTIKELEN.map(() => ""));
    setStockB(LOCATIES.map(() => ({ art: "", qty: "" })));
    setStockTab("a");
    setLocation(DEFAULT_LOCATION);
    setEditOpen(false);
    setEditDraft(DEFAULT_LOCATION);
    setAddrVerified(false);
    setAddrChanged(false);
    setView("audit");
  }

  const sliderColor = sliderVal < 25 ? "#A32D2D" : sliderVal < 50 ? "#BA7517" : sliderVal < 75 ? "#3B6D11" : "#0F6E56";
  const aFilled = stockA.filter((v) => v !== "").length;
  const bFilled = stockB.filter((r) => r.art.trim() && r.qty !== "").length;

  // ── Styles ───────────────────────────────────────────────
  const s = {
    wrap: { fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 680, margin: "0 auto", background: "#fff", minHeight: "100vh" },
    header: { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee" },
    headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    logo: { fontSize: 17, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 },
    badge: { fontSize: 11, background: "#E1F5EE", color: "#0F6E56", padding: "3px 10px", borderRadius: 20 },
    resetBtn: { fontSize: 12, color: "#888", border: "0.5px solid #ddd", borderRadius: 8, padding: "4px 10px", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
    liveScore: { padding: "10px 1.25rem", background: "#f9f9f9", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
    progressBar: { height: 3, background: "#eee" },
    legend: { display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 1.25rem", borderBottom: "0.5px solid #eee", background: "#f9f9f9" },
    legItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" },
    legDot: (c) => ({ width: 7, height: 7, borderRadius: "50%", background: c }),
    section: { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee" },
    sectionTitle: { fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: 6 },
    checkItem: { padding: "10px 0", borderBottom: "0.5px solid #eee" },
    ansRow: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 },
    ansBtn: (val, selected) => ({
      padding: "5px 11px", borderRadius: 20,
      border: selected ? `2px solid ${BTN_COLORS[val].border}` : "1.5px solid #ddd",
      background: selected ? BTN_COLORS[val].bg : "white",
      color: selected ? BTN_COLORS[val].color : "#888",
      cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
    }),
    photoBtn: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888", border: "0.5px dashed #ccc", borderRadius: 6, padding: "4px 8px", background: "none", cursor: "pointer", marginTop: 6 },
    locCard: { background: "#f9f9f9", border: "0.5px solid #eee", borderRadius: 10, padding: "0.875rem 1rem" },
    submitBtn: { width: "100%", padding: 11, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    pill: (k) => ({ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 20, border: `1px solid ${BTN_COLORS[k].border}`, background: BTN_COLORS[k].bg, color: BTN_COLORS[k].color }),
    stockTab: (active) => ({ flex: 1, padding: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", background: active ? "#1D9E75" : "white", color: active ? "white" : "#888", border: "none" }),
    stockInput: (wide) => ({ width: wide ? 110 : 72, border: "0.5px solid #ddd", borderRadius: 5, padding: "4px 6px", fontSize: 12, background: "white", textAlign: "center" }),
    reportCard: { background: "#f9f9f9", border: "0.5px solid #eee", borderRadius: 10, padding: "0.875rem 1rem", textAlign: "left", marginBottom: "0.875rem" },
    reportRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", fontSize: 12, borderBottom: "0.5px solid #eee", gap: 10 },
  };

  if (view === "success") {
    const verifyLabel = addrVerified ? "✓ Bevestigd" : addrChanged ? "⚠ Adres aangepast" : "Niet geverifieerd";
    const verifyColor = addrVerified ? "#0F6E56" : addrChanged ? "#BA7517" : "#A32D2D";
    return (
      <div style={s.wrap}>
        <div style={{ ...s.header }}>
          <div style={s.headerTop}>
            <div style={s.logo}><i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360</div>
            <span style={s.badge}>Demo</span>
          </div>
        </div>
        <div style={{ padding: "2.5rem 1.25rem", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <i className="ti ti-check" style={{ fontSize: 30, color: "#0F6E56" }} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 500, marginBottom: 7 }}>Audit ingediend</h2>
          <p style={{ fontSize: 13, color: "#888", marginBottom: "1.25rem" }}>Het rapport is verstuurd. De stock check wordt vergeleken met het systeem.</p>

          <div style={s.reportCard}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>Locatie</div>
            <div style={s.reportRow}><span style={{ color: "#888" }}>Bedrijf</span><span style={{ fontWeight: 500 }}>{location.name}</span></div>
            <div style={s.reportRow}><span style={{ color: "#888" }}>Adres</span><span style={{ fontWeight: 500, textAlign: "right" }}>{location.street}, {location.city}</span></div>
            <div style={{ ...s.reportRow, borderBottom: "none" }}><span style={{ color: "#888" }}>Verificatie</span><span style={{ fontWeight: 500, color: verifyColor }}>{verifyLabel}</span></div>
          </div>

          <div style={s.reportCard}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>Checklist score</div>
            {["ia","sat","good","exc"].map((k) => (
              <div key={k} style={s.reportRow}><span style={{ color: "#888" }}>{LABELS[k]}</span><span style={{ fontWeight: 500, color: BTN_COLORS[k].color }}>{counts[k]}</span></div>
            ))}
            <div style={{ ...s.reportRow, borderBottom: "none" }}><span style={{ color: "#888" }}>Totaalscore</span><span style={{ fontWeight: 500, color: pctColor(pct) }}>{pct !== null ? pct + "%" : "—"} ({achieved}/{maxPossible} pt)</span></div>
          </div>

          <div style={s.reportCard}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>Ruimte voor groei</div>
            <div style={s.reportRow}><span style={{ color: "#888" }}>Beschikbare capaciteit</span><span style={{ fontWeight: 500, color: sliderColor }}>{sliderVal}% vrij</span></div>
            <div style={{ ...s.reportRow, borderBottom: "none" }}><span style={{ color: "#888" }}>Toelichting</span><span style={{ fontWeight: 500 }}>{sliderRemark || "—"}</span></div>
          </div>

          <div style={s.reportCard}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>Stock check</div>
            <div style={s.reportRow}><span style={{ color: "#888" }}>Artikel → Bin</span><span style={{ fontWeight: 500 }}>{aFilled}/5 artikelen geteld</span></div>
            <div style={{ ...s.reportRow, borderBottom: "none" }}><span style={{ color: "#888" }}>Bin → Papier</span><span style={{ fontWeight: 500 }}>{bFilled}/5 locaties genoteerd</span></div>
          </div>

          <button onClick={reset} style={{ border: "0.5px solid #ddd", background: "white", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>
            <i className="ti ti-refresh" /> Opnieuw starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <div style={s.logo}><i className="ti ti-clipboard-check" style={{ color: "#1D9E75" }} /> Autrex360</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={s.resetBtn} onClick={reset}><i className="ti ti-refresh" style={{ fontSize: 13 }} /> Reset</button>
            <span style={s.badge}>Demo</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>Warehouse compliance audit · extern partner</div>
      </div>

      {/* LIVE SCORE */}
      <div style={s.liveScore}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {answered.length === 0 && <span style={{ fontSize: 12, color: "#aaa" }}>Beantwoord vragen om score te zien</span>}
          {["ia","sat","good","exc"].map((k) => counts[k] > 0 && (
            <span key={k} style={s.pill(k)}>{LABELS[k]} {counts[k]}</span>
          ))}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: pctColor(pct) }}>{pct !== null ? pct + "%" : "—"}</div>
          <div style={{ fontSize: 11, color: "#aaa" }}>{achieved} / {maxPossible} pt</div>
        </div>
      </div>
      <div style={s.progressBar}><div style={{ height: 3, background: "#1D9E75", width: progress + "%", transition: "width 0.3s" }} /></div>

      {/* LEGEND */}
      <div style={s.legend}>
        {[["#E24B4A","IA (0 pt"],["#EF9F27","Satisfactory (1 pt)"],["#639922","Good (3 pt)"],["#1D9E75","Excellent (5 pt)"],["#378ADD","N/A"]].map(([c,l]) => (
          <div key={l} style={s.legItem}><div style={s.legDot(c)} />{l}</div>
        ))}
      </div>

      {/* LOCATIE */}
      <div style={s.section}>
        <div style={s.sectionTitle}><i className="ti ti-building-warehouse" /> Locatiegegevens</div>
        <div style={s.locCard}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{location.name}</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{location.street}<br />{location.city}<br />{location.detail}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #eee", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={addrVerified} onChange={(e) => onVerifyChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#1D9E75" }} />
              <span style={{ fontSize: 12 }}>Adres is correct en actueel</span>
            </label>
            <button onClick={toggleEdit} style={{ fontSize: 11, color: editOpen ? "#633806" : "#185FA5", border: `0.5px solid ${editOpen ? "#EF9F27" : "#378ADD"}`, borderRadius: 6, padding: "4px 9px", background: editOpen ? "#FAEEDA" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <i className={`ti ${editOpen ? "ti-x" : "ti-pencil"}`} style={{ fontSize: 12 }} /> {editOpen ? "Sluiten" : "Adres aanpassen"}
            </button>
          </div>
          {editOpen && (
            <div style={{ marginTop: 10, background: "white", border: "0.5px solid #EF9F27", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: "#BA7517", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <i className="ti ti-alert-triangle" /> Wijzigingen worden meegestuurd in het rapport
              </div>
              {[["Bedrijfsnaam","name"],["Straat & huisnummer","street"],["Postcode & stad","city"],["Locatiedetail","detail"]].map(([lbl,key]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 3, marginTop: 7 }}>{lbl}</div>
                  <input value={editDraft[key]} onChange={(e) => { setEditDraft((d) => ({ ...d, [key]: e.target.value })); }} onBlur={applyEdit}
                    style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 6, padding: "6px 9px", fontSize: 12, fontFamily: "inherit", background: "white" }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 6, background: addrVerified ? "#E1F5EE" : addrChanged ? "#FAEEDA" : "#f9f9f9", color: addrVerified ? "#0F6E56" : addrChanged ? "#633806" : "#aaa" }}>
            <i className={`ti ${addrVerified ? "ti-circle-check" : addrChanged ? "ti-alert-triangle" : "ti-circle-dashed"}`} />
            {addrVerified ? "Bevestigd — adres is correct" : addrChanged ? "Adres aangepast — wordt meegestuurd" : "Nog niet geverifieerd"}
          </div>
        </div>
      </div>

      {/* CHECKLIST */}
      {SECTIONS.map((sec) => (
        <div key={sec.id} style={s.section}>
          <div style={s.sectionTitle}><i className={`ti ${sec.icon}`} /> {sec.title}</div>
          {sec.items.map((item, idx) => (
            <div key={item.id} style={{ ...s.checkItem, borderBottom: idx === sec.items.length - 1 ? "none" : "0.5px solid #eee", paddingBottom: idx === sec.items.length - 1 ? 0 : 10 }}>
              <div style={{ fontSize: 13, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{item.sub}</div>
              <div style={s.ansRow}>
                {["ia","sat","good","exc","na"].map((k) => (
                  <button key={k} style={s.ansBtn(k, responses[item.id] === k)} onClick={() => setResponse(item.id, k)}>{LABELS[k]}</button>
                ))}
              </div>
              {photos[item.id]
                ? <div style={{ fontSize: 11, color: "#0F6E56", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-photo-check" /> 1 foto toegevoegd</div>
                : <button style={s.photoBtn} onClick={() => setPhotos((p) => ({ ...p, [item.id]: true }))}><i className="ti ti-camera" /> Foto toevoegen</button>
              }
            </div>
          ))}
        </div>
      ))}

      {/* SLIDER */}
      <div style={s.section}>
        <div style={s.sectionTitle}><i className="ti ti-arrows-maximize" /> Ruimte voor groei</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Beschikbare capaciteit</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Schat het percentage vrije opslagruimte</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: sliderColor }}>{sliderVal}%</div>
        </div>
        <div style={{ position: "relative", height: 7, borderRadius: 4, background: "linear-gradient(to right,#E24B4A 0%,#EF9F27 30%,#639922 65%,#1D9E75 100%)", marginBottom: 6 }}>
          <input type="range" min={0} max={100} value={sliderVal} onChange={(e) => setSliderVal(Number(e.target.value))}
            style={{ WebkitAppearance: "none", appearance: "none", width: "100%", position: "absolute", top: "50%", transform: "translateY(-50%)", left: 0, height: 7, background: "transparent", cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", marginTop: 3 }}>
          <span>0% vrij</span><span>25%</span><span>50%</span><span>75%</span><span>100% vrij</span>
        </div>
        <textarea value={sliderRemark} onChange={(e) => setSliderRemark(e.target.value)} rows={2} placeholder="Toelichting..."
          style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", background: "white", resize: "none", marginTop: 10 }} />
      </div>

      {/* STOCK CHECK */}
      <div style={s.section}>
        <div style={s.sectionTitle}><i className="ti ti-barcode" /> Stock check</div>
        <div style={{ display: "flex", marginBottom: "0.875rem", border: "0.5px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          <button style={s.stockTab(stockTab === "a")} onClick={() => setStockTab("a")}>Artikel → Bin (papier → fysiek)</button>
          <button style={{ ...s.stockTab(stockTab === "b"), borderLeft: "0.5px solid #ddd" }} onClick={() => setStockTab("b")}>Bin → Artikel (fysiek → papier)</button>
        </div>
        {stockTab === "a" ? (
          <>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 10, padding: "7px 9px", background: "#f9f9f9", borderRadius: 7 }}>
              <i className="ti ti-info-circle" /> Zoek het artikelnummer op in de bin en noteer de fysiek getelde voorraad.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["#","Artikelnummer","Omschrijving","Geteld","Status"].map((h) => <th key={h} style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textAlign: "left", padding: "5px 6px", borderBottom: "0.5px solid #eee" }}>{h}</th>)}</tr></thead>
              <tbody>
                {ARTIKELEN.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px 6px", fontSize: 12, color: "#aaa" }}>{i + 1}</td>
                    <td style={{ padding: "5px 6px", fontSize: 11, fontWeight: 500 }}>{item.art}</td>
                    <td style={{ padding: "5px 6px", fontSize: 11, color: "#aaa" }}>{item.omschrijving}</td>
                    <td style={{ padding: "5px 6px" }}><input type="number" min={0} value={stockA[i]} onChange={(e) => setStockA((a) => a.map((v, j) => j === i ? e.target.value : v))} placeholder="0" style={s.stockInput(false)} /></td>
                    <td style={{ padding: "5px 6px" }}>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 500, background: stockA[i] !== "" ? "#E1F5EE" : "#f9f9f9", color: stockA[i] !== "" ? "#085041" : "#aaa" }}>
                        {stockA[i] !== "" ? "Geteld ✓" : "In te vullen"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 10, padding: "7px 9px", background: "#f9f9f9", borderRadius: 7 }}>
              <i className="ti ti-info-circle" /> Ga naar de locatie en noteer welk artikel en hoeveel stuks je fysiek aantreft.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["#","Locatie","Artikel gevonden","Aantal","Status"].map((h) => <th key={h} style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textAlign: "left", padding: "5px 6px", borderBottom: "0.5px solid #eee" }}>{h}</th>)}</tr></thead>
              <tbody>
                {LOCATIES.map((loc, i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px 6px", fontSize: 12, color: "#aaa" }}>{i + 1}</td>
                    <td style={{ padding: "5px 6px", fontSize: 12, fontWeight: 500 }}>{loc}</td>
                    <td style={{ padding: "5px 6px" }}><input type="text" value={stockB[i].art} onChange={(e) => setStockB((b) => b.map((v, j) => j === i ? { ...v, art: e.target.value } : v))} placeholder="ART-XXXXX" style={s.stockInput(true)} /></td>
                    <td style={{ padding: "5px 6px" }}><input type="number" min={0} value={stockB[i].qty} onChange={(e) => setStockB((b) => b.map((v, j) => j === i ? { ...v, qty: e.target.value } : v))} placeholder="0" style={s.stockInput(false)} /></td>
                    <td style={{ padding: "5px 6px" }}>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 500, background: stockB[i].art && stockB[i].qty ? "#E6F1FB" : "#f9f9f9", color: stockB[i].art && stockB[i].qty ? "#0C447C" : "#aaa" }}>
                        {stockB[i].art && stockB[i].qty ? "Genoteerd ✓" : "In te vullen"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* HANDTEKENINGEN */}
      <div style={s.section}>
        <div style={s.sectionTitle}><i className="ti ti-writing-sign" /> Handtekeningen</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
          <SignaturePad id="a" label="Auditor" sublabel="Naam en handtekening" />
          <SignaturePad id="b" label="Lokale contactpersoon" sublabel="Naam en handtekening" />
        </div>
      </div>

      {/* SUBMIT */}
      <div style={{ padding: "1rem 1.25rem" }}>
        <button style={s.submitBtn} onClick={() => setView("success")}>
          <i className="ti ti-send" /> Audit indienen
        </button>
      </div>
    </div>
  );
}
