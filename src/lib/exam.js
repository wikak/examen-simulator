// AWS SAA-C03 exam parameters + scoring/evaluation helpers.

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

// Reference only (the breakdown is displayed; categories are NOT used to grade).
export const DOMAINS = [
  { name: 'Design Secure Architectures', weight: 30 },
  { name: 'Design Resilient Architectures', weight: 26 },
  { name: 'Design High-Performing Architectures', weight: 24 },
  { name: 'Design Cost-Optimized Architectures', weight: 20 },
]

export function domainClass(domain) {
  return {
    'Design Secure Architectures': 'dom-secure',
    'Design Resilient Architectures': 'dom-resilient',
    'Design High-Performing Architectures': 'dom-perf',
    'Design Cost-Optimized Architectures': 'dom-cost',
  }[domain] || 'dom-default'
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// "C" -> ["C"];  "B, C" -> ["B","C"]
export function parseLetters(answer) {
  if (Array.isArray(answer)) return answer.map((s) => String(s).trim().toUpperCase())
  return String(answer || '')
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
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
  return picked.map((q, i) => ({ ...q, scored: scoredIdx.has(i) }))
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
