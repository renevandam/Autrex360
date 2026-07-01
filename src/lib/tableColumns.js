// ── Shared config for the "Table" question type (answer_type: "stock_take") ──
// Renamed to "Table" in the UI, but the internal answer_type value stays "stock_take" so
// existing templates and audits keep working without a data migration.

export const MAX_TABLE_COLUMNS = 5;
export const MAX_TABLE_ROWS = 10;

// A Table question's columns are stored as JSON (table_columns) on the template item once
// configured through this editor. Items created before this existed only have the legacy
// stock_col1_label/stock_col2_label/stock_col3_label fields (col3 was always a number/quantity
// column) - this reconstructs an equivalent column list for those, so nothing breaks for
// templates nobody has re-saved since this change.
export function getTableColumns(item) {
  if (Array.isArray(item?.table_columns) && item.table_columns.length > 0) {
    return item.table_columns.slice(0, MAX_TABLE_COLUMNS);
  }
  return [
    { label: item?.stock_col1_label || "Item number", type: "text" },
    { label: item?.stock_col2_label || "Bin location", type: "text" },
    { label: item?.stock_col3_label || "Quantity", type: "number" },
  ];
}

// Max rows, capped at MAX_TABLE_ROWS regardless of what's stored (older templates could have up to 20).
export function getTableMaxRows(item) {
  const n = item?.stock_max_rows ? parseInt(item.stock_max_rows, 10) : 5;
  return Math.min(MAX_TABLE_ROWS, Math.max(1, n || 5));
}

// Builds an empty row shape with a colN_value key for every configured column.
export function emptyTableRow(rowOrder, columnCount) {
  const row = { id: null, row_order: rowOrder };
  for (let i = 0; i < columnCount; i++) row[`col${i + 1}_value`] = "";
  return row;
}

// Which row positions (0-based) are required, stored as a boolean array (table_required_rows) on
// the template item. Padded/truncated to the current row count so a later change to "max rows"
// never leaves a stale flag pointing past the end.
export function getRequiredRows(item, rowCount) {
  const stored = Array.isArray(item?.table_required_rows) ? item.table_required_rows : [];
  const result = [];
  for (let i = 0; i < rowCount; i++) result.push(!!stored[i]);
  return result;
}

// A required row must have every one of its configured columns filled in - a half-filled
// "mandatory" row still blocks submission.
export function isTableRowComplete(row, columnCount) {
  for (let i = 0; i < columnCount; i++) {
    const v = row?.[`col${i + 1}_value`];
    if (v === undefined || v === null || String(v).trim() === "") return false;
  }
  return true;
}
