import { useState } from 'react'
import { EXAM, formatTime, parseLetters } from '../lib/exam.js'
import { domainClass } from '../lib/certs.js'
import { frOption, frQuestion } from '../lib/i18n.js'
import RichText from './RichText.jsx'

export default function ResultsScreen({ result, fr, onRestart, onRetry }) {
  const [filter, setFilter] = useState('all') // all | incorrect
  const { review, scaledScore, passed, correctScored, scoredTotal, correctOverall, total, accuracy, timeUsed } = result

  const shown = review.filter((r) => (filter === 'incorrect' ? !r.ok : true))

  return (
    <main className="screen results">
      <section className={`card score-card ${passed ? 'pass' : 'fail'}`}>
        <div className="score-badge">{passed ? 'RÉUSSI' : 'ÉCHOUÉ'}</div>
        <div className="score-number">{scaledScore}<span>/1000</span></div>
        <div className="score-meta">
          <span>Seuil de réussite : {EXAM.PASS_SCORE}</span>
          <span>Bonnes réponses (notées) : {correctScored}/{scoredTotal}</span>
          <span>Précision globale : {Math.round(accuracy * 100)}% ({correctOverall}/{total})</span>
          {timeUsed != null && <span>Temps utilisé : {formatTime(timeUsed)}</span>}
        </div>
        <div className="score-bar">
          <div className="fill" style={{ width: `${(scaledScore - 100) / 9}%` }} />
          <div className="threshold" style={{ left: `${(EXAM.PASS_SCORE - 100) / 9}%` }} title="Seuil 720" />
        </div>
        <div className="actions">
          <button type="button" className="primary" onClick={onRetry}>Nouvel examen</button>
          <button type="button" className="ghost" onClick={onRestart}>Reconfigurer</button>
        </div>
      </section>

      <section className="card">
        <div className="review-head">
          <h2>Correction détaillée</h2>
          <div className="chips">
            <button type="button" className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              Toutes ({review.length})
            </button>
            <button type="button" className={`chip ${filter === 'incorrect' ? 'active' : ''}`} onClick={() => setFilter('incorrect')}>
              Erreurs ({review.filter((r) => !r.ok).length})
            </button>
          </div>
        </div>

        <ol className="review-list">
          {shown.map(({ q, selected, ok }) => {
            const correct = parseLetters(q.answer)
            return (
              <li key={q.id} className={`review-item ${ok ? 'ok' : 'ko'}`}>
                <div className="review-q">
                  <span className={`tag ${ok ? 'ok' : 'ko'}`}>{ok ? '✓' : '✗'}</span>
                  {q.domain && <span className={`tag domain ${domainClass(q.domain)}`}>{q.domain}</span>}
                  {!q.scored && <span className="tag unscored" title="Question non notée">non notée</span>}
                  <span>
                    <RichText text={q.question} />
                    {frQuestion(fr, q) && <span className="fr-text">{frQuestion(fr, q)}</span>}
                  </span>
                </div>
                <ul className="review-opts">
                  {Object.keys(q.options).map((k) => {
                    const isCorrect = correct.includes(k)
                    const isChosen = selected.includes(k)
                    let cls = ''
                    if (isCorrect) cls = 'correct'
                    else if (isChosen) cls = 'wrong'
                    return (
                      <li key={k} className={cls}>
                        <strong>{k}.</strong> <RichText text={q.options[k]} />
                        {isCorrect && <em className="mark"> ✓ bonne réponse</em>}
                        {isChosen && !isCorrect && <em className="mark"> ✗ votre choix</em>}
                        {frOption(fr, q, k) && <span className="fr-opt">{frOption(fr, q, k)}</span>}
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
