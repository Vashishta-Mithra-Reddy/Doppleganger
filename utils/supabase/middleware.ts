import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
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
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    

    const { data: { user } } = await supabase.auth.getUser();
    const userx = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

    // protected routes
    if (request.nextUrl.pathname.startsWith("/protected") && userx.error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (request.nextUrl.pathname.startsWith('/dashboard') && !profile) {
      return NextResponse.redirect(new URL('/profile-setup', request.url));
    }

    if (request.nextUrl.pathname === '/' && profile) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (request.nextUrl.pathname === '/' && (!userx.error && !profile)) {
      return NextResponse.redirect(new URL('/profile-setup', request.url));
    }

    if (request.nextUrl.pathname === '/profile-setup' && profile) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (request.nextUrl.pathname === "/sign-up" && !userx.error) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (request.nextUrl.pathname.startsWith("/profile") && userx.error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return response;
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
