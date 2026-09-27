import { NextResponse } from 'next/server';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM        = process.env.TWILIO_FROM_NUMBER!;
const TWILIO_DEMO_TO     = process.env.TWILIO_DEMO_TO_NUMBER!;
const INTERNAL_KEY       = process.env.CRON_INTERNAL_KEY ?? 'swasthya-setu-cron';

/**
 * POST /api/no-show/send-sms
 * Called by pg_net (from escalate_no_show_referrals pg_cron function)
 * Sends a real Twilio SMS to the ASHA worker's phone.
 */
export async function POST(request: Request) {
  // Verify internal key so only our pg_cron can call this
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

  // On free trial: always send to verified demo number
  // On production: use actual asha_phone
  const toNumber = TWILIO_DEMO_TO || asha_phone;

  try {
    // Call Twilio REST API directly (no SDK needed)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const params = new URLSearchParams({
      To:   toNumber,
      From: TWILIO_FROM,
      Body: message,
    });

    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[Twilio] Error:', result);
      return NextResponse.json({
        success: false,
        error: result.message ?? 'Twilio error',
        twilio_code: result.code,
      }, { status: 500 });
    }

    console.log(`[Twilio] SMS sent | sid=${result.sid} | to=${toNumber} | referral=${referral_id}`);

    return NextResponse.json({
      success: true,
      sms_sid: result.sid,
      to: toNumber,
      status: result.status,
    });

  } catch (err: any) {
    console.error('[Twilio] Network error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
