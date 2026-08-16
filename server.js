const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const i18n = require('./middleware/i18n');
const { initDatabase, seedDatabase, getDb } = require('./database');
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
  secret: 'khmer-news-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  if (!req.session.lang) {
    req.session.lang = 'km';
  }
  req.lang = req.session.lang;
  next();
});

app.use((req, res, next) => {
  res.locals.t = (key) => i18n.t(req.lang, key);
  res.locals.lang = req.lang;
  
  const db = getDb();
  if (db) {
    db.get("SELECT * FROM settings WHERE id = 1", [], (err, settings) => {
      const siteSettings = settings || {
        primary_color: '#1e3a8a',
        accent_color: '#dc2626',
        hero_layout_style: 'grid_3',
        breaking_news_enabled: 1,
        header_banner_ad_enabled: 1
      };
      res.locals.siteSettings = siteSettings;

      db.all("SELECT * FROM ads WHERE is_active = 1", [], (err2, ads) => {
        const rawAds = ads || [];
        res.locals.siteAds = rawAds;
        
        // Group active ads by position key
        const adsByPos = {};
        rawAds.forEach(ad => {
          if (!adsByPos[ad.position]) {
            adsByPos[ad.position] = [];
          }
          adsByPos[ad.position].push(ad);
        });
        res.locals.siteAdsByPos = adsByPos;
        res.locals.getAd = (pos) => {
          return adsByPos[pos] && adsByPos[pos].length > 0 ? adsByPos[pos][0] : null;
        };
        next();
      });
    });
  } else {
    res.locals.siteSettings = {};
    res.locals.siteAds = [];
    res.locals.siteAdsByPos = {};
    res.locals.getAd = () => null;
    next();
  }
});

app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('404', { layout: false, title: '404' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

initDatabase((err) => {
  if (err) {
    console.error('Database init failed:', err);
    return;
  }
  seedDatabase(() => {
    console.log('Database ready.');
  });
});

app.listen(PORT, () => {
  console.log(`Khmer News server running at http://localhost:${PORT}`);
});
