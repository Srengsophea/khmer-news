const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

const PAGE_SIZE = 9;

function cleanSlug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function getArticleQuery(withWhere) {
  const where = withWhere ? withWhere : '';
  return `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id ${where} ORDER BY a.created_at DESC`;
}

function getTagsForArticle(db, articleId, callback) {
  db.all(
    `SELECT t.* FROM tags t INNER JOIN article_tags at ON at.tag_id = t.id WHERE at.article_id = ? ORDER BY t.name_en`,
    [articleId],
    (err, rows) => callback(rows || [])
  );
}

function getArticleTagsMap(db, callback) {
  db.all(`SELECT at.article_id, t.* FROM article_tags at INNER JOIN tags t ON at.tag_id = t.id`, [], (err, rows) => {
    const map = {};
    (rows || []).forEach((r) => {
      if (!map[r.article_id]) map[r.article_id] = [];
      map[r.article_id].push(r);
    });
    callback(map);
  });
}

function getCategories(db, callback) {
  db.all(`SELECT * FROM categories ORDER BY id`, [], (err, categories) => callback(categories || []));
}

function renderPagination(total, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }
  return { totalPages, pages, current: page };
}

router.get('/', (req, res) => {
  const db = getDb();
  const lang = req.lang;

  db.all(getArticleQuery(), [], (err, allArticles) => {
    db.all(`SELECT * FROM categories ORDER BY id`, [], (err2, categories) => {
      db.all(
        `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.is_featured = 1 ORDER BY a.created_at DESC LIMIT 5`,
        [],
        (err3, featured) => {
          db.get("SELECT homepage_blocks FROM settings WHERE id = 1", [], (err4, setRow) => {
            db.all(
              `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id ORDER BY COALESCE(a.views_count, 0) DESC LIMIT 5`,
              [],
              (err5, trending) => {
                db.all(`SELECT * FROM tags ORDER BY name_en`, [], (err6, tags) => {
                  let blocks = [];
                  try {
                    blocks = setRow && setRow.homepage_blocks ? JSON.parse(setRow.homepage_blocks) : [];
                  } catch (e) {
                    blocks = [];
                  }

                  // Group articles by category_id
                  const articlesByCat = {};
                  (allArticles || []).forEach(a => {
                    if (a.category_id) {
                      if (!articlesByCat[a.category_id]) articlesByCat[a.category_id] = [];
                      articlesByCat[a.category_id].push(a);
                    }
                  });

                  res.render('index', {
                    articles: allArticles || [],
                    articlesByCat: articlesByCat,
                    homepageBlocks: blocks,
                    categories: categories || [],
                    featured: (featured && featured.length > 0) ? featured : (allArticles || []).slice(0, 3),
                    trending: trending || [],
                    tags: tags || [],
                    lang,
                    title: 'Khmer News'
                  });
                });
              }
            );
          });
        }
      );
    });
  });
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

      getCategories(db, (categories) => {
        db.all(
          `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.id != ? AND a.category_id = ? ORDER BY a.created_at DESC LIMIT 4`,
          [article.id, article.category_id],
          (e3, related) => {
            // If no same-category related, fall back to latest
            const relatedArticles = (related && related.length > 0) ? related : null;
            const fallbackArticles = relatedArticles ? [] : null;
            const fetchFallback = (cb) => {
              if (fallbackArticles === null) return cb([]);
              db.all(
                `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.id != ? ORDER BY a.created_at DESC LIMIT 4`,
                [article.id],
                (e, fb) => cb(fb || [])
              );
            };
            fetchFallback((finalRelated) => {
              getTagsForArticle(db, article.id, (tags) => {
                db.all(
                  `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.id != ? ORDER BY COALESCE(a.views_count, 0) DESC LIMIT 5`,
                  [article.id],
                  (eTrend, trending) => {
                    // Prev / next navigation (tie-safe ordering)
                    db.get(
                      `SELECT * FROM articles WHERE created_at < (SELECT created_at FROM articles WHERE id = ?) OR (created_at = (SELECT created_at FROM articles WHERE id = ?) AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 1`,
                      [article.id, article.id, article.id],
                      (ePrev, prevArticle) => {
                        db.get(
                          `SELECT * FROM articles WHERE created_at > (SELECT created_at FROM articles WHERE id = ?) OR (created_at = (SELECT created_at FROM articles WHERE id = ?) AND id > ?) ORDER BY created_at ASC, id ASC LIMIT 1`,
                          [article.id, article.id, article.id],
                          (eNext, nextArticle) => {
                            db.all(`SELECT * FROM tags ORDER BY name_en`, [], (eAllTags, allTags) => {
                              getArticleTagsMap(db, (tagsMap) => {
                                db.all(
                                  `SELECT * FROM comments WHERE article_id = ? AND is_approved = 1 ORDER BY created_at ASC`,
                                  [article.id],
                                  (eComments, comments) => {
                                    const siteSettings = res.locals.siteSettings || {};
                                    let articleBlocks = [];
                                    try {
                                      articleBlocks = siteSettings.article_blocks ? JSON.parse(siteSettings.article_blocks) : [];
                                    } catch (e) {
                                      articleBlocks = [];
                                    }
                                    if (!Array.isArray(articleBlocks) || articleBlocks.length === 0) {
                                      articleBlocks = [
                                        { id: 'art-default-1', type: 'article_comments', enabled: true, title_km: 'មតិយោបល់', title_en: 'Comments' },
                                        { id: 'art-default-2', type: 'article_related', limit: 4, enabled: true, title_km: 'អត្ថបទពាក់ព័ន្ធ', title_en: 'Related Articles' }
                                      ];
                                    }
                                    res.render('article', {
                                      article,
                                      categories,
                                      articles: (relatedArticles || finalRelated || []),
                                      trending: trending || [],
                                      tags,
                                      allTags: allTags || [],
                                      tagsMap,
                                      comments: comments || [],
                                      articleBlocks,
                                      commentSuccess: req.query.c === '1' ? true : false,
                                      commentError: req.query.c === 'error' ? true : false,
                                      prevArticle,
                                      nextArticle,
                                      lang,
                                      title: article[`title_${lang}`]
                                    });
                                  }
                                );
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              });
            });
          }
        );
      });
    }
  );
});

router.post('/article/:slug/comment', express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { name, email, content } = req.body;
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanContent = (content || '').trim();

  if (!cleanName || !cleanEmail || !cleanContent || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || cleanContent.length < 2) {
    return res.redirect('/article/' + req.params.slug + '?c=error#comments');
  }

  db.get(`SELECT id FROM articles WHERE slug = ?`, [req.params.slug], (err, article) => {
    if (!article) return res.status(404).render('404', { layout: false, title: '404' });
    db.run(
      `INSERT INTO comments (article_id, name, email, content, is_approved) VALUES (?,?,?,?,1)`,
      [article.id, cleanName, cleanEmail, cleanContent],
      (err2) => {
        res.redirect('/article/' + req.params.slug + '?c=1#comments');
      }
    );
  });
});

router.get('/category/:slug', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = parseInt(req.query.limit, 10) || PAGE_SIZE;
  const offset = (page - 1) * limit;

  db.get(`SELECT * FROM categories WHERE slug = ?`, [req.params.slug], (err, category) => {
    if (!category) return res.status(404).render('404', { layout: false, title: '404' });
    db.get(`SELECT COUNT(*) as total FROM articles WHERE category_id = ?`, [category.id], (e0, countRow) => {
      db.all(
        `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.category_id = ? ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
        [category.id, limit, offset],
        (e2, articles) => {
          db.all(`SELECT * FROM categories ORDER BY id`, [], (e3, categories) => {
            db.all(`SELECT * FROM tags ORDER BY name_en`, [],          (e4, tags) => {
              const siteSettings = res.locals.siteSettings || {};
              let categoryBlocks = [];
              try {
                categoryBlocks = siteSettings.category_blocks ? JSON.parse(siteSettings.category_blocks) : [];
              } catch (e) {
                categoryBlocks = [];
              }
              if (!Array.isArray(categoryBlocks) || categoryBlocks.length === 0) {
                categoryBlocks = [
                  { id: 'cat-default-1', type: 'category', style: 'grid_3_col', limit: 9, enabled: true, title_km: 'អត្ថបទថ្មីៗ', title_en: 'Latest Articles' },
                  { id: 'cat-default-2', type: 'ad_slot', position_slot: 'homepage_mid_banner', enabled: true, title_km: 'ផ្ទាំងពាណិជ្ជកម្ម', title_en: 'Advertisement' },
                  { id: 'cat-default-3', type: 'newsletter', enabled: true, title_km: 'ជាវព័ត៌មានប្រចាំថ្ងៃ', title_en: 'Newsletter' }
                ];
              }
              res.render('category', {
                category,
                articles,
                categories,
                tags: tags || [],
                categoryBlocks,
                pagination: renderPagination(countRow ? countRow.total : 0, page, limit),
                lang,
                title: category[`name_${lang}`]
              });
            });
          });
        }
      );
    });
  });
});

router.get('/tag/:slug', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = PAGE_SIZE;
  const offset = (page - 1) * limit;

  db.get(`SELECT * FROM tags WHERE slug = ?`, [req.params.slug], (err, tag) => {
    if (!tag) return res.status(404).render('404', { layout: false, title: '404' });
    db.get(
      `SELECT COUNT(*) as total FROM article_tags WHERE tag_id = ?`,
      [tag.id],
      (e0, countRow) => {
        db.all(
          `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id INNER JOIN article_tags at ON at.article_id = a.id WHERE at.tag_id = ? ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
          [tag.id, limit, offset],
          (e2, articles) => {
            db.all(`SELECT * FROM categories ORDER BY id`, [], (e3, categories) => {
              db.all(`SELECT * FROM tags ORDER BY name_en`, [], (e4, tags) => {
                res.render('category', {
                  category: tag,
                  articles,
                  categories,
                  tags: tags || [],
                  isTagPage: true,
                  pagination: renderPagination(countRow ? countRow.total : 0, page, limit),
                  lang,
                  title: tag[`name_${lang}`]
                });
              });
            });
          }
        );
      }
    );
  });
});

router.get('/search', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  const q = req.query.q || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = PAGE_SIZE;
  const offset = (page - 1) * limit;

  const run = (callback) => {
    if (!q.trim()) {
      return callback([], 0);
    }
    db.get(
      `SELECT COUNT(*) as total FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.title_km LIKE ? OR a.title_en LIKE ? OR a.content_km LIKE ? OR a.content_en LIKE ? OR c.name_km LIKE ? OR c.name_en LIKE ?`,
      [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      (e, countRow) => {
        db.all(
          `SELECT a.*, c.slug as category_slug, c.name_km as category_name_km, c.name_en as category_name_en FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.title_km LIKE ? OR a.title_en LIKE ? OR a.content_km LIKE ? OR a.content_en LIKE ? OR c.name_km LIKE ? OR c.name_en LIKE ? ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
          [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, limit, offset],
          (err, articles) => callback(articles || [], countRow ? countRow.total : 0)
        );
      }
    );
  };

  run((articles, total) => {
    db.all(`SELECT * FROM categories ORDER BY id`, [], (e2, categories) => {
      res.render('search', {
        categories,
        lang,
        articles,
        query: q,
        pagination: renderPagination(total, page, limit),
        title: 'Search'
      });
    });
  });
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

router.get('/contact', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  getCategories(db, (categories) => {
    res.render('contact', {
      categories,
      lang,
      success: req.query.success || null,
      title: 'Contact'
    });
  });
});

router.post('/contact', express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.redirect('/contact?success=error');
  }
  db.run(
    `INSERT INTO messages (name, email, subject, message) VALUES (?,?,?,?)`,
    [name, email, subject || '', message],
    (err) => {
      res.redirect('/contact?success=1');
    }
  );
});

router.get('/advertise', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  getCategories(db, (categories) => {
    res.render('advertise', { categories, lang, title: 'Advertise' });
  });
});

router.get('/privacy', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  getCategories(db, (categories) => {
    res.render('privacy', { categories, lang, title: 'Privacy Policy' });
  });
});

router.get('/terms', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  getCategories(db, (categories) => {
    res.render('terms', { categories, lang, title: 'Terms of Service' });
  });
});

router.post('/newsletter/subscribe', express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid' });
  }
  db.run(`INSERT OR IGNORE INTO subscribers (email) VALUES (?)`, [email], function (err) {
    if (err) return res.status(500).json({ error: 'db' });
    // this.changes === 0 means the email already existed (INSERT was ignored)
    res.json({ success: true, existed: this.changes === 0 });
  });
});

router.get('/feed.xml', (req, res) => {
  const db = getDb();
  const lang = req.lang;
  db.all(getArticleQuery(), [], (err, articles) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const items = (articles || []).slice(0, 20).map((a) => {
      const title = a[`title_${lang}`] || a.title_en || a.title_km;
      const link = `${baseUrl}/article/${a.slug}`;
      const desc = (a[`content_${lang}`] || a.content_en || '').replace(/<[^>]*>/g, '').substring(0, 300);
      const date = new Date(a.created_at).toUTCString();
      return { title, link, desc, date };
    }).map((i) => `
      <item>
        <title><![CDATA[${i.title}]]></title>
        <link>${i.link}</link>
        <description><![CDATA[${i.desc}]]></description>
        <pubDate>${i.date}</pubDate>
      </item>`).join('');

    res.type('application/rss+xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Khmer News</title>
    <link>${baseUrl}</link>
    <description>Bilingual Khmer/English news portal</description>
    ${items}
  </channel>
</rss>`);
  });
});

router.get('/sitemap.xml', (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  db.all(getArticleQuery(), [], (err, articles) => {
    db.all(`SELECT * FROM categories`, [], (e, categories) => {
      db.all(`SELECT * FROM tags`, [], (e2, tags) => {
        const urls = [
          { loc: `${baseUrl}/`, freq: 'daily' },
          { loc: `${baseUrl}/about`, freq: 'monthly' },
          { loc: `${baseUrl}/contact`, freq: 'monthly' },
          { loc: `${baseUrl}/advertise`, freq: 'monthly' },
          { loc: `${baseUrl}/privacy`, freq: 'yearly' },
          { loc: `${baseUrl}/terms`, freq: 'yearly' }
        ];
        (categories || []).forEach((c) => urls.push({ loc: `${baseUrl}/category/${c.slug}`, freq: 'daily' }));
        (tags || []).forEach((t) => urls.push({ loc: `${baseUrl}/tag/${t.slug}`, freq: 'weekly' }));
        (articles || []).forEach((a) => urls.push({ loc: `${baseUrl}/article/${a.slug}`, freq: 'daily' }));
        const body = urls.map((u) => `<url><loc>${u.loc}</loc><changefreq>${u.freq}</changefreq></url>`).join('');
        res.type('application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
      });
    });
  });
});

module.exports = router;
