-- ============================================================================
-- UPCYCLE — 12: tambah peran/organisasi industri.
-- Nilai lama 'pengepul' dan 'pembeli' tetap dipertahankan agar enum tidak perlu
-- dibuat ulang, tetapi tidak dipakai lagi oleh aplikasi.
-- Harus berada di migrasi terpisah: PostgreSQL belum boleh memakai nilai enum
-- baru pada transaksi yang sama saat nilai itu ditambahkan.
-- ============================================================================

alter type public.app_role add value if not exists 'industri';
alter type public.org_type add value if not exists 'industri';
