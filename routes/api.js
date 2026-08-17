const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/articles', (req, res) => {
  const db = getDb();
  db.all(
    `SELECT a.*, c.name_km, c.name_en, c.slug as category_slug FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.created_at DESC`,
    [],
    (err, articles) => {
      res.json(articles || []);
    }
  );
});

router.get('/categories', (req, res) => {
  const db = getDb();
  db.all(`SELECT * FROM categories ORDER BY id`, [], (err, categories) => {
    res.json(categories || []);
  });
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const db = getDb();
  if (!q.trim()) return res.json([]);
  db.all(
    `SELECT a.id, a.title_km, a.title_en, a.slug, c.name_km, c.name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.title_km LIKE ? OR a.title_en LIKE ? LIMIT 20`,
    [`%${q}%`, `%${q}%`],
    (err, articles) => res.json(articles || [])
  );
});

router.post('/ads/click/:id', (req, res) => {
  const db = getDb();
  db.run("UPDATE ads SET click_count = COALESCE(click_count, 0) + 1 WHERE id = ?", [req.params.id], () => {
    res.json({ success: true });
  });
});

router.post('/newsletter/subscribe', (req, res) => {
  const db = getDb();
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid', message: 'Invalid email address' });
  }
  db.run(`INSERT OR IGNORE INTO subscribers (email) VALUES (?)`, [email], function (err) {
    if (err) return res.status(500).json({ error: 'db', message: 'Database error' });
    res.json({ success: true, existed: this.changes === 0 });
  });
});

router.get('/tags', (req, res) => {
  const db = getDb();
  db.all(`SELECT t.*, (SELECT COUNT(*) FROM article_tags at WHERE at.tag_id = t.id) as count FROM tags t ORDER BY count DESC, t.name_en`, [], (err, tags) => {
    res.json(tags || []);
  });
});

router.get('/trending', (req, res) => {
  const db = getDb();
  db.all(
    `SELECT a.id, a.title_km, a.title_en, a.slug, a.views_count, c.slug as category_slug FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY COALESCE(a.views_count, 0) DESC LIMIT 10`,
    [],
    (err, articles) => res.json(articles || [])
  );
});

module.exports = router;
