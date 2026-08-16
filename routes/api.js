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

module.exports = router;
