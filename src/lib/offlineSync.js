import { supabase } from "./supabase";
import { getPendingResponses, clearPendingResponse, getPendingStockRows, clearPendingStockRow } from "./offlineStore";

// Pushes everything queued locally for this audit to Supabase.
// Returns { synced, failed } counts so the UI can report back to the auditor.
export async function syncAuditToServer(auditId) {
  let synced = 0;
  let failed = 0;

  const pendingResponses = await getPendingResponses(auditId);
  for (const r of pendingResponses) {
    const { error } = await supabase.from("audit_responses").upsert(
      { audit_id: r.auditId, item_id: r.itemId, response: r.response },
      { onConflict: "audit_id,item_id" }
    );
    if (error) {
      failed++;
    } else {
      await clearPendingResponse(r.key);
      synced++;
    }
  }

  const pendingStockRows = await getPendingStockRows(auditId);
  for (const row of pendingStockRows) {
    const { error } = await supabase.from("stock_checks").upsert(
      {
        audit_id: row.auditId,
        item_id: row.itemId,
        row_order: row.rowOrder,
        col1_value: row.col1_value || null,
        col2_value: row.col2_value || null,
        col3_value: row.col3_value || null,
      },
      { onConflict: "audit_id,item_id,row_order" }
    );
    if (error) {
      failed++;
    } else {
      await clearPendingStockRow(row.key);
      synced++;
    }
  }

  return { synced, failed };
}
