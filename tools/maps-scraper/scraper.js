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
// change over time, so this tries several known candidates for each part
// (trigger button, scrollable feed, review card) and reports which stage
// it got stuck at via `debug`, instead of silently returning nothing.
let diagnosedNoCards = false;
let diagnosedNoTrigger = false;

async function scrapePlaceReviews(page, maxReviews) {
  // IMPORTANT: do NOT match a bare "review" substring in aria-label/text —
  // "Write a review" / "أضف مراجعة" buttons near the top of every place page
  // also contain that word and will get clicked instead, opening a review
  // *composition* dialog rather than the reviews list (confirmed via an
  // earlier DOM diagnostic: it found only the page's one aggregate rating).
  // Require a digit immediately before "review(s)" so only a "<N> review(s)"
  // count control can match. NOT anchored to the start of the string, since
  // the real label is typically combined, e.g. "4.7 stars 27 reviews" —
  // anchoring to ^ would require it to start with the count, which it
  // usually doesn't (the star rating comes first).
  const COUNT_LABEL_RE = /(?:^|[^\d])([\d][\d,]*)\)?\s*(reviews?|مراجع|تقييمات?)\b/i;

  let opened = await page.evaluate((reStr) => {
    const re = new RegExp(reStr, 'i');
    const el = Array.from(document.querySelectorAll('[aria-label]')).find((el) => re.test((el.getAttribute('aria-label') || '').trim()));
    if (!el) return false;
    (el.closest('button') || el).click();
    return true;
  }, COUNT_LABEL_RE.source);

  if (!opened) {
    opened = await page.evaluate((reStr) => {
      const re = new RegExp(reStr, 'i');
      const el = Array.from(document.querySelectorAll('button, span, div')).find((el) => re.test((el.textContent || '').trim()));
      if (!el) return false;
      (el.closest('button') || el).click();
      return true;
    }, COUNT_LABEL_RE.source);
  }
  if (!opened) {
    opened = await page.evaluate(() => {
      const el = document.querySelector('button[jsaction*="reviewChart"], button[jsaction*="moreReviews"]');
      if (!el) return false;
      el.click();
      return true;
    });
  }
  if (!opened) {
    if (!diagnosedNoTrigger) {
      diagnosedNoTrigger = true;
      const diag = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[aria-label]'))
          .map((el) => el.getAttribute('aria-label'))
          .filter((label) => /review|star|مراجع|تقييم/i.test(label || ''));
        return { candidateAriaLabels: [...new Set(els)].slice(0, 15) };
      });
      console.error('[DEBUG-TRIGGER] ' + JSON.stringify(diag));
    }
    return { reviews: [], debug: 'no-trigger' };
  }

  await page.waitForTimeout(1500);

  // Prefer a feed whose own aria-label mentions reviews (distinguishes it
  // from the photos carousel or other role="feed" panels on the same page,
  // which can otherwise match first and have nothing to do with reviews).
  let feedSelector = null;
  for (let i = 0; i < 8 && !feedSelector; i++) {
    feedSelector = await page.evaluate(() => {
      const feeds = Array.from(document.querySelectorAll('div[role="feed"]'));
      if (feeds.length === 0) return null;
      const labeled = feeds.find((f) => /review|مراجع|تقييم/i.test(f.getAttribute('aria-label') || ''));
      const chosen = labeled || feeds.find((f) => f.children.length > 1) || feeds[0];
      if (!chosen.id) chosen.id = '__reviews_feed__';
      return `#${chosen.id}`;
    });
    if (!feedSelector) await page.waitForTimeout(500);
  }
  if (!feedSelector) return { reviews: [], debug: 'no-feed' };

  // Tag review cards structurally instead of guessing Google's obfuscated
  // class names: a direct child of the reviews feed that contains a
  // per-review star rating is a review card, regardless of what class it
  // has. This survives Google's routine class-name churn. Tagging is
  // re-run on every scroll since new children get appended.
  const CARD_TAG = 'data-scraper-review-card';
  const tagAndCount = () =>
    page.evaluate(
      ({ fsel, tag }) => {
        const feed = document.querySelector(fsel);
        if (!feed) return 0;
        Array.from(feed.children).forEach((c) => {
          if (!c.hasAttribute(tag) && c.querySelector('span[aria-label*="star" i]')) c.setAttribute(tag, '1');
        });
        return feed.querySelectorAll(`[${tag}]`).length;
      },
      { fsel: feedSelector, tag: CARD_TAG }
    );

  let lastCount = await tagAndCount();
  let idleRounds = 0;
  while (idleRounds < 6) {
    if (Number.isFinite(maxReviews) && lastCount >= maxReviews) break;
    await page.evaluate((fsel) => {
      const feed = document.querySelector(fsel);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await page.waitForTimeout(1500);
    const newCount = await tagAndCount();
    if (newCount === lastCount) idleRounds++; else idleRounds = 0;
    lastCount = newCount;
  }

  if (lastCount === 0) {
    if (!diagnosedNoCards) {
      diagnosedNoCards = true;
      const diag = await page.evaluate(({ fsel }) => {
        const feed = document.querySelector(fsel);
        const starEls = feed ? Array.from(feed.querySelectorAll('span[aria-label*="star" i]')) : [];
        return {
          matchedFeedClass: feed?.className || null,
          matchedFeedAriaLabel: feed?.getAttribute('aria-label') || null,
          matchedFeedChildCount: feed?.children.length ?? null,
          starsInFeed: starEls.length,
          firstChildOuterHtmlSnippet: feed?.children[0]?.outerHTML?.slice(0, 400) || null,
        };
      }, { fsel: feedSelector });
      console.error('[DEBUG-REVIEWS] ' + JSON.stringify(diag));
    }
    return { reviews: [], debug: 'no-cards' };
  }

  // Expand "More" buttons on truncated review text before reading it.
  await page.evaluate(
    ({ fsel, tag }) => {
      document.querySelector(fsel)?.querySelectorAll(`[${tag}] button`).forEach((b) => {
        if (/more/i.test(b.textContent || '') || /more/i.test(b.getAttribute('aria-label') || '')) b.click();
      });
    },
    { fsel: feedSelector, tag: CARD_TAG }
  );
  await page.waitForTimeout(500);

  const reviews = await page.evaluate(
    ({ fsel, tag, max }) => {
      const feed = document.querySelector(fsel);
      if (!feed) return [];
      const cards = Array.from(feed.querySelectorAll(`[${tag}]`));
      return cards.slice(0, Number.isFinite(max) ? max : cards.length).map((card) => {
        const starEl = card.querySelector('span[aria-label*="star" i]');
        const ratingMatch = (starEl?.getAttribute('aria-label') || '').match(/([\d.]+)\s*star/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        // Reviewer name: usually the accessible name on a profile-photo
        // button/image near the top of the card.
        const nameEl = card.querySelector('button[aria-label]:not([aria-label*="star" i]), img[alt]:not([alt=""])');
        const reviewer = (nameEl?.getAttribute('aria-label') || nameEl?.getAttribute('alt') || '').replace(/^photo of /i, '').trim() || null;

        // Relative date: a short text node containing "ago" / Arabic "منذ".
        const dateEl = Array.from(card.querySelectorAll('span, div')).find((el) =>
          /\bago\b/i.test(el.textContent || '') || /منذ/.test(el.textContent || '')
        );
        const date = dateEl ? dateEl.textContent.trim() : null;

        // Review text: the longest text-bearing element in the card that
        // isn't the reviewer name or the date string.
        const textCandidates = Array.from(card.querySelectorAll('span, div'))
          .map((el) => el.textContent.trim())
          .filter((t) => t && t !== reviewer && t !== date && t.length > 15);
        const text = textCandidates.sort((a, b) => b.length - a.length)[0] || null;

        return { reviewer, rating, date, text };
      });
    },
    { fsel: feedSelector, tag: CARD_TAG, max: maxReviews }
  );

  return { reviews, debug: reviews.length ? 'ok' : 'no-matches' };
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
    let reviewsDebug = 'skipped';
    if (maxReviews > 0) {
      const r = await scrapePlaceReviews(page, maxReviews).catch((e) => ({ reviews: [], debug: `error:${e.message}` }));
      reviews = r.reviews;
      reviewsDebug = r.debug;
    }

    return {
      ...data,
      mapsUrl: page.url(),
      lat,
      lng,
      reviews,
      reviewsDebug,
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
  const debugCounts = {};
  for (const r of results) {
    for (const rev of r.reviews || []) {
      allReviews.push({ businessId: r.id, businessName: r.name, ...rev });
    }
    debugCounts[r.reviewsDebug] = (debugCounts[r.reviewsDebug] || 0) + 1;
    delete r.reviews;
    delete r.reviewsDebug;
  }
  if (opts.maxReviews > 0) {
    console.log(`[+] Review-scrape outcomes across ${results.length} places: ${JSON.stringify(debugCounts)}`);
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
