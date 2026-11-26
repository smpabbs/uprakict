import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware hanya menyegarkan cookie sesi Supabase dan memantulkan pengguna
 * yang sudah login dari /login. Guard halaman dilakukan di Server Component
 * masing-masing (redirect dari server component aman untuk router klien),
 * supaya permintaan RSC/prefetch tidak pernah dibalas HTML redirect —
 * itu penyebab error "An unexpected response was received from the server".
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isRsc = request.headers.get('rsc') === '1' || request.nextUrl.searchParams.has('_rsc')

  // Sudah login tapi membuka /login → pantulkan ke beranda (kecuali permintaan RSC).
  if (user && path === '/login' && !isRsc) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|manifest.webmanifest).*)',
  ],
}
