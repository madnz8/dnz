import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, SessionUsage } from 'claude-code'

import type { PaneFigures } from '../types'
import { BUTTONS_WIDTH, HEAD_RIGHT, MIN_COLUMNS, cacheRow, cardLines, clean, layout, lineWidth } from './format'
import type { Part } from './format'

// A card above the prompt: model and effort, context, the 5h / 7d limits, directory, branch and cost, and how
// long the prompt cache has left. The shape follows xuanji86/claude-statuspane (MIT); the cache line is ours.

const EMPTY: PaneFigures = { dir: null, branch: null, model: null, effort: null, cacheAt: null, stamp: '' }
const figures = atom({ plugin: 'dnz', key: 'figures' } as const, EMPTY)
const isHidden = atom({ plugin: 'dnz', key: 'isHidden' } as const, false)

const TICK_MS = 1_000
const BRANCH_MS = 30_000
const HIDDEN_RIGHT_PAD = 5 // clear of Claude Code's own [-] panel toggle, drawn at the band's top right
const MINUTE_MS = 60_000

// The usage figures, from session.measure's input or $.session.usage() alike.
const fromUsage = (u: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>): Partial<PaneFigures> => {
  const find = (kind: string) => {
    const r = u.rateLimits.find(l => l.kind === kind)
    return r ? { pct: r.percentUsed, resetsAt: r.resetsAt } : undefined
  }
  return {
    ctxPct: u.context.percent,
    ctxTokens: u.context.tokens,
    ctxWindow: u.context.window,
    fiveHour: find('five_hour'),
    week: find('seven_day'),
    costUsd: u.cost?.usd,
  }
}

// What a timer cannot catch is told once, to the debug log.
let hasWarned = false
async function warnOnce($: EngineInterface, where: string, err: unknown) {
  if (hasWarned) return
  hasWarned = true
  await $.ui.log(`dnz card: ${where} failed: ${err instanceof Error ? err.message : String(err)}`, { to: 'debug' })
}

// Runs every second and redraws the card only when something it shows moved on the clock: the cache line's
// text, or the minute (the limits' countdowns). Never rejects.
async function tick($: EngineInterface) {
  try {
    const now = await $.clock.now()
    const f = await read($, figures)
    const row = cacheRow(f.cacheAt, now)
    const stamp = `${row?.text ?? ''}|${row?.state ?? ''}|${Math.floor(now / MINUTE_MS)}`
    if (stamp !== f.stamp) await update($, figures, g => ({ ...g, stamp }))
  } catch (err) {
    await warnOnce($, 'tick', err)
  }
}

// The directory and branch the session is in. Never rejects: the last ones stay.
async function refresh($: EngineInterface) {
  try {
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'))
    const cwd = await $.session.cwd()
    const dir = clean(home && (cwd === home || cwd.startsWith(`${home}/`)) ? `~${cwd.slice(home.length)}` : cwd, 400)
    const repo = await $.session.repo()
    const b = repo ? await $.process.run(['git', 'branch', '--show-current'], { cwd, timeoutMs: 3000 }).catch(() => null) : null
    const branch = (b && b.exitCode === 0 && clean(b.stdout, 200)) || null
    await update($, figures, f => ({ ...f, dir, branch }))
  } catch (err) {
    await warnOnce($, 'refresh', err)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    hasWarned = false
    const hidden = await $.store.get('hidden').catch(() => undefined)
    await update($, isHidden, () => hidden === true)
    const model = await $.session.model()
    const usage = fromUsage(await $.session.usage())
    // A new session has no cache yet: nothing has gone out in it.
    await update($, figures, f => ({ ...f, ...usage, model: model || null, cacheAt: null, stamp: '' }))
    $.clock.every(BRANCH_MS, () => void refresh($))
    $.clock.every(TICK_MS, () => void tick($))
    void refresh($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) void refresh($) // the branch may have moved; subagents' turns leave it be
    return result
  })

  // The moment a request goes out is what the cache counts from, so it is taken before `next`, not after: a
  // long answer must not make the cache look younger than it is. Subagents have caches of their own.
  on('turn.step', async function* ($, e, next) {
    const sentAt = await $.clock.now()
    if (!e.agentId) {
      const effort = e.effort === undefined ? null : String(e.effort)
      await update($, figures, f => ({ ...f, model: e.model, effort }))
    }
    const result = yield* next(e)
    // No usage: the request failed, the cache was not touched.
    if (!e.agentId && result.usage) await update($, figures, f => ({ ...f, cacheAt: sentAt }))
    return result
  })

  on('session.measure', async ($, e, next) => {
    const usage = fromUsage(e)
    await update($, figures, f => ({ ...f, ...usage }))
    return next(e)
  })

  // A compaction empties the live window and replaces the prefix: no measurement follows until the next
  // response, and the new prefix is not cached until the next request.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId && e.trigger !== 'precompute' && !result.skip)
      await update($, figures, f => ({ ...f, ctxPct: undefined, ctxTokens: undefined, cacheAt: null }))
    return result
  })

  // The band's rows hold the card at the right edge, just above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // The desktop app shows model, effort and context on its own, so the card is terminal-only there.
    if (e.surface === 'desktop') return next(e)
    if (e.props.hasSurvey || e.props.bodyColumns < MIN_COLUMNS) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    // What the plugins beneath drew here stays, above the card. Never pass the band itself: a band handed
    // back is not drawn again when the card's state changes.
    const below = await next(e).catch(() => null)
    const withBelow = (ours: RenderElement): RenderElement => (below ? <Box flexDirection="column">{below}{ours}</Box> : ours)
    // update() applies `fn` to the latest value and retries on a race, so two quick presses both land.
    const setHidden = async (hidden: boolean) => {
      await update($, isHidden, () => hidden)
      await $.store.set('hidden', hidden).catch(() => undefined)
    }
    // Hidden: a one-row button stays at the right edge.
    if (await read($, isHidden))
      return withBelow(
        <Box justifyContent="flex-end" paddingRight={HIDDEN_RIGHT_PAD}>
          <Button key="show" label="◂ status" dimColor onPress={() => setHidden(false)} />
        </Box>,
      )

    const lines = cardLines(await read($, figures), await $.clock.now())
    const { width, buttonsOwnRow } = layout(lines)
    const runs = (parts: Part[]) => parts.map(q => <Text color={q.color} dimColor={q.dim} bold={q.bold}>{q.text}</Text>)
    const pad = (parts: Part[], room: number) => ' '.repeat(Math.max(0, room - lineWidth(parts)))
    const row = (parts: Part[], room: number) => (
      <Text wrap="truncate-end">
        {runs(parts)}
        {pad(parts, room)}
      </Text>
    )
    // Whether Claude is working, then the hide button.
    const working = e.props.isWorking
    const buttons = [
      <Text color={working ? 'claude' : undefined} dimColor={!working}>{(working ? HEAD_RIGHT : '○ idle').padStart(HEAD_RIGHT.length)}</Text>,
      <Text> </Text>,
      <Button key="hide" label="▾ hide" plain dimColor hover={{ color: 'claude' }} onPress={() => setHidden(true)} />,
    ]
    const first = lines[0] ?? []
    const top = buttonsOwnRow ? (
      <Box key="head" justifyContent="flex-end">{buttons}</Box>
    ) : (
      <Box key="head">
        {row(first, width - BUTTONS_WIDTH)}
        {buttons}
      </Box>
    )
    const rest = buttonsOwnRow ? lines : lines.slice(1)

    return withBelow(
      <Box justifyContent="flex-end" paddingRight={1}>
        <Box width={width + 4} flexDirection="column" borderStyle="round" borderColor="claude" paddingX={1}>
          {top}
          {rest.map(parts => row(parts, width))}
        </Box>
      </Box>,
    )
  })
}
