const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, '..', 'locales');

let translations = {};

function loadTranslations() {
  const langs = ['en', 'km'];
  langs.forEach(lang => {
    const file = path.join(localesDir, `${lang}.json`);
    try {
      translations[lang] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      translations[lang] = {};
    }
  });
}

function t(lang, key) {
  const keys = key.split('.');
  let val = translations[lang || 'km'];
  for (const k of keys) {
    if (!val || typeof val !== 'object') return key;
    val = val[k];
  }
  return val || key;
}

loadTranslations();

module.exports = { t, loadTranslations };
