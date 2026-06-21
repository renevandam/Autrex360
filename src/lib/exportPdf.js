import { jsPDF } from "jspdf";
import { loadAuditReportData, answerLabel, isActionItem, STATUS_LABEL } from "./auditReportData";

const BRAND_BLUE = [11, 110, 193];   // #0B6EC1
const BRAND_DARK = [9, 50, 90];      // #09325A
const GREEN = [29, 158, 117];        // #1D9E75
const ORANGE = [239, 159, 39];       // #EF9F27
const RED = [226, 75, 74];           // #E24B4A
const GREY = [136, 136, 136];

export async function exportAuditToPdf(auditId) {
  const { audit, sections, optionsBySet, responseByItem, stockByItem, photosByItem } = await loadAuditReportData(auditId);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Fetch an image and convert to base64 so jsPDF can embed it
  async function loadImageAsDataUrl(url) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null; // skip photos that fail to load rather than breaking the whole PDF
    }
  }

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
  heading(audit.locations?.name || audit.audit_templates?.name || "Audit", 16);
  bodyLine("Template", audit.audit_templates?.name);
  bodyLine("Datum", new Date(audit.audit_date).toLocaleDateString("nl-NL"));
  bodyLine("Auditor", audit.auditor_name);
  bodyLine("Status", STATUS_LABEL[audit.status] || audit.status);
  if (audit.location_id) bodyLine("Adres geverifieerd", audit.address_verified ? "Ja" : "Nee");

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

  for (const section of sections) {
    heading(section.name, 13, BRAND_BLUE);
    if (section.items.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...GREY);
      ensureSpace(16);
      doc.text("Geen vragen in deze sectie.", margin, y);
      y += 16;
    }
    for (const item of section.items) {
      if (item.answer_type === "signature") continue; // signatures shown separately if needed
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

      // Embed photos for this question, thumbnail-sized, wrapping to new rows as needed
      const photos = photosByItem[item.id] || [];
      if (photos.length > 0) {
        const thumbSize = 50;
        const gap = 6;
        let xPos = margin;
        ensureSpace(thumbSize + 6);
        const rowStartY = y;
        for (const photo of photos) {
          const dataUrl = await loadImageAsDataUrl(photo.url);
          if (!dataUrl) continue;
          if (xPos + thumbSize > pageWidth - margin) {
            xPos = margin;
            y += thumbSize + gap;
            ensureSpace(thumbSize + 6);
          }
          try {
            doc.addImage(dataUrl, "JPEG", xPos, y, thumbSize, thumbSize);
          } catch {
            // skip images jsPDF can't decode (e.g. unsupported format)
          }
          xPos += thumbSize + gap;
        }
        y += thumbSize + 8;
      }
    }
    y += 8;
  }

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

  const fileName = `audit-${(audit.locations?.name || audit.audit_templates?.name || "rapport").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${audit.audit_date}.pdf`;
  doc.save(fileName);
}
