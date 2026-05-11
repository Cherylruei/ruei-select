import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.test for unit tests (fake values safe to commit)
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.test'), 'utf8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = val
    }
  }
} catch {
  // .env.test not found — real env vars must be set externally
}
