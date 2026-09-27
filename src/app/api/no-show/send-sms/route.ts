import { NextResponse } from 'next/server';

const VONAGE_API_KEY    = process.env.VONAGE_API_KEY!;
const VONAGE_API_SECRET = process.env.VONAGE_API_SECRET!;
const DEMO_TO_NUMBER    = process.env.TWILIO_DEMO_TO_NUMBER ?? ''; // +917723840916
const INTERNAL_KEY      = process.env.CRON_INTERNAL_KEY ?? 'swasthya-setu-cron';

function to10Digit(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1);
  return digits.slice(-10);
}

/**
 * POST /api/no-show/send-sms
 * Called by pg_net from escalate_no_show_referrals() pg_cron function.
 * Sends real SMS via Vonage (Nexmo) — international route, bypasses India DLT.
 */
export async function POST(request: Request) {
  const key = request.headers.get('x-internal-key');
  if (key !== INTERNAL_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { message, referral_id, asha_phone } = body;
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const rawPhone = DEMO_TO_NUMBER || asha_phone || '';
  const phone10  = to10Digit(rawPhone);
  if (phone10.length !== 10) {
    return NextResponse.json({ error: `Invalid phone: ${rawPhone}` }, { status: 400 });
  }

  const toNumber = `91${phone10}`; // Vonage format for India: 91XXXXXXXXXX

  console.log(`[Vonage] Sending SMS | to=${toNumber} | referral=${referral_id}`);

  try {
    const res = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:    VONAGE_API_KEY,
        api_secret: VONAGE_API_SECRET,
        to:         toNumber,
        from:       'SwasthSetu',
        text:       message,
      }),
    });

    const result = await res.json();
    const msg    = result.messages?.[0];

    if (!res.ok || msg?.status !== '0') {
      console.error('[Vonage] Error:', result);
      return NextResponse.json({
        success:      false,
        error:        msg?.['error-text'] ?? 'Vonage error',
        status:       msg?.status,
        vonage_res:   result,
      }, { status: 500 });
    }

    console.log(`[Vonage] ✅ SMS sent | message-id=${msg['message-id']} | to=${toNumber}`);

    return NextResponse.json({
      success:    true,
      message_id: msg['message-id'],
      to:         toNumber,
      remaining:  msg['remaining-balance'],
      provider:   'Vonage',
    });

  } catch (err: any) {
    console.error('[Vonage] Network error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
