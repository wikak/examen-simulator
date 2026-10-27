// French translations of the question banks: { [id]: { question, options: { A, B, ... } } }.
// Loaded on demand so they stay out of the main bundle; originals stay in English.

import { useEffect, useState } from 'react'

const SHOW_FR_KEY = 'aws-show-fr-v1'

export function loadShowFr() {
  try {
    return localStorage.getItem(SHOW_FR_KEY) === '1'
  } catch {
    return false
  }
}

export function saveShowFr(on) {
  try {
    localStorage.setItem(SHOW_FR_KEY, on ? '1' : '0')
  } catch {}
}

// `loader` returns a dynamic import() of the translation file; null map while loading or off.
export function useTranslations(loader, enabled) {
  const [map, setMap] = useState(null)
  useEffect(() => {
    if (!enabled || !loader) {
      setMap(null)
      return
    }
    let alive = true
    loader()
      .then((m) => { if (alive) setMap(m.default) })
      .catch(() => { if (alive) setMap(null) })
    return () => { alive = false }
  }, [loader, enabled])
  return map
}

// null when there is no translation or it is identical to the original (e.g. a bare service name).
export function frQuestion(map, q) {
  const t = map?.[q.id]?.question
  return t && t !== q.question ? t : null
}

// Options may be shuffled: displayed letter -> original letter via q.optionOrder.
export function frOption(map, q, k) {
  const t = map?.[q.id]
  if (!t?.options) return null
  const orig = q.optionOrder ? q.optionOrder[k.charCodeAt(0) - 65] : k
  const text = t.options[orig]
  return text && text !== q.options[k] ? text : null
}
