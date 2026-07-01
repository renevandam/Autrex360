import { jsPDF } from "jspdf";
import { supabase } from "./supabase";
import { getTableColumns, getTableMaxRows } from "./tableColumns";

const BRAND_BLUE = [11, 110, 193];
const BRAND_DARK = [9, 50, 90];
const GREY = [136, 136, 136];
const LIGHT_GREY = [200, 200, 200];

function hexToRgb(hex, fallback) {
  if (!hex) return fallback;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return fallback;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

// Loads everything needed for the print form, either from Supabase (online)
// or from a previously-downloaded offline snapshot (so this can be prepared
// before going somewhere with zero connectivity, the same fallback scenario
// the offline feature itself was built for).
async function loadPrintFormData(auditId, offlineSnapshot) {
  if (offlineSnapshot) {
    return {
      locationName: offlineSnapshot.locData?.name || null,
      templateName: offlineSnapshot.templateName || null,
      auditorName: offlineSnapshot.auditorName || null,
      auditDate: offlineSnapshot.auditDate || new Date().toISOString().slice(0, 10),
      sections: offlineSnapshot.sections || [],
      itemOptions: offlineSnapshot.itemOptions || {},
      organization: offlineSnapshot.organization || null,
    };
  }

  const { data: audit } = await supabase
    .from("audits")
    .select("*, locations(name), audit_templates(name)")
    .eq("id", auditId)
    .single();
  if (!audit) throw new Error("Audit not found");

  const { data: organization } = audit.organization_id
    ? await supabase.from("organizations").select("name, address, logo_url, primary_color").eq("id", audit.organization_id).single()
    : { data: null };

  let sectionsResult, itemOptions;

  if (audit.template_snapshot) {
    // Frozen at the moment this audit started - never affected by later template edits.
    itemOptions = {};
    sectionsResult = audit.template_snapshot.sections.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => {
        if (it.answer_set) itemOptions[it.id] = it.answer_set.options || [];
        return it;
      }),
    }));
  } else {
    // Fallback for audits created before snapshotting existed - reads live data as before.
    const { data: sections } = await supabase
      .from("template_sections")
      .select("*")
      .eq("template_id", audit.template_id)
      .order("sort_order");

    const sectionIds = (sections || []).map((s) => s.id);
    const { data: items } = sectionIds.length
      ? await supabase.from("template_items").select("*").in("section_id", sectionIds).order("sort_order")
      : { data: [] };

    const setIds = [...new Set((items || []).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];
    const { data: options } = setIds.length
      ? await supabase.from("answer_options").select("*").in("set_id", setIds).order("sort_order")
      : { data: [] };

    const optionsBySet = {};
    (options || []).forEach((o) => { optionsBySet[o.set_id] = optionsBySet[o.set_id] || []; optionsBySet[o.set_id].push(o); });
    itemOptions = {};
    (items || []).forEach((it) => { itemOptions[it.id] = it.answer_set_id ? (optionsBySet[it.answer_set_id] || []) : []; });

    const itemsBySection = {};
    (items || []).forEach((it) => { itemsBySection[it.section_id] = itemsBySection[it.section_id] || []; itemsBySection[it.section_id].push(it); });
    sectionsResult = (sections || []).map((sec) => ({ ...sec, items: itemsBySection[sec.id] || [] }));
  }

  return {
    locationName: audit.locations?.name || null,
    templateName: audit.audit_templates?.name || null,
    auditorName: audit.auditor_name || null,
    auditDate: audit.audit_date,
    sections: sectionsResult,
    itemOptions,
    organization,
  };
}

export async function exportAuditToPrintForm(auditId, offlineSnapshot = null) {
  const { locationName, templateName, auditorName, auditDate, sections, itemOptions, organization } = await loadPrintFormData(auditId, offlineSnapshot);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  function ensureSpace(needed) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text(`${templateName || "Audit"} — ${locationName || ""} (continued)`, margin, y);
      y += 16;
    }
  }

  function heading(text, size = 13, color = BRAND_DARK) {
    ensureSpace(size + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, margin, y);
    y += size + 8;
  }

  function checkbox(x, yPos, label) {
    const boxSize = 9;
    doc.setDrawColor(80, 80, 80);
    doc.rect(x, yPos - boxSize + 2, boxSize, boxSize);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(label, x + boxSize + 4, yPos);
    return boxSize + 4 + doc.getTextWidth(label) + 14;
  }

  const headerColor = hexToRgb(organization?.primary_color, BRAND_BLUE);
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(organization?.name || "Audit form", margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Paper form — for use without a tablet or phone", margin, 52);
  y = 92;

  heading(templateName || "Audit", 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  if (locationName) { doc.text(`Location: ${locationName}`, margin, y); y += 15; }
  doc.text(`Date: ${auditDate ? new Date(auditDate).toLocaleDateString("en-US") : "_______________"}`, margin, y);
  y += 15;
  doc.text(`Auditor: ${auditorName || "_______________________________"}`, margin, y);
  y += 24;

  doc.setDrawColor(...LIGHT_GREY);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  for (const section of sections) {
    heading(section.name, 13, headerColor);
    if (section.items.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...GREY);
      ensureSpace(16);
      doc.text("No questions in this section.", margin, y);
      y += 16;
      continue;
    }

    for (const item of section.items) {
      if (item.answer_type === "signature") continue;

      ensureSpace(40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const label = item.label + (item.sub_label ? ` (${item.sub_label})` : "");
      const wrappedLabel = doc.splitTextToSize(label, pageWidth - margin * 2);
      doc.text(wrappedLabel, margin, y);
      y += wrappedLabel.length * 13 + 6;

      if (item.answer_type === "score" && itemOptions[item.id]?.length > 0) {
        let xPos = margin + 10;
        ensureSpace(16);
        for (const opt of itemOptions[item.id]) {
          const w = checkbox(xPos, y, opt.label);
          if (xPos + w > pageWidth - margin) {
            xPos = margin + 10;
            y += 18;
            ensureSpace(16);
          } else {
            xPos += w;
          }
        }
        y += 22;
      } else if (item.answer_type === "checkbox") {
        ensureSpace(16);
        let xPos = margin + 10;
        xPos += checkbox(xPos, y, "Yes");
        checkbox(xPos, y, "No");
        y += 22;
      } else if (item.answer_type === "datetime") {
        ensureSpace(16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GREY);
        doc.text("_______________________", margin + 10, y);
        y += 20;
      } else if (item.answer_type === "stock_take") {
        const tableColumns = getTableColumns(item);
        const maxRows = getTableMaxRows(item);
        const totalWidth = pageWidth - margin * 2 - 20;
        const colWidths = tableColumns.map(() => totalWidth / tableColumns.length);
        const rowHeight = 18;
        ensureSpace(rowHeight * (maxRows + 1) + 6);
        let xPos = margin + 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...GREY);
        tableColumns.forEach((col, i) => { doc.text(col.label, xPos + 3, y - 4); xPos += colWidths[i]; });
        y += 4;
        doc.setDrawColor(...LIGHT_GREY);
        for (let r = 0; r <= maxRows; r++) {
          doc.line(margin + 10, y + r * rowHeight, margin + 10 + colWidths.reduce((a, b) => a + b, 0), y + r * rowHeight);
        }
        xPos = margin + 10;
        for (let c = 0; c <= tableColumns.length; c++) {
          doc.line(xPos, y, xPos, y + maxRows * rowHeight);
          if (c < tableColumns.length) xPos += colWidths[c];
        }
        y += maxRows * rowHeight + 10;
      } else {
        ensureSpace(40);
        doc.setDrawColor(...LIGHT_GREY);
        doc.line(margin + 10, y + 6, pageWidth - margin, y + 6);
        doc.line(margin + 10, y + 24, pageWidth - margin, y + 24);
        y += 34;
      }
    }
    y += 6;
  }

  ensureSpace(60);
  y += 10;
  doc.setDrawColor(...LIGHT_GREY);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Signature: _______________________________", margin, y);
  doc.text("Date: _______________", pageWidth - margin - 130, y);

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 55, pageHeight - 24);
    doc.text("Powered by Autrex360", pageWidth / 2 - 38, pageHeight - 24);
  }

  const fileName = `audit-form-${(locationName || templateName || "blank").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  doc.save(fileName);
}
