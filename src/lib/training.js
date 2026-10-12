// Sandbox training mode: filters and localStorage progress (one storage key per certification).

import { parseLetters, shuffle } from './exam.js'

export const THEMES = [
  { key: 'cout', label: '💰 Coût' },
  { key: 'securite', label: '🔒 Sécurité' },
  { key: 'haute_dispo', label: '🛟 Haute dispo' },
  { key: 'performance', label: '⚡ Performance' },
  { key: 'op_overhead', label: '🛠 Overhead op.' },
]

export const THEME_LABELS = Object.fromEntries(THEMES.map((t) => [t.key, t.label]))

// A question's theme = the highest-scored radar dimension.
export function dominantTheme(q) {
  const s = q.radar?.scores
  if (!s) return null
  let best = null
  for (const k of Object.keys(s)) {
    if (best === null || s[k] > s[best]) best = k
  }
  return best
}

export function loadProgress(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {}
  } catch {
    return {}
  }
}

export function saveProgress(storageKey, progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress))
  } catch {
    // private mode / quota: training still works, progress just isn't persisted
  }
}

export function clearProgress(storageKey) {
  try {
    localStorage.removeItem(storageKey)
  } catch {}
}

export function recordAnswer(progress, qid, ok) {
  const cur = progress[qid] || { attempts: 0, correct: 0, streak: 0 }
  return {
    ...progress,
    [qid]: {
      attempts: cur.attempts + 1,
      correct: cur.correct + (ok ? 1 : 0),
      streak: ok ? (cur.streak || 0) + 1 : 0,
      lastOk: ok,
      last: Date.now(),
    },
  }
}

// Mastered = answered correctly twice in a row.
export function isMastered(entry) {
  return !!entry && entry.streak >= 2
}

export function filterBank(bank, progress, { theme, status, qtype, rangeFrom, rangeTo }) {
  return bank.filter((q) => {
    if (rangeFrom != null && q.id < rangeFrom) return false
    if (rangeTo != null && q.id > rangeTo) return false
    if (theme !== 'all' && dominantTheme(q) !== theme) return false
    const multi = parseLetters(q.answer).length > 1
    if (qtype === 'single' && multi) return false
    if (qtype === 'multi' && !multi) return false
    const p = progress[q.id]
    if (status === 'new' && p) return false
    if (status === 'wrong' && !(p && p.lastOk === false)) return false
    if (status === 'unmastered' && isMastered(p)) return false
    return true
  })
}

export function buildTrainingSession(bank, progress, cfg) {
  const pool = filterBank(bank, progress, cfg)
  const ordered =
    cfg.order === 'sequential' ? [...pool].sort((a, b) => a.id - b.id) : shuffle(pool)
  return cfg.count === 'all' ? ordered : ordered.slice(0, cfg.count)
}

/* ---------- Last played series (to replay it later) ---------- */

export function saveLastSession(storageKey, questions) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(questions.map((q) => q.id)))
  } catch {}
}

// Returns the questions of the last series, in the order they were played.
export function loadLastSession(storageKey, bank) {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey))
    if (!Array.isArray(ids) || ids.length === 0) return null
    const byId = new Map(bank.map((q) => [q.id, q]))
    const list = ids.map((id) => byId.get(id)).filter(Boolean)
    return list.length > 0 ? list : null
  } catch {
    return null
  }
}
