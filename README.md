# Modern Ecommerce

Toko online baju, celana, bandana, dan merchandise.

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Express 5 di folder `server/`, dengan SQLite

Data produk masih contoh, dan pembayaran belum aktif.

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
| POST | `/api/orders` | Membuat pesanan |

`POST /api/orders` hanya menerima referensi produk. Harga, ongkir, dan stok selalu dihitung dari database.

## Sebelum deploy

1. Salin `.env.example` menjadi `.env.local`, lalu isi `NEXT_PUBLIC_SITE_URL` dan `NEXT_PUBLIC_API_URL` dengan domain asli.
2. Salin `server/.env.example` menjadi `server/.env`, lalu isi `CORS_ORIGINS` dengan domain frontend.
3. Ganti SQLite dengan database server seperti PostgreSQL. SQLite bawaan Node masih eksperimental dan hanya cocok untuk satu server.
