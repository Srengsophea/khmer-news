const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

router.use((req, res, next) => {
  res.locals.layout = 'admin/layout';
  res.locals.pendingComments = 0;
  if (req.session && req.session.adminId) {
    const db = getDb();
    db.get(`SELECT COUNT(*) as pending FROM comments WHERE is_approved = 0`, [], (err, row) => {
      res.locals.pendingComments = row ? row.pending : 0;
      next();
    });
  } else {
    next();
  }
});

router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
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
      db.get(`SELECT COALESCE(SUM(views_count), 0) as total FROM articles`, [], (e2b, v1) => {
        db.get(`SELECT COUNT(*) as total FROM subscribers`, [], (e2c, s1) => {
          db.get(`SELECT COUNT(*) as total FROM messages`, [], (e2d, m1) => {
            db.get(`SELECT COUNT(*) as total FROM tags`, [], (e2e, t1) => {
              db.all(`SELECT * FROM categories ORDER BY id`, [], (e3, categories) => {
                db.all(
                  `SELECT a.*, c.name_km, c.name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.created_at DESC LIMIT 5`,
                  [],
                  (e4, recent) => {
                    db.all(
                      `SELECT a.*, c.name_km, c.name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY COALESCE(a.views_count, 0) DESC LIMIT 5`,
                      [],
                      (e5, topArticles) => {
                        res.render('admin/dashboard', {
                          categories,
                          recent,
                          topArticles,
                          stats: {
                            articles: a1.total,
                            categories: a2.total,
                            views: v1.total || 0,
                            subscribers: s1.total || 0,
                            messages: m1.total || 0,
                            tags: t1.total || 0
                          },
                          lang,
                          error: null,
                          success: null,
                          adminUser: req.session.adminUser
                        });
                      }
                    );
                  }
                );
              });
            });
          });
        });
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
  const isNew = req.params.id == 0;
  db.get(`SELECT * FROM articles WHERE id = ?`, [req.params.id], (err, article) => {
    const articleObj = isNew ? { id: 0, title_en: '', title_km: '', content_en: '', content_km: '', category_id: null, image_url: '', is_featured: 0, card_template: 'standard', author_name: 'Khmer News Desk', read_time_minutes: 3, summary_en: '', summary_km: '' } : (article || {});
    db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
      db.all(`SELECT * FROM tags ORDER BY name_en`, [], (e3, allTags) => {
        db.all(`SELECT tag_id FROM article_tags WHERE article_id = ?`, [req.params.id], (e4, tagRows) => {
          const articleTagIds = (tagRows || []).map((r) => r.tag_id);
          res.render('admin/articles', {
            articles: [], categories, lang, error: null, success: null,
            adminUser: req.session.adminUser, article: articleObj, allTags, articleTagIds,
            title: isNew ? 'Add Article' : 'Edit Article'
          });
        });
      });
    });
  });
});

router.post('/articles/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const {
    id, title_km, title_en, content_km, content_en, category_id, image_url, is_featured, card_template,
    author_name, read_time_minutes, summary_km, summary_en
  } = req.body;
  const tagIds = Array.isArray(req.body.tag_ids)
    ? req.body.tag_ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x))
    : (req.body.tag_ids ? [parseInt(req.body.tag_ids, 10)].filter((x) => !isNaN(x)) : []);
  const slug = (title_en || title_km).toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-');

  const afterSave = (articleId) => {
    db.run(`DELETE FROM article_tags WHERE article_id = ?`, [articleId], () => {
      const stmt = db.prepare(`INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?,?)`);
      tagIds.forEach((tid) => stmt.run(articleId, tid));
      stmt.finalize(() => res.redirect('/admin/articles'));
    });
  };

  if (id) {
    db.run(
      `UPDATE articles SET title_km=?, title_en=?, content_km=?, content_en=?, category_id=?, image_url=?, is_featured=?, card_template=?, author_name=?, read_time_minutes=?, summary_km=?, summary_en=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [title_km, title_en, content_km, content_en, category_id || null, image_url, is_featured ? 1 : 0, card_template || 'standard', author_name || 'Khmer News Desk', read_time_minutes || 3, summary_km || '', summary_en || '', id],
      (err) => afterSave(id)
    );
  } else {
    db.run(
      `INSERT INTO articles (title_km, title_en, content_km, content_en, slug, category_id, image_url, is_featured, card_template, author_name, read_time_minutes, summary_km, summary_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title_km, title_en, content_km, content_en, slug, category_id || null, image_url, is_featured ? 1 : 0, card_template || 'standard', author_name || 'Khmer News Desk', read_time_minutes || 3, summary_km || '', summary_en || ''],
      function (err) { afterSave(this.lastID); }
    );
  }
});

router.get('/articles/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM articles WHERE id = ?`, [req.params.id], () => {
    db.run(`DELETE FROM article_tags WHERE article_id = ?`, [req.params.id], () => res.redirect('/admin/articles'));
  });
});

// --- Subscribers Management ---
router.get('/subscribers', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(`SELECT * FROM subscribers ORDER BY created_at DESC`, [], (err, subscribers) => {
    res.render('admin/subscribers', { title: 'Subscribers', subscribers: subscribers || [], lang, adminUser: req.session.adminUser });
  });
});

router.get('/subscribers/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM subscribers WHERE id = ?`, [req.params.id], () => res.redirect('/admin/subscribers'));
});

// --- Messages Management ---
router.get('/messages', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(`SELECT * FROM messages ORDER BY created_at DESC`, [], (err, messages) => {
    res.render('admin/messages', { title: 'Messages', messages: messages || [], lang, adminUser: req.session.adminUser });
  });
});

router.get('/messages/read/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`UPDATE messages SET is_read = 1 WHERE id = ?`, [req.params.id], () => res.redirect('/admin/messages'));
});

router.get('/messages/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM messages WHERE id = ?`, [req.params.id], () => res.redirect('/admin/messages'));
});

// --- Comments Moderation ---
router.get('/comments', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(
    `SELECT c.*, a.title_km as article_title_km, a.title_en as article_title_en, a.slug as article_slug
     FROM comments c LEFT JOIN articles a ON c.article_id = a.id ORDER BY c.created_at DESC`,
    [],
    (err, comments) => {
      db.get(`SELECT COUNT(*) as pending FROM comments WHERE is_approved = 0`, [], (e, pRow) => {
        res.render('admin/comments', {
          title: 'Comments',
          comments: comments || [],
          pendingCount: pRow ? pRow.pending : 0,
          lang,
          adminUser: req.session.adminUser
        });
      });
    }
  );
});

router.get('/comments/approve/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`UPDATE comments SET is_approved = 1 - is_approved WHERE id = ?`, [req.params.id], () => res.redirect('/admin/comments'));
});

router.get('/comments/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM comments WHERE id = ?`, [req.params.id], () => res.redirect('/admin/comments'));
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

// --- Tags Management ---
router.get('/tags', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(
    `SELECT t.*, (SELECT COUNT(*) FROM article_tags at WHERE at.tag_id = t.id) as article_count FROM tags t ORDER BY t.name_en`,
    [],
    (err, tags) => {
      res.render('admin/tags', { title: 'Tags', tags: tags || [], lang, error: null, success: null, adminUser: req.session.adminUser, tag: null });
    }
  );
});

router.get('/tags/edit/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  const isNew = req.params.id == 0;
  db.get(`SELECT * FROM tags WHERE id = ?`, [req.params.id], (err, tag) => {
    const tagObj = isNew ? { id: 0, name_en: '', name_km: '', slug: '' } : (tag || {});
    db.all(
      `SELECT t.*, (SELECT COUNT(*) FROM article_tags at WHERE at.tag_id = t.id) as article_count FROM tags t ORDER BY t.name_en`,
      [],
      (err2, tags) => {
        res.render('admin/tags', {
          title: isNew ? 'Add Tag' : 'Edit Tag',
          tags: tags || [],
          tag: tagObj,
          lang,
          error: null,
          success: null,
          adminUser: req.session.adminUser
        });
      }
    );
  });
});

router.post('/tags/save', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { id, name_en, name_km, slug } = req.body;
  const finalSlug = (slug && slug.trim())
    ? slug.trim().toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    : (name_en || name_km).toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  if (!finalSlug || (!name_en && !name_km)) {
    return res.redirect('/admin/tags/edit/' + (id || 0));
  }
  if (id) {
    db.run(`UPDATE tags SET name_km=?, name_en=?, slug=? WHERE id=?`, [name_km, name_en, finalSlug, id], (err) => {
      if (err) return res.redirect('/admin/tags/edit/' + id);
      res.redirect('/admin/tags');
    });
  } else {
    db.run(`INSERT INTO tags (name_km, name_en, slug) VALUES (?,?,?)`, [name_km, name_en, finalSlug], (err) => {
      if (err) return res.redirect('/admin/tags/edit/0');
      res.redirect('/admin/tags');
    });
  }
});

router.get('/tags/delete/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.run(`DELETE FROM article_tags WHERE tag_id = ?`, [req.params.id], () => {
    db.run(`DELETE FROM tags WHERE id = ?`, [req.params.id], () => res.redirect('/admin/tags'));
  });
});

// --- Layout & Theme Studio Management ---
// Default block arrangements for category and article pages (used when none are saved yet)
function defaultCategoryBlocks() {
  return [
    { id: 'cat-default-1', type: 'category', style: 'grid_3_col', limit: 9, enabled: true, title_km: 'អត្ថបទថ្មីៗ', title_en: 'Latest Articles' },
    { id: 'cat-default-2', type: 'ad_slot', position_slot: 'homepage_mid_banner', enabled: true, title_km: 'ផ្ទាំងពាណិជ្ជកម្ម', title_en: 'Advertisement' },
    { id: 'cat-default-3', type: 'newsletter', enabled: true, title_km: 'ជាវព័ត៌មានប្រចាំថ្ងៃ', title_en: 'Newsletter' }
  ];
}

function defaultArticleBlocks() {
  return [
    { id: 'art-default-1', type: 'article_comments', enabled: true, title_km: 'មតិយោបល់', title_en: 'Comments' },
    { id: 'art-default-2', type: 'article_related', limit: 4, enabled: true, title_km: 'អត្ថបទពាក់ព័ន្ធ', title_en: 'Related Articles' }
  ];
}

function parseBlocks(json) {
  try {
    const arr = json ? JSON.parse(json) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

router.get('/layout', requireAdmin, (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.get("SELECT * FROM settings WHERE id = 1", [], (err, settings) => {
    db.all("SELECT * FROM categories ORDER BY id", [], (err2, categories) => {
      let blocks = parseBlocks(settings && settings.homepage_blocks);
      let categoryBlocks = parseBlocks(settings && settings.category_blocks);
      if (categoryBlocks.length === 0) categoryBlocks = defaultCategoryBlocks();
      let articleBlocks = parseBlocks(settings && settings.article_blocks);
      if (articleBlocks.length === 0) articleBlocks = defaultArticleBlocks();
      let customTemplates = [];
      try {
        customTemplates = settings && settings.custom_templates ? JSON.parse(settings.custom_templates) : [];
      } catch (e) {
        customTemplates = [];
      }
      res.render('admin/layout_manager', {
        title: 'Layout & Theme Studio',
        settings: settings || {},
        blocks: blocks,
        categoryBlocks: categoryBlocks,
        articleBlocks: articleBlocks,
        customTemplates: customTemplates,
        categories: categories || [],
        lang,
        tab: req.query.tab || 'blocks',
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
    header_banner_ad_enabled, sidebar_position, custom_css, homepage_blocks,
    ticker_style
  } = req.body;

  db.run(`
    UPDATE settings SET
      primary_color = ?, accent_color = ?, hero_layout_style = ?,
      breaking_news_enabled = ?, breaking_news_text_km = ?, breaking_news_text_en = ?,
      header_banner_ad_enabled = ?, sidebar_position = ?, custom_css = ?,
      homepage_blocks = COALESCE(NULLIF(?, ''), homepage_blocks),
      ticker_style = ?
    WHERE id = 1
  `, [
    primary_color || '#1e3a8a', accent_color || '#dc2626', hero_layout_style || 'grid_3',
    breaking_news_enabled ? 1 : 0, breaking_news_text_km || '', breaking_news_text_en || '',
    header_banner_ad_enabled ? 1 : 0, sidebar_position || 'right', custom_css || '',
    homepage_blocks || '', ticker_style || 'marquee'
  ], (err) => {
    // Auto-save from the Layout Studio uses fetch -> return JSON instead of a redirect
    if (req.xhr) {
      return res.json({ success: !err });
    }
    res.redirect('/admin/layout?tab=theme&success=Theme+settings+saved+successfully');
  });
});

// Save / update a custom layout template (named snapshot of the current block arrangement)
router.post('/layout/templates/save', requireAdmin, express.json(), (req, res) => {
  const db = getDb();
  const { name, blocks, page } = req.body;
  if (!name || !name.trim()) {
    return res.json({ success: false, error: 'Template name is required' });
  }
  const trimmedName = String(name).trim().slice(0, 60);
  const tplPage = page === 'category' || page === 'article' ? page : 'home';
  db.get("SELECT custom_templates FROM settings WHERE id = 1", [], (err, row) => {
    let templates = [];
    try {
      templates = row && row.custom_templates ? JSON.parse(row.custom_templates) : [];
    } catch (e) {
      templates = [];
    }
    const existing = templates.findIndex((t) => t.name === trimmedName && (t.page || 'home') === tplPage);
    const entry = { name: trimmedName, page: tplPage, blocks: blocks || [], savedAt: new Date().toISOString() };
    if (existing >= 0) {
      templates[existing] = entry;
    } else {
      templates.push(entry);
    }
    db.run("UPDATE settings SET custom_templates = ? WHERE id = 1", [JSON.stringify(templates)], (err2) => {
      res.json({ success: true, templates });
    });
  });
});

// Delete a custom layout template
router.post('/layout/templates/delete', requireAdmin, express.json(), (req, res) => {
  const db = getDb();
  const { name, page } = req.body;
  const tplPage = page === 'category' || page === 'article' ? page : 'home';
  db.get("SELECT custom_templates FROM settings WHERE id = 1", [], (err, row) => {
    let templates = [];
    try {
      templates = row && row.custom_templates ? JSON.parse(row.custom_templates) : [];
    } catch (e) {
      templates = [];
    }
    templates = templates.filter((t) => !(t.name === name && (t.page || 'home') === tplPage));
    db.run("UPDATE settings SET custom_templates = ? WHERE id = 1", [JSON.stringify(templates)], (err2) => {
      res.json({ success: true, templates });
    });
  });
});

router.post('/layout/blocks/save', requireAdmin, express.json(), (req, res) => {
  const db = getDb();
  const { blocks, page } = req.body;
  const column = page === 'category' ? 'category_blocks' : (page === 'article' ? 'article_blocks' : 'homepage_blocks');
  const blocksJson = JSON.stringify(blocks || []);
  db.run(`UPDATE settings SET ${column} = ? WHERE id = 1`, [blocksJson], (err) => {
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
