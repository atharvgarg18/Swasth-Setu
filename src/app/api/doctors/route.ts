import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const serviceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Hardcoded specialty tags for demo doctors
const DOCTOR_SPECIALTIES: Record<string, string> = {
  'rajesh@demo.gramincare.in': 'General Medicine',
  'arjun@demo.gramincare.in': 'Cardiology',
};

export async function GET() {
  try {
    // Get all active doctor user IDs
    const { data: roleRows, error: roleErr } = await serviceRole
      .from('user_roles')
      .select('user_id')
      .eq('role', 'doctor')
      .eq('is_active', true);

    if (roleErr || !roleRows?.length) {
      return NextResponse.json({ doctors: [] });
    }

    const userIds = roleRows.map((r: any) => r.user_id);

    // Get their profiles
    const { data: profiles, error: profErr } = await serviceRole
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profErr) {
      return NextResponse.json({ doctors: [] });
    }

    // Attach specialty
    const doctors = (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name ?? 'Doctor',
      email: p.email ?? '',
      specialty: DOCTOR_SPECIALTIES[p.email] ?? 'General Medicine',
    }));

    return NextResponse.json({ doctors });
  } catch (err) {
    return NextResponse.json({ doctors: [], error: String(err) }, { status: 500 });
  }
}
