// AWS Associate exam parameters (same format for SAA-C03 and MLA-C02) + scoring/evaluation helpers.

export const EXAM = {
  PASS_SCORE: 720,      // scaled passing score
  MIN_SCORE: 100,       // scaled score floor
  MAX_SCORE: 1000,      // scaled score ceiling
  TOTAL_QUESTIONS: 65,  // questions shown in the real exam
  SCORED_QUESTIONS: 50, // only 50 count toward the score...
  UNSCORED_QUESTIONS: 15, // ...the other 15 are unscored
  TIME_MINUTES: 130,    // real exam duration
  SECONDS_PER_QUESTION: 120, // 130 min / 65 q = 2 min per question
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Option letters quoted in explanations: "(D)", "(A/D)", "option B", "reponse D", "options B et D", "B et D".
const LETTER_REF =
  /\(([A-F](?:\s*[/,]\s*[A-F])*)\)|\b((?:[Oo]ptions?|[Rr][ée]ponses?|[Cc]hoix|[Aa]nswers?)\s+)([A-F](?:\s*(?:,|\/|et|and|ou|or)\s*[A-F])*)\b|\b([A-F]\s+(?:et|and)\s+[A-F])\b/g

function relabelText(text, map) {
  if (!text) return text
  const swap = (s) => s.replace(/\b[A-F]\b/g, (l) => map[l] || l)
  return text.replace(LETTER_REF, (m, paren, word, letters, pair) => {
    if (paren != null) return `(${swap(paren)})`
    if (word != null) return word + swap(letters)
    return swap(pair)
  })
}

// Show the options in `order` (original letters, e.g. ['C','A','D','B']): option C becomes A, etc.
// Answer, traps and letter references in the explanation follow the new letters.
export function reorderOptions(q, order) {
  const map = {}
  order.forEach((k, i) => { map[k] = String.fromCharCode(65 + i) })
  const options = {}
  for (const k of order) options[map[k]] = q.options[k]
  const answer = parseLetters(q.answer).map((l) => map[l] || l).sort().join(', ')
  let radar = q.radar
  if (radar) {
    const pieges = radar.pieges
      ? Object.fromEntries(Object.entries(radar.pieges).map(([k, v]) => [map[k] || k, relabelText(v, map)]))
      : radar.pieges
    radar = { ...radar, signal: relabelText(radar.signal, map), pieges }
  }
  return {
    ...q,
    options,
    answer,
    ...(radar ? { radar } : {}),
    ...(q.explication ? { explication: relabelText(q.explication, map) } : {}),
    optionOrder: order,
  }
}

export function shuffleOptions(q) {
  return reorderOptions(q, shuffle(Object.keys(q.options)))
}

// "C" -> ["C"];  "B, C" -> ["B","C"];  "BD" -> ["B","D"]
export function parseLetters(answer) {
  const tokens = Array.isArray(answer)
    ? answer.map((s) => String(s).trim().toUpperCase())
    : String(answer || '')
        .split(/[\s,]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
  // Concatenated letters ("BD") -> individual letters.
  return tokens.flatMap((t) => (/^[A-F]{2,}$/.test(t) ? t.split('') : [t]))
}

export function isMultiAnswer(q) {
  return parseLetters(q.answer).length > 1
}

// Validate an imported question bank and normalise it.
export function normalizeBank(raw) {
  if (!Array.isArray(raw)) throw new Error('Le JSON doit être un tableau de questions.')
  return raw.map((q, i) => {
    if (!q || typeof q !== 'object') throw new Error(`Question ${i + 1}: format invalide.`)
    if (!q.question) throw new Error(`Question ${i + 1}: champ "question" manquant.`)
    if (!q.options || typeof q.options !== 'object')
      throw new Error(`Question ${i + 1}: champ "options" manquant ou invalide.`)
    if (q.answer === undefined || q.answer === null || q.answer === '')
      throw new Error(`Question ${i + 1}: champ "answer" manquant.`)
    return {
      id: q.id ?? i + 1,
      question: q.question,
      options: q.options,
      answer: q.answer,
      ...(q.domain ? { domain: q.domain } : {}),
    }
  })
}

// Build a fresh exam: shuffle the bank, take `count`, flag scored vs unscored.
export function buildExam(bank, count) {
  const picked = shuffle(bank).slice(0, count)
  const n = picked.length
  // Only do the 50-scored / 15-unscored split for a full 65-question exam.
  let scoredIdx
  if (n >= EXAM.TOTAL_QUESTIONS) {
    scoredIdx = new Set(
      shuffle([...Array(n).keys()]).slice(0, EXAM.SCORED_QUESTIONS),
    )
  } else {
    scoredIdx = new Set([...Array(n).keys()]) // small bank: everything counts
  }
  return picked.map((q, i) => ({ ...shuffleOptions(q), scored: scoredIdx.has(i) }))
}

export function isCorrect(q, selected) {
  const correct = parseLetters(q.answer)
  const chosen = (selected || []).map((s) => s.toUpperCase())
  if (chosen.length !== correct.length) return false
  const set = new Set(correct)
  return chosen.every((c) => set.has(c))
}

// Grade the exam. Scaled score is computed from the scored questions only.
export function evaluate(exam, answers) {
  let correctOverall = 0
  let correctScored = 0
  let scoredTotal = 0

  const review = exam.map((q) => {
    const selected = answers[q.id] || []
    const ok = isCorrect(q, selected)
    if (ok) correctOverall++
    if (q.scored) {
      scoredTotal++
      if (ok) correctScored++
    }
    return { q, selected, ok }
  })

  const ratio = scoredTotal > 0 ? correctScored / scoredTotal : 0
  const scaled = Math.round(EXAM.MIN_SCORE + (EXAM.MAX_SCORE - EXAM.MIN_SCORE) * ratio)

  return {
    review,
    total: exam.length,
    correctOverall,
    scoredTotal,
    correctScored,
    accuracy: exam.length ? correctOverall / exam.length : 0,
    scaledScore: scaled,
    passed: scaled >= EXAM.PASS_SCORE,
  }
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
