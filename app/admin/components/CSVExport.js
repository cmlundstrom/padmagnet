'use client';

export default function exportCSV(columns, data, filename) {
  if (!data.length) return;
  const header = columns.map(c => c.header || c.accessorKey).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.accessorKey];
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
