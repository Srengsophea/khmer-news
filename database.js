const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, 'data', 'news.db');

let db;

function initDatabase(callback) {
  const dir = path.dirname(DB_PATH);
  const fs = require('fs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('DB connection error:', err);
      return callback(err);
    }
    db.run('PRAGMA foreign_keys = ON');
    const schema = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_km TEXT NOT NULL,
        name_en TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title_km TEXT NOT NULL,
        title_en TEXT NOT NULL,
        content_km TEXT NOT NULL,
        content_en TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category_id INTEGER,
        image_url TEXT,
        is_featured INTEGER DEFAULT 0,
        card_template TEXT DEFAULT 'standard',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        site_name_km TEXT,
        site_name_en TEXT,
        site_desc_km TEXT,
        site_desc_en TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        contact_address_km TEXT,
        contact_address_en TEXT,
        social_facebook TEXT,
        social_telegram TEXT,
        social_youtube TEXT,
        social_twitter TEXT,
        primary_color TEXT DEFAULT '#1e3a8a',
        accent_color TEXT DEFAULT '#dc2626',
        hero_layout_style TEXT DEFAULT 'grid_3',
        breaking_news_enabled INTEGER DEFAULT 1,
        breaking_news_text_km TEXT DEFAULT '',
        breaking_news_text_en TEXT DEFAULT '',
        header_banner_ad_enabled INTEGER DEFAULT 1,
        sidebar_position TEXT DEFAULT 'right',
        custom_css TEXT DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        link_url TEXT NOT NULL,
        position TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        ad_type TEXT DEFAULT 'image',
        html_code TEXT DEFAULT '',
        click_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0
      );
    `;
    db.exec(schema, (err) => {
      if (err) return callback(err);
      runMigrations(() => {
        callback(null);
      });
    });
  });
}

function runMigrations(callback) {
  const alterQueries = [
    "ALTER TABLE settings ADD COLUMN primary_color TEXT DEFAULT '#1e3a8a'",
    "ALTER TABLE settings ADD COLUMN accent_color TEXT DEFAULT '#dc2626'",
    "ALTER TABLE settings ADD COLUMN hero_layout_style TEXT DEFAULT 'grid_3'",
    "ALTER TABLE settings ADD COLUMN breaking_news_enabled INTEGER DEFAULT 1",
    "ALTER TABLE settings ADD COLUMN breaking_news_text_km TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN breaking_news_text_en TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN header_banner_ad_enabled INTEGER DEFAULT 1",
    "ALTER TABLE settings ADD COLUMN sidebar_position TEXT DEFAULT 'right'",
    "ALTER TABLE settings ADD COLUMN custom_css TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN homepage_blocks TEXT DEFAULT ''",
    "ALTER TABLE ads ADD COLUMN ad_type TEXT DEFAULT 'image'",
    "ALTER TABLE ads ADD COLUMN html_code TEXT DEFAULT ''",
    "ALTER TABLE ads ADD COLUMN click_count INTEGER DEFAULT 0",
    "ALTER TABLE ads ADD COLUMN views_count INTEGER DEFAULT 0",
    "ALTER TABLE articles ADD COLUMN views_count INTEGER DEFAULT 0",
    "ALTER TABLE articles ADD COLUMN read_time_minutes INTEGER DEFAULT 3",
    "ALTER TABLE articles ADD COLUMN author_name TEXT DEFAULT 'Khmer News Desk'"
  ];

  let completed = 0;
  alterQueries.forEach((q) => {
    db.run(q, [], () => {
      completed++;
      if (completed === alterQueries.length) {
        ensureDefaultSettings(() => {
          if (callback) callback();
        });
      }
    });
  });
}

function ensureDefaultSettings(callback) {
  const defaultBlocks = JSON.stringify([
    { id: "b-hero", type: "hero", title_km: "ព័ត៌មានលេចធ្លោ", title_en: "Featured Showcase", style: "grid_3", enabled: true, limit: 3 },
    { id: "b-spotlight", type: "spotlight", title_km: "ព័ត៌មានសំខាន់ប្រចាំថ្ងៃ", title_en: "Top Spotlight", style: "wide_card", enabled: true, limit: 1 },
    { id: "b-ad-mid", type: "ad_slot", title_km: "ផ្ទាំងពាណិជ្ជកម្មកណ្តាល", title_en: "Mid Content Banner", position_slot: "homepage_mid_banner", enabled: true },
    { id: "b-cat-national", type: "category", category_id: 1, title_km: "ព័ត៌មានជាតិ", title_en: "National News", style: "grid_3_col", enabled: true, limit: 6 },
    { id: "b-cat-tech", type: "category", category_id: 4, title_km: "បច្ចេកវិទ្យា", title_en: "Technology", style: "grid_2_col", enabled: true, limit: 4 },
    { id: "b-cat-sports", type: "category", category_id: 3, title_km: "កីឡា", title_en: "Sports", style: "list_view", enabled: true, limit: 4 },
    { id: "b-ad-bottom", type: "ad_slot", title_km: "ផ្ទាំងពាណិជ្ជកម្មខាងក្រោម", title_en: "Bottom Banner", position_slot: "homepage_bottom_banner", enabled: true },
    { id: "b-newsletter", type: "newsletter", title_km: "ជាវព័ត៌មានប្រចាំថ្ងៃ", title_en: "Subscribe Newsletter", enabled: true }
  ]);

  db.get("SELECT COUNT(*) as c FROM settings", (err, row) => {
    if (err || (row && row.c > 0)) {
      // Ensure homepage_blocks is initialized if empty
      db.get("SELECT homepage_blocks FROM settings WHERE id = 1", [], (e, sRow) => {
        if (sRow && (!sRow.homepage_blocks || sRow.homepage_blocks.trim() === '')) {
          db.run("UPDATE settings SET homepage_blocks = ? WHERE id = 1", [defaultBlocks], () => {
            if (callback) callback();
          });
        } else {
          if (callback) callback();
        }
      });
      return;
    }
    db.run(`
      INSERT INTO settings (
        id, site_name_km, site_name_en, site_desc_km, site_desc_en,
        contact_phone, contact_email, contact_address_km, contact_address_en,
        social_facebook, social_telegram, social_youtube, social_twitter,
        primary_color, accent_color, hero_layout_style, breaking_news_enabled,
        breaking_news_text_km, breaking_news_text_en, header_banner_ad_enabled, sidebar_position, homepage_blocks
      ) VALUES (
        1, 'ខ្មែរញូស៍', 'Khmer News',
        'ប្រភពព័ត៌មានឈានមុខគេ និងទាន់ហេតុការណ៍នៅកម្ពុជា',
        'Leading & Breaking News Portal in Cambodia',
        '+855 12 345 678', 'info@khmernews.com.kh',
        'ភ្នំពេញ, កម្ពុជា', 'Phnom Penh, Cambodia',
        'https://facebook.com', 'https://t.me/khmernews', 'https://youtube.com', 'https://twitter.com',
        '#1e3a8a', '#dc2626', 'grid_3', 1,
        'ព័ត៌មានទាន់ហេតុការណ៍៖ កម្ពុជាប្រកាសគម្រោងអភិវឌ្ឍន៍ហេដ្ឋារចនាសម្ព័ន្ធបច្ចេកវិទ្យាថ្មី',
        'BREAKING NEWS: Cambodia Announces Major Tech & Infrastructure Expansion Project',
        1, 'right', ?
      )
    `, [defaultBlocks], () => {
      if (callback) callback();
    });
  });
}


function seedDatabase(callback) {
  db.get("SELECT COUNT(*) as c FROM categories", (err, row) => {
    if (err) return;
    if (row.c > 0) {
      ensureAdmin(callback);
      return;
    }
    const categories = [
      { name_km: 'ព័ត៌មានជាតិ', name_en: 'National News', slug: 'national' },
      { name_km: 'ព័ត៌មានអន្តរជាតិ', name_en: 'International News', slug: 'international' },
      { name_km: 'កីឡា', name_en: 'Sports', slug: 'sports' },
      { name_km: 'បច្ចេកវិទ្យា', name_en: 'Technology', slug: 'technology' },
      { name_km: 'សេដ្ឋកិច្ច', name_en: 'Economy', slug: 'economy' }
    ];
    db.serialize(() => {
      categories.forEach((cat, idx) => {
        db.run(
          "INSERT INTO categories (id, name_km, name_en, slug) VALUES (?,?,?,?)",
          [idx + 1, cat.name_km, cat.name_en, cat.slug]
        );
      });

      const articles = [
        /* ==================== NATIONAL NEWS (1 - 10) ==================== */
        {
          title_km: 'រាជធានីភ្នំពេញពង្រីកបណ្តាញផ្លូវល្បឿនលឿន និងដឹកជញ្ជូនសាធារណៈថ្មីដើម្បីកាត់បន្ថយការកកស្ទះ',
          title_en: 'Phnom Penh Expanding Expressway and Public Transit Network to Ease Congestion',
          content_km: '<p>រដ្ឋបាលរាជធានីភ្នំពេញ សហការជាមួយក្រសួងសាធារណការ និងដឹកជញ្ជូន បានប្រកាសជាផ្លូវការអំពីការបើកដំណើរការការដ្ឋានពង្រីកផ្លូវល្បឿនលឿនថ្មី និងការពង្រឹងប្រព័ន្ធដឹកជញ្ជូនសាធារណៈនៅក្នុងក្រុង។ គម្រោងនេះធ្វើឡើងក្នុងគោលបំណងដោះស្រាយបញ្ហាកកស្ទះចរាចរណ៍ដែលកំពុងកើនឡើង និងជួយសម្រួលដល់ការធ្វើដំណើររបស់ប្រជាពលរដ្ឋកាន់តែរហ័ស និងមានសុវត្ថិភាព។</p><p>នៅក្នុងជំហានដំបូង រដ្ឋបាលក្រុងនឹងពង្រីកបណ្តាញផ្លូវសំខាន់ៗដែលតភ្ជាប់ពីកណ្តាលក្រុងទៅកាន់តំបន់ជាយក្រុង និងអាកាសយានដ្ឋានអន្តរជាតិភ្នំពេញថ្មី។ ជាមួយគ្នានេះដែរ រថយន្តក្រុងសាធារណៈថ្មីរាប់រយគ្រឿងនឹងត្រូវដាក់ពង្រាយបន្ថែម ព្រមទាំងមានការសិក្សាលើការបង្កើតប្រព័ន្ធរថភ្លើងអគ្គិសនីល្បឿនលឿន (Light Rail Transit) ផងដែរ។</p>',
          content_en: '<p>The Phnom Penh Municipal Administration, in cooperation with the Ministry of Public Works and Transport, has officially announced the launch of a new expressway expansion project and the reinforcement of the city\'s public transit system. This project aims to address growing traffic congestion and facilitate faster, safer travel for residents.</p><p>In the first phase, the city administration will expand major road networks connecting the city center to the outskirts and the new Phnom Penh International Airport. Additionally, hundreds of new public buses will be deployed, and studies are underway for the establishment of a light rail transit (LRT) system.</p>',
          slug: 'phnom-penh-expressway-expansion-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/phnompenh/800/450',
          is_featured: 1,
          card_template: 'wide'
        },
        {
          title_km: 'កម្ពុជា និងដៃគូវិនិយោគអន្តរជាតិចុះហត្ថលេខាលើកិច្ចព្រមព្រៀងសាងសង់មជ្ឈមណ្ឌលភស្តុភារកម្មបច្ចេកវិទ្យាខ្ពស់',
          title_en: 'Cambodia and International Partners Sign Deal for High-Tech Logistics Hub',
          content_km: '<p>ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ បានប្រារព្ធពិធីចុះហត្ថលេខាលើកិច្ចព្រមព្រៀងភាពជាដៃគូរវាងរដ្ឋ និងឯកជន ក្នុងការសាងសង់មជ្ឈមណ្ឌលភស្តុភារកម្មបច្ចេកវិទ្យាខ្ពស់ដំបូងបង្កោតនៅកម្ពុជា។ គម្រោងសាងសង់នេះមានទុនវិនិយោគប្រមាណជាង ២០០ លានដុល្លារអាមេរិក។</p>',
          content_en: '<p>The Ministry of Economy and Finance held a signing ceremony for a public-private partnership agreement to build Cambodia\'s first high-tech logistics hub. The construction project involves an investment of over $200 million.</p>',
          slug: 'cambodia-hitech-logistics-deal-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/logistics/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'ក្រសួងសុខាភិបាលសម្ពោធមន្ទីរពេទ្យទំនើបថ្មីមួយ បំពាក់ឧបករណ៍វេជ្ជសាស្ត្រស្តង់ដារអន្តរជាតិ',
          title_en: 'Ministry of Health Inaugurates New Modern Hospital Equipped with International Standard Medical Devices',
          content_km: '<p>ក្រសួងសុខាភិបាលបានប្រារព្ធពិធីសម្ពោធដាក់ឱ្យប្រើប្រាស់ជាផ្លូវការនូវអគារមន្ទីរពេទ្យទំនើបថ្មីមួយ ដើម្បីផ្តល់សេវាថែទាំសុខភាពកម្រិតខ្ពស់ជូនដល់ប្រជាពលរដ្ឋ។ មន្ទីរពេទ្យនេះត្រូវបានបំពាក់ដោយឧបករណ៍វេជ្ជសាស្ត្រទំនើបៗស្តង់ដារអន្តរជាតិ ព្រមទាំងមានក្រុមគ្រូពេទ្យជំនាញឯកទេសជាច្រើនរូប។</p>',
          content_en: '<p>The Ministry of Health celebrated the official inauguration of a new modern hospital building to provide high-quality healthcare services to citizens. The hospital is equipped with state-of-the-art international standard medical devices and staffed by numerous specialized medical experts.</p>',
          slug: 'cambodia-new-modern-hospital-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/hospital/800/450',
          is_featured: 1,
          card_template: 'highlight'
        },
        {
          title_km: 'ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប និងសំពះព្រះខែ អរគុណសន្តិភាព ទាក់ទាញភ្ញៀវជាតិ និងអន្តរជាតិរាប់លាននាក់',
          title_en: 'Water Festival Celebration Attracts Millions of Local and International Visitors',
          content_km: '<p>រាជធានីភ្នំពេញបានប្រារព្ធពិធីបុណ្យអុំទូកដ៏អធិកអធមរយៈពេលបីថ្ងៃ ដោយទាក់ទាញប្រជាពលរដ្ឋមកពីបណ្តាខេត្តនានា និងទេសចរបរទេសរាប់លាននាក់ចូលរួមទស្សនាការប្រណាំងទូក និងការបណ្តែតប្រទីបតាមដងទន្លេសាប។</p>',
          content_en: '<p>Phnom Penh celebrated the grand three-day Water Festival, drawing millions of citizens from various provinces and foreign tourists to watch boat racing and illuminated floats along the Tonle Sap river.</p>',
          slug: 'cambodia-water-festival-celebration-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/waterfestival/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ក្រសួងបរិស្ថានជំរុញយុទ្ធនាការ «ថ្ងៃនេះខ្ញុំមិនប្រើថង់ប្លាស្ទិកទេ» នៅតាមសាលារៀនទូទាំងប្រទេស',
          title_en: 'Ministry of Environment Promotes "Today I Do Not Use Plastic Bags" Campaign in Schools Nationwide',
          content_km: '<p>ក្រសួងបរិស្ថានបានពង្រីកយុទ្ធនាការកាត់បន្ថយប្លាស្ទិកនៅតាមសាលាបឋមសិក្សានិងវិទ្យាល័យ ដើម្បីបណ្តុះគំនិតស្រឡាញ់បរិស្ថានដល់សិស្សានុសិស្សតាំងពីក្មេង។ យុទ្ធនាការនេះទទួលបានការគាំទ្រយ៉ាងខ្លាំងពីលោកគ្រូ អ្នកគ្រូ និងអាណាព្យាបាលសិស្ស។</p>',
          content_en: '<p>The Ministry of Environment has expanded its plastic reduction campaign in primary and secondary schools to cultivate environmental love in students from a young age. The campaign has received strong support from teachers and parents.</p>',
          slug: 'cambodia-no-plastic-school-campaign-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/noplastic/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ការជួសជុលប្រាសាទបុរាណក្នុងតំបន់អង្គរ៖ កិច្ចសហប្រតិបត្តិការអន្តរជាតិដើម្បីថែរក្សាបេតិកភណ្ឌពិភពលោក',
          title_en: 'Angkor Temple Restoration: International Cooperation to Preserve World Heritage Sites',
          content_km: '<p>អាជ្ញាធរជាតិអប្សរា សហការជាមួយអ្នកជំនាញការអន្តរជាតិ បានប្រកាសពីវឌ្ឍនភាពនៃការជួសជុលប្រាសាទបុរាណមួយចំនួននៅក្នុងរមណីយដ្ឋានអង្គរ។ គម្រោងនេះផ្តោតលើការធានានិរន្តរភាពសំណង់បុរាណ និងការបណ្តុះបណ្តាលធនធានមនុស្សក្នុងស្រុក។</p>',
          content_en: '<p>The APSARA National Authority, in collaboration with international experts, announced the progress of restoring several ancient temples in the Angkor Park. The project focuses on ensuring structural sustainability and training local human resources.</p>',
          slug: 'angkor-temple-restoration-cooperation-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/angkor/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កម្មវិធីអប់រំឌីជីថល៖ ក្រសួងអប់រំដាក់ឱ្យប្រើប្រាស់កម្មវិធីសិក្សាថ្មីនៅតាមសាលារៀនរដ្ឋទូទាំងប្រទេស',
          title_en: 'Digital Education Initiative: Ministry of Education Launches New E-Learning Platforms in Public Schools',
          content_km: '<p>ក្រសួងអប់រំ យុវជន និងកីឡា បានដាក់ឱ្យប្រើប្រាស់ប្រព័ន្ធសិក្សាបែបឌីជីថលថ្មីមួយ ដើម្បីជួយសម្រួលដល់សិស្សានុសិស្សក្នុងការស្វែងរកឯកសារសិក្សា ក៏ដូចជាវគ្គសិក្សាបន្ថែមដោយឥតគិតថ្លៃ សំដៅលើកកម្ពស់គុណភាពអប់រំថ្នាក់ជាតិ។</p>',
          content_en: '<p>The Ministry of Education, Youth and Sports has launched a new e-learning platform to help students access free study materials and supplementary courses, aiming to elevate the quality of national education.</p>',
          slug: 'cambodia-digital-education-platforms-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/education/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'យុទ្ធនាការដាំដើមឈើ ១លានដើមរបស់រដ្ឋាភិបាលដើម្បីបង្កើនគម្របព្រៃឈើ និងទប់ស្កាត់ការប្រែប្រួលអាកាសធាតុ',
          title_en: 'Government Launches 1 Million Trees Campaign to Enhance Forest Cover and Combat Climate Change',
          content_km: '<p>ក្រសួងបរិស្ថានបានចាប់ផ្តើមយុទ្ធនាការដាំកូនឈើ ១លានដើមទូទាំងប្រទេសកម្ពុជា ដើម្បីបង្កើនគម្របព្រៃឈើបៃតង និងលើកកម្ពស់ការយល់ដឹងជាសាធារណៈអំពីសារៈសំខាន់នៃការអភិរក្សធនធានធម្មជាតិ។</p>',
          content_en: '<p>The Ministry of Environment has launched a campaign to plant 1 million saplings across Cambodia to increase green forest cover and promote public awareness about the importance of natural resource conservation.</p>',
          slug: 'cambodia-one-million-trees-campaign-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/forest/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ពិព័រណ៍វប្បធម៌ និងម្ហូបអាហារខ្មែរប្រចាំឆ្នាំ បង្ហាញភាពសម្បូរបែបនៃទំនៀមទម្លាប់ជាតិ',
          title_en: 'Annual Khmer Culture and Food Expo Showcases Richness of National Traditions',
          content_km: '<p>ពិព័រណ៍វប្បធម៌ដ៏ធំមួយត្រូវបានរៀបចំឡើងនៅរាជភ្នំពេញដើម្បីបង្ហាញសិល្បៈប្រពៃណី សម្លៀកបំពាក់បុរាណ និងម្ហូបអាហារខ្មែរចម្រុះ ដែលទាក់ទាញយុវជន និងភ្ញៀវទេសចរចូលរួមយ៉ាងកុះករ។</p>',
          content_en: '<p>A major cultural expo was organized in Phnom Penh to showcase traditional arts, ancient clothing, and diverse Khmer cuisine, drawing a large crowd of youths and tourists.</p>',
          slug: 'khmer-culture-food-expo-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/foodexpo/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោតប្រកាសកំណែទម្រង់ប្រព័ន្ធចុះឈ្មោះបោះឆ្នោតតាមឌីជីថល',
          title_en: 'National Election Committee Announces Reforms in Digital Voter Registration System',
          content_km: '<p>គ.ជ.ប បានបង្ហាញបច្ចេកវិទ្យាថ្មីសម្រាប់ការចុះឈ្មោះបោះឆ្នោត សំដៅធានាភាពងាយស្រួល ត្រឹមត្រូវ និងតម្លាភាពខ្ពស់សម្រាប់ប្រជាពលរដ្ឋគ្រប់រូបតាមរយៈប្រព័ន្ធអនឡាញ។</p>',
          content_en: '<p>The NEC has unveiled new technology for voter registration, aiming to ensure ease, accuracy, and high transparency for all citizens through an online system.</p>',
          slug: 'nec-digital-voter-registration-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/nec/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* ==================== INTERNATIONAL NEWS (11 - 20) ==================== */
        {
          title_km: 'សមាគមអាស៊ានប្រកាសផែនការយុទ្ធសាស្ត្រថ្មី ដើម្បីជំរុញសេដ្ឋកិច្ចបៃតង និងនិរន្តរភាពតំបន់',
          title_en: 'ASEAN Declares New Strategic Plan to Boost Regional Green Economy and Sustainability',
          content_km: '<p>នៅក្នុងកិច្ចប្រជុំកំពូលអាស៊ានលើកចុងក្រោយ ថ្នាក់ដឹកនាំបណ្តាប្រទេសជាសមាជិកបានអនុម័តជាឯកច្ឆន្ទលើផែនការយុទ្ធសាស្ត្រថ្មីសម្រាប់ឆ្នាំ ២០២៥-២០៣០ ដែលផ្តោតលើការកសាងសេដ្ឋកិច្ចបៃតង និងការអភិវឌ្ឍប្រកបដោយចីរភាព។</p>',
          content_en: '<p>At the latest ASEAN Summit, leaders of member states unanimously approved a new strategic plan for 2025-2030, focusing on building a green economy and sustainable development. The plan aims to reduce carbon emissions and increase the adoption of renewable energy across Southeast Asia.</p>',
          slug: 'asean-green-economy-strategy-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/asean/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការចរចាពាណិជ្ជកម្មរវាងសហរដ្ឋអាមេរិក និងសហភាពអឺរ៉ុប ឈានដល់កិច្ចព្រមព្រៀងថ្មីលើការកាត់បន្ថយពន្ធគយ',
          title_en: 'US and EU Trade Negotiations Reach New Accord on Tariff Reductions',
          content_km: '<p>តំណាងពាណិជ្ជកម្មមកពីសហរដ្ឋអាមេរិក និងសហភាពអឺរ៉ុប បានឈានដល់កិច្ចព្រមព្រៀងជាប្រវត្តិសាស្ត្រក្នុងការកាត់បន្ថយពន្ធគយលើទំនិញឧស្សាហកម្ម និងបច្ចេកវិទ្យាសំខាន់ៗជាច្រើន។</p>',
          content_en: '<p>Trade representatives from the United States and the European Union have reached a historic agreement to reduce tariffs on industrial and key technology goods. The talks aimed to strengthen economic ties and resolve long-standing trade disputes.</p>',
          slug: 'us-eu-trade-negotiations-tariff-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/ustrade/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កិច្ចប្រជុំបម្រែបម្រួលអាកាសធាតុសកល៖ បណ្តាប្រទេសនានាប្តេជ្ញាកាត់បន្ថយការប្រើប្រាស់ថាមពលធ្យូងថ្ម',
          title_en: 'Global Climate Change Summit: Nations Commit to Phasing Out Coal Energy',
          content_km: '<p>នៅក្នុងសន្និសីទស្តីពីបម្រែបម្រួលអាកាសធាតុរបស់អង្គការសហប្រជាជាតិ (COP) ប្រទេសជាង ១០០ បានចុះហត្ថលេខាលើសេចក្តីថ្លែងការណ៍រួមមួយ ដើម្បីប្តេជ្ញាបញ្ឈប់ការប្រើប្រាស់ថាមពលធ្យូងថ្ម និងបង្កើនការវិនិយោគលើថាមពលស្អាត។</p>',
          content_en: '<p>At the United Nations Climate Change Conference (COP), more than 100 countries signed a joint declaration committing to phase out coal energy and increase investments in clean energy.</p>',
          slug: 'global-climate-change-summit-coal-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/climate/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'អង្គការសហប្រជាជាតិព្រមានអំពីផលប៉ះពាល់នៃការឡើងកម្ដៅសមុទ្រសកលចំពោះប្រព័ន្ធជីវចម្រុះ',
          title_en: 'UN Warns of Global Ocean Warming Impact on Marine Biodiversity',
          content_km: '<p>របាយការណ៍ថ្មីរបស់អង្គការសហប្រជាជាតិបានព្រមានថា សីតុណ្ហភាពសមុទ្រដែលកំពុងកើនឡើងក្នុងល្បឿនលឿនមិនធ្លាប់មាន អាចនឹងបំផ្លាញប្រព័ន្ធផ្កាថ្មជាង ៩០% និងប៉ះពាល់ធ្ងន់ធ្ងរដល់ជីវិតមច្ឆជាតិកម្រៗនៅលើពិភពលោក។</p>',
          content_en: '<p>A new UN report warns that ocean temperatures rising at unprecedented rates could destroy over 90% of coral reefs and severely impact rare marine life globally.</p>',
          slug: 'un-ocean-warming-warning-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/ocean/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'វេទិកាសេដ្ឋកិច្ចពិភពលោកប្រចាំឆ្នាំពិភាក្សាអំពីអនាគតការងារក្នុងយុគសម័យស្វ័យប្រវត្តូបនីយកម្ម',
          title_en: 'World Economic Forum Discusses Future of Work in Automation Age',
          content_km: '<p>ថ្នាក់ដឹកនាំសកល និងអ្នកសេដ្ឋកិច្ចរាប់ពាន់នាក់បានជួបជុំគ្នានៅទីក្រុងដាវ៉ូស ប្រទេសស្វីស ដើម្បីពិភាក្សាអំពីការផ្លាស់ប្តូរទីផ្សារការងារក្រោមឥទ្ធិពលនៃបញ្ញាសិប្បនិម្មិត និងមនុស្សយន្តជំនាន់ថ្មី។</p>',
          content_en: '<p>Global leaders and thousands of economists gathered in Davos, Switzerland, to discuss labor market shifts influenced by artificial intelligence and next-generation robotics.</p>',
          slug: 'world-economic-forum-future-work-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/wef/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'យានអវកាសថ្មីរបស់ណាសាបានចុះចតដោយជោគជ័យលើភពព្រះអង្គារដើម្បីស្វែងរកជីវិតបុរាណ',
          title_en: 'NASA Rover Successfully Lands on Mars to Search for Signs of Ancient Life',
          content_km: '<p>ទីភ្នាក់ងារអវកាសណាសាបានប្រកាសពីជោគជ័យដ៏អស្ចារ្យនៃការចុះចតរបស់យានរុករកជំនាន់ថ្មីនៅលើភពព្រះអង្គារ ដើម្បីប្រមូលសំណាកថ្ម និងដីមករក្សាសិក្សាបន្ថែមអំពីលទ្ធភាពជីវិតកាលពីអតីតកាល។</p>',
          content_en: '<p>NASA has announced the successful landing of its next-generation robotic rover on Mars to collect rock and soil samples to study the possibility of ancient life on the red planet.</p>',
          slug: 'nasa-rover-mars-landing-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/mars/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'សហភាពអឺរ៉ុបអនុម័តច្បាប់តឹងរ៉ឹងថ្មីដើម្បីគ្រប់គ្រងទិន្នន័យឯកជនរបស់ក្រុមហ៊ុនបច្ចេកវិទ្យាយក្ស',
          title_en: 'European Union Approves Strict New Regulations to Govern Tech Giants Data Privacy',
          content_km: '<p>សហភាពអឺរ៉ុបបានបង្កើតវិធានការច្បាប់ថ្មីមួយដើម្បីពង្រឹងការការពារទិន្នន័យឯកជនរបស់អ្នកប្រើប្រាស់ និងពិន័យជាប្រាក់រាប់ពាន់លានដុល្លារចំពោះក្រុមហ៊ុនណាដែលល្មើសបទបញ្ញត្តិទាំងនេះ។</p>',
          content_en: '<p>The EU has enacted new legal measures to strengthen user data privacy protection and impose multi-billion dollar fines on tech companies that violate these regulations.</p>',
          slug: 'eu-tech-data-privacy-regulations-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/euprivacy/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'អង្គការសុខភាពពិភពលោកប្រកាសយុទ្ធនាការសកលដើម្បីលុបបំបាត់ជំងឺគ្រុនចាញ់ក្នុងតំបន់អាហ្វ្រិក',
          title_en: 'WHO Announces Global Campaign to Eradicate Malaria in African Regions',
          content_km: '<p>WHO បានចាប់ដៃគូជាមួយមូលនិធិសប្បុរសធម៌នានា ដើម្បីចែកចាយវ៉ាក់សាំងការពារជំងឺគ្រុនចាញ់ជំនាន់ថ្មីដល់កុមាររាប់លាននាក់នៅអាហ្វ្រិកក្នុងគោលបំណងកាត់បន្ថយអត្រាមរណភាពឱ្យបានជាអតិបរមា។</p>',
          content_en: '<p>WHO has partnered with philanthropic foundations to distribute next-generation malaria vaccines to millions of children in Africa, aiming to reduce mortality rates to the minimum.</p>',
          slug: 'who-global-malaria-eradication-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/malaria/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កិច្ចចរចាសន្តិភាពមជ្ឈិមបូព៌ា៖ ការសម្របសម្រួលដោយអង្គការសហប្រជាជាតិដើម្បីបញ្ចប់ជម្លោះយូរអង្វែង',
          title_en: 'Middle East Peace Talks: UN Brokers Dialogues to Resolve Long-standing Conflicts',
          content_km: '<p>តំណាងមកពីភាគីជម្លោះសំខាន់ៗបានជួបគ្នាជាសម្ងាត់នៅក្នុងប្រទេសស្វីស ក្រោមការសម្របសម្រួលរបស់អគ្គលេខាធិការ អសប ដើម្បីស្វែងរកកិច្ចព្រមព្រៀងឈប់បាញ់ជាអចិន្ត្រៃយ៍។</p>',
          content_en: '<p>Representatives from key conflicting parties met privately in Switzerland, brokered by the UN Secretary-General, to seek a framework for a permanent ceasefire.</p>',
          slug: 'un-middle-east-peace-talks-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/peacetalks/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ការរញ្ជួយដីកម្រិតធ្ងន់ ៦.៨ រុិចទ័រវាយប្រហារប្រទេសជប៉ុន៖ អាជ្ញាធរប្រកាសអាសន្នពីរលកយក្សស៊ូណាមិ',
          title_en: '6.8 Magnitude Earthquake Strikes Japan: Authorities Issue Urgent Tsunami Warnings',
          content_km: '<p>ការរញ្ជួយដីដ៏ខ្លាំងមួយបានកើតឡើងនៅភាគខាងជើងប្រទេសជប៉ុន បង្កការខូចខាតដល់ហេដ្ឋារចនាសម្ព័ន្ធ និងការផ្អាកជើងហោះហើរ ខណៈរដ្ឋាភិបាលជម្រុញប្រជាជនឱ្យផ្លាស់ទីទៅកន្លែងមានសុវត្ថិភាពទាន់ពេលវេលា។</p>',
          content_en: '<p>A powerful earthquake hit northern Japan, causing structural damage and flight suspensions, while the government urged residents to evacuate to higher ground immediately.</p>',
          slug: 'japan-earthquake-tsunami-warning-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/earthquake/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* ==================== SPORTS NEWS (21 - 30) ==================== */
        {
          title_km: 'ក្រុមបាល់ទាត់ជម្រើសជាតិកម្ពុជា បង្កើនការហ្វឹកហាត់ត្រៀមការប្រកួតពានរង្វាន់អាស៊ាន',
          title_en: 'Cambodian National Football Team Intensifies Training for ASEAN Championship',
          content_km: '<p>ក្រុមបាល់ទាត់ជម្រើសជាតិកម្ពុជាបានចាប់ផ្តើមប្រមូលផ្តុំកីឡាករ និងបង្កើនសកម្មភាពហ្វឹកហាត់យ៉ាងខ្លាំងក្លា ដើម្បីត្រៀមខ្លួនចូលរួមប្រកួតក្នុងព្រឹត្តិការណ៍ពានរង្វាន់ជើងឯកអាស៊ាន (ASEAN Championship) នាពេលខាងមុខ។</p>',
          content_en: '<p>The Cambodian national football team has gathered players and intensified training sessions to prepare for the upcoming ASEAN Championship. The new head coach has introduced fresh tactical strategies, focusing on improving physical conditioning and teamwork.</p>',
          slug: 'cambodia-football-training-asean-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/football/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'យុទ្ធនាការរត់ម៉ារ៉ាតុងអន្តរជាតិនៅខេត្តសៀមរាប ទាក់ទាញអ្នកចូលរួមរាប់ពាន់នាក់មកពីជុំវិញពិភពលោក',
          title_en: 'Siem Reap International Marathon Campaign Attracts Thousands of Runners Worldwide',
          content_km: '<p>ព្រឹត្តិការណ៍រត់ម៉ារ៉ាតុងអន្តរជាតិពាក់កណ្តាលអាជីព (Angkor Wat International Half Marathon) ត្រូវបានរៀបចំឡើងជាថ្មីម្តងទៀតនៅក្នុងទឹកដីប្រវត្តិសាស្ត្រអង្គរ ខេត្តសៀមរាប។</p>',
          content_en: '<p>The Angkor Wat International Half Marathon has been organized once again in the historic land of Angkor, Siem Reap. The event attracted thousands of athletes and health enthusiasts from over 50 countries.</p>',
          slug: 'siem-reap-international-marathon-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/marathon/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ព្រឹត្តិការណ៍ប្រកួតកីឡាប្រដាល់គុនខ្មែរជើងឯកអន្តរជាតិ ទាក់ទាញអ្នកទស្សនាយ៉ាងកុះករ',
          title_en: 'Kun Khmer International Championship Boxing Event Draws Massive Crowds',
          content_km: '<p>សង្វៀនកីឡាជាតិបានរៀបចំការប្រកួតកីឡាប្រដាល់គុនខ្មែរជើងឯកអន្តរជាតិ ដែលមានការចូលរួមប្រកួតពីកីឡាករល្បីៗមកពីប្រទេសកម្ពុជា ថៃ បារាំង និងប្រេស៊ីល។</p>',
          content_en: '<p>The national sports arena hosted the Kun Khmer International Championship, featuring famous fighters from Cambodia, Thailand, France, and Brazil. The event received massive interest from domestic and international audiences, filling the arena to capacity.</p>',
          slug: 'kun-khmer-international-championship-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/kunkhmer/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កីឡាករជិះកង់កម្ពុជាឈ្នះមេដាយមាសក្នុងការប្រកួតកម្រិតតំបន់អាស៊ីអាគ្នេយ៍',
          title_en: 'Cambodian Cyclist Wins Gold Medal in Southeast Asian Regional Tournament',
          content_km: '<p>កីឡាករជិះកង់ជម្រើសជាតិកម្ពុជាបានបង្កើតប្រវត្តិសាស្ត្រថ្មីដោយឈ្នះមេដាយមាសក្នុងការប្រណាំងកង់ផ្លូវរាបចម្ងាយ ១២០ គីឡូម៉ែត្រ បន្ទាប់ពីយកឈ្នះកីឡាករខ្លាំងៗមកពីថៃនិងម៉ាឡេស៊ីនៅវិនាទីចុងក្រោយ។</p>',
          content_en: '<p>A Cambodian national cyclist made history by winning the gold medal in the 120km road race, defeating strong competitors from Thailand and Malaysia in the final seconds.</p>',
          slug: 'cambodian-cyclist-wins-gold-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/cycling/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការប្រកួតកីឡាវាយកូនហ្គោលសប្បុរសធម៌លើកទី១០ នៅខេត្តសៀមរាបប្រមូលថវិកាជួយមន្ទីរពេទ្យកុមារអង្គរ',
          title_en: '10th Charity Golf Tournament in Siem Reap Raises Funds for Angkor Hospital for Children',
          content_km: '<p>ព្រឹត្តិការណ៍កីឡាវាយកូនហ្គោលប្រចាំឆ្នាំបានបញ្ចប់ដោយជោគជ័យ និងប្រមូលថវិកាបានជាង ៥ម៉ឺនដុល្លារសម្រាប់ជួយទ្រទ្រង់ការចំណាយព្យាបាលកុមារក្រីក្រដោយឥតគិតថ្លៃនៅមន្ទីរពេទ្យកុមារអង្គរ។</p>',
          content_en: '<p>The annual charity golf tournament concluded successfully, raising over $50,000 to support free medical treatment for underprivileged children at the Angkor Hospital for Children.</p>',
          slug: 'charity-golf-tournament-siem-reap-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/golf/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ក្រុមបាល់ទះបុរសកម្ពុជាយកឈ្នះហ្វីលីពីន ៣-១ ក្នុងជំនួបមិត្តភាពអន្តរជាតិកម្តៅសាច់ដុំ',
          title_en: 'Cambodian Men Volleyball Team Defeats Philippines 3-1 in Friendly Match',
          content_km: '<p>ក្រុមជម្រើសជាតិបាល់ទះបុរសកម្ពុជាបានបង្ហាញទម្រង់លេងយ៉ាងល្អឥតខ្ចោះ និងយកឈ្នះក្រុមកីឡាហ្វីលីពីនក្នុងលទ្ធផល ៣ សិតទល់នឹង ១ ក្រោមសំឡេងហ៊ោរកញ្ជ្រៀវរបស់ទស្សនិកជនរាប់ពាន់នាក់។</p>',
          content_en: '<p>The Cambodian men\'s national volleyball team displayed flawless performance, defeating the Philippines 3-1 amid cheers from thousands of spectators in the stadium.</p>',
          slug: 'cambodia-volleyball-friendly-match-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/volleyball/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កម្ពុជាសម្លឹងឃើញឱកាសបង្កើតសមិទ្ធផលថ្មីក្នុងកីឡាការ៉ាតេដូ សម្រាប់យុទ្ធនាការកីឡាតំបន់',
          title_en: 'Cambodia Aims for New Achievements in Karate-Do for Regional Sports Campaigns',
          content_km: '<p>សហព័ន្ធកីឡាការ៉ាតេកម្ពុជាបានពង្រឹងការបណ្តុះបណ្តាលកីឡាករវ័យក្មេង ដើម្បីរៀបចំខ្លួនដណ្តើមមេដាយបន្ថែមក្នុងកម្មវិធីប្រកួតអន្តរជាតិនាពេលខាងមុខ តាមរយៈការនាំចូលគ្រូបង្វឹកលំដាប់ពិភពលោក។</p>',
          content_en: '<p>The Cambodia Karate Federation has strengthened young athlete training to secure more medals in upcoming international events by importing world-class coaching staff.</p>',
          slug: 'cambodia-karate-training-achievements-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/karate/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'កីឡាការិនីវាយកូនឃ្លីលើតុវ័យក្មេងកម្ពុជាដណ្តើមបានមេដាយប្រាក់ប្រចាំការប្រកួតយុវជនអាស៊ី',
          title_en: 'Young Cambodian Female Table Tennis Player Clinches Silver in Asian Youth Tournament',
          content_km: '<p>កីឡាការិនីវ័យ ១៦ឆ្នាំរបស់កម្ពុជាបានបង្ហាញបច្ចេកទេសវាយកូនឃ្លីលើតុយ៉ាងជក់ចិត្ត និងឈ្នះមេដាយប្រាក់ជាប្រវត្តិសាស្ត្រក្នុងការប្រកួតកម្រិតយុវជនជើងឯកអាស៊ី។</p>',
          content_en: '<p>A 16-year-old Cambodian female athlete demonstrated impressive table tennis skills, winning a historic silver medal in the Asian Youth Championship tournament.</p>',
          slug: 'cambodia-table-tennis-silver-medal-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/pingpong/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការប្រកួតកីឡាហែលទឹកជ្រើសរើសជើងឯកថ្នាក់ជាតិ៖ ការស្វែងរកធនធានថ្មីត្រៀមឆាកអន្តរជាតិ',
          title_en: 'National Swimming Championship Event: Hunting for New Talents for Global Arenas',
          content_km: '<p>សហព័ន្ធកីឡាហែលទឹកបានរៀបចំការប្រកួតជើងឯកថ្នាក់ជាតិ ដើម្បីវាស់ស្ទង់សមត្ថភាពកីឡាករ និងជ្រើសរើសអ្នកលេចធ្លោនានាចូលក្នុងក្រុមជម្រើសជាតិសម្រាប់ទៅហ្វឹកហាត់នៅបរទេស។</p>',
          content_en: '<p>The Swimming Federation organized the National Championship to evaluate athlete capabilities and select top performers to join the national training camps abroad.</p>',
          slug: 'cambodia-national-swimming-championship-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/swimming/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ព្រឹត្តិការណ៍រត់កម្សាន្តលក្ខណៈគ្រួសារ «រត់ដើម្បីបរិស្ថាន» ប្រមូលអ្នកចូលរួមជាង ៣០០០ នាក់',
          title_en: 'Family Fun Run Event "Run for Environment" Gathers Over 3,000 Participants',
          content_km: '<p>យុទ្ធនាការរត់ចម្ងាយ ៥គីឡូម៉ែត្រត្រូវបានរៀបចំឡើងនៅមាត់ទន្លេក្រុងភ្នំពេញ ដើម្បីបំផុសគំនិតគិតគូរពីបរិស្ថាន និងការធ្វើលំហាត់ប្រាណប្រចាំថ្ងៃរបស់ក្រុមគ្រួសារនីមួយៗ។</p>',
          content_en: '<p>A 5km fun run campaign was organized at the Phnom Penh riverside to promote environmental awareness and daily physical exercise among families.</p>',
          slug: 'cambodia-run-for-environment-family-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/funrun/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* ==================== TECHNOLOGY NEWS (31 - 40) ==================== */
        {
          title_km: 'ព្រឹត្តិការណ៍ Hackathon ថ្នាក់ជាតិ៖ យុវជនកម្ពុជាបង្ហាញសក្តានុពលខ្ពស់លើការបង្កើតកម្មវិធីឌីជីថលថ្មីៗ',
          title_en: 'National Hackathon Event: Cambodian Youth Showcase High Potential in Digital Innovations',
          content_km: '<p>ក្រសួងប្រៃសណីយ៍ និងទូរគមនាគមន៍ បានរៀបចំការប្រកួតបង្កើតកម្មវិធីឌីជីថលថ្នាក់ជាតិ (National Hackathon) ដែលទាក់ទាញក្រុមយុវជន និងនិស្សិតបច្ចេកវិទ្យាជាច្រើនចូលរួម។</p>',
          content_en: '<p>The Ministry of Post and Telecommunications has organized the National Hackathon, drawing numerous youth teams and technology students. The event focused on finding digital solutions to address challenges in agriculture, education, and finance.</p>',
          slug: 'cambodia-national-hackathon-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/hackathon/800/450',
          is_featured: 1,
          card_template: 'highlight'
        },
        {
          title_km: 'ការប្រើប្រាស់បច្ចេកវិទ្យាបញ្ញាសិប្បនិម្មិត (AI) ក្នុងការគ្រប់គ្រងការដាំដុះដំណាំស្រូវនៅកម្ពុជា',
          title_en: 'Adoption of Artificial Intelligence (AI) Technology in Rice Cultivation Management in Cambodia',
          content_km: '<p>សហគមន៍កសិករគំរូមួយចំនួននៅកម្ពុជា បានសហការជាមួយក្រុមហ៊ុនបច្ចេកវិទ្យាក្នុងស្រុក សាកល្បងប្រើប្រាស់បច្ចេកវិទ្យាបញ្ញាសិប្បនិម្មិត (AI) ដើម្បីគ្រប់គ្រង និងតាមដានការលូតលាស់នៃដំណាំស្រូវ។</p>',
          content_en: '<p>Several model farming communities in Cambodia, in collaboration with local tech startups, have piloted the use of artificial intelligence (AI) to manage and monitor rice crop growth. This technology allows farmers to accurately analyze soil data, water levels, and leaf disease indicators.</p>',
          slug: 'cambodia-ai-rice-cultivation-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/riceai/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កម្ពុជាឈានទៅមុខក្នុងការសាកល្បងបច្ចេកវិទ្យាអ៊ីនធឺណិតល្បឿនលឿន 5.5G នៅតាមទីក្រុងធំៗ',
          title_en: 'Cambodia Advances in 5.5G High-Speed Internet Trials Across Major Cities',
          content_km: '<p>ក្រុមហ៊ុនទូរគមនាគមន៍ឈានមុខគេមួយនៅកម្ពុជាបានសហការជាមួយក្រុមហ៊ុនបច្ចេកវិទ្យាសកល សាកល្បងបច្ចេកវិទ្យា 5.5G ដែលផ្តល់ល្បឿនលឿនជាង 5G បច្ចុប្បន្នដល់ទៅ ១០ដង សម្រួលដល់វិស័យឧស្សាហកម្មឆ្លាតវៃ និងឡានស្វ័យប្រវត្តិនាពេលអនាគត។</p>',
          content_en: '<p>A leading telecom company in Cambodia has partnered with a global tech giant to trial 5.5G technology, offering speeds up to 10 times faster than current 5G, preparing for smart manufacturing and autonomous vehicles.</p>',
          slug: 'cambodia-5g-telecom-trial-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/internet5g/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'សាលាឌីជីថលជាតិកម្ពុជាប្រកាសកម្មវិធីសិក្សាកូដកុំព្យូទ័រឥតគិតថ្លៃសម្រាប់សិស្សវិទ្យាល័យ',
          title_en: 'Cambodian National Digital School Announces Free Coding Bootcamp for High School Students',
          content_km: '<p>ដើម្បីជម្រុញការយល់ដឹងពីវិស័យវិទ្យាសាស្ត្រកុំព្យូទ័រ សាលាឌីជីថលជាតិបានប្រកាសកម្មវិធីបណ្តុះបណ្តាលសរសេរកូដ (Coding Bootcamp) រយៈពេល ៦ខែ ដោយមិនគិតថ្លៃដល់សិស្សវិទ្យាល័យជាង ៥០០នាក់ទូទាំងប្រទេស។</p>',
          content_en: '<p>To boost computer science literacy, the National Digital School announced a free 6-month coding bootcamp for over 500 high school students nationwide.</p>',
          slug: 'cambodian-national-digital-school-bootcamp-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/coding/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ធនាគារជាតិនៃកម្ពុជាជំរុញការទូទាត់ប្រាក់ឆ្លងដែនតាមប្រព័ន្ធបាគងឆ្លាតវៃ',
          title_en: 'National Bank of Cambodia Promotes Cross-Border Payments via Smart Bakong System',
          content_km: '<p>ធនាគារជាតិនៃកម្ពុជាបានពង្រីកភាពជាដៃគូជាមួយបណ្តាប្រទេសក្នុងតំបន់អាស៊ី ដើម្បីអនុញ្ញាតឱ្យប្រជាពលរដ្ឋអាចស្កេនទូទាត់ QR កូដ ឆ្លងប្រទេសយ៉ាងងាយស្រួល និងសុវត្ថិភាពខ្ពស់តាមប្រព័ន្ធបាគង។</p>',
          content_en: '<p>The National Bank of Cambodia has expanded partnerships with Asian countries to allow citizens to easily scan and make cross-border QR code payments via the Bakong system.</p>',
          slug: 'national-bank-cambodia-bakong-cross-border-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/bakong/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ការគំរាមកំហែងសន្តិសុខបច្ចេកវិទ្យាព័ត៌មានវិទ្យា៖ យុទ្ធសាស្ត្រជាតិការពារទិន្នន័យពី Hacker',
          title_en: 'Cybersecurity Threat Mitigation: National Strategies to Protect Key Data from Hackers',
          content_km: '<p>គណៈកម្មាធិការសន្តិសុខបច្ចេកវិទ្យាជាតិបានដាក់ចេញនូវផែនការយុទ្ធសាស្ត្រថ្មី ដើម្បីពង្រឹងប្រព័ន្ធការពារទិន្នន័យរបស់ក្រសួង និងស្ថាប័នរដ្ឋពីការវាយប្រហារតាមអ៊ីនធឺណិតដែលកំពុងកើនឡើង។</p>',
          content_en: '<p>The National Cybersecurity Committee has launched a new strategic plan to strengthen government databases and protect state agencies from rising cyberattacks.</p>',
          slug: 'cambodia-cybersecurity-strategies-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/cyber/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'គម្រោង Smart City នៅរាជធានីភ្នំពេញ៖ ការតំឡើងបង្គោលភ្លើងឆ្លាតវៃដើរដោយថាមពលព្រះអាទិត្យ',
          title_en: 'Smart City Initiative in Phnom Penh: Deploying Intelligent Solar-powered Streetlights',
          content_km: '<p>រដ្ឋបាលក្រុងភ្នំពេញបានចាប់ផ្តើមតំឡើងបង្គោលភ្លើងឆ្លាតវៃដែលបំពាក់ដោយកាមេរ៉ាសុវត្ថិភាព និងប្រព័ន្ធផ្តល់សញ្ញា WiFi ឥតគិតថ្លៃ ដំណើរការដោយបន្ទះសូឡាកាត់បន្ថយការចំណាយថាមពលជាតិ។</p>',
          content_en: '<p>The Phnom Penh administration started installing smart streetlights equipped with CCTV cameras and free public WiFi signals, powered by solar panels to cut state energy bills.</p>',
          slug: 'phnom-penh-smart-city-streetlights-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/smartlights/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'ក្រុមហ៊ុនកម្ពុជាបង្កើតកម្មវិធី App ស្កេនពិនិត្យជំងឺដំណាំដំឡូងមីដំបូងបង្អស់',
          title_en: 'Cambodian Firm Develops First AI Mobile App to Diagnose Cassava Crop Diseases',
          content_km: '<p>ក្រុមហ៊ុនបច្ចេកវិទ្យាក្នុងស្រុកបានបង្កើតកម្មវិធីទូរស័ព្ទដៃដែលប្រើបញ្ញាសិប្បនិម្មិត ដើម្បីឱ្យកសិករថតរូបស្លឹកដំឡូងមី និងវិភាគរកជំងឺដំណាំបានភ្លាមៗ និងណែនាំវិធីព្យាបាលសមស្រប។</p>',
          content_en: '<p>A local tech firm developed an AI-based mobile application enabling farmers to photograph cassava leaves to diagnose crop diseases instantly and get treatment solutions.</p>',
          slug: 'cambodian-firm-cassava-ai-app-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/cassavaapp/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការអភិវឌ្ទប្រព័ន្ធ e-Government កម្ពុជា៖ ពង្រីកការផ្តល់សេវាសាធារណៈតាមអនឡាញកាន់តែលឿន',
          title_en: 'Cambodia E-Government Development: Expanding Online Public Services for Citizens',
          content_km: '<p>ក្រសួងប្រៃសណីយ៍បានប្រកាសពង្រីកសេវាកម្មរដ្ឋបាលតាមអនឡាញ រួមមាន ការចុះបញ្ជីអាជីវកម្ម ការបង់ពន្ធ និងសេវាលិខិតស្នាមផ្សេងៗ ដើម្បីកាត់បន្ថយពេលវេលា និងការចំណាយរបស់ពលរដ្ឋ។</p>',
          content_en: '<p>The Ministry of Telecom announced expansion of online administrative services, including business registration, tax payments, and permit requests, to save citizens time and cost.</p>',
          slug: 'cambodia-egovernment-online-services-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/egov/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'វេទិកាអ្នកវិទ្យាសាស្ត្រយុវជនកម្ពុជាលើកទី១៖ ការបង្ហាញស្នាដៃស្រាវជ្រាវរូបវិទ្យា និងគីមីវិទ្យា',
          title_en: '1st Cambodian Youth Scientist Forum: Showcasing Physics and Chemistry Researches',
          content_km: '<p>និស្សិត និងអ្នកវិទ្យាសាស្ត្រវ័យក្មេងជាច្រើននាក់បានមកជួបជុំគ្នាក្នុងវេទិកាថ្នាក់ជាតិដើម្បីបង្ហាញពីគម្រោងស្រាវជ្រាវ និងការរកឃើញថ្មីៗដែលផ្ដល់អត្ថប្រយោជន៍ដល់វិស័យអប់រំ និងបរិស្ថាន។</p>',
          content_en: '<p>Students and young researchers gathered at the national forum to present research projects and new findings benefiting the education and environmental sectors.</p>',
          slug: 'cambodia-youth-scientist-forum-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/scientist/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* ==================== ECONOMY NEWS (41 - 50) ==================== */
        {
          title_km: 'វិស័យទេសចរណ៍កម្ពុជាទទួលបានកំណើនយ៉ាងខ្លាំងក្លា ដោយសារការបើកជើងហោះហើរត្រង់ថ្មីៗ',
          title_en: 'Cambodian Tourism Witnesses Massive Growth Driven by New Direct Flights',
          content_km: '<p>ក្រសួងទេសចរណ៍បានរាយការណ៍ពីកំណើនគួរឱ្យកត់សម្គាល់នៃភ្ញៀវទេសចរអន្តរជាតិដែលមកទស្សនាកម្ពុជាក្នុងឆមាសទីមួយនេះ។ កំណើននេះកើតឡើងបន្ទាប់ពីមានការបើកដំណើរការជើងហោះហើរត្រង់ថ្មីៗជាច្រើនតភ្ជាប់ពីបណ្តាប្រទេសអាស៊ី និងអឺរ៉ុប មកកាន់ខេត្តសៀមរាប និងរាជធានីភ្នំពេញ។</p>',
          content_en: '<p>The Ministry of Tourism reported a significant increase in international tourists visiting Cambodia during this first semester. The growth follows the launch of several new direct flights connecting Asian and European countries to Siem Reap and Phnom Penh.</p>',
          slug: 'cambodia-tourism-growth-flights-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/tourism/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការនាំចេញកសិផលសំខាន់ៗរបស់កម្ពុជា ទៅកាន់ទីផ្សារអន្តរជាតិមានការកើនឡើងគួរឱ្យកត់សម្គាល់',
          title_en: 'Cambodian Key Agricultural Exports to International Markets Register Significant Rise',
          content_km: '<p>ក្រសួងកសិកម្ម រុក្ខាប្រមាញ់ និងនេសាទ បានបង្ហាញទិន្នន័យថ្មីនៃការនាំចេញកសិផលសំខាន់ៗ រួមមាន ស្រូវ អង្ករ គ្រាប់ស្វាយចន្ទី និងផ្លែស្វាយ ទៅកាន់ទីផ្សារអន្តរជាតិ ដែលបង្ហាញពីកំណើនគួរឱ្យកត់សម្គាល់ក្នុងរយៈពេលប៉ុន្មានខែចុងក្រោយនេះ។</p>',
          content_en: '<p>The Ministry of Agriculture, Forestry and Fisheries has released new data showing that exports of key agricultural products, including paddy rice, milled rice, cashew nuts, and mangoes, to international markets have registered significant growth in recent months.</p>',
          slug: 'cambodian-agricultural-exports-rise-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/agexport/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'របាយការណ៍សេដ្ឋកិច្ចជាតិ៖ អត្រាអតិផរណាកម្ពុជារក្សាស្ថិរភាពល្អក្នុងកម្រិតទាប ២.២%',
          title_en: 'National Economic Report: Cambodia Inflation Rate Remains Stable at Low 2.2%',
          content_km: '<p>យោងតាមរបាយការណ៍រួមរបស់ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ អត្រាអតិផរណារបស់កម្ពុជាត្រូវបានគ្រប់គ្រងយ៉ាងល្អប្រសើរ និងរក្សាស្ថិរភាពក្នុងកម្រិតទាបគួរឱ្យកត់សម្គាល់ ដែលឆ្លុះបញ្ចាំងពីតម្លៃទំនិញទីផ្សារមានលំនឹងល្អ។</p>',
          content_en: '<p>According to the joint report by the Ministry of Economy and Finance, Cambodia\'s inflation rate has been well managed and remains remarkably stable at a low rate, reflecting steady commodity prices.</p>',
          slug: 'cambodia-inflation-rate-stable-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/inflation/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការវិនិយោគផ្ទាល់ពីបរទេស (FDI) នៅក្នុងវិស័យកម្មន្តសាលមិនមែនកាត់ដេរកើនឡើងខ្លាំង',
          title_en: 'Foreign Direct Investment (FDI) in Non-Garment Manufacturing Rises Sharply',
          content_km: '<p>ក្រុមប្រឹក្សាអភិវឌ្ឍន៍កម្ពុជា (CDC) បានអនុម័តគម្រោងថ្មីៗជាច្រើនក្នុងវិស័យផលិតបង្គុំអេឡិចត្រូនិក និងគ្រឿងបន្លាស់រថយន្ត ដែលសបញ្ជាក់ពីការធ្វើពិពិធកម្មវិស័យឧស្សាហកម្មជាតិកាន់តែរឹងមាំ។</p>',
          content_en: '<p>The Council for the Development of Cambodia (CDC) has approved several new projects in electronics assembly and auto parts manufacturing, indicating a strong diversification of the national industrial sector.</p>',
          slug: 'cambodia-fdi-nongarment-manufacturing-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/manufacturing/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'កិច្ចព្រមព្រៀងពាណិជ្ជកម្មសេរីទ្វេភាគីកម្ពុជា-អារ៉ាប់រួម ចូលជាធរមានជាផ្លូវការជំរុញការនាំចេញ',
          title_en: 'Cambodia-UAE Bilateral Free Trade Agreement Officially Enters into Force to Boost Exports',
          content_km: '<p>កិច្ចព្រមព្រៀងពាណិជ្ជកម្មសេរីដ៏ធំនេះនឹងបើកផ្លូវឱ្យកម្ពុជាអាចនាំចេញទំនិញកសិកម្ម វាយនភណ្ឌ និងផលិតផលធ្វើដំណើរទៅកាន់តំបន់មជ្ឈិមបូព៌ាដោយមិនមានការបង់ពន្ធគយឡើយ。</p>',
          content_en: '<p>This major free trade agreement opens pathways for Cambodia to export agricultural goods, textiles, and travel products to the Middle East with zero customs tariffs.</p>',
          slug: 'cambodia-uae-fta-enters-force-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/uaefta/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'កម្មវិធីគាំទ្រសហគ្រាសធុនតូច និងមធ្យម (SME)៖ រដ្ឋាភិបាលបញ្ចេញកម្ចីការប្រាក់ទាប ១០០ លានដុល្លារ',
          title_en: 'SME Support Program: Government Releases $100 Million Low-Interest Loan Scheme',
          content_km: '<p>ធនាគារអភិវឌ្ឍន៍ជនបទ និងកសិកម្ម បានពង្រាយកញ្ចប់ថវិកាកម្ចីពិសេសដើម្បីជួយម្ចាស់អាជីវកម្មខ្នាតតូចពង្រីកផលិតកម្ម និងស្តារសង្វាក់ផលិតកម្មឡើងវិញ។</p>',
          content_en: '<p>The Agricultural and Rural Development Bank has deployed a special loan package to help small business owners expand production and recover their supply chains.</p>',
          slug: 'cambodia-sme-low-interest-loans-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/smeloan/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការវិនិយោគលើថាមពលពន្លឺព្រះអាទិត្យកើនឡើង កម្ពុជាងាកទៅរកថាមពលកកើតឡើងវិញ',
          title_en: 'Solar Energy Investments Rise as Cambodia Shifts Toward Renewable Power Sources',
          content_km: '<p>របាយការណ៍ក្រសួងរ៉ែ និងថាមពលបានបង្ហាញថានៅឆ្នាំនេះ ការសាងសង់កសិដ្ឋានសូឡាថ្មីៗបានរួមចំណែកដល់ការផ្គត់ផ្គង់ចរន្តអគ្គិសនីជាតិជាង ២០% លើកកម្ពស់សន្តិសុខថាមពលបៃតង។</p>',
          content_en: '<p>The Ministry of Mines and Energy report shows that this year, new solar farm constructions contributed over 20% to the national electricity supply, boosting green energy security.</p>',
          slug: 'cambodia-solar-energy-investments-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/solarfarm/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'ការនាំចេញកៅស៊ូធម្មជាតិកម្ពុជារកចំណូលបានជាង ២០០ លានដុល្លារក្នុងរយៈពេល ៦ខែ',
          title_en: 'Cambodian Natural Rubber Exports Earn Over $200 Million in 6 Months',
          content_km: '<p>អគ្គនាយកដ្ឋានកៅស៊ូបានបញ្ជាក់ថា កំណើនតម្រូវការសំបកកង់ឡាននៅលើទីផ្សារអន្តរជាតិបានជួយជំរុញឱ្យតម្លៃនិងបរិមាណនាំចេញជ័រកៅស៊ូរបស់កម្ពុជាកើនឡើងគួរឱ្យកត់សម្គាល់។</p>',
          content_en: '<p>The General Directorate of Rubber confirmed that rising demand for tires in global markets has driven up the price and volume of Cambodia\'s rubber exports significantly.</p>',
          slug: 'cambodian-rubber-exports-earnings-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/rubber/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'វិស័យធនាគារកម្ពុជារក្សាភាពរឹងមាំជាមួយនឹងការកើនឡើងទ្រព្យសកម្ម និងប្រាក់បញ្ញើ',
          title_en: 'Cambodian Banking Sector Remains Resilient with Growth in Assets and Deposits',
          content_km: '<p>របាយការណ៍ត្រួតពិនិត្យប្រចាំឆ្នាំរបស់ធនាគារជាតិបង្ហាញថា ទំនុកចិត្តសាធារណៈលើប្រព័ន្ធធនាគារ និងមីក្រូហិរញ្ញវត្ថុផ្លូវការនៅតែមានកម្រិតខ្ពស់ រួមចំណែកទប់លំនឹងហិរញ្ញវត្ថុជាតិ។</p>',
          content_en: '<p>The National Bank\'s annual supervision report indicates that public trust in official banking and microfinance systems remains high, stabilizing national financial security.</p>',
          slug: 'cambodian-banking-sector-resilience-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/banking/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'សមាគមស្វាយចន្ទីកម្ពុជាព្យាករណ៍ពីកំណើនទិន្នផលគ្រាប់ស្វាយចន្ទីកែច្នៃសម្រាប់នាំចេញ',
          title_en: 'Cambodian Cashew Association Forecasts Growth in Processed Cashew Nut Exports',
          content_km: '<p>ការបង្កើតរោងចក្រកែច្នៃក្នុងស្រុកថ្មីៗជួយឱ្យកម្ពុជាអាចកែច្នៃគ្រាប់ស្វាយចន្ទីឆៅទៅជាផលិតផលសម្រេច សម្បូរបែប នាំចេញទៅទីផ្សារជប៉ុន និងកូរ៉េខាងត្បូងដោយទទួលបានតម្លៃបន្ថែមខ្ពស់។</p>',
          content_en: '<p>The establishment of new domestic processing plants allows Cambodia to process raw cashews into finished goods, exporting to Japan and South Korea for higher value.</p>',
          slug: 'cambodian-processed-cashew-exports-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/cashew/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* ==================== POPULAR ARTICLES CONTINUED (51 - 75) ==================== */
        /* Additional 25 articles to reach 50 unique popular entries */
        /* Category 1: National (Extra 5) */
        {
          title_km: 'យុទ្ធនាការ «សៀវភៅមួយ ក្តីសង្ឃឹមមួយ»៖ ការប្រមូលសៀវភៅជួយដល់បណ្ណាល័យជនបទ',
          title_en: '"One Book, One Hope" Campaign: Book Drive to Support Rural Libraries',
          content_km: '<p>អង្គការសង្គមស៊ីវិល សហការជាមួយសហគ្រិនវ័យក្មេង បានចាប់ផ្តើមយុទ្ធនាការប្រមូលសៀវភៅសិក្សា និងសៀវភៅអានទូទៅ ដើម្បីយកទៅបង្កើតបណ្ណាល័យសហគមន៍នៅតាមសាលារៀនដាច់ស្រយាលក្នុងខេត្តព្រះវិហារ និងស្ទឹងត្រែង។</p>',
          content_en: '<p>Civil society organizations, in collaboration with young entrepreneurs, launched a book drive campaign to collect textbooks and reading materials to establish community libraries in remote schools.</p>',
          slug: 'one-book-one-hope-rural-libraries-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/library/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការរៀបចំមហោស្រពភាពយន្តអន្តរជាតិកម្ពុជាលើកទី១៣៖ ឱកាសបង្ហាញស្នាដៃផលិតករក្នុងស្រុក',
          title_en: '13th Cambodia International Film Festival: Showcasing Works of Local Filmmakers',
          content_km: '<p>មហោស្រពភាពយន្តដ៏ធំប្រចាំឆ្នាំបានវិលត្រឡប់មកវិញ ជាមួយការចាក់បញ្ចាំងខ្សែភាពយន្តជាង ៨០ មកពីបណ្តាប្រទេសផ្សេងៗ និងការផ្តល់រង្វាន់លើកទឹកចិត្តដល់ផលិតករខ្មែរដែលមានគំនិតច្នៃប្រឌិតខ្ពស់។</p>',
          content_en: '<p>The grand annual film festival returned, screening over 80 films from various countries and presenting awards to creative Cambodian filmmakers.</p>',
          slug: 'cambodia-international-film-festival-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/filmfest/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'កិច្ចខិតខំប្រឹងប្រែងដើម្បីចុះបញ្ជី «ណាំងស្បែកធំ» ចូលជាសម្បត្តិបេតិកភណ្ឌវប្បធម៌អរូបីបន្ថែម',
          title_en: 'Efforts to Register Traditional Crafts as Tangible Cultural Heritages',
          content_km: '<p>ក្រសួងវប្បធម៌ និងវិចិត្រសិល្បៈកំពុងរៀបចំឯកសារជាប្រវត្តិសាស្ត្រ ដើម្បីស្នើសុំចុះបញ្ជីទម្រង់សិល្បៈបុរាណមួយចំនួនបន្ថែមទៀតទៅកាន់អង្គការយូណេស្កូ សំដៅការពារ និងអភិរក្សឱ្យបានគង់វង្ស។</p>',
          content_en: '<p>The Ministry of Culture and Fine Arts is preparing historical documents to request the registration of additional ancient art forms under UNESCO protection.</p>',
          slug: 'cambodia-unesco-cultural-heritage-efforts-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/heritage/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការលើកកម្ពស់សន្តិសុខសុវត្ថិភាពម្ហូបអាហារ៖ មន្ត្រីជំនាញចុះត្រួតពិនិត្យផ្សារធំៗក្នុងក្រុង',
          title_en: 'Promoting Food Safety Standards: Specialized Officers Inspect Major Wet Markets',
          content_km: '<p>អគ្គនាយកដ្ឋានការពារអ្នកប្រើប្រាស់ កិច្ចការប្រកួតប្រជែង និងបង្ក្រាបការក្លែងបន្លំ (ក.ប.ប.) បានចាត់វិធានការចុះពិនិត្យសារធាតុគីមីហាមឃាត់ក្នុងបន្លែ និងសាច់ ដើម្បីការពារសុខភាពពលរដ្ឋ។</p>',
          content_en: '<p>The Consumer Protection, Competition and Fraud Repression Directorate-General conducted inspections for banned chemical residues in vegetables and meats to protect public health.</p>',
          slug: 'cambodia-food-safety-market-inspections-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/foodsafety/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'រដ្ឋមន្ត្រីក្រសួងយុត្តិធម៌ជំរុញការដោះស្រាយវិវាទក្រៅប្រព័ន្ធតុលាការនៅតាមមូលដ្ឋាន',
          title_en: 'Minister of Justice Promotes Out-of-Court Dispute Resolution in Communities',
          content_km: '<p>ក្រសួងយុត្តិធម៌បានពង្រីកការបង្កើតគណៈកម្មការសម្រុះសម្រួលវិវាទមូលដ្ឋាន ដើម្បីជួយដោះស្រាយបញ្ហាទំនាស់ដីធ្លី និងវិវាទរដ្ឋប្បវេណីខ្នាតតូចដោយសន្តិវិធី និងឆាប់រហ័ស។</p>',
          content_en: '<p>The Ministry of Justice expanded local dispute resolution committees to help resolve land and small civil disputes peacefully and quickly without court trials.</p>',
          slug: 'dispute-resolution-out-of-court-cambodia-2025',
          category_id: 1,
          image_url: 'https://picsum.photos/seed/justice/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* Category 2: International (Extra 5) */
        {
          title_km: 'អង្គការពាណិជ្ជកម្មពិភពលោក (WTO) រៀបចំកំណែទម្រង់ពន្ធគយ ដើម្បីកាត់បន្ថយជម្លោះសកល',
          title_en: 'World Trade Organization (WTO) Plans Tariff Reforms to Reduce Global Conflicts',
          content_km: '<p>WTO បានដាក់ចេញនូវសេចក្តីព្រាងកំណែទម្រង់ថ្មី សំដៅបង្កើតបរិយាកាសប្រកួតប្រជែងស្មើភាព និងកាត់បន្ថយការប្រើប្រាស់របាំងពន្ធគយជាឧបករណ៍នយោបាយរវាងប្រទេសមហាអំណាច។</p>',
          content_en: '<p>The WTO has proposed new reform drafts aimed at creating a level playing field and reducing the use of tariff barriers as political tools between major powers.</p>',
          slug: 'wto-tariff-reforms-global-trade-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/wto/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការរុករកភពថ្មី៖ យានអវកាសអន្តរជាតិបានរកឃើញសញ្ញាទឹកនៅលើផ្កាយរណបភពព្រហស្បតិ៍',
          title_en: 'Space Exploration: International Spacecraft Discovers Signs of Water on Jupiter Moon',
          content_km: '<p>ក្រុមអ្នកវិទ្យាសាស្ត្រអវកាសបានបង្ហាញការភ្ញាក់ផ្អើលយ៉ាងខ្លាំង បន្ទាប់ពីទិន្នន័យពីយានរុករកបង្ហាញពីអត្ថិភាពនៃមហាសមុទ្រទឹកកកនៅក្រោមផ្ទៃនៃផ្កាយរណបអឺរ៉ូប៉ា។</p>',
          content_en: '<p>Space scientists expressed excitement after spacecraft data indicated the existence of a frozen ocean beneath the surface of Jupiter\'s moon Europa.</p>',
          slug: 'spacecraft-europa-water-discovery-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/jupiter/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'កិច្ចប្រជុំកំពូលសុខភាពសកល៖ ការត្រៀមខ្លួនសម្រាប់ទប់ស្កាត់ជំងឺរាតត្បាតដែលអាចកើតមាននាពេលអនាគត',
          title_en: 'Global Health Summit: Preparing for Potential Future Pandemic Outbreaks',
          content_km: '<p>ថ្នាក់ដឹកនាំផ្នែកសុខាភិបាលទូទាំងពិភពលោកបានព្រមព្រៀងគ្នាបង្កើតបណ្តាញចែករំលែកវ៉ាក់សាំងលឿនរហ័ស និងការវិនិយោគលើប្រព័ន្ធប្រកាសអាសន្នជំងឺឆ្លងទាន់ហេតុការណ៍។</p>',
          content_en: '<p>Global health leaders agreed to establish a rapid vaccine-sharing network and invest in real-time infectious disease warning systems.</p>',
          slug: 'global-health-summit-pandemic-preparedness-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/healthsummit/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'សន្និសីទអន្តរជាតិស្ដីពីបច្ចេកវិទ្យាកសិកម្មនិរន្តរភាព៖ ការដោះស្រាយវិបត្តិស្បៀងអាហារសកល',
          title_en: 'International Conference on Sustainable Agrotech: Addressing Global Food Crisis',
          content_km: '<p>អ្នកវិទ្យាសាស្ត្រកសិកម្មបានបង្ហាញពីបច្ចេកវិទ្យាគ្រាប់ពូជធន់នឹងការរាំងស្ងួត និងវិធីសាស្ត្រដាំដុះវៃឆ្លាត ដើម្បីធានាការផ្គត់ផ្គង់ស្បៀងអាហារចំពេលអាកាសធាតុប្រែប្រួលខ្លាំង។</p>',
          content_en: '<p>Agricultural scientists showcased drought-resistant seed technologies and smart farming methods to ensure food supply stability amid extreme climate changes.</p>',
          slug: 'sustainable-agrotech-global-food-crisis-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/agrotech/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'សហរដ្ឋអាមេរិក និងឥណ្ឌាពង្រឹងកិច្ចសហប្រតិបត្តិការយុទ្ធសាស្ត្រលើបច្ចេកវិទ្យាការពារជាតិ និងថាមពលស្អាត',
          title_en: 'US and India Strengthen Strategic Partnership in Defense Tech and Clean Energy',
          content_km: '<p>ថ្នាក់ដឹកនាំនៃប្រទេសទាំងពីរបានចុះហត្ថលេខាលើភាពជាដៃគូសន្តិសុខបច្ចេកវិទ្យា សំដៅជំរុញការអភិវឌ្ឍរថយន្តអគ្គិសនី និងប្រព័ន្ធការពារព្រំដែនទំនើបៗ។</p>',
          content_en: '<p>Leaders of both nations signed a tech security partnership aimed at boosting electric vehicle development and advanced border defense systems.</p>',
          slug: 'us-india-defense-clean-energy-deal-2025',
          category_id: 2,
          image_url: 'https://picsum.photos/seed/usindia/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* Category 3: Sports (Extra 5) */
        {
          title_km: 'ក្រុមបាល់បោះជម្រើសជាតិកម្ពុជា បើកការបោះជំរុំហ្វឹកហាត់រួមគ្នានៅសហរដ្ឋអាមេរិក',
          title_en: 'Cambodian National Basketball Team Starts Joint Training Camp in the US',
          content_km: '<p>សហព័ន្ធកីឡាបាល់បោះបានបញ្ជូនក្រុមកីឡាករលេចធ្លោទៅហ្វឹកហាត់នៅសាលាបណ្តុះបណ្តាលល្បីមួយនៅអាមេរិក ដើម្បីអភិវឌ្ឍកម្រិតលេង និងបច្ចេកទេសត្រៀមប្រកួតអន្តរជាតិ។</p>',
          content_en: '<p>The Basketball Federation sent top athletes to train at a renowned US academy to upgrade their skills and game tactics for upcoming international events.</p>',
          slug: 'cambodia-basketball-us-training-camp-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/basketball/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ការរៀបចំការប្រកួតកីឡាវាយកូនបាល់ជ្រើសរើសជើងឯកភ្នំពេញ៖ ការជួបគ្នានៃអ្នកលេងលំដាប់កំពូល',
          title_en: 'Phnom Penh Tennis Championship Event: Clash of Top-Tier Players',
          content_km: '<p>ក្លឹបកីឡាវាយកូនបាល់ឈានមុខបានសហការរៀបចំការប្រកួតពានរង្វាន់ប្រចាំរាជធានី ដែលទាក់ទាញកីឡាករអាជីព និងពាក់កណ្តាលអាជីពរាប់រយនាក់ចូលរួមប្រកួតប្រជែងយ៉ាងស្វិតស្វាញ។</p>',
          content_en: '<p>Leading tennis clubs co-organized the capital tournament, attracting hundreds of professional and semi-professional tennis players to compete.</p>',
          slug: 'phnom-penh-tennis-championship-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/tennis/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'យុទ្ធនាការកីឡាសាលារៀន៖ ការបង្កើតលីគកីឡាកម្រិតវិទ្យាល័យដើម្បីស្វែងរកពន្លកថ្មី',
          title_en: 'School Sports Campaign: Establishing High School Sports League to Spot Young Talents',
          content_km: '<p>ក្រសួងអប់រំសហការជាមួយសហព័ន្ធកីឡាបានបង្កើតលីគកីឡាបាល់ទាត់ និងបាល់បោះកម្រិតវិទ្យាល័យ ដើម្បីជម្រុញស្មារតីស្រឡាញ់កីឡា និងស្វែងរកកីឡាករមានសក្តានុពល។</p>',
          content_en: '<p>The Ministry of Education, in cooperation with sports federations, launched high school football and basketball leagues to spot potential future athletes.</p>',
          slug: 'cambodia-highschool-sports-league-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/schoolsports/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'កីឡាកររត់ចម្ងាយឆ្ងាយកម្ពុជាត្រៀមខ្លួនចូលរួមប្រកួតរត់ម៉ារ៉ាតុងកម្រិតពិភពលោកនៅបារាំង',
          title_en: 'Cambodian Long-Distance Runner Prepares for World Marathon Event in France',
          content_km: '<p>ម្ចាស់មេដាយមាសក្នុងស្រុកម្នាក់បានបង្កើនការហ្វឹកហាត់យ៉ាងហ្មត់ចត់ ដើម្បីចូលរួមការប្រកួតរត់ម៉ារ៉ាតុងលំដាប់ថ្នាក់អន្តរជាតិដែលនឹងប្រព្រឹត្តទៅនៅទីក្រុងប៉ារីស។</p>',
          content_en: '<p>A local gold medalist has intensified training to participate in the prestigious international marathon event scheduled to take place in Paris.</p>',
          slug: 'cambodian-runner-paris-marathon-prep-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/parisrun/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ការប្រកួតកីឡាទូកក្តោងជាតិ៖ ការផ្សព្វផ្សាយវិស័យកីឡាជលផល និងទេសចរណ៍តំបន់ឆ្នេរ',
          title_en: 'National Sailing Championship: Promoting Water Sports and Coastal Eco-tourism',
          content_km: '<p>ខេត្តកែបបានរៀបចំការប្រកួតកីឡាទូកក្តោងថ្នាក់ជាតិ ដែលទាក់ទាញកីឡាករជាច្រើនក្រុម និងបង្កើនភាពទាក់ទាញដល់ភ្ញៀវទេសចរដែលមកកម្សាន្តនៅតំបន់ឆ្នេរ។</p>',
          content_en: '<p>Kep province hosted the national sailing championship, attracting multiple athlete teams and enhancing the tourism appeal of the coastal region.</p>',
          slug: 'cambodia-national-sailing-kep-2025',
          category_id: 3,
          image_url: 'https://picsum.photos/seed/sailing/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* Category 4: Technology (Extra 5) */
        {
          title_km: 'កម្ពុជាដាក់ឱ្យដំណើរការមជ្ឈមណ្ឌលផ្ទុកទិន្នន័យជាតិ (National Data Center) ដំបូងបង្អស់',
          title_en: 'Cambodia Launches First Secure National Data Center to Support Digital Transformation',
          content_km: '<p>រាជរដ្ឋាភិបាលបានសម្ពោធមជ្ឈមណ្ឌលទិន្នន័យកម្រិតស្តង់ដារអន្តរជាតិ ដើម្បីរក្សាទុក និងការពារទិន្នន័យផ្លូវការរបស់រដ្ឋ និងឯកជនប្រកបដោយសុវត្ថិភាព និងភាពជឿជាក់ខ្ពស់បំផុត។</p>',
          content_en: '<p>The government inaugurated an international-standard data center to securely store and protect state and private cloud databases with high reliability.</p>',
          slug: 'cambodia-national-data-center-launch-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/datacenter/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'បច្ចេកវិទ្យាកសិកម្មឆ្លាតវៃ៖ ការប្រើប្រាស់ឧបករណ៍វិភាគជាតិទឹកដីដើរដោយថាមពលព្រះអាទិត្យ',
          title_en: 'Smart Agrotech: Deploying Solar-powered Soil Moisture Analyzer Sensors',
          content_km: '<p>គម្រោងសាកល្បងកសិកម្មវៃឆ្លាតថ្មីមួយបានផ្តល់ជូនឧបករណ៍ចាប់សញ្ញាដីដល់កសិករ ដើម្បីតាមដានសំណើម និងកម្រិតជីតាមរយៈកម្មវិធីស្មាតហ្វូនបានយ៉ាងងាយស្រួល។</p>',
          content_en: '<p>A new smart agriculture pilot project distributed soil sensors to farmers, enabling real-time monitoring of moisture and fertilizer via smartphone apps.</p>',
          slug: 'smart-agrotech-soil-sensors-cambodia-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/soilsensor/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'សមាគមបច្ចេកវិទ្យាហិរញ្ញវត្ថុកម្ពុជាប្រកាសកំណើននៃការប្រើប្រាស់ការទូទាត់មិនប្រើសាច់ប្រាក់សុទ្ធ',
          title_en: 'Cambodia Fintech Association Announces Growth in Cashless Electronic Transactions',
          content_km: '<p>របាយការណ៍សង្ខេបប្រចាំឆ្នាំបង្ហាញថា ប្រតិបត្តិការទូទាត់តាមអេឡិចត្រូនិក និងការស្កេន QR កូដ បានកើនឡើងដល់ ៨០% នៃប្រតិបត្តិការអាជីវកម្មរាយទូទាំងប្រទេស។</p>',
          content_en: '<p>The annual summary report shows that electronic transactions and QR scans reached 80% of retail business operations nationwide.</p>',
          slug: 'cambodia-cashless-fintech-growth-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/fintech/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ក្រុមហ៊ុនមហាយក្សបច្ចេកវិទ្យាប្រកាសបង្កើតមជ្ឈមណ្ឌលស្រាវជ្រាវបញ្ញាសិប្បនិម្មិត AI នៅភ្នំពេញ',
          title_en: 'Tech Giant Announces AI Research Center in Phnom Penh for Local Talent Development',
          content_km: '<p>ក្រុមហ៊ុនបច្ចេកវិទ្យាលំដាប់អន្តរជាតិគ្រោងវិនិយោគថវិកាដ៏ច្រើនដើម្បីបង្កើតការិយាល័យស្រាវជ្រាវ និងអភិវឌ្ឍន៍ AI សំដៅបណ្តុះបណ្តាលវិស្វករសូហ្វវែរកម្ពុជា។</p>',
          content_en: '<p>An international tech corporation plans to invest in an AI R&D hub in Phnom Penh, aiming to train and upskill Cambodian software engineers.</p>',
          slug: 'tech-giant-ai-research-hub-phnom-penh-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/aihub/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'ការបណ្តុះបណ្តាលសន្តិសុខអ៊ីនធឺណិតសម្រាប់មន្ត្រីរាជការ៖ វិធានការការពារការលួចអត្តសញ្ញាណឌីជីថល',
          title_en: 'Cybersecurity Training for Civil Servants: Guarding Against Digital Identity Theft',
          content_km: '<p>ក្រសួងព័ត៌មានវិទ្យាបានរៀបចំវគ្គបណ្តុះបណ្តាលពិសេសស្តីពីការយល់ដឹងពីសន្តិសុខអ៊ីនធឺណិត និងរបៀបការពារគណនីផ្លូវការរបស់រដ្ឋពីរលកនៃការបន្លំទិន្នន័យ (Phishing)។</p>',
          content_en: '<p>The Ministry of IT hosted specialized training on cybersecurity awareness and methods to secure state official accounts from phishing attempts.</p>',
          slug: 'cybersecurity-training-civil-servants-cambodia-2025',
          category_id: 4,
          image_url: 'https://picsum.photos/seed/cybersecurity/800/450',
          is_featured: 0,
          card_template: 'standard'
        },

        /* Category 5: Economy (Extra 5) */
        {
          title_km: 'ការងើបឡើងវិញនៃទីផ្សារអចលនទ្រព្យកម្ពុជា៖ តម្រូវការបុរី និងខុនដូកើនឡើងជាលំដាប់',
          title_en: 'Recovery of Cambodia Real Estate Market: Steady Rise in Housing and Condo Demands',
          content_km: '<p>អ្នកវិភាគអចលនទ្រព្យបានមើលឃើញសញ្ញាវិជ្ជមាននៃការងើបឡើងវិញ ដោយសារតម្រូវការទិញលំនៅឋានពិតប្រាកដក្នុងស្រុកកើនឡើង និងអត្រាការប្រាក់កម្ចីមានភាពបត់បែនជាងមុន។</p>',
          content_en: '<p>Real estate analysts spotted positive recovery signs, driven by rising domestic housing demand and more flexible home loan interest rates.</p>',
          slug: 'cambodia-real-estate-market-recovery-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/realestate/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ពិព័រណ៍ផលិតផលខ្មែរប្រចាំឆ្នាំ៖ ការជំរុញសហគ្រាសក្នុងស្រុកឱ្យចូលទៅក្នុងខ្សែច្រវាក់ផ្គត់ផ្គង់សកល',
          title_en: 'Annual Proudly-Cambodian Products Fair: Driving Local Enterprises into Global Supply Chains',
          content_km: '<p>ក្រសួងពាណិជ្ជកម្មបានរៀបចំពិព័រណ៍ «ផលិតផលខ្មែរ គុណភាពខ្ពស់» ដើម្បីបង្កើតបណ្តាញតភ្ជាប់រវាងផលិតករក្នុងស្រុក និងក្រុមហ៊ុនទិញអន្តរជាតិធំៗ។</p>',
          content_en: '<p>The Ministry of Commerce hosted the "Khmer Products, High Quality" expo to bridge local manufacturers with major international buying offices.</p>',
          slug: 'proudly-cambodian-products-fair-expo-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/khmerfair/800/450',
          is_featured: 0,
          card_template: 'horizontal'
        },
        {
          title_km: 'ការវិនិយោគលើរោងចក្រកែច្នៃកាកសំណល់ទៅជាថាមពលអគ្គិសនីដំបូងបង្អស់នៅកម្ពុជា',
          title_en: 'Investment in Cambodia\'s First Waste-to-Energy Power Plant Project Approved',
          content_km: '<p>ក្រុមប្រឹក្សាអភិវឌ្ឍន៍កម្ពុជាបានអនុម័តគម្រោងសាងសង់រោងចក្រដុតសំរាមបម្លែងជាថាមពលអគ្គិសនី ដែលជាជំហានសំខាន់ក្នុងការគ្រប់គ្រងកាកសំណល់ និងផ្តល់ប្រភពថាមពលស្អាត។</p>',
          content_en: '<p>The CDC approved a construction project for a waste-to-energy power plant, a crucial step in urban waste management and clean electricity generation.</p>',
          slug: 'cambodia-first-waste-to-energy-plant-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/wasteenergy/800/450',
          is_featured: 0,
          card_template: 'standard'
        },
        {
          title_km: 'ធនាគារកម្ពុជាដាក់ឱ្យប្រើប្រាស់កម្ចីបៃតង (Green Loans) គាំទ្រគម្រោងមិត្តភាពបរិស្ថាន',
          title_en: 'Cambodian Banks Introduce Green Loans to Support Eco-Friendly Enterprise Projects',
          content_km: '<p>គ្រឹះស្ថានហិរញ្ញវត្ថុឈានមុខបានបើកកញ្ចប់ឥណទានបៃតងដែលផ្តល់អត្រាការប្រាក់ទាបពិសេសសម្រាប់គម្រោងថាមពលសូឡា និងការអភិវឌ្ឍសំណង់សន្សំសំចៃថាមពល។</p>',
          content_en: '<p>Leading financial institutions launched green credit packages, offering special low interest rates for solar power and energy-efficient building developments.</p>',
          slug: 'cambodian-banks-green-loans-initiative-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/greenloan/800/450',
          is_featured: 0,
          card_template: 'minimal'
        },
        {
          title_km: 'សមាគមវាយនភណ្ឌកម្ពុជាប្រកាសពីការបង្កើនប្រសិទ្ធភាពផលិតកម្មតាមរយៈបច្ចេកវិទ្យាទំនើប',
          title_en: 'Cambodian Textile Association Announces Factory Productivity Boost via Modern Technology',
          content_km: '<p>សហគ្រាសកាត់ដេរឈានមុខជាច្រើនបានចាប់ផ្តើមតំឡើងម៉ាស៊ីនស្វ័យប្រវត្តិជំនាន់ថ្មី ដែលជួយបង្កើនប្រសិទ្ធភាពផលិតកម្មបាន ៣០% និងកាត់បន្ថយការខ្ជះខ្ជាយវត្ថុធាតុដើម។</p>',
          content_en: '<p>Multiple leading garment factories started deploying next-generation automated machinery, boosting productivity by 30% and cutting material waste.</p>',
          slug: 'cambodia-textile-factory-automation-productivity-2025',
          category_id: 5,
          image_url: 'https://picsum.photos/seed/textile/800/450',
          is_featured: 0,
          card_template: 'standard'
        }
      ];
      articles.forEach(a => {
        db.run(
          "INSERT INTO articles (title_km, title_en, content_km, content_en, slug, category_id, image_url, is_featured, card_template) VALUES (?,?,?,?,?,?,?,?,?)",
          [a.title_km, a.title_en, a.content_km, a.content_en, a.slug, a.category_id, a.image_url, a.is_featured, a.card_template]
        );
      });

      db.run(
        "INSERT OR IGNORE INTO admins (username, password) VALUES (?,?)",
        ['admin', 'admin123']
      );

      // Seed settings
      db.run(`
        INSERT OR IGNORE INTO settings (
          id, site_name_km, site_name_en, site_desc_km, site_desc_en,
          contact_phone, contact_email, contact_address_km, contact_address_en,
          social_facebook, social_telegram, social_youtube, social_twitter
        ) VALUES (
          1, 'ខ្មែរញូស៍', 'Khmer News',
          'Khmer News គឺជាគេហទំព័រព័ត៌មានទ្វិភាសា ដែលផ្តល់ជូននូវព័ត៌មានថ្មីៗចុងក្រោយបំផុតជាភាសាខ្មែរ និងភាសាអង់គ្លេស។ យើងគ្របដណ្តប់លើព័ត៌មានជាតិ អន្តរជាតិ កីឡា បច្ចេកវិទ្យា និងសេដ្ឋកិច្ច។',
          'Khmer News is a bilingual news platform providing the latest news in both Khmer and English. We cover national, international, sports, technology, and economy news.',
          '+855 23 456 789', 'info@khmernews.com',
          'មហាវិថីព្រះមុនីវង្ស រាជធានីភ្នំពេញ កម្ពុជា', 'Preah Monivong Blvd, Phnom Penh, Cambodia',
          'https://facebook.com', 'https://t.me/khmernews', 'https://youtube.com', 'https://twitter.com'
        )
      `);

      // Seed ads
      db.run("INSERT OR IGNORE INTO ads (id, title, image_url, link_url, position, is_active) VALUES (1, ?,?,?,?,?)", [
        'Header Ads Banner', 'https://picsum.photos/seed/adheader/970/90', 'https://google.com', 'header', 1
      ]);
      db.run("INSERT OR IGNORE INTO ads (id, title, image_url, link_url, position, is_active) VALUES (2, ?,?,?,?,?)", [
        'Sidebar Ads Square', 'https://picsum.photos/seed/adsidebar/300/250', 'https://google.com', 'sidebar', 1
      ]);
      db.run("INSERT OR IGNORE INTO ads (id, title, image_url, link_url, position, is_active) VALUES (3, ?,?,?,?,?)", [
        'Inline Article Banner', 'https://picsum.photos/seed/adinline/640/100', 'https://google.com', 'inline', 1
      ]);
    });
    ensureAdmin(callback);
  });
}

function ensureAdmin(callback) {
  db.get("SELECT COUNT(*) as c FROM admins", (err, row) => {
    if (err) return;
    if (row.c === 0) {
      db.run(
        "INSERT INTO admins (username, password) VALUES (?,?)",
        ['admin', 'admin123']
      );
    }
    callback && callback();
  });
}

function getDb() { return db; }

module.exports = { initDatabase, seedDatabase, getDb };
