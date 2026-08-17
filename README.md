# Khmer News

A full-stack bilingual (Khmer / English) news website built with Node.js, Express, SQLite, and EJS.

## Features

- Bilingual content with Khmer (km) and English (en) support
- Admin dashboard for managing articles, categories, tags, ads, and settings
- Breaking news ticker
- Customizable site layout and colors via admin settings
- Active ads management with position-based placement
- Search functionality
- Responsive views with light/dark theme support
- Contact and subscription forms

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Templating:** EJS + express-ejs-layouts
- **Database:** SQLite3
- **i18n:** Custom middleware (`locales/km.json`, `locales/en.json`)

## Project Structure

```
├── server.js           # App entry point
├── database.js         # SQLite init & queries
├── routes/
│   ├── index.js        # Public routes
│   ├── admin.js        # Admin routes
│   └── api.js          # JSON API routes
├── middleware/
│   ├── i18n.js         # Language translation
│   └── auth.js         # Session / auth middleware
├── views/
│   ├── *.ejs           # Public pages
│   └── admin/*.ejs     # Admin panel pages
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── screenshots/
├── locales/
│   ├── km.json
│   └── en.json
└── data/               # SQLite database (gitignored)
```

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000).

## Admin Panel

Visit `/admin` to access the admin dashboard.
