# Panduan Deployment ke Vercel

Berikut adalah langkah-langkah untuk mengupload aplikasi ini ke Vercel.

## Prasyarat

1.  Akun [Vercel](https://vercel.com/).
2.  Akun [GitHub](https://github.com/), [GitLab](https://gitlab.com/), atau [Bitbucket](https://bitbucket.org/).
3.  Database PostgreSQL (Bisa menggunakan Vercel Postgres, Supabase, Neon, dll).

## Langkah 1: Persiapan Database

Aplikasi ini menggunakan PostgreSQL. Anda perlu membuat database baru dan mendapatkan connection string-nya (`DATABASE_URL`).

### Opsi A: Menggunakan Vercel Postgres (Disarankan)
1.  Anda bisa membuat database ini langsung saat proses deployment di Vercel nanti.

### Opsi B: Menggunakan Provider Lain (Supabase/Neon)
1.  Buat project baru di provider pilihan Anda.
2.  Cari connection string database (biasanya berformat `postgres://user:password@host:port/database`).

## Langkah 2: Push Kode ke Git

Pastikan kode aplikasi sudah di-push ke repository Git (GitHub/GitLab/Bitbucket).

```bash
git add .
git commit -m "Persiapan deployment vercel"
git push origin main
```

## Langkah 3: Import Project di Vercel

1.  Buka dashboard [Vercel](https://vercel.com/dashboard).
2.  Klik **"Add New..."** -> **"Project"**.
3.  Pilih repository Git yang baru saja Anda push.
4.  Klik **"Import"**.

## Langkah 4: Konfigurasi Project

Di halaman konfigurasi "Configure Project":

1.  **Framework Preset**: Pastikan terpilih **Next.js**.
2.  **Root Directory**: Biarkan default (`./`).
3.  **Build and Output Settings**: Biarkan default (Vercel akan mendeteksi dari `package.json` atau `vercel.json` yang sudah kita buat).
    *   *Catatan*: Kita sudah menambahkan `vercel.json` yang menjalankan `prisma generate && next build`.

4.  **Environment Variables**:
    *   Klik bagian ini untuk membuka.
    *   Masukkan variabel berikut:
        *   `DATABASE_URL`: Masukkan connection string PostgreSQL Anda.
        *   `NEXTAUTH_SECRET`: Masukkan string acak yang panjang dan aman (bisa generate di [sini](https://generate-secret.vercel.app/32)).
        *   `NEXTAUTH_URL`: Masukkan URL aplikasi Vercel Anda nanti (misal `https://nama-project.vercel.app`). *Untuk deployment pertama, bisa dikosongkan atau diisi nanti setelah tahu domainnya.*

    *   *Jika menggunakan Vercel Postgres*:
        *   Anda bisa klik tab "Storage" di menu kiri dashboard Vercel setelah project dibuat, lalu "Connect Store" -> "Create New" -> "Postgres". Vercel akan otomatis mengisi Environment Variables untuk Anda.

    *   **Firebase Configuration (WAJIB)**:
        *   Karena kita menggunakan Firebase Admin SDK, Anda **HARUS** menambahkan variabel berikut di Vercel:
            *   `FIREBASE_PROJECT_ID`: Project ID dari Firebase Console.
            *   `FIREBASE_CLIENT_EMAIL`: Client Email dari service account Firebase.
            *   `FIREBASE_PRIVATE_KEY`: Private Key dari service account.
        
        > [!IMPORTANT]
        > **Format Private Key**: Vercel sering bermasalah dengan karakter `\n` (newline) di environment variables.
        > **Solusi Terbaik**: Encode private key Anda ke Base64 sebelum dimasukkan ke Vercel.
        >
        > Cara generate Base64 key:
        > 1. Buka terminal di project ini.
        > 2. Jalankan script yang sudah disediakan:
        >    ```bash
        >    npx tsx scripts/generate_base64_key.ts
        >    ```
        > 3.  Copy output string (yang panjang) dan paste ke value `FIREBASE_PRIVATE_KEY` di Vercel.

## Langkah 5: Deploy

1.  Klik tombol **"Deploy"**.
2.  Tunggu proses build selesai.
3.  Jika berhasil, Anda akan melihat tampilan "Congratulations!".

## Langkah 6: Setup Database (Seed Data)

Setelah deployment berhasil, database mungkin masih kosong. Anda perlu menjalankan migrasi atau push schema.

Karena kita tidak bisa menjalankan command terminal langsung di Vercel production dengan mudah untuk `prisma db push`, cara termudah adalah:

**Opsi A: Koneksi dari Lokal (Jika database bisa diakses publik)**
1.  Ganti `DATABASE_URL` di file `.env` lokal Anda dengan URL database production.
2.  Jalankan:
    ```bash
    npx prisma db push
    ```
    *Ini akan membuat tabel-tabel di database production.*
3.  (Opsional) Jika ingin data awal (seeding):
    ```bash
    npm run seed:settings
    ```

**Opsi B: Menggunakan Vercel Console (Jika tersedia)**
Beberapa integrasi Vercel memungkinkan query SQL langsung, tapi `prisma db push` paling mudah dari lokal.

## Troubleshooting Umum

*   **Error `PrismaClientInitializationError`**: Pastikan `DATABASE_URL` benar dan database bisa diakses.
*   **Error Build**: Cek logs di Vercel. Pastikan `prisma generate` berjalan sebelum build (sudah dihandle di `vercel.json`).
