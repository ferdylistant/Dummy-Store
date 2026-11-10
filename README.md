# Modern Ecommerce

Toko online baju, celana, bandana, dan merchandise.

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Express 5 di folder `server/`, dengan PostgreSQL lewat Kysely

Data produk masih contoh. Pembayaran memakai Midtrans Snap, mulai dari mode sandbox.

## Menjalankan project

```bash
npm install
npm run dev
```

Perintah ini menjalankan frontend dan API sekaligus. Buka http://localhost:3000, dan API berjalan di http://localhost:4000. Database PostgreSQL dibuat dan diisi otomatis di `server/data/pglite` memakai PGlite, jadi tidak ada yang perlu diinstal. PGlite hanya boleh dibuka satu proses, jadi jangan menjalankan dua API dengan folder yang sama.

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
| GET | `/api/settings` | Pengaturan toko yang tampil di toko: nama, email, logo, teks promo, ongkir tetap |
| GET | `/api/home` | Isi beranda: rel hero, kategori dengan produk sampul, unggulan, baru, dan diskon |
| GET | `/api/media/:id` | Gambar yang diunggah dari dashboard |
| * | `/api/admin/*` | Dashboard admin: ringkasan, produk, kategori, pesanan, pelanggan, pengaturan. Wajib akun admin |
| POST | `/api/shipping/rates` | Pilihan pengiriman untuk keranjang dan desa tujuan, dihitung di server |
| GET | `/api/config` | Fitur yang aktif: pembayaran, pencarian wilayah, login Google |
| GET | `/api/regions/children?parent=` | Daftar provinsi, lalu kota/kabupaten, kecamatan, dan desa/kelurahan beserta kode posnya |
| GET | `/api/regions?q=` | Cari area Biteship (cadangan untuk ongkir nanti) |
| * | `/api/auth/*` | Daftar, masuk, konfirmasi email, lupa password (Better Auth) |
| * | `/api/admin-auth/*` | Masuk dashboard. Akun sama, sesi terpisah (cookie `dsa`), hanya admin, tanpa daftar |
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
- **Wilayah**: provinsi sampai desa/kelurahan dan kode posnya berasal dari data Kepmendagri 2025 di `server/resources/regions.tsv.gz` (lisensi MIT, lihat `REGIONS-LICENSE.md`). Data dimuat otomatis ke database dan tidak butuh kunci apa pun. Untuk memperbarui data, jalankan `npm run regions:build -w server`. Alamat dan pesanan hanya menyimpan kode desa, lalu server mengisi nama wilayah dan kode pos dari data itu.
- **Ongkir (Biteship)**: isi `BITESHIP_API_KEY`, lalu isi alamat toko di dashboard (Pengaturan, Alamat toko). Checkout lalu menampilkan tarif tiap kurir dari kode pos desa toko ke kode pos desa pembeli, dengan berat dari tiap produk. Kurir yang ditanya bisa diatur dengan `BITESHIP_COURIERS` dan harus aktif di akun Biteship. Saat belanja mencapai minimum gratis ongkir, kurir termurah menjadi gratis. Selama kunci atau alamat toko belum diisi, atau Biteship sedang gagal, checkout memakai tarif tetap Reguler dan Ekspres dari dashboard. Saat pesanan dibuat, server menghitung ulang ongkir dan menolak pilihan yang tidak ditawarkan.
- **BETTER_AUTH_SECRET**: wajib di production, minimal 32 karakter acak. Saat pengembangan, rahasia dibuat otomatis di `server/data/.auth-secret`.

Aturan akses dijaga di `src/proxy.ts` (dari cookie sesi) dan diperiksa lagi di setiap halaman:

- `/akun/...` dan `/checkout` hanya untuk yang sudah masuk. Tamu diarahkan ke `/masuk?next=...`.
- `/masuk`, `/daftar`, `/lupa-password`, dan `/atur-ulang-password` tanpa token hanya untuk tamu. Yang sudah masuk diarahkan ke akun.
- Tautan reset password dari email tetap bisa dibuka walau sedang masuk.
- Tujuan `?next=` hanya boleh halaman di situs ini (`src/lib/safe-next.ts`, diuji dengan `npm run test:web`).
- Data akun selalu diperiksa ulang oleh API, jadi proxy bukan satu-satunya pengaman.

Memesan wajib masuk akun. `/checkout` diarahkan ke `/masuk?next=/checkout`, keranjang tetap tersimpan di browser, dan API menolak pesanan tanpa sesi dengan `login_required`. Email pesanan selalu email akun. Pembeli bisa memakai alamat tersimpan dan menyimpan alamat baru.

## Deploy ke Vercel

Toko, API, dan dashboard menjadi **tiga project Vercel**. Browser hanya bicara dengan alamat toko dan alamat dashboard. Keduanya meneruskan `/api` ke project API, sehingga cookie login tetap milik domain masing-masing.

| Project | Repo | Root Directory | Framework |
| --- | --- | --- | --- |
| API | `Dummy-Store` | `server` | Other (diatur oleh `server/vercel.json`) |
| Toko | `Dummy-Store` | `.` (root) | Next.js |
| Dashboard | `Dummy-Store-Admin` | `.` (root) | Next.js |

Contoh di bawah memakai `toko.vercel.app`, `api-toko.vercel.app`, dan `admin-toko.vercel.app`. Ganti dengan alamat project Anda.

### 1. Database Neon

1. Buat project di https://neon.tech. Pilih region **Singapore** (`aws-ap-southeast-1`) supaya dekat dengan Vercel `sin1`.
2. Salin connection string yang **pooled** (host-nya mengandung `-pooler`, diakhiri `?sslmode=require`).
3. Tidak perlu membuat tabel. Migrasi, produk contoh, dan data wilayah dibuat otomatis saat API pertama kali dipanggil. Panggilan pertama itu bisa memakan waktu sampai sekitar satu menit.

### 2. Project API

Import repo `Dummy-Store`, ubah **Root Directory** menjadi `server`, lalu isi Environment Variables:

| Variabel | Isi |
| --- | --- |
| `DATABASE_URL` | Connection string Neon (pooled) |
| `BETTER_AUTH_SECRET` | Acak, minimal 32 karakter. Buat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `API_URL` | `https://api-toko.vercel.app` |
| `SITE_URL`, `CORS_ORIGINS`, `STORE_AUTH_URL` | `https://toko.vercel.app` |
| `ADMIN_URL`, `ADMIN_AUTH_URL` | `https://admin-toko.vercel.app` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Akun admin dashboard. Di production tidak ada akun bawaan |
| `STORE_REVALIDATE_SECRET` | Acak. Isi yang sama di project toko sebagai `REVALIDATE_SECRET` |
| `CRON_SECRET` | Acak. Vercel memakainya untuk memanggil `/api/cron/expire` setiap hari pukul 02.00 WIB |
| `TRUST_PROXY` | `1` |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Kunci Midtrans. `false` untuk sandbox |
| `RESEND_API_KEY`, `MAIL_FROM` | Email konfirmasi dan atur ulang password |
| `BITESHIP_API_KEY`, `BITESHIP_COURIERS` | Opsional, untuk ongkir kurir |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Opsional. Redirect URI: `https://toko.vercel.app/api/auth/callback/google` |

Setelah deploy, buka `https://api-toko.vercel.app/health`. Jawaban `{"status":"ok"}` berarti API dan database tersambung.

Di dashboard Midtrans, atur **Payment Notification URL** ke `https://api-toko.vercel.app/api/payments/midtrans/notification`.

### 3. Project toko

Import repo `Dummy-Store` dengan Root Directory root, lalu isi:

| Variabel | Isi |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` | `https://toko.vercel.app` (alamat toko sendiri, karena `/api` diteruskan) |
| `API_URL` | `https://api-toko.vercel.app` |
| `REVALIDATE_SECRET` | Sama dengan `STORE_REVALIDATE_SECRET` di project API |

### 4. Project dashboard

Import repo `Dummy-Store-Admin`, lalu isi:

| Variabel | Isi |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://admin-toko.vercel.app` (alamat dashboard sendiri) |
| `API_URL` | `https://api-toko.vercel.app` |
| `NEXT_PUBLIC_STORE_URL` | `https://toko.vercel.app` |

### Urutan yang disarankan

1. Deploy ketiga project sekali untuk mendapatkan alamatnya. Build pertama boleh gagal karena env belum lengkap.
2. Isi semua env di atas dengan alamat yang sudah didapat.
3. Redeploy API, lalu toko dan dashboard.
4. Buka `/health` di API, lalu coba daftar, masuk, dan pesan di toko.

### Catatan

- Variabel `NEXT_PUBLIC_*` dibaca saat build. Setelah mengubahnya, redeploy project itu.
- Batas permintaan (rate limit) disimpan per instance fungsi, jadi di Vercel sifatnya longgar.
- Di start-up pertama, log Better Auth bisa menulis "Database schema mismatch" sebelum tabelnya dibuat. Pesan itu hanya muncul sekali.
- Cron di paket Hobby berjalan sekali sehari. Pesanan yang lewat batas bayar juga dilepas setiap kali ada pesanan baru.
