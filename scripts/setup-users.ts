/**
 * Swasth Setu — Database Setup Script
 * 
 * This script creates demo auth users in Supabase with fixed UUIDs
 * matching the seed data. Run this ONCE after deploying the schema.
 * 
 * Usage: npx tsx scripts/setup-users.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DemoUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000001',
    email: 'meera@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Meera Patil',
    role: 'patient',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000002',
    email: 'priya@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Priya Deshmukh',
    role: 'asha',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000003',
    email: 'rajesh@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Dr. Rajesh Kumar',
    role: 'doctor',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000004',
    email: 'sunita@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Sunita Jadhav',
    role: 'facility_admin',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000005',
    email: 'amit@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Amit Kulkarni',
    role: 'district_admin',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000006',
    email: 'rekha@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Rekha Gaikwad',
    role: 'anm',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000007',
    email: 'suresh@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Dr. Suresh Patil',
    role: 'doctor',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000008',
    email: 'ganesh@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Ganesh Shinde',
    role: 'patient',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000009',
    email: 'anita@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Anita Bhosle',
    role: 'patient',
  },
  {
    id: 'd0d0d0d0-0000-0000-0000-000000000010',
    email: 'rohit@demo.gramincare.in',
    password: 'demo123456',
    full_name: 'Rohit Kamble',
    role: 'patient',
  },
];

async function createUser(user: DemoUser) {
  console.log(`Creating user: ${user.email} (${user.role})...`);

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
    }),
  });

  const data = await response.json();

  if (response.ok) {
    console.log(`  ✅ Created: ${user.email}`);
  } else if (data?.msg?.includes('already') || data?.message?.includes('already')) {
    console.log(`  ⚠️  Already exists: ${user.email}`);
  } else {
    console.error(`  ❌ Error: ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables. Make sure .env.local is loaded.');
    console.error('   Run with: npx dotenv -e .env.local -- npx tsx scripts/setup-users.ts');
    process.exit(1);
  }

  console.log('🏥 Swasth Setu — Setting up demo users');
  console.log('==========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  for (const user of DEMO_USERS) {
    await createUser(user);
  }

  console.log('');
  console.log('==========================================');
  console.log('✅ Done! Now run the seed data:');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Paste and run supabase/schema.sql');
  console.log('   3. Paste and run supabase/seed.sql');
  console.log('');
  console.log('Demo accounts (all password: demo123456):');
  console.log('  Patient:  meera@demo.gramincare.in');
  console.log('  ASHA:     priya@demo.gramincare.in');
  console.log('  Doctor:   rajesh@demo.gramincare.in');
  console.log('  Facility: sunita@demo.gramincare.in');
  console.log('  District: amit@demo.gramincare.in');
}

main();
