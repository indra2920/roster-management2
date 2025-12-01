# Roster Management System

Aplikasi manajemen roster karyawan dengan sistem approval multi-level untuk pengelolaan onsite/offsite work.

## Features

- 🔐 **Multi-Role Authentication**: Admin, Manager, Koordinator, Employee
- 📝 **Request Management**: Pengajuan onsite/offsite dengan approval workflow
- 📊 **Analytics Dashboard**: Grafik dan statistik lengkap
- 🔔 **Notifications**: Notifikasi otomatis untuk batas durasi
- 📍 **Location & Region Tracking**: Manajemen berdasarkan lokasi dan wilayah
- 👥 **Master Data Management**: Kelola positions, locations, regions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth.js
- **UI**: React, TailwindCSS, Recharts
- **Deployment**: Vercel

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone repository:
```bash
git clone https://github.com/YOUR_USERNAME/roster-management.git
cd roster-management
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/roster_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Run database migrations:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Seed database:
```bash
npx ts-node prisma/seed.ts
```

6. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

- **Admin**: `admin@example.com` / `password123`
- **Manager**: `manager@example.com` / `password123`
- **Employee**: `employee@example.com` / `password123`

## Deployment

Lihat panduan lengkap di [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

## Project Structure

```
roster-management/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   └── login/             # Login page
│   ├── components/            # React components
│   └── lib/                   # Utilities
├── VERCEL_DEPLOYMENT.md       # Deployment guide
└── package.json
```

## License

Private - Internal Use Only
