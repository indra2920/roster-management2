# Vercel Deployment Guide - Roster Management System

## Prerequisites

1. **GitHub Account**: Buat akun di [github.com](https://github.com) jika belum punya
2. **Vercel Account**: Daftar di [vercel.com](https://vercel.com) menggunakan akun GitHub
3. **Git Installed**: Pastikan Git sudah terinstall di komputer Anda

## Step 1: Push Code ke GitHub

### 1.1 Inisialisasi Git Repository (jika belum)

```bash
cd "d:\project\roster management"
git init
git add .
git commit -m "Initial commit - Roster Management System"
```

### 1.2 Buat Repository di GitHub

1. Buka [github.com/new](https://github.com/new)
2. Nama repository: `roster-management`
3. Pilih **Private** (agar tidak public)
4. Klik **Create repository**

### 1.3 Push ke GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/roster-management.git
git branch -M main
git push -u origin main
```

**Ganti `YOUR_USERNAME` dengan username GitHub Anda**

---

## Step 2: Setup PostgreSQL Database di Vercel

### 2.1 Login ke Vercel

1. Buka [vercel.com](https://vercel.com)
2. Login dengan GitHub
3. Klik **Add New** → **Project**

### 2.2 Import Repository

1. Pilih repository `roster-management`
2. Klik **Import**

### 2.3 Setup Database (SEBELUM Deploy)

1. Di halaman project settings, klik tab **Storage**
2. Klik **Create Database**
3. Pilih **Postgres**
4. Nama database: `roster-db`
5. Region: Pilih yang terdekat (Singapore/Tokyo)
6. Klik **Create**

### 2.4 Copy Connection String

Setelah database dibuat, Vercel akan otomatis menambahkan environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` ← **Gunakan ini untuk DATABASE_URL**

---

## Step 3: Configure Environment Variables

Di Vercel project settings → **Environment Variables**, tambahkan:

### Required Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (Auto dari Vercel Postgres) | Sudah otomatis ter-set |
| `NEXTAUTH_SECRET` | `[Generate random string]` | Buat secret key baru |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Akan dapat setelah deploy |

### Generate NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

Atau gunakan: https://generate-secret.vercel.app/32

---

## Step 4: Deploy

### 4.1 First Deployment

1. Klik **Deploy** di Vercel dashboard
2. Tunggu proses build selesai (~2-3 menit)
3. Jika sukses, Anda akan dapat URL: `https://roster-management-xxx.vercel.app`

### 4.2 Update NEXTAUTH_URL

1. Copy URL deployment Anda
2. Kembali ke **Environment Variables**
3. Edit `NEXTAUTH_URL` dengan URL yang baru
4. Klik **Save**
5. **Redeploy** (Deployments → klik titik 3 → Redeploy)

---

## Step 5: Setup Database (Migrations & Seed)

### 5.1 Install Vercel CLI (Local)

```bash
npm i -g vercel
vercel login
```

### 5.2 Link Project

```bash
cd "d:\project\roster management"
vercel link
```

Pilih project `roster-management` yang sudah dibuat.

### 5.3 Pull Environment Variables

```bash
vercel env pull .env.local
```

Ini akan download environment variables dari Vercel ke file `.env.local`.

### 5.4 Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5.5 Seed Database

```bash
npx ts-node prisma/seed.ts
```

Jika ada error, jalankan seed scripts satu per satu:
```bash
npx ts-node seed_master_data.ts
npx ts-node activate_users.ts
```

---

## Step 6: Verification

### 6.1 Test Login

1. Buka URL Vercel Anda: `https://roster-management-xxx.vercel.app`
2. Login dengan:
   - **Admin**: `admin@example.com` / `password123`
   - **Manager**: `manager@example.com` / `password123`
   - **Employee**: `employee@example.com` / `password123`

### 6.2 Test Features

- ✅ Dashboard loading
- ✅ Create new request
- ✅ Approval workflow
- ✅ Master data (Regions, Locations, Positions)

---

## Troubleshooting

### Build Error: "Prisma Client not generated"

**Solution**: Pastikan `vercel.json` sudah benar:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

### Database Connection Error

**Solution**: 
1. Cek environment variable `DATABASE_URL` sudah benar
2. Pastikan menggunakan `POSTGRES_PRISMA_URL` dari Vercel

### Migration Error

**Solution**: Jalankan migrations secara manual via Vercel CLI:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

---

## Auto-Deploy

Setelah setup selesai, setiap kali Anda push code ke GitHub:

```bash
git add .
git commit -m "Update feature X"
git push
```

Vercel akan **otomatis deploy** dalam 1-2 menit!

---

## Custom Domain (Optional)

Jika ingin domain sendiri (misal: `roster.company.com`):

1. Beli domain di Namecheap/GoDaddy
2. Di Vercel: Settings → Domains → Add
3. Ikuti instruksi DNS configuration
4. Update `NEXTAUTH_URL` dengan domain baru

---

## Monitoring

- **Logs**: Vercel Dashboard → Deployments → View Function Logs
- **Analytics**: Vercel Dashboard → Analytics
- **Database**: Vercel Dashboard → Storage → Postgres

---

## Support

Jika ada masalah:
1. Cek Vercel deployment logs
2. Cek browser console (F12)
3. Vercel documentation: https://vercel.com/docs
