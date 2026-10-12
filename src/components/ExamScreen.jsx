import { useEffect, useRef, useState } from 'react'
import { formatTime, isMultiAnswer, parseLetters } from '../lib/exam.js'
import { domainClass } from '../lib/certs.js'
import RichText from './RichText.jsx'

export default function ExamScreen({ exam, timed, timeLimit, onSubmit, onQuit }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { [qid]: ["A","C"] }
  const [flags, setFlags] = useState({}) // { [qid]: true }
  const [remaining, setRemaining] = useState(timeLimit)
  const startRef = useRef(Date.now())

  const q = exam[index]
  const optionKeys = Object.keys(q.options)
  const multi = isMultiAnswer(q)
  const selected = answers[q.id] || []

  // Countdown
  useEffect(() => {
    if (!timed) return
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t)
          submit()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed])

  function choose(letter) {
    setAnswers((prev) => {
      const cur = prev[q.id] || []
      if (multi) {
        const next = cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter]
        return { ...prev, [q.id]: next }
      }
      return { ...prev, [q.id]: [letter] }
    })
  }

  function toggleFlag() {
    setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))
  }

  function submit() {
    const used = Math.round((Date.now() - startRef.current) / 1000)
    onSubmit(answers, used)
  }

  function confirmSubmit() {
    const answered = Object.values(answers).filter((a) => a.length > 0).length
    const left = exam.length - answered
    const msg = left > 0
      ? `${left} question(s) sans réponse. Terminer quand même ?`
      : 'Terminer et voir le résultat ?'
    if (window.confirm(msg)) submit()
  }

  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length

  return (
    <main className="screen exam">
      <div className="exam-main">
        <div className="exam-head">
          <span className="qnum">Question {index + 1} / {exam.length}</span>
          {timed && (
            <span className={`timer ${remaining < 60 ? 'danger' : ''}`}>⏱ {formatTime(remaining)}</span>
          )}
        </div>

        <div className="card question-card">
          {q.domain && <span className={`domain-badge ${domainClass(q.domain)}`}>{q.domain}</span>}
          {multi && <p className="multi-hint">Choisissez {parseLetters(q.answer).length} réponses.</p>}
          <div className="question-text"><RichText text={q.question} /></div>

          <ul className="options">
            {optionKeys.map((k) => {
              const active = selected.includes(k)
              return (
                <li key={k}>
                  <button
                    type="button"
                    className={`option ${active ? 'selected' : ''}`}
                    onClick={() => choose(k)}
                  >
                    <span className="opt-key">{multi ? (active ? '☑' : '☐') : (active ? '●' : '○')} {k}</span>
                    <span className="opt-text"><RichText text={q.options[k]} /></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="exam-nav">
          <button type="button" className="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            ← Précédent
          </button>
          <button type="button" className={`ghost ${flags[q.id] ? 'flagged' : ''}`} onClick={toggleFlag}>
            {flags[q.id] ? '⚑ Marquée' : '⚑ Marquer'}
          </button>
          {index < exam.length - 1 ? (
            <button type="button" className="primary" onClick={() => setIndex((i) => Math.min(exam.length - 1, i + 1))}>
              Suivant →
            </button>
          ) : (
            <button type="button" className="primary" onClick={confirmSubmit}>
              Terminer
            </button>
          )}
        </div>
      </div>

      <aside className="palette card">
        <div className="palette-head">
          <strong>{answeredCount}/{exam.length}</strong> répondues
        </div>
        <div className="grid">
          {exam.map((item, i) => {
            const ans = (answers[item.id] || []).length > 0
            const cls = [
              i === index ? 'current' : '',
              ans ? 'answered' : '',
              flags[item.id] ? 'flagged' : '',
            ].join(' ')
            return (
              <button key={item.id} type="button" className={`cell ${cls}`} onClick={() => setIndex(i)}>
                {i + 1}
              </button>
            )
          })}
        </div>
        <div className="legend">
          <span><i className="dot answered" /> répondue</span>
          <span><i className="dot flagged" /> marquée</span>
          <span><i className="dot current" /> en cours</span>
        </div>
        <button type="button" className="primary block" onClick={confirmSubmit}>Terminer l'examen</button>
        <button type="button" className="ghost block" onClick={onQuit}>Abandonner</button>
      </aside>
    </main>
  )
}
