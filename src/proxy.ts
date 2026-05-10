import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /admin/login — public, but redirect authenticated users to /admin
  if (pathname === '/admin/login') {
    if (user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return response
  }

  // /admin/* — require authentication
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return response
  }

  // /store/[slug]/login — public
  if (pathname.match(/^\/store\/[^/]+\/login$/)) {
    return response
  }

  // /store/[slug]/* — require authentication
  if (pathname.match(/^\/store\/[^/]+/)) {
    if (!user) {
      const slugMatch = pathname.match(/^\/store\/([^/]+)/)
      const slug = slugMatch ? slugMatch[1] : ''
      return NextResponse.redirect(new URL(`/store/${slug}/login`, request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
