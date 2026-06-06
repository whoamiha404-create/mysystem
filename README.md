# RentPro / HopeZone

Full-stack real estate management system with tenants, payments, receipts, contracts, ankets, reports, users, settings, and WhatsApp integration.

## Stack

- Frontend: React 18 + Vite
- Backend: Node.js + Express
- Database: SQLite with `better-sqlite3`
- Auth: JWT + bcrypt
- WhatsApp: `whatsapp-web.js`

## Project Structure

```text
backend/
  db/database.js          SQLite schema, migrations, seed users
  middleware/auth.js      JWT auth middleware
  routes/                 API routes
  services/whatsapp.js    Per-user WhatsApp sessions
  server.js               Express server

frontend/
  src/                    React app source
  public/                 Static fonts/images
  vite.config.js          Builds into backend/public
```

## Roles

- `developer`: system-level account. Can create owners/admins and agents.
- `admin`: owner/company account. Can create and manage their own agents and view agent reports.
- `agent`: normal user. Can manage their own tenants, payments, receipts, contracts, ankets, WhatsApp, and settings.

Each account has separated workspace data. Tenants, payments, contracts, receipts, expenses, settings, logs, and WhatsApp sessions are scoped to the logged-in user.

## Local Setup

Use Node.js 20 LTS. Node 24 can break native SQLite packages on Windows.

### Backend

```bat
cd backend
copy .env.example .env
npm install
npm start
```

Backend runs on:

```text
http://localhost:3001
```

### Frontend

Open a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## Default First-Run Accounts

From `backend/.env.example`:

```text
developer / developer123
admin / admin123
```

Change these before production.

## Build For Production

```bat
cd frontend
npm run build
```

The frontend build is written into `backend/public`, and the backend serves it automatically.

Then run:

```bat
cd backend
npm start
```

## WhatsApp

Each user has their own WhatsApp session. After logging in, open the WhatsApp page and scan the QR code for that account.

Local WhatsApp sessions and uploaded template images are ignored by Git:

```text
backend/.wa_session/
backend/uploads/
```

## GitHub Notes

Do not upload local runtime files:

- `.env`
- SQLite database files: `*.db`, `*.db-wal`, `*.db-shm`
- `node_modules`
- WhatsApp sessions
- Uploads
- Logs

These are already covered by `.gitignore`.

## Useful Commands

```bat
cd backend
npm start
```

```bat
cd frontend
npm run dev
```

```bat
cd frontend
npm run build
```
