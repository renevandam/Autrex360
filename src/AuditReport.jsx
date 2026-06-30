import { useState, useEffect } from "react";
import { loadAuditReportData, answerLabel, isActionItem, answerColor, getActionItems, STATUS_LABEL } from "./lib/auditReportData";
import { exportAuditToPdf } from "./lib/exportPdf";

export default function AuditReport({ auditId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await loadAuditReportData(auditId);
        setData(result);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [auditId]);

  async function handleExportPdf() {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportAuditToPdf(auditId);
    } catch (e) {
      alert("Could not generate PDF: " + e.message);
    }
    setExportingPdf(false);
  }

  const s = {
    wrap: { fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 680, margin: "0 auto", background: "#fff", minHeight: "100vh" },
    header: { padding: "1rem 1.25rem", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" },
    page: { padding: "1.25rem" },
    sec: { padding: "0 1.25rem", marginTop: 18 },
    secTitle: { fontSize: 13, fontWeight: 700, color: "#378ADD", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 },
    card: { background: "#f9f9f9", border: "0.5px solid #e8e8e8", borderRadius: 10, padding: "0.75rem 1rem" },
  };

  if (loading) return (
    <div style={{ ...s.wrap, textAlign: "center", padding: "3rem", color: "#aaa" }}>
      <i className="ti ti-loader-2" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />Loading report...
    </div>
  );

  if (error || !data) return (
    <div style={{ ...s.wrap, textAlign: "center", padding: "3rem" }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 36, color: "#E24B4A", display: "block", marginBottom: 10 }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>Could not load the report</div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{error}</div>
      <button onClick={onBack} style={{ marginTop: 16, padding: "8px 16px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Back</button>
    </div>
  );

  const { audit, organization, sections, optionsBySet, responseByItem, noteByItem, stockByItem, photosByItem, rangesBySet } = data;

  const actionItems = getActionItems(sections, optionsBySet, responseByItem, rangesBySet, audit);

  const scoreColor = audit.score_pct >= 80 ? "#1D9E75" : audit.score_pct >= 50 ? "#EF9F27" : "#E24B4A";

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#1D9E75", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button onClick={handleExportPdf} disabled={exportingPdf} style={{ fontSize: 12, color: "#378ADD", border: "0.5px solid #378ADD", borderRadius: 6, padding: "5px 10px", background: "none", cursor: exportingPdf ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-file-type-pdf" /> {exportingPdf ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {organization && (
        <div style={{ background: organization.primary_color || "#0B6EC1", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "white", fontSize: 18, fontWeight: 700 }}>{organization.name || "Audit report"}</div>
          {organization.logo_url && <img src={organization.logo_url} style={{ height: 36, maxWidth: 100, objectFit: "contain" }} />}
        </div>
      )}

      <div style={s.page}>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#09325A" }}>
          {audit.audit_templates?.name || "Audit"}
          {audit.locations?.name && <span style={{ color: "#aaa", fontWeight: 400 }}> – {audit.locations.name}</span>}
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          <i className="ti ti-calendar" style={{ fontSize: 13 }} /> {new Date(audit.audit_date).toLocaleDateString("en-US")}
          {audit.auditor_name && <> · {audit.auditor_name}</>}
          {" · "}
          <span style={{ fontWeight: 500, color: audit.status === "submitted" ? "#1D9E75" : "#EF9F27" }}>{STATUS_LABEL[audit.status] || audit.status}</span>
        </div>

        {/* Score */}
        <div style={{ marginTop: 18 }}>
          {audit.score_pct !== null && audit.score_pct !== undefined ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 38, fontWeight: 700, color: scoreColor }}>{audit.score_pct}%</div>
              <div style={{ fontSize: 13, color: "#888" }}>{audit.score_achieved ?? "?"} / {audit.score_max ?? "?"} points</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>Score not yet available (audit has not been submitted yet)</div>
          )}
        </div>

        {/* QA status */}
        {audit.qa_status && audit.qa_status !== "not_required" && (
          <div style={{ marginTop: 18 }}>
            {(() => {
              const qaColor = audit.qa_status === "approved" ? "#1D9E75" : audit.qa_status === "rejected" ? "#E24B4A" : "#EF9F27";
              const qaLabel = audit.qa_status === "approved" ? "QA: Approved" : audit.qa_status === "rejected" ? "QA: Rejected" : "QA: Pending review";
              const qaBg = audit.qa_status === "approved" ? "#E1F5EE" : audit.qa_status === "rejected" ? "#FCEBEB" : "#FAEEDA";
              return (
                <div style={{ background: qaBg, border: `0.5px solid ${qaColor}`, borderRadius: 10, padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: qaColor }}>{qaLabel}</div>
                  {audit.qa_note && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{audit.qa_note}</div>}
                </div>
              );
            })()}
          </div>
        )}

        {/* Action items */}
        <div style={{ marginTop: 18 }}>
          {actionItems.length > 0 ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E24B4A", marginBottom: 8 }}>
                <i className="ti ti-alert-triangle" /> Action items ({actionItems.length})
              </div>
              <div style={{ background: "#FCEBEB", border: "0.5px solid #E24B4A", borderRadius: 10, padding: "0.75rem 1rem" }}>
                {actionItems.map((entry, idx) => (
                  <div key={entry.addressChange ? "address-change" : entry.item.id} style={{ fontSize: 13, padding: "5px 0", borderTop: idx === 0 ? "none" : "0.5px solid #f3d6d6" }}>
                    {entry.addressChange ? (
                      <><span style={{ color: "#888" }}>[{entry.section}]</span> Address was edited during the audit — <span style={{ fontWeight: 600, color: "#A32D2D" }}>check against the CRM source data</span></>
                    ) : (
                      <><span style={{ color: "#888" }}>[{entry.section}]</span> {entry.item.label} — <span style={{ fontWeight: 600, color: "#A32D2D" }}>{answerLabel(entry.item, optionsBySet, responseByItem)}</span></>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#1D9E75", fontStyle: "italic" }}><i className="ti ti-circle-check" /> No action items flagged.</div>
          )}
        </div>
      </div>

      {/* Detailed sections */}
      {sections.map((section) => (
        <div key={section.id} style={s.sec}>
          <div style={s.secTitle}><i className="ti ti-list" /> {section.name}</div>
          <div style={s.card}>
            {section.items.length === 0 ? (
              <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>No questions in this section.</div>
            ) : section.items.filter((i) => i.answer_type !== "signature").map((item, idx) => {
              const flagged = isActionItem(item, optionsBySet, responseByItem, rangesBySet);
              const color = answerColor(item, optionsBySet, responseByItem);
              return (
                <div key={item.id} style={{ padding: "8px 0", borderTop: idx === 0 ? "none" : "0.5px solid #eee" }}>
                  {item.answer_type === "stock_take" ? (
                    <>
                      <div style={{ fontSize: 13 }}>{item.label}</div>
                      <div style={{ marginTop: 6, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr>
                              {[item.stock_col1_label || "Col1", item.stock_col2_label || "Col2", item.stock_col3_label || "Col3"].map((h) => (
                                <th key={h} style={{ textAlign: "left", color: "#aaa", fontWeight: 500, padding: "3px 6px", borderBottom: "0.5px solid #ddd" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(stockByItem[item.id] || []).map((row) => (
                              <tr key={row.id || row.row_order}>
                                <td style={{ padding: "3px 6px" }}>{row.col1_value || "—"}</td>
                                <td style={{ padding: "3px 6px" }}>{row.col2_value || "—"}</td>
                                <td style={{ padding: "3px 6px" }}>{row.col3_value || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13 }}>{item.label}</div>
                        {item.sub_label && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{item.sub_label}</div>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: flagged ? "#A32D2D" : (color || "#1D9E75"), whiteSpace: "nowrap" }}>
                        {answerLabel(item, optionsBySet, responseByItem)}
                      </div>
                    </div>
                  )}
                  {noteByItem[item.id] && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#555", background: "#F3F3F3", borderRadius: 6, padding: "6px 9px", display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <i className="ti ti-note" style={{ fontSize: 12, color: "#888", marginTop: 1 }} />
                      <span>{noteByItem[item.id]}</span>
                    </div>
                  )}
                  {(photosByItem[item.id] || []).length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {photosByItem[item.id].map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.url}
                          onClick={() => setLightboxUrl(photo.url)}
                          style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid #ddd" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={lightboxUrl} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 11, color: "#bbb", padding: "20px 0 30px" }}>Powered by Autrex360</div>
    </div>
  );
}
