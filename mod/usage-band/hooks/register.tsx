import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Alerts, Config, Ctx, Hint, Last, Limit, Spinner, Style, Totals, TurnDone, WidgetCfg, WidgetId } from '../types'

// ---------------------------------------------------------------------------
// Defaults. O painel grava ~/.claude/usage-band.json; isto aparece quando o
// arquivo não existe. Manter em sincronia com o catálogo do painel.
// ---------------------------------------------------------------------------

const DEFAULT_WORDS = [
  'Cozinhando',
  'Fuçando',
  'Matutando',
  'Quebrando a cabeça',
  'Pensando pra caralho',
  'Maquinando',
  'Garimpando',
  'Costurando código',
  'Dando um jeito',
  'Fazendo a mágica'
]
const DEFAULT_DONE = ['Cozinhou', 'Matutou', 'Resolveu', 'Fuçou', 'Quebrou a cabeça', 'Mandou ver']
const DEFAULT_HINTS = ['5h {5h} · 7d {7d} · {cost}', '{model} · contexto {ctx}', 'agora são {time}']

const DEFAULTS: Config = {
  version: 1,
  enabled: true,
  widgets: [
    { id: 'limit5h', on: true },
    { id: 'limit7d', on: true },
    { id: 'spend', on: true },
    { id: 'inTok', on: true },
    { id: 'outTok', on: true },
    { id: 'cacheTok', on: true },
    { id: 'cost', on: true },
    { id: 'cacheHit', on: false },
    { id: 'totalTok', on: false },
    { id: 'costPerTurn', on: false },
    { id: 'burn', on: false },
    { id: 'ctx', on: false },
    { id: 'model', on: false },
    { id: 'turns', on: false },
    { id: 'duration', on: false },
    { id: 'lastTurn', on: false },
    { id: 'clock', on: false },
    { id: 'cwd', on: false }
  ],
  style: {
    look: 'pills',
    separator: ' │ ',
    align: 'left',
    gap: 1,
    padX: 1,
    labels: 'icons',
    dimLabels: false,
    palette: 'claude',
    pillBase: '#15171c',
    pillTint: 0.22,
    barStyle: 'blocks',
    barWidth: 8,
    barGradient: false,
    showBars: true,
    showReset: true,
    resetFormat: 'remaining',
    ctxDetail: false,
    numbers: 'compact',
    tokenScope: 'session',
    heat: { on: true, warn: 70, crit: 90, warnColor: '#f5a623', critColor: '#e5484d' },
    currency: { code: 'USD', rate: 5.5 },
    tzOffset: null,
    clock24: true,
    hideWhileWorking: false,
    tickerWidth: 60,
    anim: { mode: 'none', speed: 'normal', activity: false, activityStyle: 'braille' }
  },
  spinner: { on: false, words: DEFAULT_WORDS, cycleSec: 0, rainbow: false, showTime: true, showMode: true },
  turnDone: { on: false, words: DEFAULT_DONE },
  hint: { on: false, items: DEFAULT_HINTS },
  alerts: { on: false, levels: [80, 95], costUsd: 0, longTurnSec: 0 }
}

const SLOT: Record<WidgetId, string> = {
  limit5h: 'green',
  limit7d: 'purple',
  spend: 'amber',
  inTok: 'red',
  outTok: 'green',
  cacheTok: 'blue',
  cacheHit: 'teal',
  totalTok: 'gray',
  cost: 'amber',
  costPerTurn: 'amber',
  burn: 'red',
  ctx: 'blue',
  model: 'purple',
  turns: 'gray',
  duration: 'teal',
  lastTurn: 'pink',
  clock: 'gray',
  cwd: 'teal'
}

const PALETTES: Record<string, Record<string, string>> = {
  claude: { green: '#5fb38f', purple: '#9b87e8', red: '#e8765f', teal: '#4fb3c4', blue: '#7b8ce8', amber: '#d9a93a', pink: '#d97fb0', gray: '#9aa0a6' },
  neon: { green: '#39ff14', purple: '#bf5fff', red: '#ff3860', teal: '#00f0ff', blue: '#4d7cff', amber: '#ffd300', pink: '#ff4fd8', gray: '#c0c0c0' },
  dracula: { green: '#50fa7b', purple: '#bd93f9', red: '#ff5555', teal: '#8be9fd', blue: '#6d8cff', amber: '#f1fa8c', pink: '#ff79c6', gray: '#b0b4c8' },
  catppuccin: { green: '#a6e3a1', purple: '#cba6f7', red: '#f38ba8', teal: '#94e2d5', blue: '#89b4fa', amber: '#f9e2af', pink: '#f5c2e7', gray: '#a6adc8' },
  solarized: { green: '#859900', purple: '#6c71c4', red: '#dc322f', teal: '#2aa198', blue: '#268bd2', amber: '#b58900', pink: '#d33682', gray: '#93a1a1' },
  mono: { green: '#c8c8c8', purple: '#c8c8c8', red: '#c8c8c8', teal: '#c8c8c8', blue: '#c8c8c8', amber: '#c8c8c8', pink: '#c8c8c8', gray: '#c8c8c8' },
  matrix: { green: '#00ff41', purple: '#39d353', red: '#7bff95', teal: '#00d9a0', blue: '#2bbd5f', amber: '#a3ff5c', pink: '#4dff9e', gray: '#6fcf8a' },
  sunset: { green: '#ffb347', purple: '#ff6f91', red: '#ff5e57', teal: '#ffd166', blue: '#c77dff', amber: '#ffc75f', pink: '#ff8fab', gray: '#d1b3a1' },
  ocean: { green: '#2ec4b6', purple: '#7b9cff', red: '#ff7b9c', teal: '#48cae4', blue: '#4895ef', amber: '#ffd166', pink: '#a78bfa', gray: '#9db4c0' },
  brasil: { green: '#00a859', purple: '#4f86ff', red: '#ff6b57', teal: '#2fd1b5', blue: '#3f6fdb', amber: '#ffdf00', pink: '#ffd23f', gray: '#a8c8a0' }
}
const PALETTE_IDS = Object.keys(PALETTES)

// [icons, text, emoji]
const LABELS: Record<WidgetId, [string, string, string]> = {
  limit5h: ['5h', '5h', '⏱5h'],
  limit7d: ['7d', '7d', '📅7d'],
  spend: ['¤', 'gasto', '💳'],
  inTok: ['↑', 'in', '📤'],
  outTok: ['↓', 'out', '📥'],
  cacheTok: ['≣', 'cache', '🧠'],
  cacheHit: ['⚡', 'hit', '🎯'],
  totalTok: ['Σ', 'total', '🔢'],
  cost: ['', 'custo', '💰'],
  costPerTurn: ['⌀', 'por msg', '🧾'],
  burn: ['↗', 'ritmo', '🔥'],
  ctx: ['◐', 'ctx', '🧩'],
  model: ['◆', 'modelo', '🤖'],
  turns: ['#', 'msgs', '💬'],
  duration: ['◷', 'sessão', '⏳'],
  lastTurn: ['↻', 'último', '⚙'],
  clock: ['◴', 'hora', '🕐'],
  cwd: ['⌂', 'pasta', '📁']
}

const BARS: Record<string, [string, string]> = {
  blocks: ['█', '░'],
  smooth: ['▰', '▱'],
  dots: ['●', '○'],
  line: ['━', '─'],
  ascii: ['#', '-']
}

const SPEED: Record<string, number> = { slow: 500, normal: 250, fast: 120 }

const ACTIVITY: Record<string, string[]> = {
  braille: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  dots: ['·', '•', '●', '•'],
  bars: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
  arrows: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  moon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
}

const MODE_WORDS: Record<string, string> = {
  requesting: 'conectando',
  thinking: 'pensando',
  'tool-input': 'montando comando',
  'tool-use': 'rodando ferramenta',
  responding: 'escrevendo'
}

// ---------------------------------------------------------------------------
// Lendo o arquivo de config de forma defensiva: qualquer coisa estranha vira padrão.
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v)
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const color = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback)
const strList = (v: unknown, max: number, len: number, fallback: string[]) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim().slice(0, len)).slice(0, max) : fallback

const normalize = (raw: unknown): Config => {
  if (!isObj(raw)) return DEFAULTS

  const D = DEFAULTS.style
  const s = isObj(raw.style) ? raw.style : {}
  const h = isObj(s.heat) ? s.heat : {}
  const c = isObj(s.currency) ? s.currency : {}
  const a = isObj(s.anim) ? s.anim : {}

  const style: Style = {
    look: pick(s.look, ['pills', 'plain', 'brackets', 'ticker'], D.look),
    separator: typeof s.separator === 'string' ? s.separator.slice(0, 8) : D.separator,
    align: pick(s.align, ['left', 'center', 'right'], D.align),
    gap: num(s.gap, 0, 4, D.gap),
    padX: num(s.padX, 0, 3, D.padX),
    labels: pick(s.labels, ['icons', 'text', 'emoji', 'none'], D.labels),
    dimLabels: bool(s.dimLabels, D.dimLabels),
    palette: pick(s.palette, PALETTE_IDS as Style['palette'][], D.palette),
    pillBase: color(s.pillBase, D.pillBase),
    pillTint: num(s.pillTint, 0.05, 0.6, D.pillTint),
    barStyle: pick(s.barStyle, ['blocks', 'smooth', 'dots', 'line', 'ascii'], D.barStyle),
    barWidth: Math.round(num(s.barWidth, 3, 20, D.barWidth)),
    barGradient: bool(s.barGradient, D.barGradient),
    showBars: bool(s.showBars, D.showBars),
    showReset: bool(s.showReset, D.showReset),
    resetFormat: pick(s.resetFormat, ['remaining', 'clock'], D.resetFormat),
    ctxDetail: bool(s.ctxDetail, D.ctxDetail),
    numbers: pick(s.numbers, ['compact', 'full'], D.numbers),
    tokenScope: pick(s.tokenScope, ['session', 'lastTurn'], D.tokenScope),
    heat: {
      on: bool(h.on, D.heat.on),
      warn: num(h.warn, 1, 100, D.heat.warn),
      crit: num(h.crit, 1, 100, D.heat.crit),
      warnColor: color(h.warnColor, D.heat.warnColor),
      critColor: color(h.critColor, D.heat.critColor)
    },
    currency: { code: pick(c.code, ['USD', 'BRL'], D.currency.code), rate: num(c.rate, 0.01, 1000, D.currency.rate) },
    tzOffset: typeof s.tzOffset === 'number' && isFinite(s.tzOffset) ? num(s.tzOffset, -12, 14, 0) : null,
    clock24: bool(s.clock24, D.clock24),
    hideWhileWorking: bool(s.hideWhileWorking, D.hideWhileWorking),
    tickerWidth: Math.round(num(s.tickerWidth, 20, 120, D.tickerWidth)),
    anim: {
      mode: pick(a.mode, ['none', 'rainbow', 'breathe', 'shimmer', 'pulse', 'disco'], D.anim.mode),
      speed: pick(a.speed, ['slow', 'normal', 'fast'], D.anim.speed),
      activity: bool(a.activity, D.anim.activity),
      activityStyle: pick(a.activityStyle, ['braille', 'dots', 'bars', 'arrows', 'moon'], D.anim.activityStyle)
    }
  }

  const sp = isObj(raw.spinner) ? raw.spinner : {}
  const spinner: Spinner = {
    on: bool(sp.on, false),
    words: strList(sp.words, 30, 40, DEFAULT_WORDS),
    cycleSec: num(sp.cycleSec, 0, 30, 0),
    rainbow: bool(sp.rainbow, false),
    showTime: bool(sp.showTime, true),
    showMode: bool(sp.showMode, true)
  }

  const td = isObj(raw.turnDone) ? raw.turnDone : {}
  const turnDone: TurnDone = { on: bool(td.on, false), words: strList(td.words, 30, 40, DEFAULT_DONE) }

  const hi = isObj(raw.hint) ? raw.hint : {}
  const hint: Hint = { on: bool(hi.on, false), items: strList(hi.items, 20, 80, DEFAULT_HINTS) }

  const al = isObj(raw.alerts) ? raw.alerts : {}
  const levels = Array.isArray(al.levels)
    ? al.levels.filter((x: unknown): x is number => typeof x === 'number' && x >= 1 && x <= 100).map(Math.round).slice(0, 6)
    : DEFAULTS.alerts.levels
  const alerts: Alerts = {
    on: bool(al.on, false),
    levels: levels.filter((x, i) => levels.indexOf(x) === i).sort((x, y) => x - y),
    costUsd: num(al.costUsd, 0, 100000, 0),
    longTurnSec: num(al.longTurnSec, 0, 3600, 0)
  }

  const known = DEFAULTS.widgets.map(w => w.id as string)
  const seen: string[] = []
  const widgets: WidgetCfg[] = []

  if (Array.isArray(raw.widgets)) {
    for (const w of raw.widgets) {
      if (isObj(w) && known.includes(w.id) && !seen.includes(w.id)) {
        seen.push(w.id)
        const item: WidgetCfg = { id: w.id as WidgetId, on: w.on === true }
        if (typeof w.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(w.color)) item.color = w.color
        widgets.push(item)
      }
    }
  }
  // widgets que uma versão nova trouxe e o arquivo ainda não conhece
  for (const w of DEFAULTS.widgets) if (!seen.includes(w.id)) widgets.push({ id: w.id, on: false })

  return { version: 1, enabled: bool(raw.enabled, true), widgets, style, spinner, turnDone, hint, alerts }
}

// ---------------------------------------------------------------------------
// Formatação e cores
// ---------------------------------------------------------------------------

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`

const fmt = (n: number, S: Style) =>
  S.numbers === 'full' ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : compact(n)

const money = (usd: number, S: Style) =>
  S.currency.code === 'BRL' ? `R$ ${(usd * S.currency.rate).toFixed(2)}` : `$${usd.toFixed(2)}`

const span = (mins: number) => {
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = Math.floor(mins % 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

const secs = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const atClock = (ms: number, S: Style, now?: number) => {
  const off = S.tzOffset
  const d = new Date(off === null ? ms : ms + off * 3_600_000)
  const h = off === null ? d.getHours() : d.getUTCHours()
  const m = off === null ? d.getMinutes() : d.getUTCMinutes()
  const wd = off === null ? d.getDay() : d.getUTCDay()
  const hh = S.clock24 ? String(h).padStart(2, '0') : String(h % 12 || 12)
  const suffix = S.clock24 ? '' : h >= 12 ? 'pm' : 'am'
  const t = `${hh}:${String(m).padStart(2, '0')}${suffix}`

  return now !== undefined && ms - now > 20 * 3_600_000 ? `${WEEKDAYS[wd]} ${t}` : t
}

const heat = (p: number, S: Style) =>
  !S.heat.on ? undefined : p >= S.heat.crit ? S.heat.critColor : p >= S.heat.warn ? S.heat.warnColor : undefined

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) => {
  const x = hex(a)
  const y = hex(b)

  return '#' + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('')
}
const lerp = (a: string, b: string, t: number) => mix(b, a, t) // t=0 -> a, t=1 -> b

const hsl = (h: number, s: number, l: number) => {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}

const prettyModel = (id: string) => {
  const parts = id.replace(/\[.*\]$/, '').replace(/^claude-/, '').replace(/-\d{8}$/, '').split('-').filter(Boolean)
  if (!parts.length) return ''
  const [name, ...rest] = parts
  const nums = rest.filter(v => /^\d+$/.test(v))

  return `${name.charAt(0).toUpperCase()}${name.slice(1)}${nums.length ? ' ' + nums.join('.') : ''}`
}

// cor do item no frame f, conforme a animação
const animFg = (fg: string, i: number, f: number, S: Style, isAlert: boolean): string => {
  switch (S.anim.mode) {
    case 'rainbow':
      return hsl((f * 14 + i * 47) % 360, 0.72, 0.64)
    case 'breathe': {
      const t = (Math.sin(f * 0.3 + i * 0.5) + 1) / 2

      return mix(fg, '#0b0b0b', 0.5 + 0.5 * t)
    }
    case 'disco': {
      const pal = Object.values(PALETTES[S.palette])

      return pal[(f + i) % pal.length]
    }
    case 'pulse':
      return isAlert ? (f % 2 === 0 ? S.heat.critColor : mix(S.heat.critColor, '#0b0b0b', 0.3)) : fg
    default:
      return fg
  }
}

// ---------------------------------------------------------------------------
// Widgets -> células
// ---------------------------------------------------------------------------

// main = cor do item, strong = texto forte padrão, dim = apagado; bar = barra desenhada em runs
type Part = { t: string; k: 'main' | 'strong' | 'dim'; c?: string; bar?: { filled: number; width: number } }
type Cell = { label: string; parts: Part[] }
type Run = { t: string; c?: string; dim?: boolean; bold?: boolean }
type Data = {
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
}

const barPart = (p: number, S: Style, c: string | undefined): Part => {
  const filled = Math.max(0, Math.min(S.barWidth, Math.round((p / 100) * S.barWidth)))
  const [on, off] = BARS[S.barStyle]

  return { t: on.repeat(filled) + off.repeat(S.barWidth - filled), k: 'main', c, bar: { filled, width: S.barWidth } }
}

const build = (id: WidgetId, D: Data, S: Style): Cell | null => {
  const label = S.labels === 'none' ? '' : LABELS[id][S.labels === 'icons' ? 0 : S.labels === 'text' ? 1 : 2]
  const cell = (...parts: Part[]): Cell => ({ label, parts })
  const src = S.tokenScope === 'lastTurn' ? D.last ?? { input: 0, output: 0, cache: 0, cacheRead: 0, ms: 0, tools: 0 } : D.totals

  const limit = (kind: string): Cell | null => {
    const l = D.limits.find(x => x.kind === kind)
    if (!l) return null
    const p = Math.round(l.percentUsed)
    const c = heat(p, S)
    const parts: Part[] = []
    if (S.showBars) parts.push(barPart(p, S, c))
    parts.push({ t: `${p}%`, k: 'strong', c })
    if (S.showReset && l.resetsAt) {
      const at = Date.parse(l.resetsAt)
      parts.push({ t: `⟳ ${S.resetFormat === 'clock' ? atClock(at, S, D.now) : span(Math.max(0, Math.round((at - D.now) / 60000)))}`, k: 'dim' })
    }

    return cell(...parts)
  }

  switch (id) {
    case 'limit5h':
      return limit('five_hour')
    case 'limit7d':
      return limit('seven_day')
    case 'spend':
      return limit('spend_limit')
    case 'inTok':
      return cell({ t: fmt(src.input, S), k: 'main' })
    case 'outTok':
      return cell({ t: fmt(src.output, S), k: 'main' })
    case 'cacheTok':
      return cell({ t: fmt(src.cache, S), k: 'main' })
    case 'cacheHit': {
      const total = src.input + src.cache

      return cell({ t: total > 0 ? `${Math.round((src.cacheRead / total) * 100)}%` : '–', k: 'main' })
    }
    case 'totalTok':
      return cell({ t: fmt(src.input + src.output + src.cache, S), k: 'main' })
    case 'cost':
      return cell({ t: money(D.usd, S), k: 'main' })
    case 'costPerTurn':
      return cell({ t: D.turns > 0 ? money(D.usd / D.turns, S) : '–', k: 'main' })
    case 'burn': {
      const hours = (D.now - D.startedAt) / 3_600_000

      return cell({ t: D.startedAt > 0 && hours >= 1 / 60 ? `${money(D.usd / hours, S)}/h` : '–', k: 'main' })
    }
    case 'ctx': {
      if (!D.ctx) return null
      const p = D.ctx.percent
      const c = p === undefined ? undefined : heat(p, S)
      const parts: Part[] = []
      if (S.showBars && p !== undefined) parts.push(barPart(p, S, c))
      parts.push({ t: p === undefined ? '–' : `${Math.round(p)}%`, k: 'strong', c })
      if (S.ctxDetail && D.ctx.tokens !== undefined) parts.push({ t: `${compact(D.ctx.tokens)}/${compact(D.ctx.window)}`, k: 'dim' })

      return cell(...parts)
    }
    case 'model':
      return D.model ? cell({ t: prettyModel(D.model), k: 'main' }) : null
    case 'turns':
      return cell({ t: String(D.turns), k: 'main' })
    case 'duration':
      return D.startedAt > 0 ? cell({ t: span(Math.max(0, (D.now - D.startedAt) / 60000)), k: 'main' }) : null
    case 'lastTurn':
      return D.last ? cell({ t: `${Math.round(D.last.ms / 1000)}s`, k: 'main' }, { t: `· ${D.last.tools} tools`, k: 'dim' }) : null
    case 'clock':
      return D.now > 0 ? cell({ t: atClock(D.now, S), k: 'main' }) : null
    case 'cwd': {
      const name = D.cwd.split(/[\\/]/).filter(Boolean).pop()

      return name ? cell({ t: name, k: 'main' }) : null
    }
  }

  return null
}

// agrupa caracteres vizinhos de mesma cor em runs
const group = (chars: { ch: string; c?: string; dim?: boolean }[]): Run[] => {
  const runs: Run[] = []
  for (const x of chars) {
    const prev = runs[runs.length - 1]
    if (prev && prev.c === x.c && !!prev.dim === !!x.dim) prev.t += x.ch
    else runs.push({ t: x.ch, c: x.c, dim: x.dim })
  }

  return runs
}

const barRuns = (p: Part, base: string, f: number, S: Style): Run[] => {
  const { filled, width } = p.bar!
  const [on, off] = BARS[S.barStyle]
  const lit = S.anim.mode === 'shimmer' ? (f % (width + 4)) - 2 : -99
  const chars: { ch: string; c?: string; dim?: boolean }[] = []

  for (let i = 0; i < width; i++) {
    if (i >= filled) {
      chars.push({ ch: off, c: base, dim: true })
      continue
    }
    let c = base
    if (S.barGradient && !p.c) {
      const t = width > 1 ? i / (width - 1) : 0
      c = t < 0.6 ? lerp(base, S.heat.warnColor, t / 0.6) : lerp(S.heat.warnColor, S.heat.critColor, (t - 0.6) / 0.4)
    }
    if (i === lit) c = mix(c, '#ffffff', 0.3)
    else if (i === lit - 1 || i === lit + 1) c = mix(c, '#ffffff', 0.7)
    chars.push({ ch: on, c })
  }

  return group(chars)
}

const partRuns = (p: Part, fg: string, f: number, S: Style): Run[] => {
  if (p.bar) return barRuns(p, p.c ?? fg, f, S)
  if (p.k === 'strong') return [{ t: p.t, bold: true, c: p.c }]
  if (p.k === 'dim') return [{ t: p.t, dim: true }]

  return [{ t: p.t, c: p.c ?? fg }]
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

const config = atom({ plugin: 'usage-band', key: 'config' } as const, DEFAULTS)
const limits = atom({ plugin: 'usage-band', key: 'limits' } as const, [] as Limit[])
const usd = atom({ plugin: 'usage-band', key: 'usd' } as const, 0)
const totals = atom({ plugin: 'usage-band', key: 'totals' } as const, { input: 0, output: 0, cache: 0, cacheRead: 0 } as Totals)
const last = atom({ plugin: 'usage-band', key: 'last' } as const, null as Last)
const ctx = atom({ plugin: 'usage-band', key: 'ctx' } as const, null as Ctx)
const model = atom({ plugin: 'usage-band', key: 'model' } as const, '')
const turns = atom({ plugin: 'usage-band', key: 'turns' } as const, 0)
const startedAt = atom({ plugin: 'usage-band', key: 'startedAt' } as const, 0)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const cwd = atom({ plugin: 'usage-band', key: 'cwd' } as const, '')
const frame = atom({ plugin: 'usage-band', key: 'frame' } as const, 0)
const turnStart = atom({ plugin: 'usage-band', key: 'turnStart' } as const, 0)

const readData = async ($: any): Promise<Data> => ({
  limits: await read($, limits),
  usd: await read($, usd),
  totals: await read($, totals),
  last: await read($, last),
  ctx: await read($, ctx),
  model: await read($, model),
  turns: await read($, turns),
  startedAt: await read($, startedAt),
  now: await read($, now),
  cwd: await read($, cwd)
})

let tickTimer: { cancel: () => void } | null = null
let tickMs = 0
let tickAlways = false
let isWorking = false
let alerted: string[] = []

// ----- alertas (toasts) -----
const checkAlerts = ($: any, A: Alerts, ls: Limit[], c: Ctx, cost: number, S: Style, silent: boolean) => {
    if (!A.on) return
    const sources: { key: string; p: number; text: (p: number, level: number) => string }[] = []
    for (const l of ls) {
      if (l.kind === 'five_hour') sources.push({ key: 'five_hour', p: l.percentUsed, text: p => `⚠ Limite de 5h em ${Math.round(p)}%` })
      if (l.kind === 'seven_day') sources.push({ key: 'seven_day', p: l.percentUsed, text: p => `⚠ Limite de 7d em ${Math.round(p)}%` })
    }
    if (c?.percent !== undefined) sources.push({ key: 'ctx', p: c.percent, text: p => `🧩 Contexto em ${Math.round(p)}%` })

    for (const src of sources) {
      const newly: number[] = []
      for (const level of A.levels) {
        const key = `${src.key}:${level}`
        if (src.p >= level) {
          if (!alerted.includes(key)) {
            alerted.push(key)
            newly.push(level)
          }
        } else {
          alerted = alerted.filter(k => k !== key)
        }
      }
      if (newly.length && !silent) $.ui.toast(src.text(src.p, newly[newly.length - 1]))
    }

    if (A.costUsd > 0) {
      if (cost >= A.costUsd && !alerted.includes('cost')) {
        alerted.push('cost')
        if (!silent) $.ui.toast(`💸 Sessão passou de ${money(A.costUsd, S)}`)
      } else if (cost < A.costUsd) {
        alerted = alerted.filter(k => k !== 'cost')
      }
    }
  }

  // ----- relógio de animação: só roda se alguma coisa precisa dele -----
  const syncTick = ($: any, c: Config) => {
    const a = c.style.anim
    const band = c.enabled && (a.mode !== 'none' || c.style.look === 'ticker')
    const work = c.enabled && (a.activity || (c.spinner.on && (c.spinner.rainbow || c.spinner.cycleSec > 0)))
    const ms = band || work ? SPEED[a.speed] : 0

    tickAlways = band
    if (ms === tickMs) return
    tickTimer?.cancel()
    tickTimer = null
    tickMs = ms
    if (ms > 0) {
      tickTimer = $.clock.every(ms, async () => {
        if (tickAlways || isWorking) await update($, frame, v => v + 1)
      })
    }
  }

export const register: Register = on => {
  let toolsThisTurn = 0
  let timersStarted = false
  let configMtime = -1

  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    const t0 = await $.clock.now()
    const [m, n, dir] = [await $.session.model(), await $.session.turns(), await $.session.cwd()]

    await update($, limits, () => u.rateLimits)
    await update($, usd, () => u.cost?.usd ?? 0)
    await update($, ctx, () => u.context)
    await update($, startedAt, () => u.startedAt)
    await update($, now, () => t0)
    await update($, model, () => m)
    await update($, turns, () => n)
    await update($, cwd, () => dir)

    // O painel (~/.claude/usage-band.json) é conferido de tempos em tempos: só relê se o arquivo mudou.
    const pollConfig = async (silent: boolean) => {
      const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
      if (!home) return
      const path = `${home}/.claude/usage-band.json`
      try {
        const st = await $.fs.stat(path)
        if (st.mtimeMs === configMtime) return
        const text = await $.fs.read(path)
        configMtime = st.mtimeMs
        const parsed = normalize(JSON.parse(String(text)))
        await update($, config, () => parsed)
        syncTick($, parsed)
        if (silent) checkAlerts($, parsed.alerts, u.rateLimits, u.context, u.cost?.usd ?? 0, parsed.style, true)
      } catch {
        // arquivo ausente ou pela metade: mantém o que está na tela
      }
    }

    await pollConfig(true)

    if (!timersStarted) {
      timersStarted = true
      $.clock.every(2000, () => pollConfig(false))
      $.clock.every(30_000, async () => {
        const t = await $.clock.now()
        await update($, now, () => t)
      })
    }

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits)
    await update($, usd, () => e.cost?.usd ?? 0)
    await update($, ctx, () => e.context)
    checkAlerts($, (await read($, config)).alerts, e.rateLimits, e.context, e.cost?.usd ?? 0, (await read($, config)).style, false)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    toolsThisTurn = 0
    isWorking = true
    const t = await $.clock.now()
    await update($, turnStart, () => t)

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    toolsThisTurn += 1

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    const t = await $.clock.now()
    const [m, n, dir] = [await $.session.model(), await $.session.turns(), await $.session.cwd()]

    if (e.agentId === undefined) isWorking = false

    if (u) {
      const cache = u.cache_read_input_tokens + u.cache_creation_input_tokens
      await update($, totals, v => ({
        input: v.input + u.input_tokens,
        output: v.output + u.output_tokens,
        cache: v.cache + cache,
        cacheRead: v.cacheRead + u.cache_read_input_tokens
      }))

      if (e.agentId === undefined) {
        const turn = {
          input: u.input_tokens,
          output: u.output_tokens,
          cache,
          cacheRead: u.cache_read_input_tokens,
          ms: e.durationMs,
          tools: toolsThisTurn
        }
        await update($, last, () => turn)
      }
    }

    if (e.agentId === undefined) {
      const A = (await read($, config)).alerts
      if (A.on && A.longTurnSec > 0 && e.durationMs / 1000 >= A.longTurnSec) {
        $.ui.toast(`⏱ Esse turno levou ${secs(e.durationMs)}`)
      }
    }

    await update($, now, () => t)
    await update($, model, () => m)
    await update($, turns, () => n)
    await update($, cwd, () => dir)
    await update($, frame, v => v + 1)

    return next(e)
  })

  // ----- a faixa acima do prompt -----
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const cfg = await read($, config)
    const S = cfg.style

    if (!cfg.enabled || (S.hideWhileWorking && e.props.isWorking)) {
      return next(e)
    }

    const D = await readData($)
    const f = await read($, frame)
    const palette = PALETTES[S.palette]
    const items: { id: WidgetId; cell: Cell; fg: string; alert: boolean }[] = []

    for (const w of cfg.widgets) {
      if (!w.on) continue
      const cell = build(w.id, D, S)
      if (cell) {
        items.push({ id: w.id, cell, fg: w.color ?? palette[SLOT[w.id]], alert: S.heat.on && cell.parts.some(p => p.c === S.heat.critColor) })
      }
    }

    if (!items.length) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const children: any[] = []

    const runBox = (r: Run, key: string, fallback?: string) => {
      const props: Record<string, unknown> = {}
      const c = r.c ?? fallback
      if (c) props.color = c
      if (r.dim) props.dimColor = true
      if (r.bold) props.bold = true

      return (
        <Box key={key}>
          <Text {...props}>{r.t}</Text>
        </Box>
      )
    }

    // brilho de atividade: gira enquanto o Claude trabalha
    if (S.anim.activity) {
      const frames = ACTIVITY[S.anim.activityStyle]
      const glyph = e.props.isWorking ? frames[f % frames.length] : '●'
      children.push(
        <Box key="act" marginRight={S.look === 'ticker' ? 1 : 0}>
          <Text color={S.anim.mode === 'rainbow' ? hsl((f * 14) % 360, 0.72, 0.64) : palette.green} dimColor={!e.props.isWorking}>
            {glyph}
          </Text>
        </Box>
      )
    }

    if (S.look === 'ticker') {
      // letreiro: texto único rolando, uma letra por frame
      const chars: { ch: string; c?: string; dim?: boolean }[] = []
      items.forEach((it, i) => {
        const text = [it.cell.label, ...it.cell.parts.map(p => p.t)].filter(Boolean).join(' ')
        for (const ch of text) chars.push({ ch, c: it.fg })
        for (const ch of '   •   ') chars.push({ ch, c: it.fg, dim: true })
      })
      const n = chars.length
      const off = f % n
      const view: { ch: string; c?: string; dim?: boolean }[] = []
      for (let i = 0; i < S.tickerWidth; i++) {
        const x = chars[(off + i) % n]
        view.push(S.anim.mode === 'rainbow' ? { ch: x.ch, c: hsl((f * 14 + i * 9) % 360, 0.72, 0.64), dim: x.dim } : x)
      }
      group(view).forEach((r, i) => children.push(runBox(r, `t${i}`)))

      return (
        <Box width="100%" justifyContent={S.align === 'left' ? 'flex-start' : S.align === 'center' ? 'center' : 'flex-end'} paddingX={1}>
          {children}
        </Box>
      )
    }

    items.forEach((it, i) => {
      const fg = animFg(it.fg, i, f, S, it.alert)
      const inner: any[] = []

      if (S.look === 'brackets') {
        inner.push(
          <Box key="lb">
            <Text dimColor>[</Text>
          </Box>
        )
      }

      if (it.cell.label) {
        inner.push(
          <Box key="l">
            <Text color={fg} dimColor={S.dimLabels}>
              {it.cell.label}
            </Text>
          </Box>
        )
      }

      it.cell.parts.forEach((p, j) => {
        const runs = partRuns(p, fg, f, S)
        // runs da mesma parte ficam juntos, sem espaço entre eles
        inner.push(
          <Box key={`p${j}`}>
            {runs.map((r, k) => runBox(r, `r${k}`, fg))}
          </Box>
        )
      })

      if (S.look === 'brackets') {
        inner.push(
          <Box key="rb">
            <Text dimColor>]</Text>
          </Box>
        )
      }

      children.push(
        S.look === 'pills' ? (
          <Box key={it.id} backgroundColor={mix(fg, S.pillBase, S.pillTint)} paddingX={S.padX} gap={1}>
            {inner}
          </Box>
        ) : (
          <Box key={it.id} gap={1}>
            {inner}
          </Box>
        )
      )

      if (S.look === 'plain' && i < items.length - 1) {
        children.push(
          <Box key={`s${i}`}>
            <Text dimColor>{S.separator}</Text>
          </Box>
        )
      }
    })

    return (
      <Box
        width="100%"
        flexWrap="wrap"
        justifyContent={S.align === 'left' ? 'flex-start' : S.align === 'center' ? 'center' : 'flex-end'}
        columnGap={S.look === 'plain' ? 0 : S.gap}
        paddingX={1}
      >
        {children}
      </Box>
    )
  })

  // ----- o spinner ("Sauteing…") -----
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const cfg = await read($, config)
    const SP = cfg.spinner

    if (!cfg.enabled || !SP.on) {
      return next(e)
    }

    const words = SP.words.length ? SP.words : DEFAULT_WORDS
    const count = await read($, turns)
    const isAnimated = SP.rainbow || SP.cycleSec > 0

    if (!isAnimated) {
      return next({ ...e, props: { ...e.props, word: words[count % words.length] } })
    }

    const f = await read($, frame)
    const t0 = await read($, turnStart)
    const t = await $.clock.now()
    const elapsed = t0 > 0 ? Math.max(0, t - t0) : 0
    const word = words[(count + (SP.cycleSec > 0 ? Math.floor(elapsed / 1000 / SP.cycleSec) : 0)) % words.length]
    const glyph = ACTIVITY.braille[f % ACTIVITY.braille.length]
    const tail = [SP.showTime ? secs(elapsed) : '', SP.showMode ? MODE_WORDS[e.props.mode] ?? '' : ''].filter(Boolean).join(' · ')
    const accent = PALETTES[cfg.style.palette].amber
    const { Box, Text } = $.ui.resolve(e)
    const kids: any[] = Array.from(`${glyph} ${word}…`).map((ch, i) => (
      <Box key={`c${i}`}>
        <Text color={SP.rainbow ? hsl((f * 16 + i * 24) % 360, 0.75, 0.66) : accent} bold>
          {ch}
        </Text>
      </Box>
    ))
    if (tail) {
      kids.push(
        <Box key="tail" marginLeft={1}>
          <Text dimColor>{`(${tail})`}</Text>
        </Box>
      )
    }

    return <Box>{kids}</Box>
  })

  // ----- a linha que fecha o turno ("Baked for 3s") -----
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const cfg = await read($, config)
    const TD = cfg.turnDone

    if (!cfg.enabled || !TD.on) {
      return next(e)
    }

    const words = TD.words.length ? TD.words : DEFAULT_DONE
    let seed = 0
    for (const ch of String(e.requestId)) seed = (seed * 31 + ch.charCodeAt(0)) % 100003
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color={PALETTES[cfg.style.palette].pink} dimColor>
          {`✻ ${words[seed % words.length]} em ${secs(e.props.durationMs)}`}
        </Text>
      </Box>
    )
  })

  // ----- a dica embaixo do prompt -----
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const cfg = await read($, config)
    const HI = cfg.hint

    if (!cfg.enabled || !HI.on || e.props.isDraft || !HI.items.length) {
      return next(e)
    }

    const D = await readData($)
    const S = cfg.style
    const count = await read($, turns)
    const pct = (kind: string) => {
      const l = D.limits.find(x => x.kind === kind)

      return l ? `${Math.round(l.percentUsed)}%` : '–'
    }
    const vars: Record<string, string> = {
      '5h': pct('five_hour'),
      '7d': pct('seven_day'),
      cost: money(D.usd, S),
      ctx: D.ctx?.percent === undefined ? '–' : `${Math.round(D.ctx.percent)}%`,
      model: prettyModel(D.model),
      time: D.now > 0 ? atClock(D.now, S) : '',
      turns: String(D.turns),
      dir: D.cwd.split(/[\\/]/).filter(Boolean).pop() ?? ''
    }
    const text = HI.items[count % HI.items.length].replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))

    return next({ ...e, props: { ...e.props, tail: ` ${text}` } })
  })
}
