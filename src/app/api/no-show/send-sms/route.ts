import { NextResponse } from 'next/server';

const FAST2SMS_API_KEY  = process.env.FAST2SMS_API_KEY!;
const DEMO_TO_NUMBER    = process.env.TWILIO_DEMO_TO_NUMBER ?? '';  // +917723840916
const INTERNAL_KEY      = process.env.CRON_INTERNAL_KEY ?? 'swasthya-setu-cron';

/**
 * Strips country code and returns 10-digit Indian mobile number
 * +917723840916 → 7723840916
 * 917723840916  → 7723840916
 * 7723840916    → 7723840916
 */
function to10Digit(phone: string): string {
  const digits = phone.replace(/\D/g, '');            // remove non-digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1);
  return digits.slice(-10);                            // take last 10 digits
}

/**
 * POST /api/no-show/send-sms
 * Called by pg_net from escalate_no_show_referrals() pg_cron function.
 * Sends real SMS via Fast2SMS quick route (no DLT required).
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

  // Use demo number (verified) for trial; in production use actual asha_phone
  const rawPhone  = DEMO_TO_NUMBER || asha_phone || '';
  const phone10   = to10Digit(rawPhone);

  if (phone10.length !== 10) {
    console.error('[Fast2SMS] Invalid phone number:', rawPhone, '→', phone10);
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  console.log(`[Fast2SMS] Sending SMS | to=${phone10} | referral=${referral_id}`);
  console.log(`[Fast2SMS] Message: ${message}`);

  try {
    // Fast2SMS quick route — transactional, no DLT required
    const params = new URLSearchParams({
      route:    'q',
      message:  message,
      language: 'english',
      flash:    '0',
      numbers:  phone10,
    });

    const res = await fetch(
      `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          authorization: FAST2SMS_API_KEY,
          'Cache-Control': 'no-cache',
        },
      }
    );

    const result = await res.json();

    if (!res.ok || result.return === false) {
      console.error('[Fast2SMS] Error:', result);
      return NextResponse.json({
        success:      false,
        error:        result.message?.[0] ?? 'Fast2SMS error',
        fast2sms_res: result,
      }, { status: 500 });
    }

    console.log(`[Fast2SMS] ✅ SMS sent | request_id=${result.request_id} | to=${phone10}`);

    return NextResponse.json({
      success:    true,
      request_id: result.request_id,
      to:         phone10,
      provider:   'Fast2SMS',
    });

  } catch (err: any) {
    console.error('[Fast2SMS] Network error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
