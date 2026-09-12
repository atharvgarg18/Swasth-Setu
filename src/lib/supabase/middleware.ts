import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_ROUTES, type UserRole } from '@/lib/constants';

/**
 * Refreshes the Supabase auth session in middleware.
 * Must run on every request to keep session cookies fresh.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Always use getUser() on server, never getSession()
  // getSession() only reads JWT without verifying with Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/api/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname === '/manifest.webmanifest' || pathname === '/sw.js';

  if (isStaticAsset) {
    return supabaseResponse;
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!user && !isPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated and on login/register, redirect to appropriate dashboard
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    // Fetch user's primary role to determine redirect
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const primaryRole = roles?.[0]?.role as UserRole | undefined;
    const redirectPath = primaryRole ? ROLE_ROUTES[primaryRole] : '/login';

    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (user && !isPublicRoute) {
    const protectedPrefixes = ['/patient', '/asha', '/doctor', '/admin'];
    const matchedPrefix = protectedPrefixes.find((p) => pathname.startsWith(p));

    if (matchedPrefix) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const userRoles = roles?.map((r) => r.role as UserRole) ?? [];

      const allowedRoles: Record<string, UserRole[]> = {
        '/patient': ['patient'],
        '/asha': ['asha', 'anm'],
        '/doctor': ['doctor'],
        '/admin': ['facility_admin', 'district_admin'],
      };

      const requiredRoles = allowedRoles[matchedPrefix] ?? [];
      const hasAccess = userRoles.some((r) => requiredRoles.includes(r));

      if (!hasAccess) {
        // Redirect to their proper dashboard
        const correctRoute = ROLE_ROUTES[userRoles[0]] ?? '/login';
        const url = request.nextUrl.clone();
        url.pathname = correctRoute;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
