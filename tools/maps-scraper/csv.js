const BUSINESS_COLUMNS = ['id', 'name', 'category', 'rating', 'reviewCount', 'address', 'phone', 'website', 'mapsUrl', 'lat', 'lng', 'photoUrl', 'error'];
const REVIEW_COLUMNS = ['businessId', 'businessName', 'reviewer', 'rating', 'date', 'text'];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(records, columns = BUSINESS_COLUMNS) {
  const header = columns.join(',');
  const rows = records.map((r) => columns.map((col) => csvEscape(r[col])).join(','));
  return [header, ...rows].join('\n') + '\n';
}

module.exports = { toCsv, csvEscape, BUSINESS_COLUMNS, REVIEW_COLUMNS };
