import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceClient, createRouteHandlerClient } from '@/lib/supabase/server'

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

class LineAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'LineAuthError'
  }
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(LINE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }).toString(),
    })
  } catch {
    throw new LineAuthError('LINE token service unreachable', 503)
  }

  if (!response.ok) {
    throw new LineAuthError('Invalid LINE authorization code', 401)
  }

  const data = await response.json()
  return data.access_token as string
}

async function getLineProfile(accessToken: string): Promise<LineProfile> {
  let response: Response
  try {
    response = await fetch(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new LineAuthError('LINE profile service unreachable', 503)
  }

  if (!response.ok) {
    throw new LineAuthError('Invalid LINE access token', 401)
  }

  const data = await response.json()
  return {
    userId: data.userId as string,
    displayName: data.displayName as string,
    pictureUrl: data.pictureUrl as string | undefined,
  }
}

function deriveEmail(lineId: string): string {
  return `line_${lineId}@internal.rueiselect.local`
}

function derivePassword(lineId: string): string {
  return createHmac('sha256', process.env.LINE_CHANNEL_SECRET!).update(lineId).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string
      redirectUri?: string
      accessToken?: string
    }

    const { code, redirectUri, accessToken: providedToken } = body

    if (!code && !providedToken) {
      return NextResponse.json({ error: 'Missing code or accessToken' }, { status: 400 })
    }
    if (code && !redirectUri) {
      return NextResponse.json({ error: 'Missing redirectUri' }, { status: 400 })
    }

    // Resolve LINE access token
    const accessToken = providedToken ?? (await exchangeCodeForToken(code!, redirectUri!))

    // Get LINE profile
    const profile = await getLineProfile(accessToken)
    const lineId = profile.userId

    const serviceClient = createServiceClient()

    // Upsert in custom users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (serviceClient.from('users') as any).upsert(
      {
        line_id: lineId,
        display_name: profile.displayName,
        avatar_url: profile.pictureUrl ?? null,
        role: 'merchant' as const,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'line_id' }
    )

    if (upsertError) {
      throw new Error(`DB upsert failed: ${upsertError.message}`)
    }

    // Ensure Supabase auth user exists
    const email = deriveEmail(lineId)
    const password = derivePassword(lineId)

    // Check if auth user already exists before attempting to create
    const { data: listData } = await serviceClient.auth.admin.listUsers()
    const existingAuthUser = listData?.users?.find((u) => u.email === email)

    if (!existingAuthUser) {
      const { error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`)
      }
    }

    // Sign in → sets session cookies via createRouteHandlerClient
    const sessionClient = await createRouteHandlerClient()
    const { error: signInError } = await sessionClient.auth.signInWithPassword({ email, password })

    if (signInError) {
      throw new Error(`Session creation failed: ${signInError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof LineAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const detail = error instanceof Error ? error.message : String(error)
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: 'Internal server error', detail }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
