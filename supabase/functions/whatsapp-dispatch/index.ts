// Edge Function: whatsapp-dispatch
// Mengirim pesan pada tabel public.whatsapp_outbox ke gateway WhatsApp.
//
// Funktion ini opsional. Selama WHATSAPP_GATEWAY_URL belum diisi, seluruh
// pesan tetap tersimpan di outbox dan aplikasi berjalan normal.
//
// Deploy:
//   supabase functions deploy whatsapp-dispatch --no-verify-jwt
// Secrets:
//   supabase secrets set WHATSAPP_GATEWAY_URL=... WHATSAPP_GATEWAY_TOKEN=...
//   supabase secrets set WHATSAPP_DISPATCH_SECRET=... (opsional, disarankan)
//
// Kontrak gateway yang diharapkan (bisa diadaptasi pada fungsi sendViaGateway):
//   POST {WHATSAPP_GATEWAY_URL}
//   Authorization: Bearer {WHATSAPP_GATEWAY_TOKEN}
//   Content-Type: application/json
//   { "to": "0812...", "message": "teks" }
//   Respons 2xx dianggap berhasil.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const MAX_ATTEMPTS = 5;
const DEFAULT_BATCH = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-dispatch-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  return `+${digits}`;
}

async function sendViaGateway(
  gatewayUrl: string,
  token: string,
  to: string,
  message: string,
) {
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ to: normalizePhone(to), message }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Gateway menolak pesan (${response.status})${
        detail ? `: ${detail.slice(0, 180)}` : ''
      }`,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Gunakan metode POST.' }, 405);
  }

  const dispatchSecret = Deno.env.get('WHATSAPP_DISPATCH_SECRET');
  if (
    dispatchSecret &&
    request.headers.get('x-dispatch-secret') !== dispatchSecret
  ) {
    return json({ error: 'Secret pengiriman tidak valid.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const gatewayUrl = Deno.env.get('WHATSAPP_GATEWAY_URL')?.trim();
  const gatewayToken = Deno.env.get('WHATSAPP_GATEWAY_TOKEN')?.trim() ?? '';

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'SUPABASE_URL / SERVICE_ROLE_KEY belum tersedia.' }, 500);
  }

  if (!gatewayUrl) {
    return json({
      skipped: true,
      reason: 'WHATSAPP_GATEWAY_URL belum diisi. Outbox tetap tersimpan.',
    });
  }

  let limit = DEFAULT_BATCH;
  try {
    const body = await request.json();
    if (typeof body?.limit === 'number' && body.limit > 0) {
      limit = Math.min(100, Math.floor(body.limit));
    }
  } catch {
    // Body kosong diperbolehkan.
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from('whatsapp_outbox')
    .select('id, phone, message, attempts')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return json({ error: error.message }, 500);
  }

  let sent = 0;
  let failed = 0;
  const errors: Array<{ id: string; message: string }> = [];

  for (const row of rows ?? []) {
    const attempts = (row.attempts ?? 0) + 1;

    try {
      await sendViaGateway(gatewayUrl, gatewayToken, row.phone, row.message);

      await supabase
        .from('whatsapp_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts,
          last_error: null,
        })
        .eq('id', row.id);

      sent += 1;
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : 'Pengiriman gagal.';
      const exhausted = attempts >= MAX_ATTEMPTS;

      await supabase
        .from('whatsapp_outbox')
        .update({
          status: exhausted ? 'failed' : 'pending',
          attempts,
          last_error: message,
          scheduled_at: exhausted
            ? undefined
            : new Date(Date.now() + attempts * 60_000).toISOString(),
        })
        .eq('id', row.id);

      failed += 1;
      errors.push({ id: row.id, message });
    }
  }

  return json({
    processed: rows?.length ?? 0,
    sent,
    failed,
    errors,
  });
});
