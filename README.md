# UPCYCLE

Platform bank sampah dan commerce guna ulang untuk warga, BSU, BSI, industri,
dan admin.

Aplikasi dibangun bertahap. Seluruh enam tahap sudah selesai: **Tahap 1
(database + RLS)**, **Tahap 2 (fondasi frontend, autentikasi, profil, layout,
dashboard)**, **Tahap 3 (setoran warga, antrean BSU, timbang/bayar, harga,
jadwal jemput, buku kas BSU)**, **Tahap 4 (data masuk BSI, stok gabungan,
harga jual, pesanan, pengambilan, buku kas BSI & industri)**, **Tahap 5
(marketplace barang bekas & produk upcycle)**, dan **Tahap 6 (master jenis
sampah & verifikasi organisasi)**.

## Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4
- React Router v7
- Supabase (Postgres, Auth, Storage, RLS)
- TanStack Query
- Recharts, React Leaflet, lucide-react
- Font Plus Jakarta Sans

## Yang sudah tersedia di Tahap 2

- Registrasi dan login Supabase; pendaftaran mandiri hanya membuat peran
  **warga**. Warga dapat menyetor sampah, membeli, dan berjualan.
- Pemulihan password lewat email (lupa password + halaman atur ulang).
- Profil dengan nama, foto avatar di Supabase Storage, status email, peran, dan
  organisasi.
- Layout responsif: navbar desktop dengan icon pill, popover notifikasi, menu
  profil, dan bottom tab mobile.
- Navigasi serta proteksi rute sesuai peran (`warga`, `bsu`, `bsi`, `industri`,
  `admin`).
- Dashboard berbasis data Supabase:
  - peta gelap Esri Dark Gray Canvas dengan pin putih/hijau;
  - pencarian, urutan terdekat/nama/terbaru, zoom, lokasi saya, dan fullscreen;
  - kartu statistik dan grafik aktivitas 7/30/90 hari;
  - aktivitas terbaru, aksi cepat sesuai peran, dan daftar mitra.
- Empty state, loading skeleton, dan error state yang jelas untuk data kosong
  atau koneksi bermasalah.
- Seluruh rute tahap 1–6 sudah memakai halaman nyata; tidak ada tautan
  placeholder yang tersisa.

## Yang sudah tersedia di Tahap 3

- **Warga**
  - Form setoran baru: pilih BSU terverifikasi, pilih jenis sampah, estimasi
    berat, metode jemput/antar, nomor WhatsApp, alamat dan titik lokasi, catatan,
    serta foto sampah (privat, maksimal 5 MB).
  - Estimasi pembayaran dari harga aktif BSU dan validasi format nomor WA.
  - Halaman harga BSU untuk membandingkan penawaran antar-BSU per jenis sampah.
  - Riwayat setoran dengan filter tahap, pencarian, ringkasan berat/pendapatan,
    dan halaman detail.
  - Warga melihat status ringkas tiga tahap: **Diajukan → Ditimbang → Selesai**.
    Status internal 9 tahap tetap dipakai pada timeline detail, antrean BSU/BSI,
    dan data database.
  - Konfirmasi hasil timbang langsung dari halaman detail setelah BSU mencatat
    berat final dan pembayaran.
- **BSU**
  - Antrean setoran dengan filter “perlu tindakan”, pencarian, dan ringkasan
    beban kerja. Aksi jadwal/timbang/kirim tersedia langsung dari antrean.
  - Penjadwalan penjemputan lewat RPC, lengkap dengan kontak WhatsApp dan tautan
    peta pada halaman jadwal jemput.
  - Penimbangan multi-item per jenis sampah, snapshot harga acuan, alasan wajib
    saat harga disesuaikan, potongan opsional, serta pembayaran tunai/transfer.
  - Alur status lengkap: jadwal → timbang & bayar → konfirmasi warga → kirim ke
    BSI. Setoran berstatus `dikirim_ke_bsi` dilanjutkan BSI pada Tahap 4
    menjadi stok gabungan.
  - Pengelolaan harga beli append-only: perubahan membuat baris harga baru,
    riwayat lama tetap tersimpan, dan harga aktif dipakai saat menimbang.
  - Buku kas BSU: saldo dari view, rincian kas masuk/keluar, pencatatan biaya
    operasional, serta koreksi entri melalui entri pembalik.
- Notifikasi dari RPC mengarah langsung ke halaman detail setoran warga/BSU.

## Yang sudah tersedia di Tahap 4

- **BSI**
  - Halaman data masuk dari BSU dengan pencarian, filter publikasi, rincian
    item timbangan, dan perjalanan setoran. BSI tetap tidak melihat WA, alamat,
    koordinat, atau foto warga.
  - Publikasi setoran menjadi lot stok BSI melalui `publish_deposit_to_stock`.
    Publikasi mensyaratkan harga jual aktif untuk setiap jenis sampah.
  - Stok gabungan per jenis sampah, daftar lot beserta BSU asal dan setoran
    sumbernya, serta pengelolaan harga jual append-only.
  - Pesanan industri: pembatalan pesanan yang belum dibayar, penjadwalan
    pengambilan stok dari setiap BSU asal, dan penyelesaian pengambilan.
  - Buku kas BSI: kas masuk penjualan stok otomatis, biaya operasional, dan
    koreksi entri.
- **Industri**
  - Katalog stok lintas BSI dengan pencarian, filter kategori, harga jual, dan
    estimasi nilai stok.
  - Pembuatan pesanan stok dengan alokasi FIFO dari lot tertua. Stok langsung
    dikunci agar tidak terjual ganda; pesanan yang belum dibayar dapat
    dibatalkan dan stoknya dikembalikan.
  - Pembayaran tunai/transfer, penjadwalan pengambilan di lokasi BSI, dan
    penyelesaian serah terima stok.
  - Buku kas industri: kas keluar pembelian stok otomatis, biaya operasional,
    dan koreksi entri.
- **BSU**
  - Halaman **Jemput** kini juga menampilkan rute pengambilan stok pesanan oleh
    BSI. BSU dapat menandai pengambilan selesai; setoran asal otomatis menjadi
    “diambil BSI”.
- **Kas otomatis & notifikasi**
  - Pembayaran pesanan menulis kas masuk `penjualan_stok` untuk BSI dan kas
    keluar `pembelian_stok` untuk industri dalam transaksi yang sama.
  - Notifikasi pesanan, pembayaran, jadwal pengambilan, dan penyelesaian
    mengarah ke halaman pesanan/jemput yang sesuai.

## Yang sudah tersedia di Tahap 5

- **Penjual (warga & industri)**
  - Halaman **Produk saya** di `/warga/produk` dan **Produk industri** di
    `/industri/produk` dengan tab Produk dan Pesanan masuk.
  - Tambah/ubah produk, unggah satu foto ke bucket publik `product-images`,
    atur kategori, kondisi (`upcycle`/`bekas`), harga kelipatan Rp100, stok,
    satuan, dan status aktif.
  - Produk nonaktif tetap tersimpan untuk riwayat tetapi tidak tampil di
    katalog.
  - Proses pesanan masuk: tandai sudah dikirim, batalkan pesanan yang belum
    dikirim, dan hubungi warga lewat WhatsApp.
- **Warga & marketplace**
  - Marketplace di `/marketplace` berisi barang **bekas** dan produk
    **upcycle** dari warga dan industri. Tersedia pencarian, filter kategori,
    filter kondisi, harga, stok, serta identitas penjual.
  - Hanya warga yang dapat membuat pesanan produk; peran lain hanya melihat
    katalog. Warga tetap dapat berjualan di halaman produk miliknya.
  - Pembuatan pesanan mengunci dan mengurangi stok saat itu juga. Satu pesanan
    hanya boleh berisi produk dari satu penjual. Tidak ada skema kredit atau
    cicilan; pembayaran hanya tunai atau transfer.
  - Status pesanan: `menunggu_pembayaran` → `dibayar` → `dikirim` → `selesai`,
    dengan pembatalan sebelum pengiriman.
  - Warga dapat membayar (tunai/transfer), membatalkan pesanan yang belum
    dibayar, dan mengonfirmasi penerimaan barang.
- **Kas otomatis & notifikasi**
  - Penjual industri menerima kas masuk `penjualan_produk` saat pembayaran.
    Pembatalan pesanan yang sudah dibayar menulis kas keluar `koreksi`.
  - Warga penjual tidak memiliki buku kas organisasi; transaksi tetap tercatat
    pada pesanan.
  - Notifikasi pesanan baru, pembayaran, pengiriman, pembatalan, dan
    penyelesaian mengarah ke halaman produk/pesanan yang sesuai.
- Seluruh mutasi memakai RPC `create_product_order`, `pay_product_order`,
  `ship_product_order`, `complete_product_order`, dan `cancel_product_order`.

## Yang sudah tersedia di Tahap 6

- **Admin — master jenis sampah** (`/admin/jenis-sampah`)
  - Tambah/ubah jenis sampah dengan nama, kode unik, kategori, deskripsi,
    satuan, ikon, dan warna penanda.
  - Aktif/nonaktifkan jenis sampah. Jenis nonaktif tidak muncul pada pilihan
    baru tetapi tetap tersedia untuk riwayat transaksi lama.
  - Pencarian, filter status, kartu statistik, serta empty/loading/error state.
- **Admin — verifikasi organisasi** (`/admin/organisasi`)
  - Daftar BSU, BSI, dan industri dengan filter status/tipe dan pencarian.
  - Tinjau alamat, kontak, titik lokasi, dan tanggal pendaftaran.
  - Verifikasi, tolak, atau cabut verifikasi. Verifikasi mencatat `verified_at`
    dan `verified_by`; organisasi terverifikasi dapat dipakai pada alur
    setoran, stok, dan marketplace.
  - **Ubah data** organisasi untuk memperbaiki nama, nomor WhatsApp, email,
    alamat, kota/provinsi, serta koordinat lintang/bujur. Berguna untuk
    merapikan data demo atau kontak yang salah.
  - Aksi memakai policy RLS admin yang sudah ada, tanpa service-role key di
    frontend.
- **Admin — kelola pengguna** (`/admin/pengguna`)
  - Daftar akun yang sudah mendaftar dengan pencarian dan filter peran.
  - Naikkan peran akun menjadi `bsu`, `bsi`, `industri`, atau `admin`, lalu
    hubungkan ke organisasi yang sesuai (BSU/BSI/industri).
  - Peran `warga` dan `admin` otomatis dilepas dari organisasi usaha.
  - Akun admin sendiri tidak dapat diubah dari halaman ini agar akses admin
    tidak hilang. Perubahan langsung berlaku setelah pengguna memuat ulang.

## Menjalankan proyek

### 1. Prasyarat

- Node.js 20 atau lebih baru
- Proyek Supabase (cloud atau lokal)

### 2. Install dependency

```bash
npm install
```

### 3. Environment variable

Salin `.env.example` menjadi `.env`, lalu isi:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Ambil dari **Supabase Dashboard → Project Settings → API**. Gunakan hanya
**anon/public key**; jangan pernah menaruh `service_role` key di frontend.

Jika env belum diisi, aplikasi menampilkan layar setup yang memandu langkah
konfigurasi.

### 4. Terapkan database

Buka SQL Editor Supabase lalu jalankan file berikut **sesuai urutan nama**:

1. `supabase/migrations/20261106000100_core.sql`
2. `supabase/migrations/20261106000200_deposits_stock.sql`
3. `supabase/migrations/20261106000300_commerce_ledger.sql`
4. `supabase/migrations/20261106000400_views_helpers.sql`
5. `supabase/migrations/20261106000500_deposit_rpcs.sql`
6. `supabase/migrations/20261106000600_rls_core.sql`
7. `supabase/migrations/20261106000700_rls_commerce.sql`
8. `supabase/migrations/20261106000800_grants.sql`
9. `supabase/migrations/20261106000900_storage.sql`
10. `supabase/migrations/20261106001000_order_rpcs.sql`
11. `supabase/migrations/20261106001100_product_rpcs.sql`
12. `supabase/migrations/20261109000100_enum_industri.sql`
13. `supabase/migrations/20261109000200_migrate_roles.sql`
14. `supabase/migrations/20261109000300_marketplace_kondisi.sql`
15. `supabase/migrations/20261109000400_rls_industri.sql`
16. `supabase/migrations/20261109000500_rpc_industri.sql`
17. `supabase/seed.sql` (khusus database baru)

Detail database, akun demo, dan keputusan RLS ada di
[`supabase/README.md`](supabase/README.md).

### 5. Pengaturan Auth Supabase

- **Authentication → URL Configuration**
  - Site URL: `http://localhost:5173`
  - Redirect URLs: `http://localhost:5173/masuk` dan
    `http://localhost:5173/atur-ulang-password`
  - Tambahkan URL production saat deploy (lihat
    [Deploy ke GitHub Pages](#deploy-ke-github-pages)).
- Untuk pengujian cepat, **Authentication → Providers → Email** boleh
  mematikan “Confirm email”. Jika konfirmasi aktif, pengguna akan melihat layar
  “Cek email kamu”.
- Akun seed sudah terverifikasi dan bisa langsung dipakai.

### 6. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:5173`.

Perintah lain:

```bash
npm run typecheck   # TypeScript
npm run build       # build produksi
npm run preview     # pratinjau build
```

## Deploy ke GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` membangun aplikasi dan
menerbitkannya setiap ada push ke `main` (bisa juga dijalankan manual dari tab
**Actions**).

### 1. Aktifkan Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 2. Isi repository secrets

**Settings → Secrets and variables → Actions → New repository secret**:

| Nama | Nilai |
| --- | --- |
| `VITE_SUPABASE_URL` | URL proyek Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon/public key Supabase |

Keduanya hanya dibaca saat build. Bila kosong, workflow tetap berjalan tetapi
situs menampilkan layar konfigurasi dan log Actions memberi peringatan.

Panel **Akun demo** di halaman login tampil secara default. Untuk
menyembunyikannya di situs publik, buat repository **variable**
`VITE_SHOW_DEMO_ACCOUNTS` bernilai `false`
(**Settings → Secrets and variables → Actions → Variables**).

### 3. Sesuaikan URL Auth Supabase

Untuk situs Pages standar (`https://<user>.github.io/<repo>/`):

- Site URL: `https://<user>.github.io/<repo>/`
- Redirect URLs: `https://<user>.github.io/<repo>/masuk` dan
  `https://<user>.github.io/<repo>/atur-ulang-password`

Jika memakai custom domain, ganti dengan domain tersebut (lihat langkah 4).

### 4. (Opsional) Custom domain

Contoh yang dipakai proyek ini: `https://upcycle.wecloud.my.id/`.

1. **Settings → Pages → Custom domain** diisi `upcycle.wecloud.my.id`. Dengan
   GitHub Actions tidak perlu file `CNAME`.
2. Di DNS provider, buat record CNAME `upcycle` → `indragirib.github.io`
   (tanpa nama repo). Subdomain tidak memakai A record/IP dan tidak perlu
   child nameserver.
3. `public/CNAME` berisi domain custom (`upcycle.wecloud.my.id`) membuat build
   otomatis memakai base `/`, sehingga aset, router, dan redirect auth berada di
   akar domain. Repository variable `VITE_BASE_PATH` bersifat opsional untuk
   menimpa nilai itu.
4. Ubah URL Auth Supabase ke `https://upcycle.wecloud.my.id/`,
   `https://upcycle.wecloud.my.id/masuk`, dan
   `https://upcycle.wecloud.my.id/atur-ulang-password`.
5. Setelah DNS mengarah ke GitHub, aktifkan **Enforce HTTPS**. Sertifikat bisa
   sampai ~1 jam; jika opsi belum muncul, Remove lalu Save ulang custom domain.
6. Cek propagasi: `Resolve-DnsName upcycle.wecloud.my.id -Type CNAME` harus
   menghasilkan `indragirib.github.io`.

### Catatan hosting

- `vite.config.ts` mendeteksi nama repo otomatis dan memakai base `/<repo>/`;
  untuk situs pengguna (`<user>.github.io`) base tetap `/`. Saat file
  `public/CNAME` ada (custom domain), base otomatis menjadi `/`. Nilai
  `VITE_BASE_PATH` tetap bisa menimpa keduanya.
- `BrowserRouter` memakai `basename` dari `import.meta.env.BASE_URL`, jadi
  route seperti `/masuk` otomatis menjadi `/<repo>/masuk` di Pages.
- Build menghasilkan `404.html` (salinan `index.html`) agar deep link seperti
  `/marketplace` tidak 404 di GitHub Pages.
- URL aset dan redirect email mengikuti `BASE_URL` lewat `src/lib/paths.ts`.
  Jangan menulis path absolut seperti `/upcycle-logo.svg` di komponen baru.
- `npm run build` lokal tetap memakai base `/`.

## Akun demo

Semua password: `Upcycle123!`

| Email | Peran |
| --- | --- |
| `admin@upcycle.id` | admin |
| `warga1@upcycle.id` | warga |
| `warga2@upcycle.id` | warga |
| `bsu1@upcycle.id` | petugas BSU Melati |
| `bsu2@upcycle.id` | petugas BSU Kenanga |
| `bsi@upcycle.id` | petugas BSI Nusantara Hijau |
| `industri@upcycle.id` | petugas CV Jaya Daur Ulang |

Halaman login menampilkan panel **Akun demo** untuk mengisi email/password
otomatis, baik di development maupun build produksi. Panel itu bisa
disembunyikan lewat env `VITE_SHOW_DEMO_ACCOUNTS=false` saat build (lihat
[Deploy ke GitHub Pages](#deploy-ke-github-pages)). Tombol demo hanya mengisi
kredensial seed; bila password akun diubah di Supabase, isinya tidak akan cocok.

## Peran dan navigasi

| Peran | Menu utama |
| --- | --- |
| warga | Beranda, Setor (berisi tab Setor baru, Riwayat, Harga BSU), Market (berisi tab Jelajahi, Produk saya, Pesanan), Akun |
| bsu | Dashboard, Antrean setoran, Jemput, Harga, Buku kas |
| bsi | Dashboard, Data masuk, Stok, Pesanan, Buku kas |
| industri | Dashboard, Stok BSI, Pesanan, Produk, Marketplace, Buku kas |
| admin | Dashboard, Jenis sampah, Verifikasi, Pengguna |

Semua rute selain halaman publik dilindungi. Marketplace dapat dibuka semua
peran yang login, sedangkan pengelolaan produk, pesanan warga, master jenis
sampah, verifikasi organisasi, dan pengelolaan pengguna dibatasi sesuai peran
masing-masing (`ROUTE_ROLES` di `src/config/navigation.ts`). Rute lama
`/pembeli/katalog` dialihkan ke `/marketplace`, dan `/pembeli/pesanan` ke
`/warga/pesanan`.

## Struktur singkat

```text
src/
  auth/            provider sesi + profil
  components/
    admin/         dialog jenis sampah, verifikasi organisasi, ubah data
                   organisasi, dan atur peran pengguna
    cash/          dialog biaya operasional & koreksi kas
    dashboard/     peta, grafik, statistik, aktivitas, mitra
    deposits/      kartu setoran, dialog jadwal/timbang, rincian item
    layout/        navbar, bottom nav, notifikasi, menu profil
    orders/        kartu pesanan, rincian item, jadwal ambil, bayar/batal
    pricing/       dialog penetapan harga beli BSU & harga jual BSI
    products/      kartu produk, form produk, dialog pesanan/bayar/batal
    ui/            tombol, input, select, textarea, modal, kartu, badge,
                   avatar, empty state, page header
  config/          navigasi per peran
  hooks/           dashboard, organisasi, notifikasi, setoran, harga, kas,
                   stok/data BSI, pesanan stok, produk marketplace, admin
  lib/             Supabase client, util, geo, status, helper setoran,
                   storage avatar/produk/setoran
  pages/
    auth/          login, daftar, lupa/reset password
    warga/         form setor, harga BSU, riwayat setoran
    bsu/           antrean, jadwal jemput, harga, buku kas
    bsi/           data masuk, detail & publikasi, stok + harga jual, pesanan
    industri/      katalog stok, pesanan
    products/      katalog marketplace, pesanan warga, kelola produk penjual
    admin/         master jenis sampah, verifikasi organisasi, kelola pengguna
    deposits/      halaman detail setoran bersama warga/BSU
    ...            dashboard, profil, setup, 404
  routes/          guard sesi, guard peran, redirect root
  types/           tipe domain
supabase/
  migrations/      skema, RLS, RPC, storage
  seed.sql         akun + organisasi + harga + produk contoh
```

## Keamanan data

- Semua tabel memakai RLS. Anon tidak mendapat akses tabel.
- BSI tidak dapat membaca baris mentah `deposits`; hanya view aman
  `v_bsi_incoming_deposits` tanpa WA, alamat, koordinat, atau foto.
- Peran dan `org_id` dikunci trigger; hanya admin yang bisa mengubah.
- Harga dan buku kas append-only. Saldo organisasi dihitung dari view.
- Bucket `avatars` dan `product-images` publik untuk dibaca, tetapi penulisan
  dibatasi folder milik pengguna. Bucket `deposit-photos` privat.

## Uji Tahap 2

1. Tanpa `.env`, buka aplikasi → layar setup Supabase tampil.
2. Isi `.env` + terapkan migrasi → login dengan `warga1@upcycle.id`.
3. Pastikan diarahkan ke dashboard warga, peta menampilkan mitra, pencarian dan
   urutan peta berjalan, serta kartu statistik kosong tampil rapi.
4. Buka menu profil → ubah nama, unggah avatar, lalu muat ulang halaman.
5. Coba “Lupa password” dan pastikan email reset mengarah ke halaman atur ulang.
6. Logout, login sebagai `bsu1`, `bsi`, `industri`, dan `admin`.
   Pastikan menu serta dashboard berubah sesuai peran.
7. Buka URL rute peran lain secara manual (mis. `/admin/organisasi` sebagai
   warga) → harus dialihkan ke dashboard.
8. Perkecil layar ke ukuran mobile → bottom tab, kartu bertumpuk, peta, dan
   form tetap nyaman dipakai.
9. Buka notifikasi (lonceng) → empty state tampil jika belum ada notifikasi.
10. Jalankan `npm run typecheck` dan `npm run build` → keduanya harus lulus.

## Uji Tahap 3

1. Login sebagai `warga1@upcycle.id`, buka **Setor sampah**, pilih BSU Melati,
   jenis sampah, isi berat dan nomor WA, lalu pilih metode **Dijemput**.
   Lengkapi alamat dan tautan/koordinat lokasi, lampirkan foto, lalu kirim.
2. Pastikan diarahkan ke detail setoran berstatus **Diajukan**. Cek foto dapat
   dibuka (signed URL) dan tombol konfirmasi belum muncul.
3. Login sebagai `bsu1@upcycle.id`, buka **Antrean setoran** → setoran baru ada
   di filter “Perlu tindakan”. Buka **Jemput**, pastikan alamat, nomor WA, dan
   tautan peta tampil, lalu jadwalkan penjemputan.
4. Kembali sebagai warga: status berubah menjadi **Dijadwalkan** dan notifikasi
   penjemputan masuk.
5. Sebagai BSU, buka detail setoran lalu **Timbang & bayar**. Tambahkan satu
   atau lebih jenis sampah, ubah berat/harga, dan pastikan alasan penyesuaian
   wajib diisi saat harga berbeda dari harga acuan. Isi potongan (opsional) dan
   pilih metode bayar, lalu simpan.
6. Pastikan status menjadi **Dicek & dibayar**, total dibulatkan ke Rp100, dan
   entri kas keluar `pembayaran_warga` muncul di **Buku kas**.
7. Login sebagai warga, buka detail setoran, periksa rincian item, lalu klik
   **Konfirmasi hasil**. Status berubah menjadi **Dikonfirmasi**.
8. Login sebagai BSU, buka detail setoran, lalu klik **Kirim ke BSI**. Status
   akhir alur ini adalah **Dikirim ke BSI**; lanjutkan ke Uji Tahap 4 untuk
   publikasi stok.
9. Buka **Harga** sebagai BSU: atur harga jenis sampah yang belum punya harga
   atau ubah harga aktif. Pastikan harga lama tetap ada di riwayat dan harga
   baru dipakai pada penimbangan berikutnya.
10. Buka **Buku kas**: catat biaya operasional, lalu coba **Koreksi entri** pada
    salah satu transaksi. Pastikan entri pembalik muncul dan entri yang sudah
    dikoreksi tidak bisa dikoreksi lagi.
11. Uji akses: sebagai warga, buka `/bsu/kas` atau `/bsu/setoran` secara manual
    → harus dialihkan ke dashboard. Sebagai BSU, buka `/warga/setor` → juga
    dialihkan.
12. Uji metode **Antar sendiri**: setoran baru bisa langsung ditimbang tanpa
    jadwal jemput.
13. Jalankan `npm run typecheck` dan `npm run build` → keduanya harus lulus.

## Uji Tahap 4

1. Pastikan migrasi `20261106001000_order_rpcs.sql` sudah diterapkan. Siapkan
   satu setoran Tahap 3 yang sudah berstatus **Dikirim ke BSI**.
2. Login sebagai `bsi@upcycle.id`, buka **Data masuk**, lalu buka detail setoran.
   Pastikan BSI hanya melihat nama warga, BSU asal, item, berat, dan nominal —
   tanpa nomor WA, alamat, koordinat, atau foto.
3. Buka **Stok** → atur harga jual untuk setiap jenis sampah pada setoran
   tersebut. Kembali ke detail setoran lalu klik **Publikasikan jadi stok**.
   Lot stok baru harus muncul beserta BSU asal dan tautan setoran sumber.
4. Coba publikasikan setoran lain yang harga jualnya belum lengkap → RPC harus
   menolak dengan pesan yang jelas.
5. Login sebagai `industri@upcycle.id`, buka **Stok BSI**, cari BSI/jenis
   sampah, lalu **Buat pesanan** dengan berat sebagian. Pastikan total
   dibulatkan ke Rp100, stok berkurang, dan pesanan berstatus **Menunggu
   pembayaran**.
6. Buka **Pesanan**, bayar pesanan dengan transfer atau tunai. Pastikan status
   menjadi **Dibayar**, kas masuk `penjualan_stok` muncul di **Buku kas BSI**,
   dan kas keluar `pembelian_stok` muncul di **Buku kas industri**.
7. Kembali sebagai BSI, buka **Pesanan**, klik **Jadwalkan ambil dari BSU**.
   Satu jadwal dibuat per BSU asal; status pesanan menjadi **Diproses** dan BSU
   menerima notifikasi.
8. Login sebagai `bsu1@upcycle.id`, buka **Jemput**. Bagian **Pengambilan stok
   oleh BSI** harus menampilkan rute beserta nomor pesanan. Tandai selesai →
   setoran asal menjadi **Diambil BSI**.
9. Login sebagai industri, buka **Pesanan**. Setelah semua rute BSU selesai,
   jadwalkan pengambilan di BSI lalu tandai selesai. Pesanan menjadi **Selesai**
   dan setoran asal menjadi **Diambil industri**. Menjadwalkan lebih awal harus
   ditolak sampai stok tiba di BSI.
10. Buat pesanan baru yang belum dibayar lalu batalkan dari industri atau BSI.
    Pastikan stok kembali ke lot asal dan setoran sumber kembali
    **Dipublikasikan** bila tidak ada pesanan sah lain.
11. Uji akses: warga membuka `/bsi/stok` atau `/industri/kas` →
    dialihkan ke dashboard. Industri tidak dapat melihat kas BSI, dan BSI tidak
    dapat membaca tabel `deposits` mentah.
12. Jalankan `npm run typecheck` dan `npm run build` → keduanya harus lulus.

## Uji Tahap 5

1. Pastikan migrasi `20261106001100_product_rpcs.sql` dan lima migrasi
   `2026110900*.sql` sudah diterapkan. RPC harus tersedia di schema cache
   Supabase.
2. Login sebagai `warga1@upcycle.id`, buka **Produk saya** → **Tambah produk**.
   Isi nama, kategori, kondisi (`upcycle`/`bekas`), harga kelipatan Rp100,
   stok, satuan, dan unggah foto. Pastikan produk muncul di **Marketplace**.
3. Login sebagai `industri@upcycle.id`, buka **Produk**, lalu tambah produk
   organisasi. Produk industri harus tampil dengan nama organisasi.
4. Login sebagai `warga1@upcycle.id`, buka **Marketplace**, cari produk, lalu
   **Beli**. Isi jumlah, nomor WhatsApp, dan alamat. Pastikan stok langsung
   berkurang dan pesanan berstatus **Menunggu pembayaran**.
5. Coba beli melebihi stok, membeli produk sendiri, atau mencampur produk dari
   dua penjual dalam satu pesanan → RPC harus menolak dengan pesan jelas.
6. Dari **Pesanan saya**, bayar pesanan dengan transfer/tunai. Penjual menerima
   notifikasi. Bila penjual adalah industri, kas masuk `penjualan_produk`
   muncul di **Buku kas** organisasinya.
7. Batalkan satu pesanan yang belum dibayar dari sisi warga. Pastikan stok
   kembali ke katalog.
8. Sebagai penjual, buka tab **Pesanan masuk**, tandai pesanan yang sudah
   dibayar sebagai **Kirim pesanan**. Sebagai warga, klik **Pesanan diterima**
   → status menjadi **Selesai**.
9. Sebagai penjual industri, batalkan satu pesanan yang sudah dibayar sebelum
   dikirim. Pastikan stok kembali dan kas keluar `koreksi` tercatat.
10. Buka `/warga/produk` atau `/admin/jenis-sampah` sebagai pengguna non-warga
    yang tidak berhak → harus dialihkan ke dashboard. `/marketplace` harus tetap
    bisa dibuka semua peran, tetapi tombol beli hanya muncul untuk warga.
11. Jalankan `npm run typecheck` dan `npm run build` → keduanya harus lulus.

## Uji Tahap 6

1. Login sebagai `admin@upcycle.id`, buka **Jenis sampah**.
2. Tambah jenis sampah baru, lalu ubah nama/kategori/warna/ikonnya. Pastikan
   jenis baru muncul pada pilihan harga BSU/BSI.
3. Nonaktifkan jenis tersebut → jenis hilang dari pilihan baru, tetapi data
   transaksi lama tetap aman. Aktifkan kembali.
4. Buka **Verifikasi**. Coba pencarian dan filter status/tipe.
5. Klik **Ubah data** pada satu organisasi, ganti nomor WhatsApp/koordinat, lalu
   simpan. Pastikan kartu organisasi, tautan WhatsApp, dan titik peta memakai
   data baru.
6. Pilih salah satu organisasi terverifikasi → **Cabut verifikasi**, lalu
   verifikasi kembali. Pastikan badge status dan tanggal verifikasi berubah.
7. Organisasi yang berstatus ditolak harus gagal dipakai pada alur transaksi
   baru sampai diverifikasi kembali.
8. Buka **Pengguna**. Cari akun `warga2@upcycle.id`, ubah perannya menjadi
   **Petugas BSU** dan hubungkan ke **BSU Melati**. Login ulang sebagai akun itu
   → menu BSU harus muncul. Kembalikan perannya ke **Warga** setelah uji.
9. Pastikan akun sendiri tidak bisa diubah perannya dari halaman **Pengguna**.
10. Buka `/admin/organisasi` atau `/admin/pengguna` sebagai warga atau industri →
    harus dialihkan ke dashboard.
8. Jalankan `npm run typecheck` dan `npm run build` → keduanya harus lulus.

## Status tahap

- ✅ Tahap 1 — database, RLS, RPC inti, seed
- ✅ Tahap 2 — setup frontend, auth, profil/peran, layout, dashboard
- ✅ Tahap 3 — setoran warga, antrean BSU, timbang/bayar, harga, jadwal jemput,
  kas BSU
- ✅ Tahap 4 — data masuk BSI, stok gabungan, harga jual, pesanan, pengambilan,
  kas BSI & industri
- ✅ Tahap 5 — marketplace barang bekas & produk upcycle, pesanan warga, kas
  penjualan produk
- ✅ Tahap 6 — admin master jenis sampah & verifikasi organisasi

## Troubleshooting

- **Layar setup terus muncul** — pastikan file bernama `.env` (bukan hanya
  `.env.example`) berada di root, lalu hentikan dan jalankan ulang `npm run dev`.
- **Profil tidak ditemukan** — pastikan seluruh migrasi dan trigger
  `handle_new_user` sudah diterapkan; logout lalu login ulang.
- **Avatar gagal diunggah / bucket not found** — jalankan
  `20261106000900_storage.sql`, lalu cek bucket `avatars` di Supabase Storage.
- **Foto setoran gagal dibuka** — pastikan bucket privat `deposit-photos` sudah
  dibuat dan policy storage sudah diterapkan. Path harus berada di
  `{warga_id}/{deposit_id}/`.
- **Pesanan/publikasi stok gagal** — pastikan migrasi
  `20261106001000_order_rpcs.sql` sudah diterapkan. Publikasi juga gagal bila
  harga jual BSI untuk salah satu jenis sampah belum aktif.
- **Pesanan produk gagal dibuat** — pastikan migrasi
  `20261106001100_product_rpcs.sql` dan `20261109000500_rpc_industri.sql` sudah
  diterapkan. Hanya akun **warga** yang dapat membuat pesanan, stok harus cukup,
  dan produk tidak boleh milik sendiri.
- **Foto produk gagal diunggah** — jalankan
  `20261106000900_storage.sql`; bucket publik `product-images` harus ada dan
  penulisan hanya di folder `{user_id}/`.
- **Admin gagal mengubah status organisasi** — pastikan akun berperan `admin`
  dan policy `organizations_update_admin` sudah diterapkan.
- **Email konfirmasi tidak datang** — cek folder spam, batas rate limit email
  Supabase, dan pengaturan SMTP. Untuk pengujian, nonaktifkan konfirmasi email.
- **Peta kosong** — pastikan organisasi seed sudah ada dan memiliki `lat`/`lng`,
  serta koneksi ke tile Esri tidak diblokir jaringan.
