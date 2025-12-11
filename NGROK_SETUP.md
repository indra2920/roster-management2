# Panduan Setup Ngrok untuk Roster Management

Panduan ini akan membantu Anda mengaktifkan **ngrok** agar aplikasi Roster Management dapat diakses dari luar jaringan lokal Anda.

## 📋 Apa itu Ngrok?

Ngrok adalah tool yang membuat secure tunnel dari internet publik ke aplikasi lokal Anda. Dengan ngrok, Anda dapat:
- Mengakses aplikasi lokal dari internet
- Share aplikasi dengan orang lain untuk testing
- Mengakses aplikasi dari perangkat mobile
- Testing webhook dan integrasi eksternal

## 🚀 Langkah 1: Download dan Install Ngrok

### Windows

1. **Download Ngrok**
   - Kunjungi: https://ngrok.com/download
   - Pilih versi Windows
   - Download file ZIP

2. **Extract File**
   - Extract file `ngrok.zip` ke folder pilihan Anda
   - Contoh: `C:\ngrok\` atau `D:\tools\ngrok\`

3. **Tambahkan ke PATH (Opsional)**
   - Buka System Properties → Environment Variables
   - Edit variabel `Path`
   - Tambahkan folder ngrok (contoh: `C:\ngrok\`)
   - Atau jalankan langsung dari folder ngrok

## 🔑 Langkah 2: Setup Autentikasi

1. **Daftar Akun Ngrok (Gratis)**
   - Kunjungi: https://dashboard.ngrok.com/signup
   - Daftar dengan email atau Google/GitHub

2. **Dapatkan Authtoken**
   - Setelah login, buka: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy authtoken Anda

3. **Konfigurasi Authtoken**
   
   Buka PowerShell atau Command Prompt, lalu jalankan:
   ```powershell
   # Jika ngrok sudah di PATH
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   
   # Atau jika belum di PATH, jalankan dari folder ngrok
   cd C:\ngrok
   .\ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```
   
   Ganti `<YOUR_AUTHTOKEN>` dengan token yang Anda copy.

## 🌐 Langkah 3: Menjalankan Ngrok

### Metode 1: Basic Tunnel (Paling Mudah)

1. **Jalankan Aplikasi Roster Management**
   ```powershell
   cd "d:\project\roster management"
   npm run dev
   ```
   
   Aplikasi akan berjalan di `http://localhost:3000`

2. **Buka Terminal/PowerShell Baru**
   
   Jangan tutup terminal aplikasi, buka terminal baru:
   ```powershell
   # Jika ngrok sudah di PATH
   ngrok http 3000
   
   # Atau dari folder ngrok
   cd C:\ngrok
   .\ngrok http 3000
   ```

3. **Dapatkan URL Publik**
   
   Ngrok akan menampilkan informasi seperti ini:
   ```
   Session Status                online
   Account                       your-email@example.com
   Version                       3.x.x
   Region                        Asia Pacific (ap)
   Forwarding                    https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3000
   ```
   
   **Copy URL** yang ada di bagian `Forwarding` (contoh: `https://xxxx-xxxx-xxxx.ngrok-free.app`)

4. **Akses Aplikasi**
   - Buka browser
   - Paste URL ngrok
   - Klik "Visit Site" jika ada warning ngrok
   - Aplikasi Anda sekarang dapat diakses dari mana saja!

### Metode 2: Custom Domain (Berbayar)

Jika Anda memiliki akun ngrok berbayar, Anda bisa menggunakan custom domain:
```powershell
ngrok http --domain=your-domain.ngrok.app 3000
```

## 📱 Mengakses dari Perangkat Lain

Setelah ngrok berjalan:
1. Copy URL publik dari ngrok (contoh: `https://xxxx-xxxx.ngrok-free.app`)
2. Buka URL tersebut di:
   - Smartphone Anda
   - Laptop teman
   - Komputer di jaringan lain
3. Semua akan dapat mengakses aplikasi Anda!

## ⚙️ Tips dan Trik

### Menjaga Tunnel Tetap Aktif

Tunnel ngrok akan tetap aktif selama:
- Terminal ngrok tidak ditutup
- Komputer tidak dimatikan
- Koneksi internet stabil

### Menggunakan Config File

Untuk konfigurasi yang lebih advanced, buat file `ngrok.yml`:

```yaml
version: "2"
authtoken: <YOUR_AUTHTOKEN>
tunnels:
  roster-app:
    proto: http
    addr: 3000
    inspect: true
```

Jalankan dengan:
```powershell
ngrok start roster-app
```

### Melihat Request Logs

Ngrok menyediakan web interface untuk monitoring:
- Buka browser: `http://localhost:4040`
- Lihat semua HTTP request yang masuk
- Berguna untuk debugging

## 🔒 Keamanan

> [!WARNING]
> Aplikasi Anda akan dapat diakses dari internet publik!

**Penting untuk diperhatikan:**

1. **Jangan share URL sembarangan**
   - URL ngrok dapat diakses siapa saja yang memiliki link
   - Hanya share dengan orang yang Anda percaya

2. **Gunakan Autentikasi**
   - Pastikan aplikasi memiliki sistem login
   - Roster Management sudah memiliki NextAuth

3. **Monitor Akses**
   - Cek ngrok dashboard: https://dashboard.ngrok.com
   - Lihat siapa saja yang mengakses

4. **Matikan Saat Tidak Digunakan**
   - Tekan `Ctrl+C` di terminal ngrok untuk stop
   - Tunnel akan langsung terputus

5. **Akun Gratis Limitations**
   - URL berubah setiap kali restart ngrok
   - Maksimal 1 tunnel aktif
   - Ada warning page sebelum akses aplikasi

## 🐛 Troubleshooting

### Error: "command not found: ngrok"

**Solusi:**
- Pastikan ngrok sudah di-extract
- Jalankan dari folder ngrok: `cd C:\ngrok` lalu `.\ngrok`
- Atau tambahkan ke PATH

### Error: "authentication failed"

**Solusi:**
- Pastikan authtoken sudah dikonfigurasi
- Jalankan ulang: `ngrok config add-authtoken <YOUR_AUTHTOKEN>`
- Cek di: `%USERPROFILE%\.ngrok2\ngrok.yml`

### Error: "tunnel not found"

**Solusi:**
- Pastikan aplikasi Next.js sudah berjalan di port 3000
- Cek dengan buka `http://localhost:3000` di browser
- Pastikan tidak ada aplikasi lain yang menggunakan port 3000

### URL Ngrok Tidak Bisa Diakses

**Solusi:**
- Cek koneksi internet
- Pastikan firewall tidak memblokir ngrok
- Restart ngrok tunnel

### Aplikasi Lambat

**Solusi:**
- Ngrok gratis mungkin lebih lambat
- Coba region yang lebih dekat:
  ```powershell
  ngrok http 3000 --region ap  # Asia Pacific
  ngrok http 3000 --region us  # United States
  ngrok http 3000 --region eu  # Europe
  ```

## 📊 Monitoring dan Analytics

### Ngrok Dashboard

1. Login ke: https://dashboard.ngrok.com
2. Lihat:
   - Active tunnels
   - Request count
   - Bandwidth usage
   - Endpoint status

### Local Web Interface

Saat ngrok berjalan:
- Buka: http://localhost:4040
- Fitur:
  - Request history
  - Request/response details
  - Replay requests
  - Status metrics

## 🎯 Contoh Penggunaan

### Scenario 1: Testing dari HP

```powershell
# Terminal 1: Jalankan aplikasi
cd "d:\project\roster management"
npm run dev

# Terminal 2: Jalankan ngrok
ngrok http 3000

# Buka URL ngrok di HP Anda
# Contoh: https://abc123.ngrok-free.app
```

### Scenario 2: Demo ke Client

```powershell
# Jalankan dengan region terdekat client
ngrok http 3000 --region us

# Share URL ke client
# Client bisa langsung akses tanpa setup apapun
```

### Scenario 3: Development dengan Team

```powershell
# Jalankan ngrok
ngrok http 3000

# Share URL ke team
# Team bisa test fitur terbaru real-time
```

## 🔄 Alternatif Ngrok

Jika Anda butuh solusi lain:

1. **Cloudflare Tunnel** (Gratis, unlimited)
   - Lebih stabil untuk production
   - Setup lebih kompleks

2. **LocalTunnel** (Gratis, open source)
   - Lebih sederhana
   - Kurang fitur

3. **Serveo** (Gratis)
   - Menggunakan SSH
   - Tidak perlu install

4. **Deploy ke VPS/Cloud** (Untuk production)
   - Lihat: `DEPLOYMENT_VPS.md`
   - Lebih cocok untuk 24/7 access

## 📞 Bantuan Lebih Lanjut

- **Dokumentasi Ngrok:** https://ngrok.com/docs
- **Community Forum:** https://ngrok.com/community
- **Support:** https://ngrok.com/support

---

## ✅ Quick Start Checklist

- [ ] Download dan extract ngrok
- [ ] Daftar akun ngrok gratis
- [ ] Setup authtoken
- [ ] Jalankan `npm run dev`
- [ ] Jalankan `ngrok http 3000`
- [ ] Copy URL publik
- [ ] Test akses dari perangkat lain
- [ ] Bookmark URL ngrok dashboard

**Selamat! Aplikasi Anda sekarang dapat diakses dari mana saja! 🎉**
