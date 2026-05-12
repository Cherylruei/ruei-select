import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isProtectedAdminRoute(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login'
}

function isProtectedStoreRoute(pathname: string) {
  return pathname.match(/^\/store\/[^/]+/) !== null && !pathname.match(/^\/store\/[^/]+\/login$/)
}

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
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return response
  }

  // /admin/* — require authentication
  if (isProtectedAdminRoute(pathname)) {
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
  if (isProtectedStoreRoute(pathname)) {
    if (!user) {
      const slugMatch = pathname.match(/^\/store\/([^/]+)/)
      const slug = slugMatch ? slugMatch[1] : ''
      return NextResponse.redirect(new URL(`/store/${slug}/login`, request.url))
    }
    return response
  }

  return response
}
