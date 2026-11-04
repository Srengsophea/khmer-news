// Ensure a good hero mix: feature the biggest viral stories. node scripts/fix_featured.js
const s = require('sqlite3');
const db = new s.Database('./data/news.db');
const WANTED = ['trump-takes-aim%', 'left-wing-democrat-abdul%', 'binances-6-3bn%', 'arsenal-move-clear%', 'over-1-300-killed%', 'odyssey-endless-cruise%', 'nadal-set-to-join%', 'chinese-cambodian-thai%'];
db.run('UPDATE articles SET is_featured = 0', () => {
  let done = 0;
  WANTED.forEach((p) => {
    db.run(`UPDATE articles SET is_featured = 1, card_template = CASE WHEN id IN (SELECT id FROM articles WHERE slug LIKE ? ORDER BY views_count DESC LIMIT 1) THEN 'wide' ELSE card_template END WHERE slug LIKE ?`, [p, p], function () {
      done++;
      if (done === WANTED.length) {
        db.all('SELECT slug, is_featured FROM articles WHERE is_featured = 1', (e, r) => {
          console.log('Featured now:', r);
          db.close();
        });
      }
    });
  });
});
