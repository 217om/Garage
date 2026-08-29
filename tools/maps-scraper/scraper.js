#!/usr/bin/env node
/**
 * Personal-use Google Maps business scraper.
 *
 * Usage:
 *   node scraper.js --query "garages" --location "المعبيلة، مسقط، عمان" --out results.json
 *   node scraper.js --query "restaurants" --location "Muscat, Oman" --out food.json --concurrency 4
 *
 * No Google API key. Drives a real Chromium via Playwright, scrolls the
 * results panel to load every listing, then opens each one (in parallel
 * tabs) to pull rating, review count, address, phone, category, photo and
 * the canonical Maps link (with lat/lng).
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { query: 'garages', location: 'المعبيلة، مسقط، عمان', out: 'results.json', concurrency: 4, headless: true };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--query') opts.query = args[++i];
    else if (a === '--location') opts.location = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (a === '--concurrency') opts.concurrency = parseInt(args[++i], 10);
    else if (a === '--headed') opts.headless = false;
  }
  return opts;
}

function extractCoordsFromUrl(url) {
  const m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return { lat: null, lng: null };
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

async function autoScrollResults(page, maxIdleRounds = 4) {
  const feedSelector = 'div[role="feed"]';
  await page.waitForSelector(feedSelector, { timeout: 30000 });
  let lastCount = 0;
  let idleRounds = 0;
  while (idleRounds < maxIdleRounds) {
    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await page.waitForTimeout(1200);
    const count = await page.evaluate((sel) => document.querySelectorAll(`${sel} a[href*="/maps/place/"]`).length, feedSelector);
    if (count === lastCount) {
      idleRounds++;
    } else {
      idleRounds = 0;
      lastCount = count;
    }
  }
  return page.evaluate((sel) => {
    const anchors = Array.from(document.querySelectorAll(`${sel} a[href*="/maps/place/"]`));
    const seen = new Set();
    const out = [];
    for (const a of anchors) {
      if (seen.has(a.href)) continue;
      seen.add(a.href);
      out.push(a.href);
    }
    return out;
  }, feedSelector);
}

async function scrapePlace(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);

    const data = await page.evaluate(() => {
      const text = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : null;
      };

      const name = text('h1');

      const ratingBtn = document.querySelector('div[jsaction*="pane.rating"] span[aria-label*="stars"]')
        || document.querySelector('span[role="img"][aria-label*="stars"]');
      let rating = null;
      let reviewCount = null;
      if (ratingBtn) {
        const ratingMatch = ratingBtn.getAttribute('aria-label').match(/([\d.]+)\s*stars/);
        if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      }
      const reviewEl = Array.from(document.querySelectorAll('button, span')).find((el) =>
        /^\(?[\d,]+\)?\s*reviews?$|^[\d,]+\s*مراجع/.test((el.textContent || '').trim())
      );
      if (reviewEl) {
        const m = reviewEl.textContent.replace(/[(),]/g, '').match(/[\d]+/);
        if (m) reviewCount = parseInt(m[0], 10);
      }

      const buttons = Array.from(document.querySelectorAll('button[data-item-id], a[data-item-id]'));
      let address = null, phone = null, website = null;
      for (const b of buttons) {
        const id = b.getAttribute('data-item-id') || '';
        const label = b.getAttribute('aria-label') || '';
        if (id.startsWith('address')) address = label.replace(/^Address:\s*/i, '').trim();
        if (id.startsWith('phone')) phone = label.replace(/^Phone:\s*/i, '').trim();
        if (id === 'authority') website = b.href || label;
      }

      const category = text('button[jsaction*="category"]') || text('.DkEaL');

      const img = document.querySelector('button[aria-label*="Photo"] img, .ZKCDEc img, .aoRNLd img');
      const photoUrl = img ? img.src : null;

      return { name, rating, reviewCount, address, phone, website, category, photoUrl };
    });

    const { lat, lng } = extractCoordsFromUrl(page.url());

    return {
      ...data,
      mapsUrl: page.url(),
      lat,
      lng,
    };
  } catch (err) {
    return { mapsUrl: url, error: err.message };
  } finally {
    await page.close();
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

async function main() {
  const opts = parseArgs();
  const searchQuery = `${opts.query} in ${opts.location}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}?hl=en`;

  console.log(`[+] Query: "${searchQuery}"`);
  console.log(`[+] Opening search results...`);

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: opts.headless,
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'en-US',
  });

  const listPage = await context.newPage();
  await listPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // dismiss cookie/consent dialog if present
  await listPage.locator('button:has-text("Accept all")').first().click({ timeout: 3000 }).catch(() => {});

  const links = await autoScrollResults(listPage);
  console.log(`[+] Found ${links.length} listings. Scraping details with concurrency=${opts.concurrency}...`);
  await listPage.close();

  let done = 0;
  const results = await runWithConcurrency(links, opts.concurrency, async (url) => {
    const r = await scrapePlace(context, url);
    done++;
    process.stdout.write(`\r[+] Scraped ${done}/${links.length}`);
    return r;
  });
  process.stdout.write('\n');

  await browser.close();

  const outPath = path.resolve(process.cwd(), opts.out);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[+] Saved ${results.length} records to ${outPath}`);
}

main().catch((err) => {
  console.error('[!] Fatal error:', err);
  process.exit(1);
});
