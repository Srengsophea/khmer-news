const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

router.use((req, res, next) => {
  res.locals.layout = 'admin/layout';
  next();
});

router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { layout: false, error: null, lang: req.lang });
});

router.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  db.get(`SELECT * FROM admins WHERE username = ? AND password = ?`, [username, password], (err, admin) => {
    if (admin) {
      req.session.adminId = admin.id;
      req.session.adminUser = admin.username;
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { layout: false, error: 'Invalid credentials', lang: req.lang });
  });
});

router.get('/logout', (req, res) => {
  req.session.adminId = null;
  req.session.adminUser = null;
  res.redirect('/admin/login');
});

router.get('/dashboard', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get(`SELECT COUNT(*) as total FROM articles`, [], (e1, a1) => {
    db.get(`SELECT COUNT(*) as total FROM categories`, [], (e2, a2) => {
      db.all(`SELECT * FROM categories ORDER BY id`, [], (e3, categories) => {
        db.all(
          `SELECT a.*, c.name_km, c.name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.created_at DESC LIMIT 5`,
          [],
          (e4, recent) => {
            res.render('admin/dashboard', {
              categories,
              recent,
              stats: { articles: a1.total, categories: a2.total },
              lang,
              error: null,
              success: null,
              adminUser: req.session.adminUser
            });
          }
        );
      });
    });
  });
});

router.get('/articles', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(`SELECT a.*, c.name_km, c.name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.created_at DESC`, [], (err, articles) => {
    db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
      res.render('admin/articles', { articles, categories, lang, error: null, success: null, adminUser: req.session.adminUser, title: 'Articles' });
    });
  });
});

router.get('/articles/edit/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get(`SELECT * FROM articles WHERE id = ?`, [req.params.id], (err, article) => {
    db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
      res.render('admin/articles', { articles: [], categories, lang, error: null, success: null, adminUser: req.session.adminUser, article, title: 'Edit Article' });
    });
  });
});

router.post('/articles/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { id, title_km, title_en, content_km, content_en, category_id, image_url, is_featured, card_template } = req.body;
  const slug = (title_en || title_km).toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-');
  if (id) {
    db.run(
      `UPDATE articles SET title_km=?, title_en=?, content_km=?, content_en=?, category_id=?, image_url=?, is_featured=?, card_template=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [title_km, title_en, content_km, content_en, category_id || null, image_url, is_featured ? 1 : 0, card_template || 'standard', id],
      (err) => res.redirect('/admin/articles')
    );
  } else {
    db.run(
      `INSERT INTO articles (title_km, title_en, content_km, content_en, slug, category_id, image_url, is_featured, card_template) VALUES (?,?,?,?,?,?,?,?,?)`,
      [title_km, title_en, content_km, content_en, slug, category_id || null, image_url, is_featured ? 1 : 0, card_template || 'standard'],
      (err) => res.redirect('/admin/articles')
    );
  }
});

router.get('/articles/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM articles WHERE id = ?`, [req.params.id], () => res.redirect('/admin/articles'));
});

router.get('/categories', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(`SELECT * FROM categories ORDER BY id`, [], (err, categories) => {
    res.render('admin/categories', { categories, lang, error: null, success: null, adminUser: req.session.adminUser, title: 'Categories' });
  });
});

router.post('/categories/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { id, name_km, name_en, slug } = req.body;
  if (id) {
    db.run(`UPDATE categories SET name_km=?, name_en=?, slug=? WHERE id=?`, [name_km, name_en, slug, id], () => res.redirect('/admin/categories'));
  } else {
    db.run(`INSERT INTO categories (name_km, name_en, slug) VALUES (?,?,?)`, [name_km, name_en, slug], () => res.redirect('/admin/categories'));
  }
});

router.get('/categories/edit/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get(`SELECT * FROM categories WHERE id = ?`, [req.params.id], (err, category) => {
    db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
      res.render('admin/categories', { categories, lang, error: null, success: null, adminUser: req.session.adminUser, category, title: 'Edit Category' });
    });
  });
});

router.get('/categories/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM categories WHERE id = ?`, [req.params.id], () => res.redirect('/admin/categories'));
});

// --- Settings Management ---
router.get('/settings', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get("SELECT * FROM settings WHERE id = 1", [], (err, settings) => {
    res.render('admin/settings', { title: 'Settings', settings, lang, success: req.query.success || null, adminUser: req.session.adminUser });
  });
});

router.post('/settings/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const {
    site_name_km, site_name_en, site_desc_km, site_desc_en,
    contact_phone, contact_email, contact_address_km, contact_address_en,
    social_facebook, social_telegram, social_youtube, social_twitter
  } = req.body;

  db.run(`
    UPDATE settings SET
      site_name_km = ?, site_name_en = ?, site_desc_km = ?, site_desc_en = ?,
      contact_phone = ?, contact_email = ?, contact_address_km = ?, contact_address_en = ?,
      social_facebook = ?, social_telegram = ?, social_youtube = ?, social_twitter = ?
    WHERE id = 1
  `, [
    site_name_km, site_name_en, site_desc_km, site_desc_en,
    contact_phone, contact_email, contact_address_km, contact_address_en,
    social_facebook, social_telegram, social_youtube, social_twitter
  ], (err) => {
    res.redirect('/admin/settings?success=Settings+updated+successfully');
  });
});

// --- Ads Management ---
router.get('/ads', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all("SELECT * FROM ads ORDER BY id DESC", [], (err, ads) => {
    res.render('admin/ads', { title: 'Ads Management', ads, lang, adminUser: req.session.adminUser });
  });
});

router.get('/ads/edit/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  if (req.params.id == 0) {
    res.render('admin/ads', { title: 'Add Ad', ad: {}, lang, adminUser: req.session.adminUser });
  } else {
    db.get("SELECT * FROM ads WHERE id = ?", [req.params.id], (err, ad) => {
      res.render('admin/ads', { title: 'Edit Ad', ad, lang, adminUser: req.session.adminUser });
    });
  }
});

router.post('/ads/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { id, title, image_url, link_url, position, is_active } = req.body;
  const active = is_active ? 1 : 0;
  if (id) {
    db.run(
      "UPDATE ads SET title = ?, image_url = ?, link_url = ?, position = ?, is_active = ? WHERE id = ?",
      [title, image_url, link_url, position, active, id],
      () => res.redirect('/admin/ads')
    );
  } else {
    db.run(
      "INSERT INTO ads (title, image_url, link_url, position, is_active) VALUES (?,?,?,?,?)",
      [title, image_url, link_url, position, active],
      () => res.redirect('/admin/ads')
    );
  }
});

router.get('/ads/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run("DELETE FROM ads WHERE id = ?", [req.params.id], () => res.redirect('/admin/ads'));
});

module.exports = router;
