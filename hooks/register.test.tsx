import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const MIN = 60_000
const NOW = Date.parse('2026-10-06T10:00:00Z')

const BAND = (columns = 120) =>
  ({
    plugin: 'dnz', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: columns, scroll: { offset: 0, bodyRows: 19 }, view: {} },
  }) as never

const STEP = { turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 3 } as never
const ANSWER = (usage: unknown) =>
  ({ turnId: 't1', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage }) as never
const MSG = { role: 'user', text: 'riassunto', toolUses: [] } // a compaction leaves at least one message
const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 9, cache_creation_input_tokens: 0, model: 'claude-opus-5-5' }

type Session = { session: { start: (e: never) => Promise<unknown> } }
type Turn = { turn: { step: (e: never) => AsyncGenerator & { result: Promise<unknown> } } }

// The world beneath a started session: the store as given, the model, the usage, and a directory in a repo on `main`.
const startSession = async ($: Session, on: On, stored?: unknown) => {
  const saved: { key: string; value: unknown }[] = []
  on('store.get', () => ({ value: stored }) as never)
  on('store.set', (_, e) => (saved.push({ key: e.key, value: e.value }), { value: undefined }) as never)
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }) as never)
  on('session.cwd', () => ({ value: '/home/u/work/dnz' }))
  on('session.repo', () => ({ value: { root: '/home/u/work/dnz' } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  mock.env(on, { HOME: '/home/u' })
  await $.session.start({ cwd: '/home/u/work/dnz', surface: null, isInteractive: true } as never)
  return saved
}
const step = async ($: Turn, input: never) => {
  const s = $.turn.step(input)
  for await (const _ of s) void _
  await s.result
}

test('la card si disegna con modello, contesto e luogo, e la cache dice "—" finché non c\'è una risposta', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  await startSession($ as never, on)
  await clock.advance(1_000) // the directory and branch are read off the start's path
  const ui = await $.ui.mount(BAND())
  const missing: string[] = []
  for (const re of [/Opus 5\.5/, /ctx/, /~\/work\/dnz/, /⎇ main/, /cache/])
    if (!(await ui.find({ type: 'Text', text: re }))) missing.push(String(re))
  expect(missing).toEqual([])
  expect(await ui.find({ type: 'Text', text: /≈/ })).toBeUndefined()
  await ui.unmount()
})

test('dopo una risposta la cache compare e scende con il tempo', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await step($ as never, STEP)
  expect(await ui.find({ type: 'Text', text: /≈60m/ })).toBeDefined()
  await clock.advance(1_000)
  expect(await ui.find({ type: 'Text', text: /≈59m/ })).toBeDefined()
  await clock.advance(10 * MIN)
  expect(await ui.find({ type: 'Text', text: /≈49m/ })).toBeDefined()
  await ui.unmount()
})

test('i passi di un subagent non toccano la cache del thread principale', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await step($ as never, { ...(STEP as object), agentId: 'sub-1' } as never)
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: /≈/ })).toBeUndefined()
  await ui.unmount()
})

test('una richiesta senza risposta non fa partire il conto', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(null) })
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await step($ as never, STEP)
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: /≈/ })).toBeUndefined()
  await ui.unmount()
})

test('un\'ora senza richieste: la cache è fredda', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await step($ as never, STEP)
  await clock.advance(61 * MIN)
  expect(await ui.find({ type: 'Text', text: /fredda/ })).toBeDefined()
  await ui.unmount()
})

test('il modello e lo sforzo vengono dal passo del modello', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await step($ as never, { ...(STEP as object), model: 'claude-sonnet-5-5', effort: 'max' } as never)
  expect(await ui.find({ type: 'Text', text: /Sonnet 5\.5/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /max/ })).toBeDefined()
  await ui.unmount()
})

test('una misura aggiorna contesto, limiti e costo', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await $.session.measure({
    context: { tokens: 620_000, window: 1_000_000, percent: 62 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 33, resetsAt: new Date(NOW + 90 * MIN).toISOString() }],
    cost: { usd: 1.5 },
    changed: ['context'],
  } as never)
  expect(await ui.find({ type: 'Text', text: /62%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /33%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /↻1h30m/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\$1\.50/ })).toBeDefined()
  await ui.unmount()
})

test('una compattazione svuota contesto e cache: il prefisso nuovo non è ancora in cache', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.compact', () => ({ messages: [MSG] }) as never)
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await $.session.measure({ context: { tokens: 620_000, window: 1_000_000, percent: 62 }, rateLimits: [], changed: ['context'] } as never)
  await step($ as never, STEP)
  await clock.advance(1_000)
  expect(await ui.find({ type: 'Text', text: /≈59m/ })).toBeDefined()
  await $.session.compact({ trigger: 'manual', messages: [MSG] } as never)
  expect(await ui.find({ type: 'Text', text: /62%/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /≈/ })).toBeUndefined()
  await ui.unmount()
})

test('una compattazione saltata o solo calcolata in anticipo lascia la cache com\'è', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  on('turn.step', async function* () { return ANSWER(USAGE) })
  on('session.compact', (_, e) => (e.trigger === 'precompute' ? { messages: [MSG] } : { skip: 'niente da compattare' }) as never)
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await step($ as never, STEP)
  await clock.advance(1_000)
  await $.session.compact({ trigger: 'manual', messages: [MSG] } as never)
  await $.session.compact({ trigger: 'precompute', messages: [MSG] } as never)
  expect(await ui.find({ type: 'Text', text: /≈59m/ })).toBeDefined()
  await ui.unmount()
})

test('il pulsante ▾ nasconde la card, ◂ la riporta, e la scelta resta nello store', async ($, on) => {
  mock.clock(on, { now: NOW })
  const saved = await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
  expect(saved.at(-1)).toEqual({ key: 'hidden', value: true })
  await ui.press({ key: 'show' })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  expect(saved.at(-1)).toEqual({ key: 'hidden', value: false })
  await ui.unmount()
})

test('una card nascosta nella sessione prima resta nascosta in quella nuova', async ($, on) => {
  mock.clock(on, { now: NOW })
  await startSession($ as never, on, true)
  const ui = await $.ui.mount(BAND())
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
  await ui.press({ key: 'show' })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  await ui.unmount()
})

// A plugin beneath the card that draws `text` in the band: a band the card leaves alone needs an answer from below.
const drawsBelow = (on: On, text: string) =>
  on('ui.render', { component: 'AbovePrompt' }, $ => {
    const { Text } = ($ as { ui: { resolve: (e: unknown) => { Text: (p: object) => unknown } } }).ui.resolve({ surface: 'terminal', component: 'AbovePrompt' })
    return h(Text as never, {}, text) as never
  })

test('sotto le 70 colonne la card non si disegna', async ($, on) => {
  mock.clock(on, { now: NOW })
  drawsBelow(on, 'da sotto')
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND(60))
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
  await ui.unmount()
})

test('quello che i plugin sotto disegnano nella fascia resta, sopra la card', async ($, on) => {
  mock.clock(on, { now: NOW })
  drawsBelow(on, 'da sotto')
  await startSession($ as never, on)
  const ui = await $.ui.mount(BAND())
  expect(await ui.find({ type: 'Text', text: /da sotto/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  await ui.unmount()
})
