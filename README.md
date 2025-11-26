
-----

# 🚀 Onboarding Guide: Kuitansi dApps

Panduan instalasi cepat untuk tim developer. Karena konfigurasi (`.env`) sudah disertakan, kalian tinggal install dependency dan jalankan.

## 📋 1. Persiapan Awal (Wajib)

Pastikan laptop kalian sudah terinstall:

1.  **Node.js** (Versi 18 ke atas).
2.  **MySQL Database** (Nyalakan XAMPP / Laragon).
3.  **Git**.

-----

## 📥 2. Clone Repository

Buka terminal (Command Prompt / PowerShell / Terminal), lalu jalankan:

```bash
git clone https://github.com/rikokurnia/kuitansi-dapps.git
cd kuitansi-dapps
```

-----

## 🗄️ 3. Setup Database (Sekali Saja)

1.  Buka **phpMyAdmin** (http://localhost/phpmyadmin) atau TablePlus/DBeaver.
2.  Buat database baru dengan nama persis: **`receipt_audit_db`**
3.  *Jangan buat tabel manual, Prisma yang akan mengisinya.*

⚠️ **Catatan Penting soal Database:**
File `.env` di repo ini menggunakan setting default XAMPP (User: `root`, Password: `kosong`).

  * Jika MySQL kalian ada passwordnya, silakan edit file `receipt-audit-dapp/.env` di bagian `DATABASE_URL`.

-----

## ⚙️ 4. Setup Backend (Server)

Buka terminal baru, masuk ke folder backend:

```bash
cd receipt-audit-dapp

# 1. Install Library (Wajib, karena node_modules tidak di-upload)
npm install

# 2. Sinkronisasi Database (Ini akan membuat tabel otomatis di MySQL kalian)
npx prisma generate
npx prisma db push

# 3. Jalankan Server
npm run dev
```

✅ *Backend siap di: `http://localhost:3000`*

-----

## 🎨 5. Setup Frontend (Tampilan)

Buka terminal **baru lagi** (jangan matikan terminal backend), masuk ke folder frontend:

```bash
cd blockchain-receipt

# 1. Install Library
npm install

# 2. Jalankan Frontend
npm run dev
```

✅ *Frontend siap di: `http://localhost:5173`*

-----

## 🔑 Catatan Penting (Environment Variables)

File **`.env` sudah disertakan** di dalam repository ini agar kalian tidak perlu setup ulang API Key.

  * **JANGAN MENGHAPUS** file `.env`.
  * **JANGAN MENGUBAH** `GOOGLE_AI_API_KEY` sembarangan kecuali limit habis.
  * Jika kalian mengubah config database di `.env` (misal nambah password), **HATI-HATI SAAT PUSH**. Perubahan kalian akan tertimpa ke teman lain. Disarankan jangan commit perubahan `.env` jika itu hanya untuk config lokal kalian.

-----
