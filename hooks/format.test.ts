import { describe, expect, test } from 'claude-code/testing'

import type { PaneFigures } from '../types'
import {
  MAX_CARD_WIDTH, TTL_MS, WARN_MS, cacheRow, cardLines, clean, cols, fit, fmtEta, fmtLeft, gauge, layout, lineWidth, prettyModel, shortDir,
} from './format'
import type { Part } from './format'

const MIN = 60_000
const NOW = Date.parse('2026-10-06T10:00:00Z')
const text = (parts: Part[]) => parts.map(p => p.text).join('')

const FIGURES: PaneFigures = {
  dir: '~/workspace/dnz', branch: 'main', model: 'claude-opus-5-5', effort: 'high',
  ctxPct: 42, ctxTokens: 222_000, ctxWindow: 1_000_000,
  fiveHour: { pct: 40, resetsAt: new Date(NOW + 161 * MIN).toISOString() },
  week: { pct: 90, resetsAt: new Date(NOW + (6 * 24 + 23) * 60 * MIN).toISOString() },
  costUsd: 12.3456, cacheAt: NOW - 13 * MIN, stamp: '',
}

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
  test('senza una risposta del modello non c\'è niente da dire', () => {
    expect(cacheRow(null, NOW)).toBeNull()
  })
  test('calda: la barra si svuota e il tempo è una stima', () => {
    const row = cacheRow(NOW - 13 * MIN, NOW)
    expect(row).toMatchObject({ text: '≈47m', state: 'ok' })
    expect(Math.round((row?.percent ?? 0) * 10) / 10).toBe(78.3) // 47 of 60 minutes
  })
  test('negli ultimi minuti diventa rossa e conta i secondi', () => {
    expect(cacheRow(NOW - (TTL_MS - 4 * MIN), NOW)).toMatchObject({ text: '≈4m00s', state: 'error' })
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

describe('testo', () => {
  test('cols conta due colonne per i caratteri larghi', () => {
    expect(cols('abc')).toBe(3)
    expect(cols('日本')).toBe(4)
  })
  test('fit tiene l\'inizio o la fine e mette i puntini', () => {
    expect(fit('abcdefgh', 5)).toBe('abcd…')
    expect(fit('abcdefgh', 5, 'end')).toBe('…efgh')
    expect(fit('abc', 5)).toBe('abc')
  })
  test('shortDir tiene gli ultimi segmenti', () => {
    expect(shortDir('~/workspace/dnz')).toBe('~/workspace/dnz')
    expect(shortDir('~/Desktop/aaaaaaaa/bbbb/project')).toBe('…/bbbb/project')
  })
  test('clean toglie escape, controlli e caratteri bidi, e taglia', () => {
    const esc = String.fromCharCode(27)
    const rlo = String.fromCodePoint(0x202e)
    expect(clean(`${esc}[31mmain${rlo}`, 50)).toBe('[31mmain')
    expect(clean('abcdef', 3)).toBe('abc')
    expect(clean(42, 10)).toBe('')
  })
  test('prettyModel dà il nome e la versione', () => {
    expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(prettyModel('claude-opus-5-5[1m]')).toBe('Opus 5.5 (1M)')
    expect(prettyModel('claude-opus-4-20250514')).toBe('Opus 4')
    expect(prettyModel('qualcosa-altro')).toBe('qualcosa-altro')
  })
  test('fmtEta dà ore e minuti, o giorni e ore, o "now"', () => {
    expect(fmtEta(new Date(NOW + 161 * MIN).toISOString(), NOW)).toBe('2h41m')
    expect(fmtEta(new Date(NOW + (6 * 24 + 23) * 60 * MIN).toISOString(), NOW)).toBe('6d23h')
    expect(fmtEta(new Date(NOW - MIN).toISOString(), NOW)).toBe('now')
    expect(fmtEta(undefined, NOW)).toBe('')
  })
  test('gauge riempie in proporzione', () => {
    expect(gauge(50, 10)).toEqual({ on: '▰▰▰▰▰', off: '▱▱▱▱▱' })
    expect(gauge(150, 4).on).toBe('▰▰▰▰')
    expect(gauge(-5, 4).on).toBe('')
  })
})

describe('cardLines', () => {
  const lines = cardLines(FIGURES, NOW).map(text)
  test('modello e effort, contesto, limiti, luogo e costo, cache', () => {
    expect(lines).toHaveLength(5)
    expect(lines[0]).toBe('Opus 5.5  ▮▮▮▯▯ high')
    expect(lines[1]).toBe('ctx ▰▰▰▰▰▱▱▱▱▱▱▱ 42% 222k/1M')
    expect(lines[2]).toBe('5h ▰▰▱▱▱ 40% ↻2h41m   7d ▰▰▰▰▰ 90% ↻6d23h')
    expect(lines[3]).toBe('~/workspace/dnz · ⎇ main · $12.35')
    expect(lines[4]).toBe('cache ▰▰▰▰▰▰▰▰▰▱▱▱ ≈47m')
  })
  test('prima di ogni misura le righe dicono "—", la cache compresa', () => {
    const empty = cardLines({ dir: null, branch: null, model: null, effort: null, cacheAt: null, stamp: '' }, NOW).map(text)
    expect(empty[0]).toBe('—')
    expect(empty[1]).toBe('ctx ▱▱▱▱▱▱▱▱▱▱▱▱ —')
    expect(empty[2]).toBe('5h —   7d —')
    expect(empty[3]).toBe('—')
    expect(empty[4]).toBe('cache ▱▱▱▱▱▱▱▱▱▱▱▱ —')
  })
  test('la cache negli ultimi minuti è rossa, da fredda dice "fredda"', () => {
    const last = cardLines({ ...FIGURES, cacheAt: NOW - (TTL_MS - 2 * MIN) }, NOW).at(-1) ?? []
    expect(last.some(p => p.color === 'error' && p.text.includes('≈2m00s'))).toBe(true)
    const cold = cardLines({ ...FIGURES, cacheAt: NOW - TTL_MS - MIN }, NOW).at(-1) ?? []
    expect(text(cold)).toBe('cache ▱▱▱▱▱▱▱▱▱▱▱▱ fredda')
    expect(cold.some(p => p.color === 'error' && p.text.includes('fredda'))).toBe(true)
  })
  test('i limiti sopra il 60% e l\'85% passano ad avviso ed errore', () => {
    const l = cardLines({ ...FIGURES, fiveHour: { pct: 70 }, week: { pct: 90 } }, NOW)[2] ?? []
    expect(l.some(p => p.color === 'warning' && p.text.includes('70%'))).toBe(true)
    expect(l.some(p => p.color === 'error' && p.text.includes('90%'))).toBe(true)
  })
})

describe('layout', () => {
  test('la card sta nella larghezza massima e il pulsante sta accanto alla prima riga', () => {
    const l = layout(cardLines(FIGURES, NOW))
    expect(l.width).toBeLessThanOrEqual(MAX_CARD_WIDTH)
    expect(l.buttonsOwnRow).toBe(false)
  })
  test('una prima riga troppo lunga manda i pulsanti su una riga a parte', () => {
    const long: Part[][] = [[{ text: 'x'.repeat(40) }]]
    expect(layout(long).buttonsOwnRow).toBe(true)
    expect(lineWidth(long[0] ?? [])).toBe(40)
  })
})
