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

// --- Layout & Theme Studio Management ---
router.get('/layout', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get("SELECT * FROM settings WHERE id = 1", [], (err, settings) => {
    db.all("SELECT * FROM categories ORDER BY id", [], (err2, categories) => {
      let blocks = [];
      try {
        blocks = settings && settings.homepage_blocks ? JSON.parse(settings.homepage_blocks) : [];
      } catch (e) {
        blocks = [];
      }
      res.render('admin/layout_manager', {
        title: 'Layout & Theme Studio',
        settings: settings || {},
        blocks: blocks,
        categories: categories || [],
        lang,
        success: req.query.success || null,
        adminUser: req.session.adminUser
      });
    });
  });
});

router.post('/layout/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const {
    primary_color, accent_color, hero_layout_style,
    breaking_news_enabled, breaking_news_text_km, breaking_news_text_en,
    header_banner_ad_enabled, sidebar_position, custom_css, homepage_blocks
  } = req.body;

  db.run(`
    UPDATE settings SET
      primary_color = ?, accent_color = ?, hero_layout_style = ?,
      breaking_news_enabled = ?, breaking_news_text_km = ?, breaking_news_text_en = ?,
      header_banner_ad_enabled = ?, sidebar_position = ?, custom_css = ?,
      homepage_blocks = COALESCE(NULLIF(?, ''), homepage_blocks)
    WHERE id = 1
  `, [
    primary_color || '#1e3a8a', accent_color || '#dc2626', hero_layout_style || 'grid_3',
    breaking_news_enabled ? 1 : 0, breaking_news_text_km || '', breaking_news_text_en || '',
    header_banner_ad_enabled ? 1 : 0, sidebar_position || 'right', custom_css || '',
    homepage_blocks || ''
  ], (err) => {
    res.redirect('/admin/layout?success=Layout+and+theme+updated+successfully');
  });
});

router.post('/layout/blocks/save', requireAdmin, express.json(), (req, res) => {
  const db = getDb();
  const { blocks } = req.body;
  const blocksJson = JSON.stringify(blocks || []);
  db.run("UPDATE settings SET homepage_blocks = ? WHERE id = 1", [blocksJson], (err) => {
    if (err) return res.status(500).json({ error: 'Save failed' });
    res.json({ success: true });
  });
});

// --- Settings Management ---
router.get('/settings', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get("SELECT * FROM settings WHERE id = 1", [], (err, settings) => {
    res.render('admin/settings', { title: 'Settings', settings: settings || {}, lang, success: req.query.success || null, adminUser: req.session.adminUser });
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
    res.render('admin/ads', { title: 'Ads Management', ads: ads || [], lang, adminUser: req.session.adminUser, ad: null });
  });
});

router.get('/ads/edit/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  if (req.params.id == 0) {
    db.all("SELECT * FROM ads ORDER BY id DESC", [], (err, ads) => {
      res.render('admin/ads', { title: 'Add Ad', ads: ads || [], ad: {}, lang, adminUser: req.session.adminUser });
    });
  } else {
    db.get("SELECT * FROM ads WHERE id = ?", [req.params.id], (err, ad) => {
      db.all("SELECT * FROM ads ORDER BY id DESC", [], (err2, ads) => {
        res.render('admin/ads', { title: 'Edit Ad', ads: ads || [], ad: ad || {}, lang, adminUser: req.session.adminUser });
      });
    });
  }
});

router.post('/ads/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { id, title, image_url, link_url, position, is_active, ad_type, html_code } = req.body;
  const active = is_active ? 1 : 0;
  const type = ad_type || 'image';
  const imgUrl = image_url || '';
  const link = link_url || '#';
  const code = html_code || '';

  if (id) {
    db.run(
      "UPDATE ads SET title = ?, image_url = ?, link_url = ?, position = ?, is_active = ?, ad_type = ?, html_code = ? WHERE id = ?",
      [title, imgUrl, link, position, active, type, code, id],
      () => res.redirect('/admin/ads')
    );
  } else {
    db.run(
      "INSERT INTO ads (title, image_url, link_url, position, is_active, ad_type, html_code) VALUES (?,?,?,?,?,?,?)",
      [title, imgUrl, link, position, active, type, code],
      () => res.redirect('/admin/ads')
    );
  }
});

router.get('/ads/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run("DELETE FROM ads WHERE id = ?", [req.params.id], () => res.redirect('/admin/ads'));
});

module.exports = router;
