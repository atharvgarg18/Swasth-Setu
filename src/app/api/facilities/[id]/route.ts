import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/facilities/[id] - Get facility details with stock and diagnostics
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: facility, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !facility) {
    return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
  }

  // Fetch medicine stock
  const { data: medicines } = await supabase
    .from('medicine_stock')
    .select('*')
    .eq('facility_id', id)
    .order('medicine_name');

  // Fetch diagnostic availability
  const { data: diagnostics } = await supabase
    .from('diagnostic_availability')
    .select('*')
    .eq('facility_id', id)
    .order('test_name');

  return NextResponse.json({
    data: {
      ...facility,
      medicines: medicines ?? [],
      diagnostics: diagnostics ?? [],
    },
  });
}
