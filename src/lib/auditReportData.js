import { supabase } from "./supabase";

export const STATUS_LABEL = { draft: "Draft", submitted: "Submitted" };

// Fetch everything needed to render a full audit report
export async function loadAuditReportData(auditId) {
  const { data: audit } = await supabase
    .from("audits")
    .select("*, locations(*), audit_templates(id,name,description)")
    .eq("id", auditId)
    .single();
  if (!audit) throw new Error("Audit not found");

  const { data: organization } = audit.organization_id
    ? await supabase.from("organizations").select("name, address, logo_url, primary_color").eq("id", audit.organization_id).single()
    : { data: null };

  const itemIdsForResponses = [];
  let sectionsResult, optionsBySet, rangesBySet;

  if (audit.template_snapshot) {
    // Use the audit's own frozen structure - never affected by later template edits.
    optionsBySet = {};
    rangesBySet = {};
    sectionsResult = audit.template_snapshot.sections.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => {
        itemIdsForResponses.push(it.id);
        if (it.answer_set) {
          optionsBySet[it.answer_set.id] = it.answer_set.options || [];
          rangesBySet[it.answer_set.id] = it.answer_set.actionRanges || [];
        }
        // Normalize to "answer_sets" (matching the live-data shape) so answerLabel/isActionItem work unchanged
        return { ...it, answer_sets: it.answer_set || null };
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
      ? await supabase.from("template_items").select("*, answer_sets(name,set_type,slider_mode,slider_min,slider_max,slider_step,slider_start_color,slider_end_color)").in("section_id", sectionIds).order("sort_order")
      : { data: [] };

    const setIds = [...new Set((items || []).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];
    const [{ data: liveOptions }, { data: liveRanges }] = await Promise.all([
      setIds.length ? supabase.from("answer_options").select("*").in("set_id", setIds) : Promise.resolve({ data: [] }),
      setIds.length ? supabase.from("slider_action_ranges").select("*").in("set_id", setIds) : Promise.resolve({ data: [] }),
    ]);

    optionsBySet = {};
    (liveOptions || []).forEach((o) => { optionsBySet[o.set_id] = optionsBySet[o.set_id] || []; optionsBySet[o.set_id].push(o); });
    rangesBySet = {};
    (liveRanges || []).forEach((r) => { rangesBySet[r.set_id] = rangesBySet[r.set_id] || []; rangesBySet[r.set_id].push(r); });

    const itemsBySection = {};
    (items || []).forEach((it) => {
      itemIdsForResponses.push(it.id);
      itemsBySection[it.section_id] = itemsBySection[it.section_id] || [];
      itemsBySection[it.section_id].push(it);
    });
    sectionsResult = (sections || []).map((sec) => ({ ...sec, items: itemsBySection[sec.id] || [] }));
  }

  const [{ data: responses }, { data: stockRows }, { data: photoRows }] = await Promise.all([
    itemIdsForResponses.length ? supabase.from("audit_responses").select("*").in("item_id", itemIdsForResponses).eq("audit_id", auditId) : Promise.resolve({ data: [] }),
    itemIdsForResponses.length ? supabase.from("stock_checks").select("*").in("item_id", itemIdsForResponses).eq("audit_id", auditId).order("row_order") : Promise.resolve({ data: [] }),
    itemIdsForResponses.length ? supabase.from("audit_photos").select("*").in("item_id", itemIdsForResponses).eq("audit_id", auditId).order("created_at") : Promise.resolve({ data: [] }),
  ]);

  const responseByItem = {};
  (responses || []).forEach((r) => { responseByItem[r.item_id] = r.response; });
  const stockByItem = {};
  (stockRows || []).forEach((r) => { stockByItem[r.item_id] = stockByItem[r.item_id] || []; stockByItem[r.item_id].push(r); });
  const photosByItem = {};
  (photoRows || []).forEach((p) => {
    photosByItem[p.item_id] = photosByItem[p.item_id] || [];
    photosByItem[p.item_id].push({ ...p, url: supabase.storage.from("audit-photos").getPublicUrl(p.storage_path).data.publicUrl });
  });

  return {
    audit,
    organization,
    sections: sectionsResult,
    optionsBySet,
    responseByItem,
    stockByItem,
    photosByItem,
    rangesBySet,
  };
}

export function answerLabel(item, optionsBySet, responseByItem) {
  const raw = responseByItem[item.id];
  if (raw === undefined || raw === null || raw === "") return "— Not filled in —";
  if (item.answer_type === "score" && item.answer_sets?.set_type === "slider") {
    const opts = item.answer_set_id ? (optionsBySet[item.answer_set_id] || []) : [];
    const naOption = opts.find((o) => o.is_na && o.id === raw);
    if (naOption) return naOption.label;
    const suffix = item.answer_sets.slider_mode === "percentage" ? "%" : "";
    return `${raw}${suffix}`;
  }
  if (item.answer_type === "score" && item.answer_set_id) {
    const opts = optionsBySet[item.answer_set_id] || [];
    const match = opts.find((o) => o.id === raw);
    return match ? match.label : raw;
  }
  if (item.answer_type === "checkbox") return raw === "true" ? "Yes" : "No";
  if (item.answer_type === "slider") return `${raw}%`;
  if (item.answer_type === "datetime") {
    const mode = item.datetime_mode || "date";
    if (mode === "time") return raw; // already HH:MM
    const d = new Date(mode === "date" ? `${raw}T00:00` : raw);
    if (isNaN(d.getTime())) return raw;
    if (mode === "date") return d.toLocaleDateString("en-US");
    return d.toLocaleString("en-US", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return String(raw);
}

export function isActionItem(item, optionsBySet, responseByItem, rangesBySet) {
  if (item.answer_type !== "score") return false;
  if (item.answer_sets?.set_type === "slider") {
    const raw = responseByItem[item.id];
    if (raw === undefined || raw === null || raw === "") return false;
    const opts = item.answer_set_id ? (optionsBySet[item.answer_set_id] || []) : [];
    if (opts.some((o) => o.is_na && o.id === raw)) return false; // N/A never counts as an action item
    const ranges = (rangesBySet && item.answer_set_id) ? (rangesBySet[item.answer_set_id] || []) : [];
    const v = Number(raw);
    return ranges.some((r) => v >= r.range_start && v <= r.range_end);
  }
  if (!item.answer_set_id) return false;
  const opts = optionsBySet[item.answer_set_id] || [];
  const match = opts.find((o) => o.id === responseByItem[item.id]);
  return !!match?.is_action_item;
}

export function answerColor(item, optionsBySet, responseByItem) {
  if (item.answer_type !== "score" || !item.answer_set_id) return null;
  const opts = optionsBySet[item.answer_set_id] || [];
  const match = opts.find((o) => o.id === responseByItem[item.id]);
  return match?.color || null;
}

// Builds the full list of action items for a report/PDF: every flagged question, plus a synthetic
// entry when the location address was edited during the audit (addresses often come straight from a
// CRM import, so an on-site correction is worth flagging for someone to fix at the source).
export function getActionItems(sections, optionsBySet, responseByItem, rangesBySet, audit) {
  const result = [];
  if (audit?.address_override) {
    result.push({ section: "Location", addressChange: true });
  }
  sections.forEach((sec) => sec.items.forEach((item) => {
    if (isActionItem(item, optionsBySet, responseByItem, rangesBySet)) result.push({ section: sec.name, item });
  }));
  return result;
}
