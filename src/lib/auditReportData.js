import { supabase } from "./supabase";

export const STATUS_LABEL = { draft: "Concept", submitted: "Ingediend" };

// Fetch everything needed to render a full audit report
export async function loadAuditReportData(auditId) {
  const { data: audit } = await supabase
    .from("audits")
    .select("*, locations(*), audit_templates(id,name,description)")
    .eq("id", auditId)
    .single();
  if (!audit) throw new Error("Audit niet gevonden");

  const { data: organization } = audit.organization_id
    ? await supabase.from("organizations").select("name, address, logo_url, primary_color").eq("id", audit.organization_id).single()
    : { data: null };

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", audit.template_id)
    .order("sort_order");

  const sectionIds = (sections || []).map((s) => s.id);
  const { data: items } = sectionIds.length
    ? await supabase.from("template_items").select("*, answer_sets(name,set_type,slider_mode,slider_min,slider_max,slider_step)").in("section_id", sectionIds).order("sort_order")
    : { data: [] };

  const itemIds = (items || []).map((i) => i.id);
  const setIds = [...new Set((items || []).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];

  const [{ data: options }, { data: responses }, { data: stockRows }, { data: photoRows }] = await Promise.all([
    setIds.length ? supabase.from("answer_options").select("*").in("set_id", setIds) : Promise.resolve({ data: [] }),
    itemIds.length ? supabase.from("audit_responses").select("*").in("item_id", itemIds).eq("audit_id", auditId) : Promise.resolve({ data: [] }),
    itemIds.length ? supabase.from("stock_checks").select("*").in("item_id", itemIds).eq("audit_id", auditId).order("row_order") : Promise.resolve({ data: [] }),
    itemIds.length ? supabase.from("audit_photos").select("*").in("item_id", itemIds).eq("audit_id", auditId).order("created_at") : Promise.resolve({ data: [] }),
  ]);

  const optionsBySet = {};
  (options || []).forEach((o) => { optionsBySet[o.set_id] = optionsBySet[o.set_id] || []; optionsBySet[o.set_id].push(o); });
  const responseByItem = {};
  (responses || []).forEach((r) => { responseByItem[r.item_id] = r.response; });
  const stockByItem = {};
  (stockRows || []).forEach((r) => { stockByItem[r.item_id] = stockByItem[r.item_id] || []; stockByItem[r.item_id].push(r); });
  const photosByItem = {};
  (photoRows || []).forEach((p) => {
    photosByItem[p.item_id] = photosByItem[p.item_id] || [];
    photosByItem[p.item_id].push({ ...p, url: supabase.storage.from("audit-photos").getPublicUrl(p.storage_path).data.publicUrl });
  });

  const itemsBySection = {};
  (items || []).forEach((it) => { itemsBySection[it.section_id] = itemsBySection[it.section_id] || []; itemsBySection[it.section_id].push(it); });

  return {
    audit,
    organization,
    sections: (sections || []).map((sec) => ({ ...sec, items: itemsBySection[sec.id] || [] })),
    optionsBySet,
    responseByItem,
    stockByItem,
    photosByItem,
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

export function isActionItem(item, optionsBySet, responseByItem) {
  if (item.answer_type !== "score" || !item.answer_set_id) return false;
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
