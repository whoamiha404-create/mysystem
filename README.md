# 🏠 RentPro v3 — Full-Stack Property Management

A complete, production-ready rental management system with WhatsApp integration.

## Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React 18 + Vite         |
| Backend  | Node.js + Express       |
| Database | SQLite (better-sqlite3) |
| Auth     | JWT + bcrypt            |
| WhatsApp | whatsapp-web.js         |

---

## Project Structure

```
RentPro-v3/
├── backend/
│   ├── server.js          ← Main API server (port 3001)
│   ├── db/
│   │   └── database.js    ← SQLite schema + seeding
│   ├── middleware/
│   │   └── auth.js        ← JWT middleware
│   ├── routes/
│   │   ├── auth.js        ← Login / password
│   │   ├── tenants.js     ← CRUD tenants
│   │   ├── payments.js    ← CRUD payments
│   │   ├── expenses.js    ← CRUD expenses
│   │   ├── users.js       ← CRUD users (admin only)
│   │   ├── settings.js    ← App settings
│   │   ├── whatsapp.js    ← WA send + remind
│   │   └── logs.js        ← Activity logs
│   └── services/
│       └── whatsapp.js    ← WhatsApp client service
└── frontend/
    ├── index.html         ← FONT import is here ← ← ←
    └── src/
        ├── styles/
        │   └── globals.css ← FONT VARIABLES are here ← ← ←
        ├── pages/          ← One file per page
        └── components/     ← Reusable components
```

---

## 🔤 How to Change the Font

**Step 1** — Go to https://fonts.google.com and pick fonts you like

**Step 2** — Open `frontend/index.html` and replace the Google Fonts `<link>` tag:
```html
<!-- Change THIS line in index.html -->
<link href="https://fonts.googleapis.com/css2?family=YOUR+FONT:wght@400;700&display=swap" rel="stylesheet" />
```

**Step 3** — Open `frontend/src/styles/globals.css` and update these two lines at the top:
```css
--font-display : 'Your Display Font', serif;   /* Headings, titles */
--font-body    : 'Your Body Font', sans-serif;  /* All body text   */
```

**Step 4** — Change font sizes if needed (same file):
```css
--text-base : 15px;   /* ← Main body font size — increase to 16px or 17px */
```

---

## ⚡ Quick Start (Development)

### 1. Install Chrome for WhatsApp (once only)
```bash
cd backend
npm install
npx puppeteer browsers install chrome
```

### 2. Setup backend
```bash
cd backend
cp .env.example .env
# Edit .env to change secrets/credentials
npm start
# API running at http://localhost:3001
```

### 3. Setup frontend
```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

Default login: **admin / admin123**

---

## 🚀 VPS Deployment

### Backend (PM2)
```bash
cd /your/path/backend
npm install
npx puppeteer browsers install chrome

# Install system libs if needed (Ubuntu)
apt-get install -y libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2t64 libpango-1.0-0 libnspr4 libnss3

# Start with PM2
pm2 start server.js --name rentpro-api
pm2 save
pm2 startup
```

### Frontend (Build + Serve via Nginx)
```bash
cd /your/path/frontend
npm install
npm run build
# Built files → backend/public/
```

The build output goes directly into `backend/public/` and Express serves it automatically.

### Nginx config (optional, for custom domain)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location / {
        root /your/path/backend/public;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔧 Environment Variables (backend/.env)

| Variable       | Default         | Description                        |
|----------------|-----------------|------------------------------------|
| PORT           | 3001            | API server port                    |
| JWT_SECRET     | (change this!)  | Secret for JWT signing             |
| JWT_EXPIRES_IN | 7d              | Token expiry                       |
| ADMIN_USER     | admin           | Initial admin username             |
| ADMIN_PASS     | admin123        | Initial admin password             |
| CURRENCY       | USD             | Default currency                   |
| TIMEZONE       | Asia/Baghdad    | Cron job timezone                  |
| CHROME_PATH    | (auto-detect)   | Path to Chrome binary              |
| DB_PATH        | ./db/rentpro.db | SQLite database file path          |

---

## 💡 Default Credentials
- Username: `admin`
- Password: `admin123`

**Change these immediately after first login in Settings → Security.**
"# mysystem" 
# mysystem
