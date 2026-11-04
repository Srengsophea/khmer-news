/**
 * Parse the fetched RSS feed XML files and emit a clean, deduplicated JSON list
 * of real news items: { cat, title, desc, link, date, img, source }
 * Run: node scripts/parse_feeds.js
 */
const fs = require('fs');
const path = require('path');

const DIR = 'C:\\Users\\Asus\\.qoder\\cache\\projects\\Khmer-News-6906ca76\\agent-tools\\cb4af372';

const FILES = [
  { f: 'e70511c5.txt', cat: 'international', src: 'BBC News' },
  { f: '949e5095.txt', cat: 'international', src: 'BBC News Asia' },
  { f: '0040e494.txt', cat: 'economy', src: 'BBC Business' },
  { f: '04bcfc64.txt', cat: 'sports', src: 'BBC Sport' },
  { f: 'e9191345.txt', cat: 'technology', src: 'Ars Technica' },
  { f: '7f958be1.txt', cat: 'national', src: '' }, // Google News Cambodia (source per item)
  { f: 'b8ec0bcc.txt', cat: 'sports', src: '' } // Google News football (source per item)
];

function decode(s) {
  return (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(s) {
  return decode(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFeed(xml, defCat, defSrc) {
  const items = [];
  const blocks = xml.split('<item>').slice(1);
  for (const b of blocks) {
    const chunk = b.split('</item>')[0];
    const g = (tag) => {
      const m = chunk.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
      return m ? m[1] : '';
    };
    const title = stripHtml(g('title'));
    if (!title) continue;
    const desc = stripHtml(g('description'));
    let link = decode(g('link'));
    const pubDate = decode(g('pubDate'));
    const tm = chunk.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const cm = chunk.match(/<media:content[^>]*url="([^"]+)"/);
    const img = tm ? tm[1] : (cm ? cm[1] : '');
    const sm = chunk.match(/<source url="[^"]*">([\s\S]*?)<\/source>/);
    const source = sm ? stripHtml(sm[1]) : defSrc;
    // Google News item links are redirects; keep them but prefer original if present
    items.push({ cat: defCat, title, desc, link, date: pubDate, img, source });
  }
  return items;
}

let all = [];
for (const spec of FILES) {
  const p = path.join(DIR, spec.f);
  if (!fs.existsSync(p)) { console.log('MISSING', spec.f); continue; }
  const xml = fs.readFileSync(p, 'utf8');
  const items = parseFeed(xml, spec.cat, spec.src);
  console.log(spec.f, '->', items.length, 'items');
  all = all.concat(items);
}

// Deduplicate by normalized title
const seen = {};
all = all.filter((it) => {
  const k = it.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
  if (seen[k]) return false;
  seen[k] = true;
  return true;
});

// Keep only items with real dates in Oct-Nov 2026
all = all.filter((it) => {
  const d = new Date(it.date);
  return !isNaN(d.getTime()) && d.getFullYear() === 2026 && d.getMonth() >= 9; // Oct(9)/Nov(10)
});

const out = path.join(__dirname, 'feed_items.json');
fs.writeFileSync(out, JSON.stringify(all, null, 1), 'utf8');
console.log('Wrote', all.length, 'items to', out);
// Print a compact index for review
all.forEach((it, i) => {
  console.log(`${i} [${it.cat}] ${it.date ? it.date.slice(0, 16) : '?'} | ${it.source} | ${it.title.slice(0, 110)}`);
});
