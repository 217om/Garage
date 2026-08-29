const CSV_COLUMNS = ['name', 'category', 'rating', 'reviewCount', 'address', 'phone', 'website', 'mapsUrl', 'lat', 'lng', 'photoUrl', 'error'];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(records) {
  const header = CSV_COLUMNS.join(',');
  const rows = records.map((r) => CSV_COLUMNS.map((col) => csvEscape(r[col])).join(','));
  return [header, ...rows].join('\n') + '\n';
}

module.exports = { toCsv, csvEscape, CSV_COLUMNS };
