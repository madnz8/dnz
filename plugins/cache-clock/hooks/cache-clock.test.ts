import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { TTL_MS, WARN_MS, cacheRow, fmtLeft } from './register'

const MIN = 60_000
const NOW = Date.parse('2026-10-06T10:00:00Z')

describe('fmtLeft', () => {
  test('da dieci minuti in su dà i soli minuti', () => {
    expect(fmtLeft(47 * MIN + 30_000)).toBe('47m')
    expect(fmtLeft(10 * MIN)).toBe('10m')
    expect(fmtLeft(TTL_MS)).toBe('60m')
  })
  test('sotto i dieci minuti aggiunge i secondi', () => {
    expect(fmtLeft(9 * MIN + 5_000)).toBe('9m05s')
    expect(fmtLeft(4 * MIN)).toBe('4m00s')
  })
  test('sotto il minuto dà i soli secondi', () => {
    expect(fmtLeft(42_000)).toBe('42s')
  })
})

describe('cacheRow', () => {
  test('senza una risposta del modello non c\'è riga', () => {
    expect(cacheRow(null, NOW)).toBeNull()
  })
  test('calda: la barra si svuota e il tempo è una stima', () => {
    const row = cacheRow(NOW - 13 * MIN, NOW)
    expect(row).toMatchObject({ id: 'cache', label: 'cache', text: '≈47m', state: 'ok' })
    expect(Math.round((row?.percent ?? 0) * 10) / 10).toBe(78.3) // 47 of 60 minutes
  })
  test('negli ultimi minuti diventa rossa e conta i secondi', () => {
    const row = cacheRow(NOW - (TTL_MS - 4 * MIN), NOW)
    expect(row).toMatchObject({ text: '≈4m00s', state: 'error' })
    expect(WARN_MS).toBe(5 * MIN)
  })
  test('fredda: barra a zero e la parola, non un tempo negativo', () => {
    expect(cacheRow(NOW - TTL_MS, NOW)).toMatchObject({ percent: 0, text: 'fredda', state: 'error' })
    expect(cacheRow(NOW - TTL_MS - 5 * MIN, NOW)).toMatchObject({ percent: 0, text: 'fredda' })
  })
  test('un orologio rimesso indietro non esce dalla barra', () => {
    const row = cacheRow(NOW + 5 * MIN, NOW)
    expect(row?.percent).toBe(100)
    expect(row?.text).toBe('≈60m')
  })
})

// The world beneath a started session, and a statuspane that records what it is told.
type Report = { id: string; label: string; percent?: number; text?: string; ttl?: number; state?: string }
const withStatuspane = (on: On) => {
  const reports: Report[] = []
  const cleared: string[] = []
  on('engine.create', async (_, e, next) => ({
    ...(await next(e)),
    statuspane: {
      progress: async (r: Report) => void reports.push(r),
      clear: async (id: string) => void cleared.push(id),
    },
  }))
  return { reports, cleared }
}

const STEP = { turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 3 } as never
const ANSWER = (usage: unknown) =>
  ({ turnId: 't1', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage }) as never
const MSG = { role: 'user', text: 'riassunto', toolUses: [] } // a compaction leaves at least one message
const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 9, cache_creation_input_tokens: 0, model: 'claude-opus-5-5' }

const start = async ($: { session: { start: (e: never) => Promise<unknown> } }, on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/w', surface: null, isInteractive: true } as never)
}
const step = async ($: { turn: { step: (e: never) => AsyncGenerator & { result: Promise<unknown> } } }, input: never) => {
  const s = $.turn.step(input)
  for await (const _ of s) void _
  await s.result
}

test('dopo una risposta del modello la riga compare e scende con il tempo', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const { reports } = withStatuspane(on)
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await start($, on)
  await step($ as never, STEP)
  await clock.advance(1_000)
  expect(reports.at(-1)).toMatchObject({ id: 'cache', text: '≈59m', state: 'ok' })
  await clock.advance(10 * MIN)
  expect(reports.at(-1)).toMatchObject({ text: '≈49m' })
})

test('i passi di un subagent non toccano la cache del thread principale', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const { reports } = withStatuspane(on)
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await start($, on)
  await step($ as never, { ...(STEP as object), agentId: 'sub-1' } as never)
  await clock.advance(5_000)
  expect(reports).toEqual([])
})

test('una richiesta senza risposta non fa ripartire il conto', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const { reports } = withStatuspane(on)
  on('turn.step', async function* () { return ANSWER(null) })
  await start($, on)
  await step($ as never, STEP)
  await clock.advance(5_000)
  expect(reports).toEqual([])
})

test('una compattazione la svuota: il prefisso nuovo non è ancora in cache', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const { reports, cleared } = withStatuspane(on)
  on('turn.step', async function* () { return ANSWER(USAGE) })
  on('session.compact', () => ({ messages: [MSG] }) as never)
  await start($, on)
  await step($ as never, STEP)
  await clock.advance(1_000)
  await $.session.compact({ trigger: 'manual', messages: [MSG] } as never)
  const before = reports.length
  await clock.advance(5_000)
  expect(cleared).toContain('cache')
  expect(reports.length).toBe(before)
})

test('una compattazione saltata o solo calcolata in anticipo lascia la cache com\'è', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const { reports, cleared } = withStatuspane(on)
  on('turn.step', async function* () { return ANSWER(USAGE) })
  on('session.compact', (_, e) => (e.trigger === 'precompute' ? { messages: [MSG] } : { skip: 'niente da compattare' }) as never)
  await start($, on)
  await step($ as never, STEP)
  await clock.advance(1_000)
  await $.session.compact({ trigger: 'manual', messages: [MSG] } as never)
  await $.session.compact({ trigger: 'precompute', messages: [MSG] } as never)
  const before = reports.length
  await clock.advance(2_000)
  expect(cleared).toEqual([])
  expect(reports.length).toBeGreaterThan(before)
})

test('senza statuspane non succede niente e niente si rompe', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await start($, on)
  await step($ as never, STEP)
  await clock.advance(5_000)
})
