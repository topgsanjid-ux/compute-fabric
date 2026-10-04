export type PresetKey = 'LLM-TRAIN-04' | 'INFERENCE-HEAVY' | 'GRID-IDLE'

export type Preset = {
  temp: number
  throughput: number
  nvlink: number
  util: number
  power: number
  description: string
}

export const PRESETS: Record<PresetKey, Preset> = {
  'LLM-TRAIN-04': {
    temp: 74.2,
    throughput: 8.2,
    nvlink: 846,
    util: 96,
    power: 688,
    description: '70B dense pretrain · TP8 × PP8',
  },
  'INFERENCE-HEAVY': {
    temp: 66.8,
    throughput: 5.4,
    nvlink: 512,
    util: 72,
    power: 541,
    description: 'vLLM serving · 64 replicas',
  },
  'GRID-IDLE': {
    temp: 38.6,
    throughput: 0.3,
    nvlink: 22,
    util: 3,
    power: 92,
    description: 'Fabric idle · health sweeps only',
  },
}

export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[]

export const NODE_COUNT = 64
export const HISTORY_POINTS = 48
export const NVLINK_MAX = 900
export const THROTTLE_TEMP = 83

export type NodeStatus = 'nominal' | 'anomaly' | 'critical' | 'drained'

export type LogLevel = 'INFO' | 'WARN' | 'PRED' | 'ACT' | 'OK' | 'CRIT'

export type LogEntry = { id: number; ts: string; level: LogLevel; msg: string }

export type Checkpoint = {
  id: string
  step: number
  size: string
  kind: 'scheduled' | 'interdiction'
  status: 'committed' | 'writing'
  age: string
}

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seeded = mulberry32(1337)

function centered(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return values.map((v) => v - mean)
}

const TEMP_OFFSETS = centered(Array.from({ length: NODE_COUNT }, () => (seeded() - 0.5) * 8))
const UTIL_OFFSETS = centered(Array.from({ length: NODE_COUNT }, () => (seeded() - 0.5) * 8))

export function shuffledIndices(random: () => number) {
  const arr = Array.from({ length: NODE_COUNT }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const INITIAL_ANOMALY_ORDER = shuffledIndices(mulberry32(2024))

export function noise(i: number, t: number) {
  return (Math.sin(i * 12.9898 + t * 0.71) + Math.sin(i * 4.1414 + t * 1.37)) / 2
}

export function nodeId(i: number) {
  return `h100-r${String(Math.floor(i / 8) + 1).padStart(2, '0')}-${i % 8}`
}

export function nodeTemp(i: number, t: number, preset: Preset, status: NodeStatus) {
  if (status === 'drained') return 31 + noise(i, t) * 0.4
  let value = preset.temp + TEMP_OFFSETS[i] * (preset.util / 100 + 0.25) + noise(i, t) * 1.2
  if (status === 'anomaly') value += 11.5 + noise(i + 3, t * 2) * 1.5
  if (status === 'critical') value += 19 + noise(i + 5, t * 3) * 2
  return value
}

export function nodeUtil(i: number, t: number, preset: Preset, status: NodeStatus) {
  if (status === 'drained') return 0
  let value = preset.util + UTIL_OFFSETS[i] * (preset.util / 100) + noise(i + 7, t) * 1.8
  if (status === 'anomaly') value *= 0.84
  if (status === 'critical') value *= 0.55
  return Math.max(0, Math.min(100, value))
}

export function nodePower(i: number, t: number, preset: Preset, status: NodeStatus) {
  if (status === 'drained') return 61
  return preset.power + UTIL_OFFSETS[i] * 4 + noise(i + 11, t) * 9 + (status === 'nominal' ? 0 : 42)
}

export function nodePcieErrors(i: number, t: number, status: NodeStatus) {
  if (status === 'critical') return 380 + Math.round(Math.abs(noise(i, t)) * 80)
  if (status === 'anomaly') return 24 + Math.round(Math.abs(noise(i, t)) * 18)
  if (status === 'drained') return 0
  return Math.round(Math.abs(noise(i, t)) * 3)
}

export function nvlinkAt(t: number, preset: Preset, penalty: number) {
  const value = preset.nvlink + noise(3, t * 0.6) * 22 + noise(9, t * 1.7) * 8 - penalty
  return Math.max(0, Math.min(NVLINK_MAX, value))
}

export function anomalyTarget(threshold: number) {
  if (threshold < 35) return 0
  if (threshold < 55) return 1
  if (threshold < 70) return 2
  if (threshold < 80) return 3
  if (threshold < 90) return 4
  return 5
}

export function formatClock(date: Date) {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(
    date.getMilliseconds(),
    3,
  )}`
}

export const INITIAL_LOGS: LogEntry[] = [
  { id: 1, ts: '09:41:02.118', level: 'INFO', msg: 'kelvind 0.9.4 attached · nvml, pcie-aer, ebpf probes loaded' },
  { id: 2, ts: '09:41:02.204', level: 'INFO', msg: 'topology: 8 racks × 8 nodes · NVSwitch gen4 · IB NDR 400' },
  { id: 3, ts: '09:41:03.870', level: 'OK', msg: 'baseline thermal envelope learned (σ=1.84°C)' },
  { id: 4, ts: '09:52:17.551', level: 'WARN', msg: 'h100-r03-5: ECC SBE count 12 → 19 (watching)' },
  { id: 5, ts: '10:04:44.009', level: 'INFO', msg: 'checkpoint: step 183,040 committed · 2.38 TB · 37.1s' },
  { id: 6, ts: '10:05:01.332', level: 'PRED', msg: 'fold-7 forecast refresh · 0 nodes above p=0.80' },
]

export const INITIAL_CHECKPOINTS: Checkpoint[] = [
  { id: 'ckpt-0183040', step: 183040, size: '2.38 TB', kind: 'scheduled', status: 'committed', age: '12m ago' },
  { id: 'ckpt-0181760', step: 181760, size: '2.38 TB', kind: 'scheduled', status: 'committed', age: '42m ago' },
  { id: 'ckpt-0180480', step: 180480, size: '2.37 TB', kind: 'scheduled', status: 'committed', age: '1h 12m ago' },
  { id: 'ckpt-0179200', step: 179200, size: '2.37 TB', kind: 'scheduled', status: 'committed', age: '1h 42m ago' },
]
