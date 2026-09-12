import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/facilities - List facilities
 * Query params: type, district, services (comma-separated)
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const district = searchParams.get('district');
  const services = searchParams.get('services');

  let dbQuery = supabase
    .from('facilities')
    .select('*')
    .eq('is_active', true)
    .order('type', { ascending: true });

  if (type) dbQuery = dbQuery.eq('type', type);
  if (district) dbQuery = dbQuery.eq('district', district);
  if (services) {
    // Filter facilities that have at least one of the requested services
    dbQuery = dbQuery.overlaps('services', services.split(','));
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
