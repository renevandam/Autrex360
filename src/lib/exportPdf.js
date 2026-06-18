import { jsPDF } from "jspdf";
import { supabase } from "./supabase";

const BRAND_BLUE = [11, 110, 193];   // #0B6EC1
const BRAND_DARK = [9, 50, 90];      // #09325A
const GREEN = [29, 158, 117];        // #1D9E75
const ORANGE = [239, 159, 39];       // #EF9F27
const RED = [226, 75, 74];           // #E24B4A
const GREY = [136, 136, 136];

const STATUS_LABEL = { draft: "Concept", submitted: "Ingediend" };

// Fetch everything needed to render a full audit report
async function loadAuditReportData(auditId) {
  const { data: audit } = await supabase
    .from("audits")
    .select("*, locations(*), audit_templates(id,name,description)")
    .eq("id", auditId)
    .single();
  if (!audit) throw new Error("Audit niet gevonden");

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", audit.template_id)
    .order("sort_order");

  const sectionIds = (sections || []).map((s) => s.id);
  const { data: items } = sectionIds.length
    ? await supabase.from("template_items").select("*, answer_sets(name)").in("section_id", sectionIds).order("sort_order")
    : { data: [] };

  const itemIds = (items || []).map((i) => i.id);
  const setIds = [...new Set((items || []).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];

  const [{ data: options }, { data: responses }, { data: stockRows }] = await Promise.all([
    setIds.length ? supabase.from("answer_options").select("*").in("set_id", setIds) : Promise.resolve({ data: [] }),
    itemIds.length ? supabase.from("audit_responses").select("*").in("item_id", itemIds).eq("audit_id", auditId) : Promise.resolve({ data: [] }),
    itemIds.length ? supabase.from("stock_checks").select("*").in("item_id", itemIds).eq("audit_id", auditId).order("row_order") : Promise.resolve({ data: [] }),
  ]);

  const optionsBySet = {};
  (options || []).forEach((o) => { optionsBySet[o.set_id] = optionsBySet[o.set_id] || []; optionsBySet[o.set_id].push(o); });
  const responseByItem = {};
  (responses || []).forEach((r) => { responseByItem[r.item_id] = r.response; });
  const stockByItem = {};
  (stockRows || []).forEach((r) => { stockByItem[r.item_id] = stockByItem[r.item_id] || []; stockByItem[r.item_id].push(r); });

  const itemsBySection = {};
  (items || []).forEach((it) => { itemsBySection[it.section_id] = itemsBySection[it.section_id] || []; itemsBySection[it.section_id].push(it); });

  return {
    audit,
    sections: (sections || []).map((sec) => ({ ...sec, items: itemsBySection[sec.id] || [] })),
    optionsBySet,
    responseByItem,
    stockByItem,
  };
}

function answerLabel(item, optionsBySet, responseByItem) {
  const raw = responseByItem[item.id];
  if (raw === undefined || raw === null || raw === "") return "— Niet ingevuld —";
  if (item.answer_type === "score" && item.answer_set_id) {
    const opts = optionsBySet[item.answer_set_id] || [];
    const match = opts.find((o) => o.id === raw);
    return match ? match.label : raw;
  }
  if (item.answer_type === "checkbox") return raw === "true" ? "Ja" : "Nee";
  if (item.answer_type === "slider") return `${raw}%`;
  return String(raw);
}

function isActionItem(item, optionsBySet, responseByItem) {
  if (item.answer_type !== "score" || !item.answer_set_id) return false;
  const opts = optionsBySet[item.answer_set_id] || [];
  const match = opts.find((o) => o.id === responseByItem[item.id]);
  return !!match?.is_action_item;
}

export async function exportAuditToPdf(auditId) {
  const { audit, sections, optionsBySet, responseByItem, stockByItem } = await loadAuditReportData(auditId);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  function ensureSpace(needed) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text, size = 14, color = BRAND_DARK) {
    ensureSpace(size + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, margin, y);
    y += size + 8;
  }

  function bodyLine(label, value, opts = {}) {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(String(value ?? "—"), margin + (opts.labelWidth || 130), y);
    y += 16;
  }

  // ── Header ──
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Autrex360", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Audit · Simplified", margin, 58);
  y = 100;

  // ── Summary ──
  heading(audit.locations?.name || "Onbekende locatie", 16);
  bodyLine("Template", audit.audit_templates?.name);
  bodyLine("Datum", new Date(audit.audit_date).toLocaleDateString("nl-NL"));
  bodyLine("Auditor", audit.auditor_name);
  bodyLine("Status", STATUS_LABEL[audit.status] || audit.status);
  bodyLine("Adres geverifieerd", audit.address_verified ? "Ja" : "Nee");

  if (audit.score_pct !== null && audit.score_pct !== undefined) {
    y += 6;
    ensureSpace(40);
    const scoreColor = audit.score_pct >= 80 ? GREEN : audit.score_pct >= 50 ? ORANGE : RED;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...scoreColor);
    doc.text(`${audit.score_pct}%`, margin, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(`${audit.score_achieved ?? "?"} / ${audit.score_max ?? "?"} punten`, margin + 80, y + 24);
    y += 40;
  } else {
    y += 6;
    ensureSpace(20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text("Score nog niet beschikbaar (audit is nog niet ingediend)", margin, y + 4);
    y += 20;
  }

  // ── Action items summary ──
  const actionItems = [];
  sections.forEach((sec) => sec.items.forEach((item) => {
    if (isActionItem(item, optionsBySet, responseByItem)) actionItems.push({ section: sec.name, item });
  }));

  if (actionItems.length > 0) {
    y += 6;
    heading(`Actiepunten (${actionItems.length})`, 13, RED);
    actionItems.forEach(({ section, item }) => {
      ensureSpace(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const text = `• [${section}] ${item.label} — ${answerLabel(item, optionsBySet, responseByItem)}`;
      const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 13 + 4;
    });
  } else {
    y += 6;
    ensureSpace(20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text("Geen actiepunten gesignaleerd.", margin, y + 4);
    y += 20;
  }

  // ── Detailed sections ──
  y += 10;
  ensureSpace(30);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  sections.forEach((section) => {
    heading(section.name, 13, BRAND_BLUE);
    if (section.items.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...GREY);
      ensureSpace(16);
      doc.text("Geen vragen in deze sectie.", margin, y);
      y += 16;
    }
    section.items.forEach((item) => {
      if (item.answer_type === "signature") return; // signatures shown separately if needed
      ensureSpace(30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const label = item.label + (item.sub_label ? ` (${item.sub_label})` : "");
      const wrappedLabel = doc.splitTextToSize(label, pageWidth - margin * 2 - 160);
      doc.text(wrappedLabel, margin, y);

      if (item.answer_type === "stock_take") {
        const rows = stockByItem[item.id] || [];
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...GREY);
        doc.text(`${rows.length} rij(en)`, pageWidth - margin - 140, y);
        y += wrappedLabel.length * 13 + 4;
        rows.forEach((r) => {
          ensureSpace(14);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(`   ${item.stock_col1_label || "Kol1"}: ${r.col1_value || "—"}  ·  ${item.stock_col2_label || "Kol2"}: ${r.col2_value || "—"}  ·  ${item.stock_col3_label || "Kol3"}: ${r.col3_value || "—"}`, margin, y);
          y += 13;
        });
      } else {
        const answer = answerLabel(item, optionsBySet, responseByItem);
        const flagged = isActionItem(item, optionsBySet, responseByItem);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...(flagged ? RED : GREEN));
        const wrappedAnswer = doc.splitTextToSize(answer, 150);
        doc.text(wrappedAnswer, pageWidth - margin - 150, y);
        y += Math.max(wrappedLabel.length, wrappedAnswer.length) * 13 + 4;
      }
    });
    y += 8;
  });

  // ── Footer with page numbers ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`Pagina ${i} van ${pageCount}`, pageWidth - margin - 60, pageHeight - 24);
    doc.text(`Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`, margin, pageHeight - 24);
  }

  const fileName = `audit-${(audit.locations?.name || "rapport").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${audit.audit_date}.pdf`;
  doc.save(fileName);
}
