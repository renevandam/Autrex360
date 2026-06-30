import { jsPDF } from "jspdf";
import { loadAuditReportData, answerLabel, isActionItem, getActionItems, STATUS_LABEL } from "./auditReportData";

const BRAND_BLUE = [11, 110, 193];   // #0B6EC1
const BRAND_DARK = [9, 50, 90];      // #09325A
const GREEN = [29, 158, 117];        // #1D9E75
const ORANGE = [239, 159, 39];       // #EF9F27
const RED = [226, 75, 74];           // #E24B4A
const GREY = [136, 136, 136];

// Converts a "#rrggbb" string to an [r,g,b] array for jsPDF color functions
function hexToRgb(hex, fallback) {
  if (!hex) return fallback;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return fallback;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

export async function exportAuditToPdf(auditId) {
  const { audit, organization, sections, optionsBySet, responseByItem, noteByItem, stockByItem, photosByItem, rangesBySet } = await loadAuditReportData(auditId);

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
  const headerColor = hexToRgb(organization?.primary_color, BRAND_BLUE);
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(organization?.name || "Audit report", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (organization?.address) {
    doc.text(organization.address, margin, 58);
  }

  if (organization?.logo_url) {
    const logoDataUrl = await loadImageAsDataUrl(organization.logo_url);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", pageWidth - margin - 50, 12, 50, 46);
      } catch {
        // skip if jsPDF can't decode this image format
      }
    }
  }

  y = 100;

  // ── Summary ──
  heading(audit.locations?.name || audit.audit_templates?.name || "Audit", 16);
  bodyLine("Template", audit.audit_templates?.name);
  bodyLine("Date", new Date(audit.audit_date).toLocaleDateString("en-US"));
  bodyLine("Auditor", audit.auditor_name);
  bodyLine("Status", STATUS_LABEL[audit.status] || audit.status);
  if (audit.location_id) bodyLine("Address verified", audit.address_verified ? "Yes" : "No");

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
    doc.text(`${audit.score_achieved ?? "?"} / ${audit.score_max ?? "?"} points`, margin + 80, y + 24);
    y += 40;
  } else {
    y += 6;
    ensureSpace(20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text("Score not yet available (audit has not been submitted yet)", margin, y + 4);
    y += 20;
  }

  // ── Action items summary ──
  const actionItems = getActionItems(sections, optionsBySet, responseByItem, rangesBySet, audit);

  if (actionItems.length > 0) {
    y += 6;
    heading(`Action items (${actionItems.length})`, 13, RED);
    actionItems.forEach((entry) => {
      ensureSpace(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const text = entry.addressChange
        ? `• [${entry.section}] Address was edited during the audit — check against the CRM source data`
        : `• [${entry.section}] ${entry.item.label} — ${answerLabel(entry.item, optionsBySet, responseByItem)}`;
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
    doc.text("No action items flagged.", margin, y + 4);
    y += 20;
  }

  if (audit.qa_status && audit.qa_status !== "not_required") {
    y += 6;
    ensureSpace(24);
    const qaColor = audit.qa_status === "approved" ? GREEN : audit.qa_status === "rejected" ? RED : ORANGE;
    const qaLabel = audit.qa_status === "approved" ? "QA: Approved" : audit.qa_status === "rejected" ? "QA: Rejected" : "QA: Pending review";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...qaColor);
    doc.text(qaLabel, margin, y);
    y += 16;
    if (audit.qa_note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const wrappedNote = doc.splitTextToSize(`Note: ${audit.qa_note}`, pageWidth - margin * 2);
      ensureSpace(wrappedNote.length * 13);
      doc.text(wrappedNote, margin, y);
      y += wrappedNote.length * 13 + 4;
    }
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
      doc.text("No questions in this section.", margin, y);
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
        doc.text(`${rows.length} row(s)`, pageWidth - margin - 140, y);
        y += wrappedLabel.length * 13 + 4;
        rows.forEach((r) => {
          ensureSpace(14);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(`   ${item.stock_col1_label || "Col1"}: ${r.col1_value || "—"}  ·  ${item.stock_col2_label || "Col2"}: ${r.col2_value || "—"}  ·  ${item.stock_col3_label || "Col3"}: ${r.col3_value || "—"}`, margin, y);
          y += 13;
        });
      } else {
        const answer = answerLabel(item, optionsBySet, responseByItem);
        const flagged = isActionItem(item, optionsBySet, responseByItem, rangesBySet);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...(flagged ? RED : GREEN));
        const wrappedAnswer = doc.splitTextToSize(answer, 150);
        doc.text(wrappedAnswer, pageWidth - margin - 150, y);
        y += Math.max(wrappedLabel.length, wrappedAnswer.length) * 13 + 4;
      }

      // Note attached to this question, if any
      if (noteByItem[item.id]) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...GREY);
        const wrappedNote = doc.splitTextToSize(`Note: ${noteByItem[item.id]}`, pageWidth - margin * 2);
        ensureSpace(wrappedNote.length * 12);
        doc.text(wrappedNote, margin, y);
        y += wrappedNote.length * 12 + 4;
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

  // ── Footer with page numbers and Autrex360 attribution ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 60, pageHeight - 24);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-US")}`, margin, pageHeight - 24);
    doc.text("Powered by Autrex360", pageWidth / 2 - 38, pageHeight - 24);
  }

  const fileName = `audit-${(audit.locations?.name || audit.audit_templates?.name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${audit.audit_date}.pdf`;
  doc.save(fileName);
}
