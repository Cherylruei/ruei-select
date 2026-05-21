import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isProtectedAdminRoute(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login'
}

// Sprint 3：/store/* 路由全部公開，auth guard 改由 layout LIFF 處理

async function getAuthUser(request: NextRequest, response: NextResponse) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

function redirectWithCookies(to: URL, cookieSource: NextResponse): NextResponse {
  const res = NextResponse.redirect(to)
  cookieSource.cookies.getAll().forEach(({ name, value, ...opts }) => {
    res.cookies.set(name, value, opts)
  })
  return res
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
        'Copy .env.example to .env.local and fill in your Supabase credentials.'
    )
    return response
  }

  const user = await getAuthUser(request, response)

  // /admin/login — public; redirect authenticated users to /admin
  if (pathname === '/admin/login') {
    if (user) {
      return redirectWithCookies(new URL('/admin', request.url), response)
    }
    return response
  }

  // /admin/* — require authentication
  if (isProtectedAdminRoute(pathname)) {
    if (!user) {
      return redirectWithCookies(new URL('/admin/login', request.url), response)
    }
    return response
  }

  // /store/* — 全部公開，LIFF auth guard 在 layout 層處理
  if (pathname.startsWith('/store/')) {
    return response
  }

  return response
}
