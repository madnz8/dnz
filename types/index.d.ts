export type PaneLimit = { pct: number; resetsAt?: string }

// What the card draws from. Kept in `$.state`, not in module variables: a hot reload would lose those.
export type PaneFigures = {
  dir: string | null
  branch: string | null
  model: string | null
  effort: string | null
  ctxPct?: number
  ctxTokens?: number
  ctxWindow?: number
  fiveHour?: PaneLimit
  week?: PaneLimit
  costUsd?: number
  /** When the main thread's last model request went out; the prompt cache counts from it. Null: none yet. */
  cacheAt: number | null
  /** What the card last redrew for on the clock (the cache line's text, the minute): a change redraws it. */
  stamp: string
}

declare module 'claude-code' {
  interface PluginState {
    dnz: {
      figures: PaneFigures
      isHidden: boolean
    }
  }
}
