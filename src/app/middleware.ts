import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Récupère l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser()

  // Protection de la route /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Pas connecté → redirige vers login
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Connecté mais pas admin → redirige vers map
    const isAdmin = user.user_metadata?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/map', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}