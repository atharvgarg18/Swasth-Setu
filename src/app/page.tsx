import { redirect } from 'next/navigation';

/**
 * Root page - redirects to login.
 * Authenticated users are redirected to their role-specific dashboard by middleware.
 */
export default function RootPage() {
  redirect('/login');
}
