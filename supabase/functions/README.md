# Supabase Edge Functions

## `whatsapp-dispatch`

Mengirim antrean WhatsApp dari tabel `public.whatsapp_outbox` ke gateway
WhatsApp milik Anda. Fitur ini **opsional**: tanpa gateway, pesan tetap
tersimpan di outbox dan notifikasi dalam aplikasi tetap berjalan.

### 1. Isi secret

```bash
supabase secrets set \
  WHATSAPP_GATEWAY_URL="https://gateway-contoh.example/send" \
  WHATSAPP_GATEWAY_TOKEN="token-rahasia" \
  WHATSAPP_DISPATCH_SECRET="string-acak-panjang"
```

`WHATSAPP_DISPATCH_SECRET` opsional tetapi disarankan. Bila diisi, pemanggil
wajib mengirim header `x-dispatch-secret` dengan nilai yang sama.

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan otomatis oleh runtime
Supabase dan tidak perlu diisi manual.

### 2. Deploy

```bash
supabase functions deploy whatsapp-dispatch --no-verify-jwt
```

### 3. Kontrak gateway

Fungsi mengirim permintaan berikut:

```http
POST {WHATSAPP_GATEWAY_URL}
Authorization: Bearer {WHATSAPP_GATEWAY_TOKEN}
Content-Type: application/json

{ "to": "+62812xxxxxxx", "message": "teks pesan" }
```

Respons HTTP 2xx dianggap berhasil. Bila gateway Anda memakai format lain,
sesuaikan fungsi `sendViaGateway` di `index.ts`.

### 4. Jadwalkan pengiriman

Panggil fungsi secara berkala (mis. tiap 1 menit) memakai cron eksternal,
GitHub Actions, atau `pg_cron` + `pg_net`:

```sql
select cron.schedule(
  'whatsapp-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/whatsapp-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', '<WHATSAPP_DISPATCH_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 5. Perilaku retry

- Maksimal 5 percobaan per pesan.
- Pesan yang gagal dijadwalkan ulang setelah `attempts × 1 menit`.
- Setelah 5 percobaan, status menjadi `failed` dan `last_error` menyimpan
  pesan kesalahan terakhir.
- Admin dapat membaca `whatsapp_outbox` untuk memantau status.
