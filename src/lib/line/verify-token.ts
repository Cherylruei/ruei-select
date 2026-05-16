interface LiffTokenPayload {
  lineId: string
  displayName: string
}

export async function verifyLiffToken(token: string): Promise<LiffTokenPayload | null> {
  try {
    const res = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null

    const profile = await res.json()
    return {
      lineId: profile.userId as string,
      displayName: profile.displayName as string,
    }
  } catch {
    return null
  }
}
