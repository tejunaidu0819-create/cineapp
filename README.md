# 🎬 CineVerse — Cinema Booking App

A full-stack cinema booking web application built with **React 18 + Vite** (frontend) and **Express.js + Neon PostgreSQL** (backend). Features real-time seat selection, ACID booking transactions, QR-code digital tickets, and an admin dashboard.

---

## ✨ Features

- 🎥 Browse movies with search and multi-filter (title, genre, language, cinema, date)
- 🪑 Live seat map with availability — AVAILABLE / HELD / BOOKED / BLOCKED
- 🔒 ACID booking transaction with row-level seat locking (10-minute hold)
- 💳 Payment confirmation with idempotency keys (no duplicate charges)
- 🎫 Digital tickets with unique QR codes
- 📋 Booking history, guest lookup, and cancellation with instant seat release
- 👨‍💼 Admin dashboard — KPI stats, movie manager, showtime scheduler, QR scanner
- ⏱️ Automatic expired-hold cleanup via cron endpoint

---

## 🗂 Project Structure

```
cineverse-app/
├── api/
│   └── index.js              # Vercel serverless function entry point
├── server/
│   ├── db/
│   │   ├── database.js       # sql.js SQLite engine (local dev)
│   │   ├── neon-client.js    # Neon PostgreSQL client
│   │   └── neon-migrator.js  # Migration runner
│   ├── migrations/
│   │   ├── 001_create_neon_schema.sql
│   │   ├── 002_triggers_and_audit.sql
│   │   └── 003_seed_catalog.sql
│   ├── routes/
│   │   ├── api.js            # Main REST API (movies, bookings, seats…)
│   │   └── neonApi.js        # v2 API (ACID transactions, payments, tickets)
│   ├── services/
│   │   ├── bookingTransactionService.js
│   │   ├── paymentService.js
│   │   ├── seatHoldService.js
│   │   └── auditService.js
│   └── index.js              # Local Express server entry
├── src/
│   ├── components/           # Navbar, Footer, MovieCard, Toast, TrailerModal
│   ├── pages/                # HomePage, MovieDetailsPage, SeatSelectionPage…
│   ├── services/api.js       # Frontend API client
│   └── styles/index.css      # Design system (dark luxury theme)
├── .env.example              # Template — copy to .env and fill in values
├── vercel.json               # Vercel deployment config + cron
├── vite.config.js
└── package.json
```

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 9
- A [Neon PostgreSQL](https://neon.tech) database (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/tejunaidu0819-create/cineapp.git
cd cineapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your real values (see [Environment Variables](#-environment-variables) below).

### 4. Run database migrations

```bash
npm run migrate
```

This creates all 14 tables and seeds sample data (movies, cinemas, showtimes, seats).

### 5. Start the development server

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Neon v2 API | http://localhost:3001/api/v2 |
| Health check | http://localhost:3001/health |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string (`postgresql://…?sslmode=require`) |
| `CRON_SECRET` | ✅ | Secret token for the `/api/v2/seat-holds/release-expired` cron endpoint |
| `PORT` | ❌ | Local Express port (default: `3001`, not used on Vercel) |

**Generate a secure `CRON_SECRET`:**
```bash
# macOS / Linux
openssl rand -hex 32

# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## 🗄️ Database Migrations

Migrations live in `server/migrations/` and are tracked in the `schema_migrations` table.

### Run migrations (local or against Neon)

```bash
npm run migrate
```

### Migration files

| File | Description |
|---|---|
| `001_create_neon_schema.sql` | 14 tables with UUID PKs, constraints, indexes |
| `002_triggers_and_audit.sql` | Auto `updated_at` triggers, audit log triggers |
| `003_seed_catalog.sql` | Sample movies, cinemas, auditoriums, seats, showtimes |

### Schema overview

```
users → bookings ←─── payments
movies → showtimes → showtime_seats ← seats ← auditoriums ← cinemas
bookings → booking_items → tickets
bookings, payments → audit_logs
```

---

## 🧪 Testing

### Run the full QA test suite

```bash
npm test
# or
node test-qa-agent3.js
```

The suite covers 20 test groups:

1. Auth — registration, login, logout, authorization
2. Movie search & multi-filter
3. Cinema selection
4. Showtimes filter
5. Seat map correctness
6. Full booking flow (hold → confirm → ticket)
7. Concurrent booking conflict (same seat, two sessions)
8. Expired seat hold auto-release
9. Pricing integer math (subtotal + fee − discount = total)
10. Payment success & ticket issuance
11. Payment failure / expired booking
12. Duplicate webhook idempotency
13. Cross-user data isolation
14. Admin permission gating
15. Clean-slate migration
16. Booking cancellation & seat release
17. QR ticket verification
18. Audit log creation
19. Cron secret protection
20. Production build verification

---

## ☁️ Vercel Deployment

### Step 1 — Connect your repository

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo: `tejunaidu0819-create/cineapp`
3. Vercel auto-detects `vercel.json`

### Step 2 — Provision Neon PostgreSQL

1. In Vercel dashboard → **Storage** → **Connect Store** → **Neon**
2. Create a new Neon database (or connect an existing one)
3. Vercel automatically injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into your environment

### Step 3 — Set environment variables in Vercel

Go to **Project → Settings → Environment Variables** and add:

| Key | Value | Environments |
|---|---|---|
| `CRON_SECRET` | Your generated secret | Production, Preview |
| `DATABASE_URL` | Set automatically by Neon integration | Production, Preview |

> ⚠️ Never paste secrets into `vercel.json` or commit them to the repo.

### Step 4 — Run migrations on Neon

After first deploy, run migrations against your cloud Neon DB:

```bash
# Set DATABASE_URL to your Neon production string, then:
npm run migrate
```

Or trigger via Vercel's one-off function invocation.

### Step 5 — Deploy

```bash
git push origin main
```

Vercel auto-deploys on every push to `main`. Preview deployments are created for every PR.

### Cron job

`vercel.json` configures a cron job that fires every 10 minutes:

```
POST /api/v2/seat-holds/release-expired
Authorization: Bearer <CRON_SECRET>
```

This releases any seat holds that have been HELD beyond 10 minutes.

---

## 🛣️ API Reference

### Core Endpoints (`/api`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies` | List movies (supports `?search=`, `?genre=`, `?language=`, `?cinemaId=`, `?date=`) |
| `GET` | `/api/movies/:id` | Movie details |
| `GET` | `/api/cinemas` | List all cinemas |
| `GET` | `/api/showtimes` | List showtimes (`?movieId=`, `?cinemaId=`, `?date=`) |
| `GET` | `/api/showtimes/:id/seats` | Seat map for a showtime |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/users/register` | Register |
| `GET` | `/api/bookings` | User bookings (`?email=` for guest) |
| `POST` | `/api/bookings` | Create booking |

### v2 ACID Endpoints (`/api/v2`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v2/bookings/hold` | Steps 1–7: Lock seats, create pending booking |
| `POST` | `/api/v2/payments/confirm` | Steps 8–9: Confirm payment, issue tickets |
| `POST` | `/api/v2/bookings/:id/refund` | Refund & release seats |
| `POST` | `/api/v2/seat-holds/release-expired` | Cron: release expired holds (requires `Authorization: Bearer <CRON_SECRET>`) |
| `GET` | `/api/v2/tickets/verify/:code` | Verify ticket QR code |
| `GET` | `/api/v2/audit-logs` | Retrieve audit logs |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | Express.js, Node.js ≥ 20 |
| Database (cloud) | Neon PostgreSQL (serverless) |
| Database (local dev) | sql.js (WebAssembly SQLite) |
| QR Codes | qrcode npm package |
| Deployment | Vercel (serverless functions + static hosting) |
| Cron | Vercel Cron Jobs |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: description"`
6. Push and open a Pull Request

---

## 📄 License

MIT
