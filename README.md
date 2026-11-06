# Modern Ecommerce

Toko online baju, celana, bandana, dan merchandise. Dibangun dengan Next.js (App Router), React, TypeScript, dan Tailwind CSS.

Frontend saat ini memakai data contoh. Backend Express menyusul.

## Menjalankan project

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server development |
| `npm run build` | Membuat build production |
| `npm run start` | Menjalankan hasil build |
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
| `src/services` | Akses data. Saat API Express siap, cukup ganti isi file di sini |
| `src/content` | Teks bantuan |
| `src/lib` | Helper: format harga, ongkir, SEO, konfigurasi situs |

## Sebelum deploy

Salin `.env.example` menjadi `.env.local`, lalu isi `NEXT_PUBLIC_SITE_URL` dengan domain asli. Nilai ini dipakai untuk canonical, sitemap, dan data terstruktur.
