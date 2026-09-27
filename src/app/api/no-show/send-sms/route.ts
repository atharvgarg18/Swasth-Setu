import { NextResponse } from 'next/server';

const DEMO_TO_NUMBER = process.env.TWILIO_DEMO_TO_NUMBER ?? '';  // +917723840916
const INTERNAL_KEY   = process.env.CRON_INTERNAL_KEY ?? 'swasthya-setu-cron';

/**
 * Strips country code → 10-digit Indian mobile number
 * +917723840916 → 7723840916
 */
function to10Digit(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1);
  return digits.slice(-10);
}

/**
 * POST /api/no-show/send-sms
 * Called by pg_net from escalate_no_show_referrals() pg_cron function.
 * Sends real SMS via Textbelt (free tier: 1/day, no signup required).
 */
export async function POST(request: Request) {
  // Verify internal key
  const key = request.headers.get('x-internal-key');
  if (key !== INTERNAL_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, referral_id, asha_phone } = body;
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const rawPhone = DEMO_TO_NUMBER || asha_phone || '';
  const phone10  = to10Digit(rawPhone);

  if (phone10.length !== 10) {
    return NextResponse.json({ error: `Invalid phone: ${rawPhone}` }, { status: 400 });
  }

  // Textbelt format for Indian numbers: prefix with 91
  const phoneForTextbelt = `91${phone10}`;

  console.log(`[Textbelt] Sending SMS | to=${phoneForTextbelt} | referral=${referral_id}`);

  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone:   phoneForTextbelt,
        message: message,
        key:     'textbelt',          // free tier: 1 SMS per day
      }),
    });

    const result = await res.json();
    console.log('[Textbelt] Response:', JSON.stringify(result));

    if (!result.success) {
      console.error('[Textbelt] Failed:', result.error);
      return NextResponse.json({
        success: false,
        error:   result.error ?? 'Textbelt error',
        quota:   result.quotaRemaining,
      }, { status: 500 });
    }

    console.log(`[Textbelt] ✅ SMS sent | textId=${result.textId} | quota=${result.quotaRemaining}`);

    return NextResponse.json({
      success:  true,
      text_id:  result.textId,
      to:       phoneForTextbelt,
      quota:    result.quotaRemaining,
      provider: 'Textbelt',
    });

  } catch (err: any) {
    console.error('[Textbelt] Network error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
