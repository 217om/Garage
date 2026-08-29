#!/usr/bin/env node
/**
 * Regenerate CSVs from existing scraper JSON output, without re-scraping.
 *
 * Usage:
 *   node json-to-csv.js almaabilah.json
 *   node json-to-csv.js almaabilah.json --out almaabilah_fixed.csv
 *
 * If a matching "<name>_reviews.json" sits next to the input file, its
 * reviews CSV is regenerated too.
 */

const fs = require('fs');
const path = require('path');
const { toCsv, BUSINESS_COLUMNS, REVIEW_COLUMNS } = require('./csv');

const args = process.argv.slice(2);
const jsonPath = args[0];
if (!jsonPath) {
  console.error('Usage: node json-to-csv.js <input.json> [--out <output.csv>]');
  process.exit(1);
}

const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? args[outIdx + 1] : jsonPath.replace(/\.json$/i, '.csv');

const records = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf-8'));
fs.writeFileSync(path.resolve(outPath), toCsv(records, BUSINESS_COLUMNS), 'utf-8');
console.log(`[+] Saved CSV to ${path.resolve(outPath)}`);

const reviewsJsonPath = jsonPath.replace(/\.json$/i, '_reviews.json');
if (fs.existsSync(reviewsJsonPath)) {
  const reviews = JSON.parse(fs.readFileSync(path.resolve(reviewsJsonPath), 'utf-8'));
  const reviewsCsvPath = outPath.replace(/\.csv$/i, '_reviews.csv');
  fs.writeFileSync(path.resolve(reviewsCsvPath), toCsv(reviews, REVIEW_COLUMNS), 'utf-8');
  console.log(`[+] Saved CSV to ${path.resolve(reviewsCsvPath)}`);
}
