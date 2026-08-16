const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(
    `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.created_at DESC LIMIT 10`,
    [],
    (err, articles) => {
      db.all(`SELECT * FROM categories ORDER BY id`, [], (err2, categories) => {
        db.all(
          `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.is_featured = 1 ORDER BY a.created_at DESC LIMIT 5`,
          [],
          (err3, featured) => {
            res.render('index', {
              articles,
              categories,
              featured,
              lang,
              title: 'Khmer News'
            });
          }
        );
      });
    }
  );
});

router.get('/article/:slug', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get(
    `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.slug = ?`,
    [req.params.slug],
    (err, article) => {
      if (!article) {
        return res.status(404).render('404', { layout: false, title: '404' });
      }
      // Increment views count
      db.run("UPDATE articles SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?", [article.id]);

      db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
        db.all(
          `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.slug != ? ORDER BY a.created_at DESC LIMIT 4`,
          [req.params.slug],
          (e3, articles) => {
            res.render('article', { article, categories, articles, lang, title: article[`title_${lang}`] });
          }
        );
      });
    }
  );
});

router.get('/category/:slug', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get(`SELECT * FROM categories WHERE slug = ?`, [req.params.slug], (err, category) => {
    if (!category) return res.status(404).render('404', { layout: false, title: '404' });
    db.all(
      `SELECT * FROM articles WHERE category_id = ? ORDER BY created_at DESC`,
      [category.id],
      (e2, articles) => {
        db.all(`SELECT * FROM categories ORDER BY id`, [], (e3, categories) => {
          res.render('category', { category, articles, categories, lang, title: category[`name_${lang}`] });
        });
      }
    );
  });
});

router.get('/search', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  const q = req.query.q || '';
  if (!q.trim()) {
    db.all(`SELECT * FROM categories ORDER BY id`, [], (e, categories) => {
      res.render('search', { categories, lang, articles: [], query: q, title: 'Search' });
    });
    return;
  }
  db.all(
    `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.title_km LIKE ? OR a.title_en LIKE ? OR a.content_km LIKE ? OR a.content_en LIKE ? OR c.name_km LIKE ? OR c.name_en LIKE ? ORDER BY a.created_at DESC`,
    [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
    (err, articles) => {
      db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
        res.render('search', { categories, lang, articles, query: q, title: 'Search' });
      });
    }
  );
});

router.get('/change-lang/:lang', (req, res) => {
  const lang = req.params.lang;
  if (lang === 'en' || lang === 'km') {
    req.session.lang = lang;
  }
  res.redirect('back');
});

router.get('/about', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(`SELECT * FROM categories ORDER BY id`, [], (err, categories) => {
    res.render('about', { categories, lang, title: 'About' });
  });
});

module.exports = router;
