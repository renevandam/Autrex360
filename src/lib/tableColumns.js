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

// Which column positions (0-based) must be filled in whenever their row is required, stored as a
// boolean array (table_required_columns) on the template item. Not-yet-configured items (the array
// doesn't exist at all) default every column to required, preserving the original behavior where a
// required row meant "every column must be filled in". Once a template owner opens the editor and
// unchecks a column (e.g. an optional "Serial number" not every item has), that choice is stored
// explicitly; any column added later that isn't in the stored array yet defaults to optional,
// matching getRequiredRows' padding behavior.
export function getRequiredColumns(item, columnCount) {
  // An empty array is treated the same as "not configured" - it's what a never-touched stock_take
  // item gets persisted with, and should still default to "all columns required".
  const stored = Array.isArray(item?.table_required_columns) && item.table_required_columns.length > 0 ? item.table_required_columns : null;
  const result = [];
  for (let i = 0; i < columnCount; i++) result.push(stored ? !!stored[i] : true);
  return result;
}

// A required row must have every one of its required columns filled in - columns explicitly marked
// optional (via requiredColumns) are skipped. Without a requiredColumns array, every column is
// checked (the original all-columns-required behavior).
export function isTableRowComplete(row, columnCount, requiredColumns) {
  for (let i = 0; i < columnCount; i++) {
    if (requiredColumns && !requiredColumns[i]) continue;
    const v = row?.[`col${i + 1}_value`];
    if (v === undefined || v === null || String(v).trim() === "") return false;
  }
  return true;
}
