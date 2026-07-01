// Renders question / option text and auto-formats embedded code.
// Handles two cases produced by the OCR pipeline:
//   1. Clean JSON with braces  -> parsed and re-indented.
//   2. IAM policies whose { } braces were dropped by the OCR -> detected via
//      AWS policy key tokens ("Version", "Statement", "Effect"...) and laid out
//      one key/value per line so they stay readable.

const POLICY_KEY =
  /"(Version|Sid|Statement|Effect|Action|NotAction|Principal|NotPrincipal|Resource|NotResource|Condition|Id)"\s*:/i

function findMatchingClose(text, start) {
  let depth = 0
  let inStr = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') { i++; continue }
      if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function looksLikeCode(seg) {
  return seg.length >= 18 && seg.includes('"') && (seg.includes(':') || seg.includes(','))
}

// Consume a run of JSON-ish tokens (strings, brackets, punctuation) and stop at
// the first unquoted prose word — this bounds a brace-less policy.
function scanJsonEnd(text, start) {
  let inStr = false
  let q = ''
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') { i++; continue }
      if (c === q) inStr = false
      continue
    }
    if (c === '"' || c === "'") { inStr = true; q = c; continue }
    if (/[\s{}\[\]():,*.\-\d/]/.test(c)) continue
    const rest = text.slice(i, i + 5).toLowerCase()
    if (rest.startsWith('true')) { i += 3; continue }
    if (rest.startsWith('false')) { i += 4; continue }
    if (rest.startsWith('null')) { i += 3; continue }
    return i // unquoted letter = prose resumes
  }
  return text.length
}

// Pretty-print any JSON-ish string, valid or not.
function formatJsonish(s) {
  let out = ''
  let indent = 0
  let inStr = false
  let q = ''
  const pad = () => '\n' + '  '.repeat(Math.max(0, indent))
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      out += c
      if (c === '\\') out += s[++i] || ''
      else if (c === q) inStr = false
      continue
    }
    if (c === '"' || c === "'") { inStr = true; q = c; out += c; continue }
    if (c === '{' || c === '[') { indent++; out += c + pad(); continue }
    if (c === '}' || c === ']') { indent = Math.max(0, indent - 1); out += pad() + c; continue }
    if (c === ',') { out += c + pad(); continue }
    if (c === ':') { out += ': '; continue }
    if (/\s/.test(c)) {
      let j = i
      while (j < s.length && /\s/.test(s[j])) j++
      if (out.endsWith('"') && s[j] === '"') out += pad() // missing comma between strings
      i = j - 1
      continue
    }
    out += c
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim()
}

function formatSeg(seg) {
  try {
    return JSON.stringify(JSON.parse(seg), null, 2)
  } catch {
    return formatJsonish(seg)
  }
}

// Locate the earliest code region at or after `from`.
function findCode(text, from) {
  let braced = null
  for (let k = from; k < text.length; k++) {
    const c = text[k]
    if (c === '{' || c === '[') {
      const end = findMatchingClose(text, k)
      if (end !== -1) {
        const seg = text.slice(k, end + 1)
        if (looksLikeCode(seg)) { braced = { start: k, end: end + 1, value: formatSeg(seg) }; break }
      }
    }
  }

  let policy = null
  const m = POLICY_KEY.exec(text.slice(from))
  if (m) {
    const start = from + m.index
    const end = scanJsonEnd(text, start)
    const seg = text.slice(start, end)
    if ((seg.match(/"/g) || []).length >= 4 && seg.length >= 25) {
      policy = { start, end, value: formatJsonish(seg) }
    }
  }

  if (braced && policy) return braced.start <= policy.start ? braced : policy
  return braced || policy
}

export function parseSegments(text) {
  const segs = []
  let i = 0
  while (i < text.length) {
    const code = findCode(text, i)
    if (!code) { segs.push({ type: 'text', value: text.slice(i) }); break }
    const before = text.slice(i, code.start).replace(/\bJSON\b\s*$/i, '').replace(/\s+$/, '')
    if (before) segs.push({ type: 'text', value: before })
    segs.push({ type: 'code', value: code.value })
    i = code.end
  }
  return segs
}

export default function RichText({ text }) {
  const segs = parseSegments(text || '')
  return (
    <>
      {segs.map((s, idx) =>
        s.type === 'code'
          ? <code key={idx} className="code-block">{s.value}</code>
          : <span key={idx}>{s.value}</span>,
      )}
    </>
  )
}
