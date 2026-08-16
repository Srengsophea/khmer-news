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
      res.locals.siteSettings = settings || {};
      db.all("SELECT * FROM ads WHERE is_active = 1", [], (err2, ads) => {
        res.locals.siteAds = ads || [];
        next();
      });
    });
  } else {
    res.locals.siteSettings = {};
    res.locals.siteAds = [];
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
