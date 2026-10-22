/**
 * One CSV cell. Values starting with = + - @ (or a tab/CR) are prefixed with a
 * quote so spreadsheet apps show them as text instead of running them as
 * formulas: business names, reasons and customer fields are user-controlled.
 */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}
