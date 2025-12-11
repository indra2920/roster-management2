# Panduan Deployment ke Hostinger VPS (Ubuntu)

Panduan ini akan membantu Anda men-deploy aplikasi Next.js + Prisma ke VPS (Virtual Private Server) menggunakan Ubuntu, Nginx, PM2, dan PostgreSQL.

## Prasyarat

1.  **VPS Hostinger** (OS: Ubuntu 22.04 atau 24.04).
2.  **Domain** yang sudah diarahkan ke IP Address VPS Anda (A Record).
3.  Akses **SSH** ke VPS (via terminal atau Putty).

---

## Langkah 1: Akses Server & Update

Masuk ke VPS Anda via SSH:
```bash
ssh root@ip_address_vps_anda
```

Update paket sistem:
```bash
apt update && apt upgrade -y
```

## Langkah 2: Install Node.js

Kita akan menginstall Node.js versi LTS (misal v20).

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```
Cek instalasi:
```bash
node -v
npm -v
```

## Langkah 3: Install PostgreSQL (Database)

Install PostgreSQL:
```bash
apt install postgresql postgresql-contrib -y
```

Masuk ke user postgres dan buat database & user baru:
```bash
sudo -u postgres psql
```

Di dalam console PostgreSQL (`postgres=#`), jalankan perintah berikut (ganti `password_rahasia` dengan password kuat):

```sql
CREATE DATABASE roster_db;
CREATE USER roster_user WITH ENCRYPTED PASSWORD 'password_rahasia';
GRANT ALL PRIVILEGES ON DATABASE roster_db TO roster_user;
ALTER DATABASE roster_db OWNER TO roster_user;
\q
```

## Langkah 4: Clone Aplikasi

Install Git:
```bash
apt install git -y
```

Clone repository Anda (ganti URL dengan repo Anda):
```bash
cd /var/www
git clone https://github.com/username/repo-anda.git roster-app
cd roster-app
```

## Langkah 5: Konfigurasi Environment Variables

Buat file `.env`:
```bash
nano .env
```

Isi dengan konfigurasi berikut (sesuaikan password database):

```env
# Database local di VPS
DATABASE_URL="postgresql://roster_user:password_rahasia@localhost:5432/roster_db"

# NextAuth
NEXTAUTH_URL="http://domain-anda.com" # Ganti dengan domain Anda
NEXTAUTH_SECRET="string_acak_panjang_untuk_keamanan"
```
Simpan dengan `Ctrl+X`, lalu `Y`, lalu `Enter`.

## Langkah 6: Install Dependencies & Build

```bash
npm install
npx prisma generate
npx prisma migrate deploy # Push schema ke database VPS
npm run build
```

## Langkah 7: Setup PM2 (Process Manager)

PM2 akan menjaga aplikasi tetap berjalan di background.

Install PM2:
```bash
npm install -g pm2
```

Jalankan aplikasi:
```bash
pm2 start npm --name "roster-app" -- start
```

Agar PM2 otomatis jalan saat server restart:
```bash
pm2 startup
pm2 save
```

## Langkah 8: Setup Nginx (Reverse Proxy)

Install Nginx:
```bash
apt install nginx -y
```

Buat konfigurasi server block:
```bash
nano /etc/nginx/sites-available/roster-app
```

Isi dengan (ganti `domain-anda.com` dengan domain asli):

```nginx
server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi:
```bash
ln -s /etc/nginx/sites-available/roster-app /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default # Hapus default config jika ada
nginx -t # Cek error
systemctl restart nginx
```

## Langkah 9: Setup SSL (HTTPS) dengan Certbot

Agar website aman (gembok hijau).

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d domain-anda.com -d www.domain-anda.com
```
Ikuti instruksi di layar.

---

## Selesai!

Aplikasi Anda sekarang seharusnya sudah bisa diakses di `https://domain-anda.com`.

### Cara Update Aplikasi Nanti

Jika Anda ada perubahan kode di GitHub, lakukan ini di VPS:

```bash
cd /var/www/roster-app
git pull origin main
npm install # Jika ada library baru
npx prisma migrate deploy # Jika ada perubahan database
npm run build
pm2 restart roster-app
```
