import type { PaneFigures, PaneLimit } from '../types'

// Pure: everything the card says and how wide it is. The hooks and the drawing live in register.tsx.
// The shape of the card (gauges, the 5h / 7d limits, the model line) follows xuanji86/claude-statuspane (MIT).

// The prompt cache lives one hour from its last use, and every model request refreshes it. Measured on
// this account's transcripts: the cache writes go to the 1h tier (`ephemeral_1h_input_tokens`), none to 5m.
// The exact expiry is `prompt_cache.expires_at` in the status line's JSON, which the mod API does not
// expose, so the card shows an estimate: when the last main-thread request went out, plus the TTL.
export const TTL_MS = 3_600_000
export const WARN_MS = 300_000 // under this the line turns red: a pause past it costs a full re-cache

export const GAUGE = 12 // cells of the context and cache gauges
const LIMIT_GAUGE = 5
const PENDING = '—'
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']

export const CARD_WIDTH = 34 // inside the border, at least; a wider line widens the card
export const MAX_CARD_WIDTH = 50
export const MIN_COLUMNS = 70 // narrower than this the card would cover too much; draw nothing
// Right of the first line: '● working', then the ' ' and '▾ hide' button.
export const HEAD_RIGHT = '● working'
export const BUTTONS_WIDTH = HEAD_RIGHT.length + 1 + 6

export type Part = { text: string; color?: string; dim?: boolean; bold?: boolean }

// Claude Code's own colors, by theme key, so the card follows the person's theme.
const levelColor = (pct: number, warnAt: number, errAt: number) => (pct >= errAt ? 'error' : pct >= warnAt ? 'warning' : 'claude')
export const usedColor = (pct: number) => levelColor(pct, 60, 85)
export const ctxColor = (pct: number) => levelColor(pct, 50, 80)

// Terminal columns a string takes: East Asian wide and fullwidth characters take two. Emoji below the emoji
// block (⌛ ⚡ ✅ …) are not counted wide: the card draws none, and the text it gets (a directory, a branch) rarely has them.
export const cols = (s: string) => {
  let n = 0
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    const wide =
      (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1faff) || (c >= 0x20000 && c <= 0x3fffd)
    n += wide ? 2 : 1
  }
  return n
}

// Cut text to `max` columns, keeping its end ("…tail") or its start ("head…").
export const fit = (s: string, max: number, keep: 'end' | 'start' = 'start') => {
  if (cols(s) <= max) return s
  const out: string[] = []
  let n = 1 // the ellipsis
  for (const ch of keep === 'end' ? [...s].reverse() : [...s]) {
    if (n + cols(ch) > max) break
    n += cols(ch)
    out.push(ch)
  }
  return keep === 'end' ? `…${out.reverse().join('')}` : `${out.join('')}…`
}

// A long directory keeps its last segments: "~/Desktop/a/b/project" -> "…/b/project".
export const shortDir = (dir: string, max = 20) => {
  if (cols(dir) <= max) return dir
  const segs = dir.split('/')
  let tail = segs.pop() ?? ''
  if (cols(tail) + 2 > max) return fit(tail, max, 'end')
  while (segs.length && cols(`…/${segs[segs.length - 1]}/${tail}`) <= max) tail = `${segs.pop()}/${tail}`
  return `…/${tail}`
}

// Text from git and the engine goes to the terminal: no control, escape or bidi characters, bounded length.
// C0/C1 controls (escape included), bidi marks and isolates, zero-width and line/paragraph separators.
const UNSAFE: [number, number][] = [
  [0x00, 0x1f], [0x7f, 0x9f], [0x61c, 0x61c], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff],
]
const isSafe = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0
  return !UNSAFE.some(([lo, hi]) => c >= lo && c <= hi)
}
export const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? [...v].filter(isSafe).slice(0, max).join('').trim() : ''

// "claude-opus-5-5[1m]" -> "Opus 5.5 (1M)", "claude-opus-4-20250514" -> "Opus 4"; anything else as given.
export const prettyModel = (id: string) => {
  const m = /^claude-([a-z]+)-(\d{1,2})(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/.exec(id)
  if (!m || !m[1]) return id
  return `${m[1][0]?.toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ''}${m[4] ? ' (1M)' : ''}`
}

// "2h41m" to a rate limit's reset, "6d23h" past a day; "now" once it has passed.
export const fmtEta = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const s = Math.floor((Date.parse(resetsAt) - now) / 1000)
  if (!(s > 0)) return 'now'
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d${h}h` : `${h}h${m}m`
}

// "47m" from ten minutes up, "4m05s" below, "42s" under a minute.
export const fmtLeft = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  if (m >= 10) return `${m}m`
  if (m >= 1) return `${m}m${String(s % 60).padStart(2, '0')}s`
  return `${s}s`
}

// A gauge as Claude Code draws one: ▰ used, ▱ left.
export const gauge = (pct: number, width: number) => {
  const on = Math.min(width, Math.max(0, Math.round((pct * width) / 100)))
  return { on: '▰'.repeat(on), off: '▱'.repeat(width - on) }
}
const gaugeParts = (pct: number, width: number, color: string): Part[] => {
  const g = gauge(pct, width)
  return [{ text: g.on, color }, { text: g.off, color: 'subtle' }]
}

export type CacheRow = { percent: number; text: string; state: 'ok' | 'error' }

// The cache last used at `cacheAt` (null: no response yet, so nothing to say). The bar drains; once cold it
// shows the word, never a negative time.
export const cacheRow = (cacheAt: number | null, now: number): CacheRow | null => {
  if (cacheAt === null) return null
  const left = Math.min(TTL_MS, cacheAt + TTL_MS - now) // a clock set back must not push the bar past full
  if (left <= 0) return { percent: 0, text: 'fredda', state: 'error' }
  return { percent: (left / TTL_MS) * 100, text: `≈${fmtLeft(left)}`, state: left > WARN_MS ? 'ok' : 'error' }
}

const cacheLine = (cacheAt: number | null, now: number): Part[] => {
  const row = cacheRow(cacheAt, now)
  if (!row) return [{ text: 'cache ', dim: true }, { text: gauge(0, GAUGE).off, color: 'subtle' }, { text: ` ${PENDING}`, dim: true }]
  const color = row.state === 'error' ? 'error' : 'claude'
  return [
    { text: 'cache ', dim: true },
    ...gaugeParts(row.percent, GAUGE, color),
    { text: ` ${row.text}`, ...(row.state === 'error' ? { color } : {}) },
  ]
}

const limit = (label: string, l: PaneLimit | undefined, now: number): Part[] => {
  if (!l) return [{ text: `${label} `, dim: true }, { text: PENDING, dim: true }]
  const eta = fmtEta(l.resetsAt, now)
  const color = usedColor(l.pct)
  return [
    { text: `${label} `, dim: true },
    ...gaugeParts(l.pct, LIMIT_GAUGE, color),
    { text: ` ${Math.round(l.pct)}%`, ...(color === 'claude' ? { dim: true } : { color }) },
    ...(eta ? [{ text: ` ↻${eta}`, dim: true }] : []),
  ]
}

// "▮▮▮▯▯ high"; a level it does not know, as a word alone.
const effortParts = (effort: string): Part[] => {
  const n = EFFORTS.indexOf(effort) + 1
  return [
    ...(n ? [{ text: `${'▮'.repeat(n)}${'▯'.repeat(EFFORTS.length - n)} `, color: 'claude' }] : []),
    { text: effort, color: 'claude', bold: true },
  ]
}

export const lineWidth = (parts: Part[]) => parts.reduce((n, p) => n + cols(p.text), 0)

// The card's lines, each a run of colored parts: model and effort, context, limits, place and cost, cache.
export const cardLines = (f: PaneFigures, now: number): Part[][] => {
  const sep: Part = { text: ' · ', dim: true }
  const k = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`)
  const model: Part[] = [
    { text: f.model ? prettyModel(f.model) : PENDING, color: 'claude', bold: true },
    ...(f.effort ? [{ text: '  ' }, ...effortParts(f.effort)] : []),
  ]
  const ctx: Part[] =
    f.ctxPct === undefined
      ? [{ text: 'ctx ', dim: true }, { text: gauge(0, GAUGE).off, color: 'subtle' }, { text: ` ${PENDING}`, dim: true }]
      : [
          { text: 'ctx ', dim: true },
          ...gaugeParts(f.ctxPct, GAUGE, ctxColor(f.ctxPct)),
          { text: ` ${Math.round(f.ctxPct)}%`, bold: true },
          ...(f.ctxTokens !== undefined && f.ctxWindow ? [{ text: ` ${k(f.ctxTokens)}/${k(f.ctxWindow)}`, dim: true }] : []),
        ]
  const place: Part[][] = [
    [{ text: f.dir ? shortDir(f.dir) : PENDING }],
    ...(f.branch ? [[{ text: `⎇ ${fit(f.branch, 16)}` }]] : []),
    ...(f.costUsd !== undefined ? [[{ text: `$${f.costUsd.toFixed(2)}` }]] : []),
  ]
  return [
    model,
    ctx,
    [...limit('5h', f.fiveHour, now), { text: '   ' }, ...limit('7d', f.week, now)],
    place.flatMap((parts, n) => (n > 0 ? [sep, ...parts] : parts)),
    cacheLine(f.cacheAt, now),
  ]
}

// The card's inner width and where the buttons go: beside the first line, or on a row of their own above it
// when that line and the buttons together would pass the widest card.
export const layout = (lines: Part[][]) => {
  const first = lineWidth(lines[0] ?? [])
  const buttonsOwnRow = lines.length > 0 && first + BUTTONS_WIDTH > MAX_CARD_WIDTH
  const width = Math.min(MAX_CARD_WIDTH, Math.max(CARD_WIDTH, ...lines.map(lineWidth), buttonsOwnRow ? BUTTONS_WIDTH : first + BUTTONS_WIDTH))
  return { width, buttonsOwnRow }
}
