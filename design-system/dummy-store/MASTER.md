# Design System: Dummy Store

Sumber desain utama project ini. Baca file ini sebelum menulis atau mengubah UI.

- **Token kode:** `src/app/globals.css`. Jika nilai di sini berubah, ubah di sana juga.
- **Aturan per halaman:** `design-system/dummy-store/pages/<halaman>.md`. Jika file itu ada, aturannya mengalahkan file ini.
- **Nama toko:** "Dummy Store" masih sementara.

## 1. Arah desain

| Aspek | Keputusan |
| --- | --- |
| Produk | Toko online baju, celana, bandana, dan merchandise |
| Gaya | Bersih dan premium seperti situs produk Apple, berbasis Minimalism & Swiss Style |
| Karakter | Putih, lega, tipografi besar, netral, tanpa bingkai dan gradien |
| Keunikan | Motif hang tag dan rel pakaian (lihat bagian 2) |
| Prinsip utama | Antarmuka diam dan produk yang bicara. Warna hanya datang dari produk |
| Dial generator | Variance 3, Motion 3, Density 3 |

Gaya ini hanya inspirasi. Jangan memakai logo, nama, ikon, atau aset Apple.

## 2. Ciri khas: hang tag

Toko ini punya satu benda khas, yaitu label baju yang digantung. Motif ini yang membuat tampilan tidak generik, jadi pakai dengan hemat.

- **`HangTagLink`** (`src/components/ui/hang-tag-link.tsx`): CTA utama berbentuk label berlubang dengan tali, yang berayun saat di-hover dan ditekan.
- **Hanya untuk satu CTA terpenting di halaman brand:** hero beranda dan halaman 404. Tombol fungsional seperti tambah ke keranjang tetap memakai pill biasa.
- **Rel pakaian** di hero beranda adalah elemen utama, dan label harganya memakai bahasa bentuk yang sama.
- **Logo dan favicon** memakai bentuk label yang sama.
- **`PaperTag`** (`src/components/ui/paper-tag.tsx`): label kertas dengan sudut terpotong dan lubang. Dipakai untuk harga di gambar produk dan kategori di footer.
- **FAQ:** `<details>` dengan utility `accordion` dan atribut `name`, pemisah jahitan yang menjadi benang utuh saat terbuka.
- **Label kain:** panel `muted` dengan garis jahitan di dalamnya, untuk Detail Produk. Isinya hanya data produk yang benar.
- **Kartu anggota:** label kertas besar yang tergantung di rel, di halaman Masuk, Daftar, dan pemulihan password (`AuthShell` di `src/features/auth/auth-shell.tsx`). Nama yang diketik di form Daftar ikut tertulis di label. Label berayun sekali saat muncul.
- **Halaman akun:** menu samping berupa garis jahitan putus-putus, dengan menu aktif dijahit benang utuh (di ponsel menjadi tab geser dengan jahitan di bawah). Ringkasan memakai kartu anggota bergaya label kain. Status pesanan selalu memakai ikon dan teks lewat `StatusChip`, dan tahap pesanan memakai `OrderProgress` (`src/features/account/order-parts.tsx`).
- **Jahitan:** garis putus-putus yang menjadi benang utuh. Dipakai untuk progres checkout dan tautan teks.

## 3. Warna

Selalu pakai token semantik. Jangan menulis hex atau warna bawaan Tailwind seperti `bg-blue-600` di komponen.

| Token | Terang | Gelap | Kegunaan |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | `#000000` | Latar halaman |
| `foreground` | `#1D1D1F` | `#F5F5F7` | Teks utama |
| `card` | `#FFFFFF` | `#1C1C1E` | Permukaan panel |
| `card-foreground` | `#1D1D1F` | `#F5F5F7` | Teks di panel |
| `popover` | `#FFFFFF` | `#1C1C1E` | Dropdown, dialog |
| `popover-foreground` | `#1D1D1F` | `#F5F5F7` | Teks di popover |
| `primary` | `#1D1D1F` | `#F5F5F7` | Aksi utama |
| `primary-hover` | `#000000` | `#FFFFFF` | Hover aksi utama |
| `primary-foreground` | `#FFFFFF` | `#1D1D1F` | Teks di atas primary |
| `secondary` | `#F5F5F7` | `#2C2C2E` | Aksi sekunder |
| `secondary-foreground` | `#1D1D1F` | `#F5F5F7` | Teks di atas secondary |
| `muted` | `#F5F5F7` | `#1C1C1E` | Tile produk, footer, skeleton |
| `muted-foreground` | `#6E6E73` | `#A1A1A6` | Teks pendukung |
| `accent` | `#B64400` | `#FF9F4A` | Teks label promo, "Baru", "Hemat" |
| `accent-foreground` | `#FFFFFF` | `#000000` | Teks di atas accent |
| `destructive` | `#D70015` | `#FF6961` | Error, hapus |
| `destructive-foreground` | `#FFFFFF` | `#000000` | Teks di atas destructive |
| `success` | `#1F7A35` | `#30D158` | Berhasil |
| `success-foreground` | `#FFFFFF` | `#000000` | Teks di atas success |
| `warning` | `#9A5B00` | `#FFD60A` | Stok menipis |
| `warning-foreground` | `#FFFFFF` | `#000000` | Teks di atas warning |
| `border` | `#E5E5EA` | `#38383A` | Garis tipis dekoratif |
| `input` | `#86868B` | `#86868B` | Garis field form |
| `ring` | `#1D1D1F` | `#F5F5F7` | Focus ring |

Aturan penggunaan:

- Satu layar hanya punya satu aksi utama `primary`.
- Label produk memakai teks `accent` kecil di atas nama produk, bukan badge di atas gambar.
- Jangan memakai warna biru untuk tautan. Tautan dibedakan lewat garis jahitan, bukan warna.
- `border` hanya untuk pemisah. Batas field form wajib `input` agar kontrasnya minimal 3:1.
- Status tidak boleh hanya dibedakan warna. Tambahkan teks atau ikon.

Kontras diuji pada 2026-11-06 dan memenuhi WCAG AA, termasuk di atas `muted`. Terendah untuk teks adalah 4,66:1 (`muted-foreground` di atas `muted`).

Mode gelap: token tersedia lewat class `.dark`, tetapi tombol pengalihnya belum dibuat, jadi website tampil terang. Varian `dark:` dikunci ke class `.dark`, bukan setelan OS.

## 4. Tipografi

- **Font:** Inter untuk judul dan isi, dimuat dengan `next/font/google` di `src/app/layout.tsx`. Jangan memakai tag `<link>` font.
- **Bobot:** 400 isi, 500 label, 600 judul dan tombol.
- Judul besar selalu `tracking-tight`, karena tipografi adalah elemen visual utama di gaya ini.

| Peran | Mobile | Desktop (`lg`) | Kelas |
| --- | --- | --- | --- |
| Display (hero) | 48px | 72px | `text-5xl lg:text-7xl font-semibold tracking-tight` |
| H1 halaman | 36px | 48px | `text-4xl lg:text-5xl font-semibold tracking-tight` |
| H2 section | 30px | 48px | `text-3xl lg:text-5xl font-semibold tracking-tight` |
| H3 kartu | 18px | 20px | `text-lg lg:text-xl font-semibold` |
| Isi | 16px | 16px | `text-base leading-relaxed` |
| Pendukung | 14px | 14px | `text-sm text-muted-foreground` |
| Keterangan | 12px | 12px | `text-xs`, hanya untuk metadata singkat |
| Harga | 14-24px | 14-24px | `tabular-nums` |

Aturan:

- Teks isi minimal 16px, dengan tinggi baris 1.5 sampai 1.75.
- Lebar teks panjang maksimal 65-75 karakter (`max-w-prose`).
- Teks input minimal 16px agar iOS tidak melakukan zoom otomatis.
- Urutan heading tidak boleh melompat, dan tiap halaman hanya punya satu `h1`.
- Harga ditulis dengan format Rupiah `Intl.NumberFormat('id-ID')`.

## 5. Spacing

Memakai kelipatan 4px sesuai skala Tailwind. Hindari nilai arbitrer seperti `p-[13px]`. Ruang kosong adalah bagian dari desain, jadi jarak antar section sengaja besar.

| Level | Nilai | Kelas |
| --- | --- | --- |
| Rapat, ikon dan teks | 8px | `gap-2` |
| Dalam komponen | 12-16px | `gap-3`, `p-4` |
| Dalam tile | 24-32px | `p-6 lg:p-8` |
| Judul section ke isi | 32-48px | `mb-8 lg:mb-12` |
| Antar section | 64 / 112px | `py-16 lg:py-28` |

## 6. Radius

| Token | Nilai | Kegunaan |
| --- | --- | --- |
| `rounded-sm` | 8px | Elemen kecil |
| `rounded-lg` | 12px | Dropdown |
| `rounded-xl` | 16px | Input, panel |
| `rounded-2xl` | 20px | Tile produk |
| `rounded-3xl` | 28px | Tile kategori, gambar detail produk |
| `rounded-full` | Penuh | Tombol, swatch warna |

Semua nilai diturunkan dari `--radius` (12px) di `globals.css`.

## 7. Grid dan layout

- **Container:** `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` (lebar maksimal 1280px).
- **Teks panjang dan form:** `max-w-prose` atau `max-w-xl`.

| Elemen | Mobile | `md` | `lg` | `xl` |
| --- | --- | --- | --- | --- |
| Tile kategori (bento) | 2 kolom | 4 kolom, tile pertama 2 x 2 | Sama | Sama |
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

## 8. Header

- Tembus pandang dengan blur: `bg-background/80 backdrop-blur-xl`, tinggi 56px.
- Menu berada di tengah pada desktop. Pencarian dibuka dari ikon, bukan kotak yang selalu tampil.
- Blur hanya dipakai di header dan latar dialog.

## 9. Tombol

Dasar: `buttonClasses()` di `src/components/ui/button.tsx`. Semua tombol berbentuk pill, dengan efek tekan `active:scale-[0.97]`.

| Varian | Kelas | Kegunaan |
| --- | --- | --- |
| Action | `variant="action"` dengan `ButtonArrow` atau `ButtonIcon` | Satu langkah maju utama: tambah ke keranjang, checkout, buat pesanan |
| Primary | `bg-primary text-primary-foreground hover:bg-primary-hover` | Aksi utama yang kecil, seperti tombol di status kosong |
| Secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/70` | Aksi pendamping |
| Outline | `variant="outline"`, terisi dari bawah saat hover | Filter, kembali, aksi netral |
| Ghost | `bg-transparent hover:bg-muted` | Navigasi, ikon |
| Destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Hapus |
| Tautan | Teks di dalam `<span className="link-stitch">`, dengan chevron bila mengarah ke halaman lain | Aksi sekunder dan tautan dalam teks |

| Ukuran | Tinggi | Kelas |
| --- | --- | --- |
| `sm` | 36px | `h-9 px-3 text-sm`, hanya di desktop |
| `md` (default) | 44px | `h-11 px-5 text-base` |
| `lg` | 48px | `h-12 px-6 text-base` |
| `action` | 56px | Otomatis untuk varian Action |
| Ikon | 44 x 44px | `size-11`, wajib `aria-label` |

Aturan:

- Target sentuh di mobile minimal 44 x 44px, dengan jarak antar target minimal 8px.
- Saat proses berjalan, tombol dinonaktifkan dan menampilkan status, dengan lebar tetap.
- Jangan memakai `<select>` bawaan untuk pilihan singkat. Pakai segmented control seperti `SortTabs`, yang tiap pilihannya berupa link.
- Efek tekan tidak boleh menggeser layout. Gunakan `active:scale-[0.98]` paling besar.

## 10. Kartu dan tile

- **Kartu produk:** tanpa bingkai dan bayangan.
  - Gambar berada di tile `rounded-2xl bg-muted` rasio 4:5 (`aspect-[4/5]`), memakai `next/image` untuk foto.
  - Seluruh kartu adalah satu link ke detail produk.
  - Urutan: label `accent`, nama (maksimal 2 baris), harga, titik warna.
  - Hover hanya gambar `scale-[1.03]`, durasi 200ms.
- **Tile kategori:** `rounded-3xl bg-muted p-6 lg:p-8`, dengan judul di atas dan gambar di bawah.
- **Panel keranjang dan checkout:** `rounded-xl border border-border bg-card`, padding `p-4` lalu `md:p-6`.
- **Skeleton:** pakai `Skeleton`, `SkeletonLine`, dan `SkeletonRegion` dari `src/components/ui/skeleton.tsx`.
  - Tiap halaman punya skeleton sendiri yang mengikuti struktur aslinya, dengan kelas grid dan tinggi baris yang sama, agar tidak ada lompatan saat konten masuk.
  - Kalau struktur halaman berubah, ubah skeleton-nya juga.
  - Di atas latar `muted`, set `--skeleton-bg` ke `var(--color-border)`.

Hindari glassmorphism, gradien dekoratif, dan bayangan pada kartu.

## 11. Form

- **Input:** `h-11 w-full rounded-xl border border-input bg-card px-3 text-base placeholder:text-muted-foreground`.
- **Label:** selalu terlihat di atas field, `text-sm font-medium`. Placeholder bukan pengganti label.
- **Wajib diisi:** tandai dengan `*` dan `required`.
- **Bantuan:** `text-sm text-muted-foreground` di bawah field.
- **Error:** `text-sm text-destructive` di bawah field, terhubung lewat `aria-describedby`, dengan `aria-invalid` di field. Pesan menyebut penyebab dan cara memperbaiki.
- **Validasi:** saat `blur`, bukan saat mengetik.
- **Setelah submit gagal:** pindahkan fokus ke field pertama yang salah, atau ke ringkasan error jika errornya banyak.
- **Mobile:** gunakan `type`, `inputMode`, dan `autoComplete` yang tepat, misalnya `tel`, `email`, dan `postal-code`.
- **Pengelompokan:** field terkait memakai `fieldset` dan `legend`.
- **Checkout:** 3 langkah dengan `CheckoutSteps`. Validasi per langkah, langkah selesai bisa dibuka lagi, langkah berikutnya terkunci, dan tombol back browser berpindah antar-langkah. Langkah terakhir menampilkan tinjauan.

## 12. Responsive

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
- Wajib dicek di 360, 768, 1024, dan 1440 px.

## 13. Animasi dan ikon

| Peran | Durasi |
| --- | --- |
| Hover, tekan | 150-200ms |
| Dropdown, drawer masuk | 200-300ms |
| Elemen keluar | 60-70% durasi masuk |

- **Library:** `motion`, diimpor dari `motion/react`, hanya di Client Component. Pakai `m`, bukan `motion`, karena fiturnya dimuat sekali oleh `LazyMotion` di `src/components/motion-provider.tsx`.
- Animasikan `transform` dan `opacity` saja, maksimal 1-2 elemen kunci per tampilan.
- Wajib menghormati `prefers-reduced-motion`.
- Konten penting untuk SEO tidak boleh tersembunyi menunggu animasi.
- Hindari animasi yang berjalan terus-menerus seperti marquee.
- **Ikon:** `lucide-react`, satu set saja, ukuran 16, 20, atau 24px. Jangan memakai emoji sebagai ikon.
- Ikon dekoratif memakai `aria-hidden="true"`. Tombol ikon wajib punya nama aksesibel.

## 14. Aturan komponen dari 21st

Komponen dari 21st wajib disesuaikan sebelum dipakai:

1. Ganti warna tetap (`bg-zinc-900`, `text-gray-500`, hex) dengan token semantik di atas.
2. Sesuaikan radius, tinggi tombol, dan spacing dengan file ini.
3. Hapus gradien, glow, atau glassmorphism yang tidak sesuai gaya.
4. Tambahkan `'use client'` hanya pada komponen yang memakai state, efek, atau `motion`.
5. Ganti `<img>` dengan `next/image`.
6. Cek label, keyboard, fokus, dan `prefers-reduced-motion`.
7. Cek tampilan di 360 px dan pastikan tidak ada scroll horizontal.

## 15. Checklist sebelum selesai

- [ ] Tidak ada hex atau warna bawaan Tailwind di komponen
- [ ] Tidak ada emoji sebagai ikon
- [ ] Semua elemen klik punya hover, fokus, dan `cursor-pointer`
- [ ] Focus ring terlihat saat navigasi keyboard
- [ ] Target sentuh minimal 44 x 44px di mobile
- [ ] Gambar punya `alt` dan ukuran yang dicadangkan
- [ ] `prefers-reduced-motion` dihormati
- [ ] Tidak ada scroll horizontal di 360px
- [ ] Dicek di 360, 768, 1024, dan 1440 px
