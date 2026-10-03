export type WidgetId =
  | 'limit5h'
  | 'limit7d'
  | 'spend'
  | 'inTok'
  | 'outTok'
  | 'cacheTok'
  | 'cacheHit'
  | 'totalTok'
  | 'cost'
  | 'costPerTurn'
  | 'burn'
  | 'ctx'
  | 'model'
  | 'turns'
  | 'duration'
  | 'lastTurn'
  | 'clock'
  | 'cwd'

export type WidgetCfg = { id: WidgetId; on: boolean; color?: string }

export type Anim = {
  mode: 'none' | 'rainbow' | 'breathe' | 'shimmer' | 'pulse' | 'disco'
  speed: 'slow' | 'normal' | 'fast'
  activity: boolean
  activityStyle: 'braille' | 'dots' | 'bars' | 'arrows' | 'moon'
}

export type Style = {
  look: 'pills' | 'plain' | 'brackets' | 'ticker'
  separator: string
  align: 'left' | 'center' | 'right'
  gap: number
  padX: number
  labels: 'icons' | 'text' | 'emoji' | 'none'
  dimLabels: boolean
  palette: 'claude' | 'neon' | 'dracula' | 'catppuccin' | 'solarized' | 'mono' | 'matrix' | 'sunset' | 'ocean' | 'brasil'
  pillBase: string
  pillTint: number
  barStyle: 'blocks' | 'smooth' | 'dots' | 'line' | 'ascii'
  barWidth: number
  barGradient: boolean
  showBars: boolean
  showReset: boolean
  resetFormat: 'remaining' | 'clock'
  ctxDetail: boolean
  numbers: 'compact' | 'full'
  tokenScope: 'session' | 'lastTurn'
  heat: { on: boolean; warn: number; crit: number; warnColor: string; critColor: string }
  currency: { code: 'USD' | 'BRL'; rate: number }
  tzOffset: number | null
  clock24: boolean
  hideWhileWorking: boolean
  tickerWidth: number
  anim: Anim
}

export type Spinner = { on: boolean; words: string[]; cycleSec: number; rainbow: boolean; showTime: boolean; showMode: boolean }
export type TurnDone = { on: boolean; words: string[] }
export type Hint = { on: boolean; items: string[] }
export type Alerts = { on: boolean; levels: number[]; costUsd: number; longTurnSec: number }

export type Config = {
  version: 1
  enabled: boolean
  widgets: WidgetCfg[]
  style: Style
  spinner: Spinner
  turnDone: TurnDone
  hint: Hint
  alerts: Alerts
}

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Totals = { input: number; output: number; cache: number; cacheRead: number }
export type Last = { input: number; output: number; cache: number; cacheRead: number; ms: number; tools: number } | null
export type Ctx = { tokens?: number; window: number; percent?: number } | null

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      config: Config
      limits: Limit[]
      usd: number
      totals: Totals
      last: Last
      ctx: Ctx
      model: string
      turns: number
      startedAt: number
      now: number
      cwd: string
      frame: number
      turnStart: number
    }
  }
}
