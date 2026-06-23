# Attendance Manager

Day-based salary tracking with flexible pay cycles (2-day, 7-day, etc.), multi-distributor payment ledger, and supervisor-marked attendance.

## Stack

- **Frontend:** React + Vite + Tailwind CSS (mobile-responsive)
- **Backend:** Node.js + Express REST API
- **Database:** MySQL + Prisma ORM
- **Auth:** JWT (ready for future React Native app)

## Prerequisites

- Node.js 18+
- MySQL 8 running locally

## Setup

### 1. Configure environment

Copy `server/.env.example` to `server/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=attendance_app
DB_PASSWORD=AttendanceApp@2024
DB_NAME=attendance_manager
```

`DATABASE_URL` is built automatically from these values (password is URL-encoded for Prisma).

### 2. Create database user (one time)

```bash
npm run db:setup
```

Enter your MySQL **root** password. Or run `server/database/setup.sql` in MySQL Workbench.

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start development servers

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@attendance.com | admin123 |
| Supervisor | supervisor@attendance.com | super123 |
| Distributor | distributor@attendance.com | dist123 |

## Key features

- **Day-based pay:** `daily_rate × days worked` (present = full, half-day = 50%)
- **Flexible cycles:** Each worker can have 2-day, 7-day, or custom payout interval
- **Multi-distributor:** Workers assigned to distributors; full transaction ledger
- **Anti-cheat attendance:** Supervisor-only marking, audit trail, locked after payout
- **Mobile-responsive:** Works on phone browser and tablet for supervisors

## API

All endpoints under `/api/v1/`. Same API will be used by future React Native mobile app.

## Project structure

```
client/     React web app
server/     Node.js Express API + Prisma
```
