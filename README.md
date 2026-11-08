# Modern Ecommerce

Toko online baju, celana, bandana, dan merchandise.

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Express 5 di folder `server/`, dengan SQLite

Data produk masih contoh. Pembayaran memakai Midtrans Snap, mulai dari mode sandbox.

## Menjalankan project

```bash
npm install
npm run dev
```

Perintah ini menjalankan frontend dan API sekaligus. Buka http://localhost:3000, dan API berjalan di http://localhost:4000. Database dibuat dan diisi otomatis di `server/data/store.db`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan frontend dan API |
| `npm run dev:web` | Menjalankan frontend saja |
| `npm run dev:api` | Menjalankan API saja |
| `npm test` | Menjalankan pengujian API |
| `npm run db:reset -w server` | Mengisi ulang database, semua pesanan terhapus |
| `npm run build` | Membuat build frontend, tanpa perlu API menyala |
| `npm run start` | Menjalankan hasil build, API harus menyala |
| `npm run lint` | Memeriksa kode dengan ESLint |
| `npm run typecheck` | Memeriksa tipe TypeScript |

## Design system

Baca `design-system/dummy-store/MASTER.md` sebelum menulis UI. Token kodenya ada di `src/app/globals.css`.

## Struktur

| Folder | Isi |
| --- | --- |
| `src/app` | Halaman, metadata, sitemap, robots, gambar OG |
| `src/components` | Komponen umum, layout, dan SEO |
| `src/features` | Fitur: `cart`, `catalog`, `checkout`, `home`, `products` |
| `src/services` | Klien API. Komponen hanya mengakses data lewat folder ini |
| `server/src` | API Express: rute, database, pesanan, pengujian |
| `src/content` | Teks bantuan |
| `src/lib` | Helper: format harga, ongkir, SEO, konfigurasi situs |

## API

| Metode | Alamat | Fungsi |
| --- | --- | --- |
| GET | `/health` | Status server |
| GET | `/api/categories` | Daftar kategori |
| GET | `/api/categories/:slug` | Detail kategori |
| GET | `/api/products` | Daftar produk dengan filter dan pagination |
| GET | `/api/products/facets` | Pilihan ukuran dan warna |
| GET | `/api/products/:slug` | Detail produk |
| GET | `/api/products/:slug/related` | Produk terkait |
| POST | `/api/orders` | Membuat pesanan dan tagihan Midtrans |
| GET | `/api/orders/:nomor` | Status pesanan, tanpa data pembeli |
| POST | `/api/payments/midtrans/notification` | Notifikasi pembayaran dari Midtrans |
| GET | `/api/config` | Fitur yang aktif: pembayaran, pencarian wilayah, login Google |
| GET | `/api/regions?q=` | Cari kecamatan atau kode pos lewat Biteship |
| * | `/api/auth/*` | Daftar, masuk, konfirmasi email, lupa password (Better Auth) |
| GET, POST, PUT, DELETE | `/api/me/addresses` | Alamat tersimpan milik pengguna yang masuk |
| GET, PUT | `/api/me/preferences` | Pengaturan notifikasi |
| GET | `/api/me/orders` | Riwayat pesanan |

`POST /api/orders` hanya menerima referensi produk. Harga, ongkir, dan stok selalu dihitung dari database.

## Pembayaran Midtrans

1. Salin `server/.env.example` menjadi `server/.env`, lalu isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` dari halaman Access Keys di dashboard Midtrans (mode Sandbox).
2. Jalankan ulang `npm run dev`. Log API menampilkan `Midtrans sandbox` jika kunci terbaca.
3. Atur **Payment Notification URL** di dashboard Midtrans ke `https://<alamat-publik>/api/payments/midtrans/notification`. Saat pengembangan lokal, pakai tunnel seperti ngrok.

Toko memakai Midtrans Core API, jadi nomor virtual account, kode bayar Mandiri, kode QR (QRIS, GoPay), dan tombol ShopeePay tampil di halaman toko sendiri lengkap dengan cara bayar per bank. Hanya kartu kredit yang membuka jendela Midtrans, karena verifikasi OTP 3D Secure harus berjalan di halaman bank. Batas bayar 24 jam untuk transfer dan 1 jam untuk QRIS serta dompet digital.

Di mode Sandbox, tagihan dibayar lewat simulator Midtrans di https://simulator.sandbox.midtrans.com. Untuk Production, Core API perlu diaktifkan dulu lewat dashboard atau tim Midtrans.

Tanpa notifikasi pun status tetap diperbarui, karena halaman status pesanan mengecek ke Midtrans selama pesanan belum dibayar. Pesanan yang lewat batas bayar dibatalkan dan stoknya dikembalikan.

## Akun, email, dan wilayah

Semua kunci di bawah ini diisi di `server/.env`. Tanpa kunci, fitur tetap jalan dalam mode pengembangan.

- **Email (Resend)**: isi `RESEND_API_KEY` dan `MAIL_FROM` dengan domain yang sudah diverifikasi di Resend. Tanpa kunci, email konfirmasi dan atur ulang password dicetak di log API, jadi tautannya bisa disalin dari sana.
- **Login Google**: buat OAuth Client ID di Google Cloud Console, isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`, dan daftarkan redirect URI `<API_URL>/api/auth/callback/google`. Tombol Google hanya muncul jika kunci ini diisi.
- **Wilayah (Biteship)**: isi `BITESHIP_API_KEY`. Kecamatan, kota, provinsi, dan kode pos lalu dipilih dari hasil pencarian. Tanpa kunci, kolom wilayah diisi manual.
- **BETTER_AUTH_SECRET**: wajib di production, minimal 32 karakter acak. Saat pengembangan, rahasia dibuat otomatis di `server/data/.auth-secret`.

Aturan akses dijaga di `src/proxy.ts` (dari cookie sesi) dan diperiksa lagi di setiap halaman:

- `/akun/...` hanya untuk yang sudah masuk. Tamu diarahkan ke `/masuk?next=...`.
- `/masuk`, `/daftar`, `/lupa-password`, dan `/atur-ulang-password` tanpa token hanya untuk tamu. Yang sudah masuk diarahkan ke akun.
- Tautan reset password dari email tetap bisa dibuka walau sedang masuk.
- Tujuan `?next=` hanya boleh halaman di situs ini (`src/lib/safe-next.ts`, diuji dengan `npm run test:web`).
- Data akun selalu diperiksa ulang oleh API, jadi proxy bukan satu-satunya pengaman.

Checkout tetap bisa tanpa akun. Pembeli yang masuk bisa memakai alamat tersimpan dan menyimpan alamat baru.

## Sebelum deploy

1. Salin `.env.example` menjadi `.env.local`, lalu isi `NEXT_PUBLIC_SITE_URL` dan `NEXT_PUBLIC_API_URL` dengan domain asli.
2. Salin `server/.env.example` menjadi `server/.env`, lalu isi `CORS_ORIGINS` dengan domain frontend.
3. Ganti SQLite dengan database server seperti PostgreSQL. SQLite bawaan Node masih eksperimental dan hanya cocok untuk satu server.
