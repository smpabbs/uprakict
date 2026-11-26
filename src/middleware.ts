import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const isLogin = path === '/login'
  const isApi = path.startsWith('/api')
  // Next memakai header "RSC" untuk prefetch/navigasi klien. Jangan pernah
  // membalasnya dengan HTML redirect — router akan gagal ("client-side exception").
  const isRsc =
    request.headers.get('rsc') === '1' || request.nextUrl.searchParams.has('_rsc')

  if (!user && !isLogin) {
    if (isApi) {
      return NextResponse.json({ error: 'Sesi habis, silakan masuk ulang.' }, { status: 401 })
    }
    if (isRsc) {
      return new NextResponse(null, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Aset statis, ikon, dan manifest tidak boleh lewat guard.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|manifest.webmanifest).*)',
  ],
}
