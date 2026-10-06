import type { EngineInterface, Register } from 'claude-code'

// The prompt cache lives one hour from its last use, and every model request refreshes it. Measured on
// this account's transcripts: the cache writes go to the 1h tier (`ephemeral_1h_input_tokens`), none to 5m.
// The exact expiry is `prompt_cache.expires_at` in the status line's JSON, which the mod API does not
// expose, so this is an estimate: when the last main-thread request went out, plus the TTL.
export const TTL_MS = 3_600_000
export const WARN_MS = 300_000 // under this the row turns red: a pause past it costs a full re-cache
const TICK_MS = 1_000
const ROW_ID = 'cache'
const ROW_TTL_S = 120 // statuspane drops a row this long after its last report, so a dead mod leaves none

// What statuspane's `$.statuspane.progress` takes; it is another plugin's noun, so typed here, not imported.
type Row = { id: string; label: string; percent: number; text: string; ttl: number; state: 'ok' | 'error' }
type Statuspane = { progress: (row: Row) => Promise<void>; clear: (id: string) => Promise<void> }

// "47m" from ten minutes up, "4m05s" below, "42s" under a minute.
export const fmtLeft = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  if (m >= 10) return `${m}m`
  if (m >= 1) return `${m}m${String(s % 60).padStart(2, '0')}s`
  return `${s}s`
}

// Pure: the row for a cache last used at `lastAt` (null: no response yet, so no row). The bar drains; once
// cold it shows the word, never a negative time.
export const cacheRow = (lastAt: number | null, now: number): Row | null => {
  if (lastAt === null) return null
  const left = Math.min(TTL_MS, lastAt + TTL_MS - now) // a clock set back must not push the bar past full
  const base = { id: ROW_ID, label: 'cache', ttl: ROW_TTL_S }
  if (left <= 0) return { ...base, percent: 0, text: 'fredda', state: 'error' }
  return { ...base, percent: (left / TTL_MS) * 100, text: `≈${fmtLeft(left)}`, state: left > WARN_MS ? 'ok' : 'error' }
}

// When the main thread's cache was last used. Module state, as statuspane keeps its own: a reload forgets
// it (and session.start, which fires again, clears it), so a row never outlives what it was measured from.
let lastAt: number | null = null

// statuspane adds `$.statuspane` in its own engine.create. The sandbox lets a noun of `$` be called but not
// read as a value, so there is no "is it there?" check: without statuspane the call throws, and it is told once.
declare module 'claude-code' {
  interface EngineInterface {
    statuspane: Statuspane
  }
}

let hasWarned = false
const warnOnce = async ($: EngineInterface, err: unknown) => {
  if (hasWarned) return
  hasWarned = true
  await $.ui.log(`cache-clock: cannot reach statuspane (installed and enabled?): ${err instanceof Error ? err.message : String(err)}`, { to: 'debug' })
}

// Never rejects: runs from a timer, where nobody could catch it.
async function publish($: EngineInterface) {
  const row = cacheRow(lastAt, await $.clock.now())
  if (!row) return
  try {
    await $.statuspane.progress(row)
  } catch (err) {
    await warnOnce($, err)
  }
}

async function clearRow($: EngineInterface) {
  try {
    await $.statuspane.clear(ROW_ID)
  } catch (err) {
    await warnOnce($, err)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    lastAt = null
    hasWarned = false
    $.clock.every(TICK_MS, () => void publish($))
    return next(e)
  })

  // The moment the request goes out is what the cache counts from, so it is taken before `next`, not after:
  // a long answer must not make the cache look younger than it is. Subagents have caches of their own.
  on('turn.step', async function* ($, e, next) {
    const sentAt = await $.clock.now()
    const result = yield* next(e)
    if (!e.agentId && result.usage) lastAt = sentAt // no usage: the request failed, the cache was not touched
    return result
  })

  // A compaction replaces the prefix, and the new one is not cached until the next request.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId && e.trigger !== 'precompute' && !result.skip) {
      lastAt = null
      await clearRow($)
    }
    return result
  })
}
