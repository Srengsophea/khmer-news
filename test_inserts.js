const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/news.db');

db.serialize(() => {
  db.run("PRAGMA foreign_keys = OFF");
  db.run("DELETE FROM categories");
  db.run("DELETE FROM articles");
  db.run("PRAGMA foreign_keys = ON");
  
  const categories = [
    { name_km: 'ព័ត៌មានជាតិ', name_en: 'National News', slug: 'national' },
    { name_km: 'ព័ត៌មានអន្តរជាតិ', name_en: 'International News', slug: 'international' },
    { name_km: 'កីឡា', name_en: 'Sports', slug: 'sports' },
    { name_km: 'បច្ចេកវិទ្យា', name_en: 'Technology', slug: 'technology' },
    { name_km: 'សេដ្ឋកិច្ច', name_en: 'Economy', slug: 'economy' }
  ];

  categories.forEach((cat, idx) => {
    db.run(
      "INSERT INTO categories (id, name_km, name_en, slug) VALUES (?,?,?,?)",
      [idx + 1, cat.name_km, cat.name_en, cat.slug],
      (err) => {
        console.log(`Cat ${idx + 1} insert error:`, err);
      }
    );
  });

  const article = {
    title_km: 'រាជធានីភ្នំពេញ...',
    title_en: 'Phnom Penh...',
    content_km: '<p>Content</p>',
    content_en: '<p>Content</p>',
    slug: 'phnom-penh-expressway-expansion-2025',
    category_id: 1,
    image_url: 'https://picsum.photos/seed/phnompenh/800/450',
    is_featured: 1,
    card_template: 'wide'
  };

  db.run(
    "INSERT INTO articles (title_km, title_en, content_km, content_en, slug, category_id, image_url, is_featured, card_template) VALUES (?,?,?,?,?,?,?,?,?)",
    [article.title_km, article.title_en, article.content_km, article.content_en, article.slug, article.category_id, article.image_url, article.is_featured, article.card_template],
    (err) => {
      console.log("Article insert error:", err);
      db.all("SELECT * FROM categories", [], (err2, cats) => {
        console.log("Categories in DB:", cats);
        db.close();
      });
    }
  );
});
