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
 * tabs) to pull rating, review count, address, phone, category, photo,
 * the canonical Maps link (with lat/lng), and every review comment.
 *
 * Output: <out>.json / <out>.csv for businesses (with an `id` column),
 * plus <out>_reviews.json / <out>_reviews.csv linked by `businessId`.
 *
 * Flags:
 *   --max-reviews N   stop after N reviews per place (default: all)
 *   --no-reviews      skip review scraping entirely
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { query: 'garages', location: 'المعبيلة، مسقط، عمان', out: 'results.json', concurrency: 4, headless: true, maxReviews: Infinity };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--query') opts.query = args[++i];
    else if (a === '--location') opts.location = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (a === '--concurrency') opts.concurrency = parseInt(args[++i], 10);
    else if (a === '--headed') opts.headless = false;
    else if (a === '--max-reviews') opts.maxReviews = parseInt(args[++i], 10);
    else if (a === '--no-reviews') opts.maxReviews = 0;
  }
  return opts;
}

const { toCsv, BUSINESS_COLUMNS, REVIEW_COLUMNS } = require('./csv');

function extractCoordsFromUrl(url) {
  const m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return { lat: null, lng: null };
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

async function autoScrollResults(page, maxIdleRounds = 8) {
  const feedSelector = 'div[role="feed"]';
  await page.waitForSelector(feedSelector, { timeout: 30000 });
  let lastCount = 0;
  let idleRounds = 0;
  let reachedEnd = false;
  while (idleRounds < maxIdleRounds) {
    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await page.waitForTimeout(1800);

    reachedEnd = await page.evaluate(
      (sel) => !!document.querySelector(sel)?.textContent.match(/reached the end of the list|You've reached the end/i),
      feedSelector
    );
    if (reachedEnd) break;

    const count = await page.evaluate((sel) => document.querySelectorAll(`${sel} a[href*="/maps/place/"]`).length, feedSelector);
    if (count === lastCount) {
      idleRounds++;
    } else {
      idleRounds = 0;
      lastCount = count;
    }
  }
  console.log(reachedEnd ? '[+] Reached the end of the results list.' : '[+] Stopped: no new listings after several scroll attempts (likely Google\'s per-search cap, ~120).');
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

// Opens the reviews panel on an already-loaded place page and scrolls it
// until no more reviews load, then expands truncated text and extracts
// each review. Google's review-panel class names are obfuscated and do
// change over time (currently: .jftiEf per review card, .d4r55 reviewer
// name, .rsqaWe relative date, .wiI7pd review text) — if this comes back
// empty on a place you know has reviews, those are the selectors to
// re-inspect via devtools and fix.
async function scrapePlaceReviews(page, maxReviews) {
  const opened = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, span')).find((el) =>
      /^\(?[\d,]+\)?\s*reviews?$|^[\d,]+\s*مراجع/.test((el.textContent || '').trim())
    );
    if (!el) return false;
    (el.closest('button') || el).click();
    return true;
  });
  if (!opened) return [];

  await page.waitForTimeout(1500);

  const feedSelector = 'div.m6QErb[role="feed"], div[role="feed"]';
  const hasFeed = await page.waitForSelector(feedSelector, { timeout: 10000 }).then(() => true).catch(() => false);
  if (!hasFeed) return [];

  let idleRounds = 0;
  let lastCount = 0;
  while (idleRounds < 6) {
    const count = await page.evaluate((sel) => document.querySelectorAll(`${sel} .jftiEf`).length, feedSelector);
    if (Number.isFinite(maxReviews) && count >= maxReviews) break;
    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await page.waitForTimeout(1500);
    const newCount = await page.evaluate((sel) => document.querySelectorAll(`${sel} .jftiEf`).length, feedSelector);
    if (newCount === lastCount) idleRounds++; else idleRounds = 0;
    lastCount = newCount;
  }

  // Expand "More" buttons on truncated review text before reading it.
  await page.evaluate((sel) => {
    document.querySelectorAll(`${sel} button[aria-label="See more"], ${sel} button.w8nwRe`).forEach((b) => b.click());
  }, feedSelector);
  await page.waitForTimeout(500);

  return page.evaluate((sel, max) => {
    const cards = Array.from(document.querySelectorAll(`${sel} .jftiEf`));
    return cards.slice(0, Number.isFinite(max) ? max : cards.length).map((card) => {
      const reviewer = card.querySelector('.d4r55')?.textContent.trim() || null;
      const ratingLabel = card.querySelector('span[role="img"][aria-label*="star"]')?.getAttribute('aria-label') || '';
      const ratingMatch = ratingLabel.match(/([\d.]+)\s*star/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      const date = card.querySelector('.rsqaWe')?.textContent.trim() || null;
      const text = card.querySelector('.wiI7pd')?.textContent.trim() || null;
      return { reviewer, rating, date, text };
    });
  }, feedSelector, maxReviews);
}

async function scrapePlace(context, url, maxReviews) {
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

    let reviews = [];
    if (maxReviews > 0) {
      reviews = await scrapePlaceReviews(page, maxReviews).catch(() => []);
    }

    return {
      ...data,
      mapsUrl: page.url(),
      lat,
      lng,
      reviews,
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
    // Set PW_CHROME_PATH to point at a specific Chromium binary (e.g. one
    // already installed outside of `npx playwright install`).
    executablePath: process.env.PW_CHROME_PATH || undefined,
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
    const r = await scrapePlace(context, url, opts.maxReviews);
    done++;
    const reviewNote = opts.maxReviews > 0 ? `, ${(r.reviews || []).length} reviews` : '';
    process.stdout.write(`\r[+] Scraped ${done}/${links.length} (${r.name || 'unknown'}${reviewNote})            `);
    return r;
  });
  process.stdout.write('\n');

  await browser.close();

  results.forEach((r, i) => { r.id = i + 1; });

  const allReviews = [];
  for (const r of results) {
    for (const rev of r.reviews || []) {
      allReviews.push({ businessId: r.id, businessName: r.name, ...rev });
    }
    delete r.reviews;
  }

  const outPath = path.resolve(process.cwd(), opts.out);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[+] Saved ${results.length} businesses to ${outPath}`);

  const reviewsJsonPath = outPath.replace(/\.json$/i, '_reviews.json');
  fs.writeFileSync(reviewsJsonPath, JSON.stringify(allReviews, null, 2), 'utf-8');
  console.log(`[+] Saved ${allReviews.length} reviews to ${reviewsJsonPath}`);

  const csvPath = outPath.replace(/\.json$/i, '.csv');
  const reviewsCsvPath = outPath.replace(/\.json$/i, '_reviews.csv');
  try {
    fs.writeFileSync(csvPath, toCsv(results, BUSINESS_COLUMNS), 'utf-8');
    console.log(`[+] Saved CSV to ${csvPath}`);
    fs.writeFileSync(reviewsCsvPath, toCsv(allReviews, REVIEW_COLUMNS), 'utf-8');
    console.log(`[+] Saved CSV to ${reviewsCsvPath}`);
  } catch (err) {
    console.error(`[!] Could not write a CSV (${err.code || err.message}) — is one of them open in Excel? The JSON files above are unaffected.`);
    console.error(`[!] Once it's closed, run: node json-to-csv.js "${outPath}"`);
  }
}

main().catch((err) => {
  console.error('[!] Fatal error:', err);
  process.exit(1);
});
