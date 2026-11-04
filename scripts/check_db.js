// Quick DB check: node scripts/check_db.js
const s = require('sqlite3');
const db = new s.Database('./data/news.db');
db.all("SELECT slug, substr(created_at,1,10) d FROM articles ORDER BY created_at DESC LIMIT 5", (e, r) => {
  console.log('Newest:', r);
  db.all("SELECT COUNT(*) c FROM articles WHERE title_km IS NULL OR title_en IS NULL OR content_km IS NULL", (e2, x) => {
    console.log('Broken rows:', x[0].c);
    db.all("SELECT author_name, COUNT(*) n FROM articles GROUP BY author_name ORDER BY n DESC LIMIT 8", (e3, y) => {
      console.log('Sources:', y);
      db.close();
    });
  });
});
