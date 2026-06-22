import { supabase } from "./supabase";

// Builds a complete, self-contained snapshot of everything needed to render
// and score an audit for a given template, frozen at this exact moment.
// Once stored on the audit, later edits to the live template/answer sets
// never affect this audit again - draft, submitted, or archived alike.
export async function buildTemplateSnapshot(templateId) {
  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order");

  const sectionIds = (sections || []).map((s) => s.id);
  const { data: items } = sectionIds.length
    ? await supabase.from("template_items").select("*").in("section_id", sectionIds).order("sort_order")
    : { data: [] };

  const setIds = [...new Set((items || []).filter((i) => i.answer_set_id).map((i) => i.answer_set_id))];

  const [{ data: answerSets }, { data: options }, { data: ranges }] = await Promise.all([
    setIds.length ? supabase.from("answer_sets").select("*").in("id", setIds) : Promise.resolve({ data: [] }),
    setIds.length ? supabase.from("answer_options").select("*").in("set_id", setIds).order("sort_order") : Promise.resolve({ data: [] }),
    setIds.length ? supabase.from("slider_action_ranges").select("*").in("set_id", setIds) : Promise.resolve({ data: [] }),
  ]);

  const optionsBySet = {};
  (options || []).forEach((o) => { optionsBySet[o.set_id] = optionsBySet[o.set_id] || []; optionsBySet[o.set_id].push(o); });
  const rangesBySet = {};
  (ranges || []).forEach((r) => { rangesBySet[r.set_id] = rangesBySet[r.set_id] || []; rangesBySet[r.set_id].push(r); });
  const answerSetsById = {};
  (answerSets || []).forEach((s) => {
    answerSetsById[s.id] = { ...s, options: optionsBySet[s.id] || [], actionRanges: rangesBySet[s.id] || [] };
  });

  const itemsBySection = {};
  (items || []).forEach((it) => {
    itemsBySection[it.section_id] = itemsBySection[it.section_id] || [];
    itemsBySection[it.section_id].push({
      ...it,
      answer_set: it.answer_set_id ? (answerSetsById[it.answer_set_id] || null) : null,
    });
  });

  return {
    snapshotted_at: new Date().toISOString(),
    template_id: templateId,
    sections: (sections || []).map((sec) => ({ ...sec, items: itemsBySection[sec.id] || [] })),
  };
}
