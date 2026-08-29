#!/usr/bin/env node
/**
 * Regenerate a CSV from an existing scraper JSON output, without re-scraping.
 *
 * Usage:
 *   node json-to-csv.js almaabilah.json
 *   node json-to-csv.js almaabilah.json --out almaabilah_fixed.csv
 */

const fs = require('fs');
const path = require('path');
const { toCsv } = require('./csv');

const args = process.argv.slice(2);
const jsonPath = args[0];
if (!jsonPath) {
  console.error('Usage: node json-to-csv.js <input.json> [--out <output.csv>]');
  process.exit(1);
}

const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? args[outIdx + 1] : jsonPath.replace(/\.json$/i, '.csv');

const records = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf-8'));
fs.writeFileSync(path.resolve(outPath), toCsv(records), 'utf-8');
console.log(`[+] Saved CSV to ${path.resolve(outPath)}`);
