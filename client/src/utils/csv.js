/**
 * Convert an array of objects to a CSV string and trigger a download.
 * `columns` is an array of { key, label, value? } where `value(row)` is optional.
 */
export const downloadCsv = (filename, columns, rows) => {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => escape(c.value ? c.value(row) : row[c.key]))
        .join(',')
    )
    .join('\r\n');

  const csv = `${header}\r\n${body}`;
  // Prepend BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
