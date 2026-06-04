import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — must not write code between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes: both auth portals + onboarding + callback
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/patient-login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth/callback');

  // Public emergency-card scan page — must be accessible without login
  const isPublicRoute = pathname.startsWith('/emergency');

  // If no session and trying to access a protected route, redirect to caregiver login
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If authenticated, fetch role and redirect accordingly from root
  if (user && (pathname === '/' || pathname === '')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, family_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.family_id) {
      // No profile yet — go to onboarding
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = profile.role === 'caregiver' ? '/caregiver' : '/patient';
    return NextResponse.redirect(url);
  }

  // If authenticated but no profile, redirect to onboarding (except when already there)
  if (user && !isAuthRoute && pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, family_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.family_id) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    // Role-based protection: patients cannot access /caregiver routes and vice versa
    if (profile.role === 'patient' && pathname.startsWith('/caregiver')) {
      const url = request.nextUrl.clone();
      url.pathname = '/patient';
      return NextResponse.redirect(url);
    }
    if (profile.role === 'caregiver' && pathname.startsWith('/patient')) {
      const url = request.nextUrl.clone();
      url.pathname = '/caregiver';
      return NextResponse.redirect(url);
    }
  }

  // If logged-in user visits auth routes (either portal), redirect to their dashboard
  if (user && isAuthRoute && pathname !== '/auth/callback') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, family_id')
      .eq('id', user.id)
      .single();

    if (profile?.family_id) {
      const url = request.nextUrl.clone();
      url.pathname = profile.role === 'caregiver' ? '/caregiver' : '/patient';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
