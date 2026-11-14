# UPCYCLE — Database

Folder ini berisi skema PostgreSQL/Supabase untuk aplikasi UPCYCLE.

## Isi

Jalankan **berurutan** di SQL Editor Supabase (atau lewat Supabase CLI):

| Urutan | File | Isi |
| --- | --- | --- |
| 1 | `migrations/20261106000100_core.sql` | enum, organisasi, profil, helper peran, master sampah, harga append-only |
| 2 | `migrations/20261106000200_deposits_stock.sql` | setoran, item timbang, lot stok BSI, pesanan, jadwal ambil |
| 3 | `migrations/20261106000300_commerce_ledger.sql` | produk, pesanan produk, buku kas, notifikasi |
| 4 | `migrations/20261106000400_views_helpers.sql` | view harga/stok/kas/setoran aman BSI, helper RLS |
| 5 | `migrations/20261106000500_deposit_rpcs.sql` | RPC jadwal, timbang+bayar, konfirmasi, kirim BSI, publikasi stok, koreksi kas |
| 6 | `migrations/20261106000600_rls_core.sql` | RLS inti |
| 7 | `migrations/20261106000700_rls_commerce.sql` | RLS pesanan, marketplace, kas, notifikasi |
| 8 | `migrations/20261106000800_grants.sql` | grant/revoke tabel, view, dan function |
| 9 | `migrations/20261106000900_storage.sql` | bucket `avatars`, `product-images`, `deposit-photos` + policy storage |
| 10 | `migrations/20261106001000_order_rpcs.sql` | RPC pesanan stok, pembayaran, pengambilan, kas otomatis, policy pesanan untuk BSU |
| 11 | `migrations/20261106001100_product_rpcs.sql` | RPC pesanan produk marketplace, penguncian stok, kas penjualan produk, notifikasi |
| 12 | `migrations/20261109000100_enum_industri.sql` | nilai enum `industri` untuk peran/organisasi/tipe pengambilan |
| 13 | `migrations/20261109000200_migrate_roles.sql` | migrasi data `pembeli` → `warga`, `pengepul` → `industri`, trigger & validasi |
| 14 | `migrations/20261109000300_marketplace_kondisi.sql` | kolom `products.kondisi` dan `product_order_items.kondisi_produk` (`bekas`/`upcycle`) |
| 15 | `migrations/20261109000400_rls_industri.sql` | policy RLS untuk peran dan organisasi industri |
| 16 | `migrations/20261109000500_rpc_industri.sql` | RPC pesanan/stok/produk versi peran warga & industri |
| 17 | `migrations/20261109000600_rename_pengepul_to_industri.sql` | rename kolom/enum/fungsi/RPC internal `pengepul` → `industri` |
| 18 | `migrations/20261114000100_whatsapp_payment_proof.sql` | kolom bukti pembayaran, RPC konfirmasi, tabel & trigger `whatsapp_outbox`, bucket `payment-proofs` |
| 19 | `seed.sql` | data contoh dan akun demo |

> `seed.sql` hanya untuk database baru/kosong. Menjalankannya ulang dapat
> menabrak constraint unik akun/auth.

## Akun demo

Semua password: **`Upcycle123!`**

| Email | Peran |
| --- | --- |
| `admin@upcycle.id` | admin |
| `warga1@upcycle.id` | warga (Siti Aminah) |
| `warga2@upcycle.id` | warga (Budi Santoso) |
| `bsu1@upcycle.id` | petugas BSU Melati |
| `bsu2@upcycle.id` | petugas BSU Kenanga |
| `bsi@upcycle.id` | petugas BSI Nusantara Hijau |
| `industri@upcycle.id` | petugas CV Jaya Daur Ulang |

Organisasi contoh: **BSU Melati**, **BSU Kenanga**, **BSI Nusantara Hijau**,
**CV Jaya Daur Ulang**. Sudah terverifikasi.

## Keputusan data penting

- **Privasi nomor WA/lokasi:** BSI *tidak* memiliki policy SELECT pada tabel
  `deposits`. BSI hanya dapat membaca `v_bsi_incoming_deposits` yang tidak
  memuat `nomor_wa`, `lokasi_url`, `lat`, `lng`, `alamat`, atau foto. Ini
  menghindari kebocoran kolom yang tidak bisa dicegah hanya dengan row-level
  security.
- **Stok gabungan:** `bsi_stock` menyimpan lot per item/deposit agar asal bahan
  dan status setoran bisa dilacak. Tampilan stok gabungan ada di
  `v_bsi_stock_summary`.
- **Harga** append-only (`waste_prices`). Harga aktif dibaca dari
  `v_active_waste_prices` atau `get_active_price()`.
- **Buku kas** append-only. Tidak ada saldo tersimpan; saldo dihitung di
  `v_org_cash_balance`. Koreksi memakai RPC `correct_ledger_entry`.
- **Role** tidak dapat diubah sendiri. Trigger + RLS hanya mengizinkan admin.
- **Total** dihitung dan dibulatkan ke Rp100 di dalam RPC, lalu kas keluar
  dibuat otomatis di transaksi yang sama.
- **Pesanan stok** memakai alokasi FIFO: `create_stock_order` mengunci dan
  mengurangi `bsi_stock.berat_tersedia_kg` saat pesanan dibuat, lalu mencatat
  `order_stock_allocations` sebagai jejak asal lot. Pembatalan pesanan yang
  belum dibayar mengembalikan stok ke lot asal.
- **Kas pesanan** ditulis otomatis dan atomik saat pembayaran:
  `penjualan_stok` (masuk) untuk BSI dan `pembelian_stok` (keluar) untuk
  industri. Kategori `pembelian_stok` ditambahkan pada
  `20261106001000_order_rpcs.sql`.
- **Pengambilan** dipisah dua fase: BSI menjadwalkan pengambilan dari tiap BSU
  (`bsi_ke_bsu`), lalu industri menjadwalkan pengambilan di BSI
  (`industri_ke_bsi`). Menyelesaikan pengambilan
  industri menutup pesanan dan menandai setoran asal `diambil_industri`;
  pengambilan BSI menandai `diambil_bsi`.
- **Pesanan produk marketplace** memakai `create_product_order`: hanya warga,
  satu penjual per pesanan, produk tidak boleh milik sendiri, dan stok langsung
  dikunci/dikurangi. Penjual dapat berupa warga atau industri. `pay_product_order`
  menulis kas masuk `penjualan_produk` untuk penjual yang memiliki organisasi.
  Pembatalan mengembalikan stok; pembatalan pesanan yang sudah dibayar menulis
  kas keluar `koreksi`.
- **Kondisi marketplace** disimpan di `products.kondisi` dan disalin ke
  `product_order_items.kondisi_produk` saat pesanan dibuat. Nilai yang dipakai:
  `upcycle` dan `bekas`. Tidak ada kategori sembako, kredit, atau cicilan.
- **Peran lama** `pembeli` dan `pengepul` tetap ada di enum `app_role` dan
  `org_type` sebagai nilai deprecated agar enum tidak perlu dibangun ulang.
  Seluruh baris sudah dimigrasikan ke `warga`/`industri`, trigger
  `handle_new_user` hanya membuat `warga`, dan kode aplikasi tidak memakai nilai
  lama. Nama kolom, nilai enum status/pengambilan, fungsi, dan RPC internal
  sudah diganti ke `industri` oleh migrasi 17.
- **Master jenis sampah** dikelola admin lewat insert/update `waste_types`.
  Jenis nonaktif tetap tersimpan untuk riwayat tetapi tidak muncul pada pilihan
  baru.
- **Verifikasi organisasi** memakai update langsung `organizations` oleh admin
  (`status`, `verified_at`, `verified_by`). Alur setoran, stok, dan marketplace
  mensyaratkan organisasi berstatus `verified`.
- RPC inti yang tersedia:
  - `complete_deposit_weighing(...)`
  - `send_deposit_to_bsi(...)`
  - `publish_deposit_to_stock(...)`
  - `schedule_deposit_pickup`, `confirm_deposit`, `correct_ledger_entry`
  - `create_stock_order(...)`, `pay_stock_order(...)`, `cancel_stock_order(...)`
  - `schedule_order_bsu_pickup(...)`,
    `schedule_order_industri_pickup(...)`, `update_pickup_status(...)`
  - `create_product_order(...)`, `pay_product_order(...)`,
    `cancel_product_order(...)`, `ship_product_order(...)`,
    `complete_product_order(...)`
- **Storage:**
  - `avatars` — publik dibaca; tulis hanya di folder `{user_id}/`.
  - `product-images` — publik dibaca; tulis hanya di folder `{user_id}/`.
  - `deposit-photos` — privat. Path `{warga_id}/{deposit_id}/{file}`; warga
    pemilik dan BSU tujuan dapat membaca, BSI/industri tidak.
  - Batas ukuran: avatar 2 MB; foto produk/setoran 5 MB. MIME hanya JPEG, PNG,
    WebP.

## Alur Tahap 3 di aplikasi

Tahap 3 tidak menambah migrasi baru. UI memakai skema, view, policy, dan RPC
yang sudah ada:

| Aksi UI | Mekanisme | Batasan utama |
| --- | --- | --- |
| Warga membuat setoran | insert langsung `deposits` | `warga_id = auth.uid()`, role `warga`, status `diajukan`, `bsi_id` null, total/potongan 0, `metode_bayar` null, BSU tujuan terverifikasi |
| Warga mengunggah foto | Storage `deposit-photos` | path `{warga_id}/{deposit_id}/{file}`, privat, maks. 5 MB |
| BSU menetapkan harga | insert langsung `waste_prices` | `org_id = get_my_org_id()`, `dibuat_oleh = auth.uid()`, `tipe = 'beli'`, organisasi terverifikasi |
| BSU menjadwalkan jemput | RPC `schedule_deposit_pickup` | hanya metode `jemput`, status `diajukan`, milik BSU tersebut |
| BSU menimbang & membayar | RPC `complete_deposit_weighing` | status `antar/diajukan` atau `jemput/dijadwalkan`; setiap item wajib punya harga beli aktif; alasan wajib bila harga disesuaikan |
| Warga mengonfirmasi | RPC `confirm_deposit` | hanya pemilik setoran dan status `dicek_dibayar` |
| BSU mengirim ke BSI | RPC `send_deposit_to_bsi` | status `dikonfirmasi`; BSI default adalah BSI terverifikasi pertama |
| BSU mencatat biaya | insert langsung `ledger_entries` | `org_id = get_my_org_id()`, `arah = 'keluar'`, `kategori = 'operasional'`, `ref_type`/`ref_id` null, `dicatat_oleh = auth.uid()` |
| BSU mengoreksi kas | RPC `correct_ledger_entry` | membuat entri pembalik; entri `koreksi` dan entri yang sudah dikoreksi tidak bisa dikoreksi lagi |

Catatan perilaku:

- `complete_deposit_weighing` menyimpan snapshot `harga_acuan_per_kg`,
  menghitung subtotal per item, membulatkan total ke Rp100 terdekat, lalu
  menulis kas keluar `pembayaran_warga` dalam transaksi yang sama.
- Notifikasi dari RPC mengarah ke `/warga/setoran/{id}` atau
  `/bsu/setoran/{id}` dan langsung membuka halaman detail terkait.
- Setoran berhenti di `dikirim_ke_bsi`. Publikasi menjadi stok BSI
  (`publish_deposit_to_stock`) baru dipakai pada Tahap 4.
- Nomor WA, alamat, koordinat, dan foto tetap tidak pernah dikirim ke BSI;
  BSI hanya membaca `v_bsi_incoming_deposits` pada tahap berikutnya.

## Alur Tahap 4 di aplikasi

Tahap 4 menambah satu migrasi, `20261106001000_order_rpcs.sql`. UI memakai
view/RLS yang sudah ada ditambah RPC baru:

| Aksi UI | Mekanisme | Batasan utama |
| --- | --- | --- |
| BSI melihat data masuk | select `v_bsi_incoming_deposits` | hanya BSI penerima; tanpa WA/alamat/koordinat/foto |
| BSI melihat item timbangan | select `deposit_items` | `is_bsi_recipient(deposit_id)` |
| BSI mengatur harga jual | insert langsung `waste_prices` | role `bsi`, `tipe = 'jual'`, organisasi terverifikasi |
| BSI mempublikasikan stok | RPC `publish_deposit_to_stock` | status `dikirim_ke_bsi`; harga jual aktif untuk semua item |
| Industri membuat pesanan | RPC `create_stock_order` | role `industri`; stok cukup; alokasi FIFO; harga jual aktif |
| Industri membayar | RPC `pay_stock_order` | pemilik pesanan; status `menunggu_pembayaran`; menulis kas BSI & industri |
| Membatalkan pesanan | RPC `cancel_stock_order` | BSI/industri pemilik; hanya sebelum dibayar; stok dikembalikan |
| BSI menjadwalkan ambil dari BSU | RPC `schedule_order_bsu_pickup` | status `dibayar`/`diproses`; satu jadwal per BSU |
| Industri menjadwalkan ambil di BSI | RPC `schedule_order_industri_pickup` | status `diproses` |
| Menyelesaikan pengambilan | RPC `update_pickup_status` | BSI/BSU untuk rute `bsi_ke_bsu`; BSI/industri untuk rute `industri_ke_bsi` |
| BSI/industri mencatat biaya | insert langsung `ledger_entries` | role org terkait, `arah = 'keluar'`, `kategori = 'operasional'`, tanpa ref |
| BSI/industri mengoreksi kas | RPC `correct_ledger_entry` | membuat entri pembalik; entri `koreksi` tidak bisa dikoreksi ulang |

Catatan perilaku:

- `create_stock_order` langsung mengurangi stok dan mencatat alokasi lot. Bila
  salah satu item gagal (stok kurang/harga tidak ada), seluruh transaksi
  dibatalkan.
- `pay_stock_order` menulis dua entri kas dalam transaksi yang sama:
  `penjualan_stok` masuk untuk BSI dan `pembelian_stok` keluar untuk industri.
- `update_pickup_status` menstempel `diambil_bsi_at` / `diambil_industri_at`
  pada setoran asal dan menutup pesanan saat pengambilan industri selesai.
- Industri baru dapat menjadwalkan pengambilan di BSI setelah seluruh rute
  `bsi_ke_bsu` pesanan tersebut selesai. Saat rute terakhir selesai, industri
  menerima notifikasi bahwa stok siap diambil.
- Policy baru `orders_select_bsu_pickup` memberi BSU akses ringkasan pesanan
  yang punya jadwal pengambilan ke BSU tersebut, tanpa membuka item/alokasi.
- Seed tidak berisi lot stok atau pesanan. Jalankan alur Tahap 3 terlebih
  dahulu, atur harga jual BSI, lalu publikasikan setoran sebelum menguji
  pesanan.

## Alur Tahap 5 di aplikasi

Tahap 5 menambah migrasi `20261106001100_product_rpcs.sql`, lalu penyesuaian
peran & marketplace menambah `20261109000300_marketplace_kondisi.sql`
dan `20261109000500_rpc_industri.sql`. UI memakai tabel dan RLS marketplace yang
sudah ada ditambah RPC baru:

| Aksi UI | Mekanisme | Batasan utama |
| --- | --- | --- |
| Warga/industri menambah produk | insert/update langsung `products` | role `warga`/`industri`; trigger memvalidasi org penjual; `kondisi` wajib `bekas`/`upcycle`; foto di `product-images` |
| Warga membuat pesanan | RPC `create_product_order` | role `warga`; satu penjual per pesanan; stok cukup; bukan produk sendiri; penjual warga atau industri terverifikasi |
| Warga membayar | RPC `pay_product_order` | pemilik pesanan; status `menunggu_pembayaran`; tunai/transfer; kas masuk `penjualan_produk` bila penjual punya organisasi |
| Penjual mengirim | RPC `ship_product_order` | pemilik/org penjual; status `dibayar` |
| Warga menyelesaikan | RPC `complete_product_order` | pemilik pesanan; status `dikirim` |
| Membatalkan pesanan | RPC `cancel_product_order` | warga sebelum bayar; penjual sebelum kirim; stok dikembalikan; kas `koreksi` bila sudah dibayar dan penjual punya organisasi |

Catatan perilaku:

- `create_product_order` mengunci baris produk dengan `for update`, menghitung
  total, membuat `product_order_items` beserta snapshot `kondisi_produk`, lalu
  mengurangi stok dalam satu transaksi. Bila salah satu item gagal, seluruh
  pesanan dibatalkan.
- Satu pesanan hanya boleh berisi produk dari satu penjual. UI saat ini membuat
  satu pesanan per produk, sedangkan RPC siap menerima banyak item.
- Penjual warga tidak memiliki `penjual_org_id`, sehingga tidak ada entri kas
  organisasi; status pesanan tetap tercatat.
- Notifikasi mengarah ke `/warga/pesanan`,
  `/industri/produk?tab=pesanan`, atau `/warga/produk?tab=pesanan`.

## Alur Tahap 6 di aplikasi

Tahap 6 tidak menambah migrasi. Admin memakai RLS yang sudah ada:

| Aksi UI | Mekanisme | Batasan utama |
| --- | --- | --- |
| Admin melihat semua jenis sampah | select `waste_types` | policy select terbuka untuk semua authenticated; halaman harga/stok menyaring `aktif = true`, admin melihat semua |
| Admin menambah/mengubah jenis sampah | insert/update `waste_types` | policy `waste_types_insert_admin` / `waste_types_update_admin` |
| Admin melihat semua organisasi | select `organizations` | policy `organizations_select` mengizinkan admin melihat status apa pun |
| Admin memverifikasi/menolak | update `organizations` | policy `organizations_update_admin`; menulis `status`, `verified_at`, `verified_by` |

Catatan perilaku:

- Organisasi berstatus `verified` dapat dipakai pada alur setoran, stok BSI,
  dan marketplace. Menolak atau mencabut verifikasi menghentikan transaksi baru
  tanpa menghapus data lama.
- Jenis sampah tidak dihapus dari UI; admin menonaktifkannya agar riwayat
  setoran, harga, dan stok lama tetap valid.
- Tidak ada service-role key di frontend; seluruh aksi admin tetap melalui RLS.

## Bukti pembayaran & antrean WhatsApp (migrasi 18)

Migrasi `20261114000100_whatsapp_payment_proof.sql` menambahkan:

| Objek | Fungsi |
| --- | --- |
| `deposits.bukti_bayar_url`, `bukti_bayar_at` | path dan waktu unggah bukti oleh BSU |
| `deposits.pembayaran_diterima_at` | waktu warga mengonfirmasi pembayaran diterima |
| `deposits.pembayaran_ditolak_at`, `alasan_bayar_ditolak` | laporan masalah pembayaran dari warga |
| `set_deposit_payment_proof(uuid, text)` | RPC BSU menyimpan path bukti setelah penimbangan |
| `confirm_payment_received(uuid, boolean, text)` | RPC warga menerima/melaporkan masalah |
| `whatsapp_outbox` | antrean pesan WhatsApp yang ditulis trigger |
| `enqueue_whatsapp_message(...)` | helper internal trigger (tidak dapat dipanggil klien) |
| `queue_deposit_whatsapp()` + trigger | mengisi outbox saat setoran baru/berubah status |
| bucket `payment-proofs` | privat, path `{deposit_id}/{berkas}` |

Catatan:

- `whatsapp_outbox` hanya dapat dibaca admin. Penulisan dilakukan trigger
  `SECURITY DEFINER`, sehingga klien tidak dapat memalsukan pesan.
- Pengiriman dilakukan Edge Function `whatsapp-dispatch` memakai service role.
  Tanpa gateway, antrean tetap tersimpan dan tidak mengganggu aplikasi.
- Retry maksimal 5 kali dengan jeda bertambah; setelah itu status menjadi
  `failed`.
- Policy `payment-proofs` mengizinkan warga pemilik setoran, BSU tujuan, dan
  admin membaca berkas. Unggah oleh warga/BSU, hapus oleh BSU/admin.

## Cek setelah migrasi

Jalankan di SQL Editor:

```sql
-- Harus kosong: semua tabel public wajib RLS
select tablename
from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- Harga aktif: PET BSU Melati harus Rp4.000
select org_nama, waste_nama, tipe, harga_per_kg
from public.v_active_waste_prices
where org_nama = 'BSU Melati' and waste_nama = 'Botol PET';

-- Semua akun dan peran
select p.nama, p.role, o.nama as organisasi
from public.profiles p
left join public.organizations o on o.id = p.org_id
order by p.role, p.nama;

-- Migrasi bukti pembayaran & WhatsApp sudah ada
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'deposits'
  and column_name in ('bukti_bayar_url', 'pembayaran_diterima_at', 'alasan_bayar_ditolak');
select count(*) as antrean_pending
from public.whatsapp_outbox where status = 'pending';

-- RPC Tahap 4 harus ada
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'create_stock_order', 'pay_stock_order', 'cancel_stock_order',
    'schedule_order_bsu_pickup', 'schedule_order_industri_pickup',
    'update_pickup_status'
  )
order by proname;

-- Kategori kas pembelian stok harus diterima
select pg_get_constraintdef(oid) as definisi
from pg_constraint
where conname = 'ledger_entries_kategori_check';

-- RPC Tahap 5 harus ada
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'create_product_order', 'pay_product_order', 'cancel_product_order',
    'ship_product_order', 'complete_product_order'
  )
  order by proname;

-- Master jenis sampah & organisasi untuk admin
select count(*) as jenis_sampah from public.waste_types;
select status, count(*) from public.organizations group by status order by status;
```

Uji RLS dan alur penuh memerlukan sesi login. Aplikasi Tahap 2–6 sudah
menyediakan login, dashboard, alur setoran, alur pesanan stok, marketplace
produk, serta halaman admin. Masuk sebagai warga lalu BSU/BSI/industri/admin
untuk memastikan:

1. Warga dapat membuat setoran, mengunggah foto, melihat riwayat, dan
   mengonfirmasi hasil timbang hanya untuk setorannya sendiri.
2. BSU dapat melihat WA/lokasi setoran tujuannya, menjadwalkan jemput,
   menimbang, dan mengirim data ke BSI.
3. BSI tidak bisa membaca tabel `deposits` mentah, tetapi melihat data aman di
   dashboard setelah BSU mengirim data.
4. Industri/warga hanya melihat stok gabungan, bukan detail setoran mentah.
5. Kas BSU tidak dapat dibaca atau ditulis oleh organisasi lain. Biaya
   operasional hanya bisa ditambah dengan bentuk yang diizinkan.
6. Perubahan harga membuat baris baru; harga lama tidak berubah. Koreksi kas
   membuat entri pembalik dan tidak bisa diulang untuk entri yang sama.
7. BSI dapat mempublikasikan setoran hanya setelah harga jual aktif; stok
   gabungan dan lot asal BSU tampil sesuai.
8. Industri hanya dapat memesan stok yang tersedia; stok berkurang saat pesanan
   dibuat dan kembali saat pesanan belum dibayar dibatalkan.
9. Pembayaran pesanan menulis kas BSI masuk dan kas industri keluar. Organisasi
   lain tidak dapat membaca buku kas tersebut.
10. BSU hanya melihat ringkasan pesanan yang dijadwalkan dijemput dari BSU-nya;
    item dan alokasi lot tetap tertutup.
11. Hanya warga yang dapat membuat pesanan produk; stok berkurang saat
    pesanan dibuat dan kembali saat dibatalkan sebelum dikirim.
12. Pembayaran produk menulis kas masuk `penjualan_produk` hanya untuk penjual
    yang memiliki organisasi. Pembatalan setelah dibayar menulis `koreksi`.
13. Warga hanya melihat pesanan miliknya; penjual/org penjual hanya melihat
    pesanan masuknya. Warga lain tidak dapat membaca pesanan tersebut.
14. Non-admin tidak dapat mengubah `waste_types` atau status `organizations`;
    admin dapat memverifikasi/menolak organisasi dan mengelola master sampah.
15. Nilai enum lama `pembeli`/`pengepul` tidak lagi dipakai baris profil atau
    organisasi mana pun; registrasi baru selalu menghasilkan `warga`. Nama
    internal lain sudah memakai `industri` (lihat migrasi 17).

## Catatan

Panduan setup aplikasi, konfigurasi Auth, dan checklist pengujian Tahap 2–6 ada
di [`../README.md`](../README.md). Pastikan migrasi storage juga dijalankan agar
unggah avatar, foto setoran, dan foto produk berfungsi.
