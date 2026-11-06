# Design System: Dummy Store

Sumber desain utama project ini. Baca file ini sebelum menulis atau mengubah UI.

- **Token kode:** `src/app/globals.css`. Jika nilai di sini berubah, ubah di sana juga.
- **Aturan per halaman:** `design-system/dummy-store/pages/<halaman>.md`. Jika file itu ada, aturannya mengalahkan file ini.
- **Nama toko:** "Dummy Store" masih sementara.

## 1. Arah desain

| Aspek | Keputusan |
| --- | --- |
| Produk | Toko online baju, celana, bandana, dan merchandise |
| Gaya | SaaS clean, berbasis Minimalism & Swiss Style |
| Karakter | Bersih, lega, fungsional, kontras tinggi, berbasis grid |
| Prinsip utama | UI netral dan foto produk yang memberi warna |
| Dial generator | Variance 3, Motion 3, Density 5 |

Sumber: UI UX Pro Max. Gaya dan dial berasal dari generator `--design-system`. Palet memakai profil "SaaS (General)", dan tipografi memakai "Friendly SaaS". Palet hijau-mint bawaan generator tidak dipakai karena tidak sesuai arah SaaS.

## 2. Warna

Selalu pakai token semantik. Jangan menulis hex atau warna bawaan Tailwind seperti `bg-blue-600` di komponen.

| Token | Terang | Gelap | Kegunaan |
| --- | --- | --- | --- |
| `background` | `#F8FAFC` | `#0F172A` | Latar halaman |
| `foreground` | `#1E293B` | `#F1F5F9` | Teks utama |
| `card` | `#FFFFFF` | `#1E293B` | Permukaan kartu |
| `card-foreground` | `#1E293B` | `#F1F5F9` | Teks di kartu |
| `popover` | `#FFFFFF` | `#1E293B` | Dropdown, dialog |
| `popover-foreground` | `#1E293B` | `#F1F5F9` | Teks di popover |
| `primary` | `#2563EB` | `#60A5FA` | Aksi utama, link |
| `primary-hover` | `#1D4ED8` | `#93C5FD` | Hover aksi utama |
| `primary-foreground` | `#FFFFFF` | `#0F172A` | Teks di atas primary |
| `secondary` | `#E9EFF8` | `#334155` | Aksi sekunder |
| `secondary-foreground` | `#1E293B` | `#F1F5F9` | Teks di atas secondary |
| `muted` | `#E9EFF8` | `#334155` | Latar redup, skeleton |
| `muted-foreground` | `#475569` | `#CBD5E1` | Teks pendukung |
| `accent` | `#EA580C` | `#FB923C` | Promo dan diskon saja |
| `accent-foreground` | `#000000` | `#000000` | Teks di atas accent |
| `destructive` | `#DC2626` | `#F87171` | Error, hapus |
| `destructive-foreground` | `#FFFFFF` | `#0F172A` | Teks di atas destructive |
| `success` | `#15803D` | `#4ADE80` | Berhasil, stok tersedia |
| `success-foreground` | `#FFFFFF` | `#0F172A` | Teks di atas success |
| `warning` | `#B45309` | `#FBBF24` | Stok menipis |
| `warning-foreground` | `#FFFFFF` | `#0F172A` | Teks di atas warning |
| `border` | `#E2E8F0` | `#334155` | Garis dekoratif |
| `input` | `#64748B` | `#94A3B8` | Garis field form |
| `ring` | `#2563EB` | `#60A5FA` | Focus ring |

Aturan penggunaan:

- Satu layar hanya punya satu aksi utama `primary`.
- `accent` hanya sebagai latar badge promo. Teks di atasnya wajib `accent-foreground` (hitam), karena teks putih hanya 3,56:1 dan gagal WCAG.
- `border` hanya untuk pemisah dekoratif. Batas field form wajib `input` agar kontrasnya minimal 3:1.
- Status tidak boleh hanya dibedakan warna. Tambahkan teks atau ikon.

Kontras teks dan batas field sudah diuji pada 2026-11-06 dan memenuhi WCAG AA di kedua tema. Kontras terendah untuk teks adalah 4,83:1 (`destructive` terang).

Mode gelap: token sudah tersedia lewat class `.dark`, tetapi tombol pengalihnya belum dibuat, jadi website tampil terang. Varian `dark:` dikunci ke class `.dark`, bukan setelan OS.

## 3. Tipografi

- **Font:** Plus Jakarta Sans untuk judul dan isi, dimuat dengan `next/font/google` di `src/app/layout.tsx`. Jangan memakai tag `<link>` font.
- **Bobot:** 400 isi, 500 label, 600 judul dan tombol, 700 judul hero.

| Peran | Mobile | Desktop (`lg`) | Kelas |
| --- | --- | --- | --- |
| Display (hero) | 36px | 48px | `text-4xl lg:text-5xl font-bold tracking-tight` |
| H1 halaman | 30px | 36px | `text-3xl lg:text-4xl font-semibold tracking-tight` |
| H2 section | 24px | 30px | `text-2xl lg:text-3xl font-semibold tracking-tight` |
| H3 kartu | 18px | 20px | `text-lg lg:text-xl font-semibold` |
| Isi | 16px | 16px | `text-base leading-relaxed` |
| Pendukung | 14px | 14px | `text-sm text-muted-foreground` |
| Keterangan | 12px | 12px | `text-xs`, hanya untuk metadata singkat |
| Harga | 16-24px | 16-24px | `font-semibold tabular-nums` |

Aturan:

- Teks isi minimal 16px, dengan tinggi baris 1.5 sampai 1.75.
- Lebar teks panjang maksimal 65-75 karakter (`max-w-prose`).
- Teks input minimal 16px agar iOS tidak melakukan zoom otomatis.
- Urutan heading tidak boleh melompat, dan tiap halaman hanya punya satu `h1`.
- Harga ditulis dengan format Rupiah `Intl.NumberFormat('id-ID')`.

## 4. Spacing

Memakai kelipatan 4px sesuai skala Tailwind. Hindari nilai arbitrer seperti `p-[13px]`.

| Level | Nilai | Kelas |
| --- | --- | --- |
| Rapat, ikon dan teks | 8px | `gap-2` |
| Dalam komponen | 12-16px | `gap-3`, `p-4` |
| Antar elemen dalam kartu | 16-24px | `gap-4`, `p-6` |
| Judul section ke isi | 32px | `mb-8` |
| Antar section | 48 / 64 / 96px | `py-12 md:py-16 lg:py-24` |

## 5. Radius

| Token | Nilai | Kegunaan |
| --- | --- | --- |
| `rounded-sm` | 4px | Checkbox, elemen kecil |
| `rounded-md` | 6px | Badge, tag |
| `rounded-lg` | 8px | Tombol, input, dropdown |
| `rounded-xl` | 12px | Kartu, gambar produk |
| `rounded-2xl` | 16px | Dialog, panel besar |
| `rounded-full` | Penuh | Avatar, tombol ikon bulat, swatch warna |

Semua nilai diturunkan dari `--radius` (8px) di `globals.css`.

## 6. Grid dan layout

- **Container:** `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` (lebar maksimal 1280px).
- **Teks panjang dan form:** `max-w-prose` atau `max-w-xl`.

| Elemen | Mobile | `md` | `lg` | `xl` |
| --- | --- | --- | --- | --- |
| Grid produk katalog | 2 kolom | 3 kolom | 3 kolom + sidebar filter | 4 kolom |
| Grid produk beranda | 2 kolom | 2 kolom | 4 kolom | 4 kolom |
| Celah grid produk | 16px | 24px | 24px | 24px |
| Detail produk | 1 kolom | 1 kolom | 2 kolom | 2 kolom |
| Checkout | 1 kolom | 1 kolom | Form 2/3 + ringkasan 1/3 | Sama |

Lapisan z-index:

| Kelas | Lapisan |
| --- | --- |
| `z-10` | Elemen menempel di dalam konten |
| `z-20` | Header sticky |
| `z-30` | Bar CTA bawah mobile |
| `z-40` | Drawer dan overlay |
| `z-50` | Dialog, toast |

## 7. Tombol

Dasar: `inline-flex items-center justify-center gap-2 rounded-lg font-semibold cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`.

| Varian | Kelas | Kegunaan |
| --- | --- | --- |
| Primary | `bg-primary text-primary-foreground hover:bg-primary-hover` | Tambah ke keranjang, bayar |
| Secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/70` | Aksi pendamping |
| Outline | `border border-input bg-transparent hover:bg-muted` | Filter, aksi netral |
| Ghost | `bg-transparent hover:bg-muted` | Navigasi, ikon |
| Destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Hapus |
| Link | `text-primary underline-offset-4 hover:underline` | Tautan dalam teks |

| Ukuran | Tinggi | Kelas |
| --- | --- | --- |
| `sm` | 36px | `h-9 px-3 text-sm`, hanya di desktop |
| `md` (default) | 44px | `h-11 px-5 text-base` |
| `lg` | 48px | `h-12 px-6 text-base` |
| Ikon | 44 x 44px | `size-11`, wajib `aria-label` |

Aturan:

- Target sentuh di mobile minimal 44 x 44px, dengan jarak antar target minimal 8px.
- Saat proses berjalan, tombol dinonaktifkan dan menampilkan spinner, dengan lebar tetap.
- Efek tekan tidak boleh menggeser layout. Gunakan `active:scale-[0.98]` paling besar.
- Aksi `accent` tidak dipakai untuk tombol.

## 8. Kartu

Dasar: `rounded-xl border border-border bg-card text-card-foreground`.

- **Kartu umum:** padding `p-4` di mobile dan `p-6` mulai `md`, tanpa bayangan.
- **Kartu produk:**
  - Seluruh kartu adalah satu link ke detail produk.
  - Gambar rasio 4:5 (`aspect-[4/5]`) dengan `object-cover`, memakai `next/image`.
  - Urutan isi: nama (maksimal 2 baris), harga, lalu badge bila ada.
  - Hover: `hover:shadow-md` dan gambar `scale-[1.03]`, durasi 200ms.
  - Di perangkat sentuh, informasi tidak boleh hanya muncul saat hover.
- **Badge:** `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold`.
- **Skeleton:** `animate-pulse rounded-xl bg-muted` dengan ukuran sama seperti konten akhir.

Kedalaman memakai `shadow-sm`, `shadow-md`, dan `shadow-lg` saja, secukupnya. Hindari glassmorphism dan gradien dekoratif.

## 9. Form

- **Input:** `h-11 w-full rounded-lg border border-input bg-card px-3 text-base placeholder:text-muted-foreground`.
- **Label:** selalu terlihat di atas field, `text-sm font-medium`. Placeholder bukan pengganti label.
- **Wajib diisi:** tandai dengan `*` dan `required`.
- **Bantuan:** `text-sm text-muted-foreground` di bawah field.
- **Error:** `text-sm text-destructive` di bawah field, terhubung lewat `aria-describedby`, dengan `aria-invalid` di field. Pesan menyebut penyebab dan cara memperbaiki.
- **Validasi:** saat `blur`, bukan saat mengetik.
- **Setelah submit gagal:** pindahkan fokus ke field pertama yang salah, atau ke ringkasan error jika errornya banyak.
- **Mobile:** gunakan `type`, `inputMode`, dan `autoComplete` yang tepat, misalnya `tel`, `email`, dan `postal-code`.
- **Pengelompokan:** field terkait memakai `fieldset` dan `legend`. Checkout multi-langkah menampilkan indikator langkah dan tombol kembali.

## 10. Responsive

Memakai breakpoint bawaan Tailwind dan selalu mobile-first: tulis gaya mobile dulu, lalu tambahkan `md:` dan seterusnya.

| Prefix | Lebar | Perangkat |
| --- | --- | --- |
| (tanpa) | 0px | Ponsel |
| `sm` | 640px | Ponsel besar |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Desktop besar |

Aturan:

- Tidak boleh ada scroll horizontal pada halaman di lebar 360px.
- Gunakan `min-h-dvh`, bukan `h-screen`.
- Jangan menonaktifkan zoom.
- Navigasi: menu drawer di bawah `lg`, navigasi horizontal mulai `lg`.
- Filter produk: drawer di bawah `lg`, sidebar mulai `lg`.
- CTA detail produk: bar menempel di bawah pada mobile, dan konten diberi ruang agar tidak tertutup.
- Elemen sticky tidak boleh menutupi elemen yang sedang difokus.
- Tabel lebar berubah menjadi daftar kartu di mobile.
- Wajib dicek di 360, 768, 1024, dan 1440 px.

## 11. Animasi dan ikon

| Peran | Durasi |
| --- | --- |
| Hover, tekan | 150-200ms |
| Dropdown, drawer masuk | 200-300ms |
| Elemen keluar | 60-70% durasi masuk |
| Reveal saat scroll | 300-400ms, geser 8-16px |

- **Library:** `motion` yang sudah terpasang, diimpor dari `motion/react`, hanya di Client Component. Saran GSAP dari generator tidak dipakai agar tidak menambah dependency.
- Animasikan `transform` dan `opacity` saja, maksimal 1-2 elemen kunci per tampilan.
- Wajib menghormati `prefers-reduced-motion`.
- Konten penting untuk SEO tidak boleh tersembunyi menunggu animasi.
- **Ikon:** `lucide-react` (dipasang saat pertama dibutuhkan), satu set saja, ukuran 16, 20, atau 24px, ketebalan garis konsisten. Jangan memakai emoji sebagai ikon.
- Ikon dekoratif memakai `aria-hidden="true"`. Tombol ikon wajib punya nama aksesibel.

## 12. Aturan komponen dari 21st

Komponen dari 21st wajib disesuaikan sebelum dipakai:

1. Ganti warna tetap (`bg-zinc-900`, `text-gray-500`, hex) dengan token semantik di atas.
2. Sesuaikan radius, tinggi tombol, dan spacing dengan file ini.
3. Hapus gradien, glow, atau glassmorphism yang tidak sesuai gaya.
4. Tambahkan `'use client'` hanya pada komponen yang memakai state, efek, atau `motion`.
5. Ganti `<img>` dengan `next/image`.
6. Cek label, keyboard, fokus, dan `prefers-reduced-motion`.
7. Cek tampilan di 360 px dan pastikan tidak ada scroll horizontal.

## 13. Struktur halaman utama

Berdasarkan pola "Feature-Rich Showcase", disesuaikan untuk toko: Hero dengan satu pesan dan CTA, kategori, produk unggulan, keunggulan toko, lalu CTA penutup.

## 14. Checklist sebelum selesai

- [ ] Tidak ada hex atau warna bawaan Tailwind di komponen
- [ ] Tidak ada emoji sebagai ikon
- [ ] Semua elemen klik punya hover, fokus, dan `cursor-pointer`
- [ ] Focus ring terlihat saat navigasi keyboard
- [ ] Target sentuh minimal 44 x 44px di mobile
- [ ] Gambar punya `alt` dan ukuran yang dicadangkan
- [ ] `prefers-reduced-motion` dihormati
- [ ] Tidak ada scroll horizontal di 360px
- [ ] Dicek di 360, 768, 1024, dan 1440 px
