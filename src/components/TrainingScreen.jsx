import { useEffect, useMemo, useState } from 'react'
import RichText from './RichText.jsx'
import { isCorrect, parseLetters } from '../lib/exam.js'
import {
  THEMES,
  THEME_LABELS,
  TRAINING_BANK,
  buildTrainingSession,
  clearProgress,
  dominantTheme,
  filterBank,
  isMastered,
  loadProgress,
  recordAnswer,
  saveProgress,
} from '../lib/training.js'

const COUNT_OPTIONS = [10, 20, 50]
const STATUS_OPTIONS = [
  { key: 'all', label: 'Toutes' },
  { key: 'new', label: 'Jamais vues' },
  { key: 'wrong', label: 'Ratées' },
  { key: 'unmastered', label: 'Non maîtrisées' },
]
const TYPE_OPTIONS = [
  { key: 'all', label: 'Tous types' },
  { key: 'single', label: 'Réponse unique' },
  { key: 'multi', label: 'Multi-réponses' },
]
const ORDER_OPTIONS = [
  { key: 'random', label: '🎲 Aléatoire' },
  { key: 'sequential', label: '↦ Séquentiel' },
]

export default function TrainingScreen() {
  const bank = TRAINING_BANK
  const [phase, setPhase] = useState('config') // config | run | summary
  const [progress, setProgress] = useState(loadProgress)

  // Session settings
  const [theme, setTheme] = useState('all')
  const [status, setStatus] = useState('all')
  const [qtype, setQtype] = useState('all')
  const [count, setCount] = useState(20)
  const [order, setOrder] = useState('random')
  const [showHints, setShowHints] = useState(true)

  // Running session
  const [session, setSession] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState([])
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([]) // [{ q, selected, ok }]

  const cfg = { theme, status, qtype, count, order }
  const pool = useMemo(
    () => filterBank(bank, progress, cfg),
    [bank, progress, theme, status, qtype],
  )

  const stats = useMemo(() => {
    let seen = 0
    let mastered = 0
    let wrong = 0
    for (const q of bank) {
      const p = progress[q.id]
      if (!p) continue
      seen++
      if (isMastered(p)) mastered++
      else if (p.lastOk === false) wrong++
    }
    return { seen, mastered, wrong, total: bank.length }
  }, [bank, progress])

  function startSession() {
    const list = buildTrainingSession(bank, progress, cfg)
    if (list.length === 0) return
    setSession(list)
    setIndex(0)
    setSelected([])
    setRevealed(false)
    setResults([])
    setPhase('run')
    window.scrollTo(0, 0)
  }

  const q = session[index]
  const multi = q ? parseLetters(q.answer).length > 1 : false
  const correctLetters = q ? parseLetters(q.answer) : []
  const lastResult = results[results.length - 1]

  function choose(letter) {
    if (revealed) return
    setSelected((cur) => {
      if (multi) {
        return cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter]
      }
      return [letter]
    })
  }

  function validate() {
    if (revealed || selected.length === 0) return
    const ok = isCorrect(q, selected)
    setResults((r) => [...r, { q, selected, ok }])
    setProgress((p) => {
      const next = recordAnswer(p, q.id, ok)
      saveProgress(next)
      return next
    })
    setRevealed(true)
  }

  function next() {
    if (index + 1 >= session.length) {
      setPhase('summary')
      window.scrollTo(0, 0)
      return
    }
    setIndex((i) => i + 1)
    setSelected([])
    setRevealed(false)
    window.scrollTo(0, 0)
  }

  function replayErrors() {
    const wrongQs = results.filter((r) => !r.ok).map((r) => r.q)
    if (wrongQs.length === 0) return
    setSession(wrongQs)
    setIndex(0)
    setSelected([])
    setRevealed(false)
    setResults([])
    setPhase('run')
    window.scrollTo(0, 0)
  }

  function resetProgress() {
    if (!window.confirm('Réinitialiser toute la progression d’entraînement ?')) return
    clearProgress()
    setProgress({})
  }

  // Keyboard shortcuts: A–F to pick an option, Enter to validate / go next.
  useEffect(() => {
    if (phase !== 'run') return
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.toUpperCase()
      if (/^[A-F]$/.test(k) && q && q.options[k]) {
        choose(k)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (revealed) next()
        else validate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- Config ---------- */
  if (phase === 'config') {
    return (
      <main className="screen">
        <section className="card">
          <h2>🧪 Mode entraînement</h2>
          <p className="muted">
            Apprends question par question avec correction immédiate : signal à repérer,
            pièges de chaque option et explication détaillée. Ta progression est
            sauvegardée sur cet appareil.
          </p>

          <div className="stats-grid">
            <div className="stat">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">questions</span>
            </div>
            <div className="stat">
              <span className="stat-num">{stats.seen}</span>
              <span className="stat-label">vues</span>
            </div>
            <div className="stat good">
              <span className="stat-num">{stats.mastered}</span>
              <span className="stat-label">maîtrisées</span>
            </div>
            <div className="stat bad">
              <span className="stat-num">{stats.wrong}</span>
              <span className="stat-label">à revoir</span>
            </div>
          </div>
          <div className="mastery-bar">
            <i style={{ width: `${(stats.mastered / stats.total) * 100}%` }} />
          </div>
          <p className="muted small">
            Une question est « maîtrisée » après 2 bonnes réponses d'affilée.
          </p>
          {stats.seen > 0 && (
            <button type="button" className="ghost small-btn" onClick={resetProgress}>
              Réinitialiser la progression
            </button>
          )}
        </section>

        <section className="card">
          <h2>Paramètres de la session</h2>

          <label className="field">
            <span>Thème</span>
            <div className="chips">
              <button
                type="button"
                className={`chip ${theme === 'all' ? 'active' : ''}`}
                onClick={() => setTheme('all')}
              >
                Tous
              </button>
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`chip ${theme === t.key ? 'active' : ''}`}
                  onClick={() => setTheme(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Statut</span>
            <div className="chips">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`chip ${status === s.key ? 'active' : ''}`}
                  onClick={() => setStatus(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Type de question</span>
            <div className="chips">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`chip ${qtype === t.key ? 'active' : ''}`}
                  onClick={() => setQtype(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Nombre de questions</span>
            <div className="chips">
              {COUNT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${count === c ? 'active' : ''}`}
                  onClick={() => setCount(c)}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                className={`chip ${count === 'all' ? 'active' : ''}`}
                onClick={() => setCount('all')}
              >
                Toutes
              </button>
            </div>
          </label>

          <label className="field">
            <span>Ordre</span>
            <div className="chips">
              {ORDER_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`chip ${order === o.key ? 'active' : ''}`}
                  onClick={() => setOrder(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field switch">
            <input
              type="checkbox"
              checked={showHints}
              onChange={(e) => setShowHints(e.target.checked)}
            />
            <span>Afficher les déclencheurs (indices) avant de répondre</span>
          </label>

          <button
            type="button"
            className="primary big"
            disabled={pool.length === 0}
            onClick={startSession}
          >
            {pool.length === 0
              ? 'Aucune question ne correspond aux filtres'
              : `Démarrer l'entraînement (${
                  count === 'all' ? pool.length : Math.min(count, pool.length)
                } questions)`}
          </button>
          <p className="muted small">
            {pool.length} question(s) correspondent aux filtres. Raccourcis pendant la
            session : touches A–F pour choisir, Entrée pour valider puis passer à la
            suivante.
          </p>
        </section>
      </main>
    )
  }

  /* ---------- Summary ---------- */
  if (phase === 'summary') {
    const good = results.filter((r) => r.ok).length
    const pct = results.length ? Math.round((good / results.length) * 100) : 0
    const wrongs = results.filter((r) => !r.ok)
    return (
      <main className="screen results">
        <section className={`card score-card ${pct >= 72 ? 'pass' : 'fail'}`}>
          <span className="score-badge">{pct >= 72 ? 'BIEN JOUÉ' : 'À RETRAVAILLER'}</span>
          <div className="score-number">
            {pct}<span>%</span>
          </div>
          <div className="score-meta">
            <span>✅ {good} correcte(s)</span>
            <span>❌ {results.length - good} ratée(s)</span>
            <span>{results.length} répondues</span>
          </div>
          <div className="actions">
            {wrongs.length > 0 && (
              <button type="button" className="primary" onClick={replayErrors}>
                🔁 Rejouer mes {wrongs.length} erreur(s)
              </button>
            )}
            <button type="button" className="ghost" onClick={startSession}>
              Nouvelle session
            </button>
            <button type="button" className="ghost" onClick={() => setPhase('config')}>
              Paramètres
            </button>
          </div>
        </section>

        {wrongs.length > 0 && (
          <section className="card">
            <h2>Questions ratées</h2>
            <ul className="review-list">
              {wrongs.map(({ q: wq, selected: sel }) => (
                <li key={wq.id} className="review-item ko">
                  <div className="review-q">
                    <span className="tag ko">✗</span>
                    <div>
                      <RichText text={wq.question} />
                    </div>
                  </div>
                  <p className="muted small">
                    Ta réponse : {sel.join(', ') || '—'} · Bonne réponse :{' '}
                    <strong>{parseLetters(wq.answer).join(', ')}</strong>
                  </p>
                  {wq.radar?.signal && <p className="signal">🧭 {wq.radar.signal}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    )
  }

  /* ---------- Run ---------- */
  const themeKey = dominantTheme(q)
  const answered = results.length
  const goodSoFar = results.filter((r) => r.ok).length

  return (
    <main className="screen training">
      <div className="training-main">
        <div className="exam-head">
          <span className="qnum">
            Question {index + 1} / {session.length}
            {' · '}
            <span className="ok-count">✅ {goodSoFar}</span>{' '}
            <span className="ko-count">❌ {answered - goodSoFar}</span>
          </span>
          <button type="button" className="ghost small-btn" onClick={() => setPhase('summary')}>
            Terminer
          </button>
        </div>
        <div className="session-progress">
          <i style={{ width: `${(index / session.length) * 100}%` }} />
        </div>

        <div className="card question-card">
          <div className="badges-row">
            {themeKey && <span className="theme-badge">{THEME_LABELS[themeKey]}</span>}
            <span className="theme-badge id-badge">#{q.id}</span>
            {multi && (
              <span className="theme-badge multi-badge">
                {correctLetters.length} réponses attendues
              </span>
            )}
          </div>

          {showHints && q.radar?.declencheurs?.length > 0 && (
            <div className="hintbox">
              <span className="hint-title">🎯 Déclencheurs à repérer :</span>
              {q.radar.declencheurs.map((d) => (
                <span key={d} className="trigger-chip">{d}</span>
              ))}
            </div>
          )}

          <div className="question-text"><RichText text={q.question} /></div>

          <ul className="options">
            {Object.keys(q.options).map((k) => {
              const active = selected.includes(k)
              const isGood = correctLetters.includes(k)
              const cls = revealed
                ? isGood
                  ? 'reveal-correct'
                  : active
                    ? 'reveal-wrong'
                    : 'reveal-dim'
                : active
                  ? 'selected'
                  : ''
              const piege = revealed && !isGood ? q.radar?.pieges?.[k] : null
              return (
                <li key={k}>
                  <button
                    type="button"
                    className={`option ${cls}`}
                    onClick={() => choose(k)}
                    disabled={revealed}
                  >
                    <span className="opt-key">
                      {revealed
                        ? isGood ? '✓' : active ? '✗' : '·'
                        : multi ? (active ? '☑' : '☐') : (active ? '●' : '○')}{' '}
                      {k}
                    </span>
                    <span className="opt-text">
                      <RichText text={q.options[k]} />
                      {piege && <span className="piege">⚠️ {piege}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {!revealed && (
            <button
              type="button"
              className="primary big"
              disabled={selected.length === 0}
              onClick={validate}
            >
              Valider {multi && selected.length !== correctLetters.length
                ? `(${selected.length}/${correctLetters.length} sélectionnées)`
                : ''}
            </button>
          )}
        </div>

        {revealed && (
          <div className={`card feedback ${lastResult?.ok ? 'good' : 'bad'}`}>
            <div className="feedback-head">
              {lastResult?.ok
                ? '✅ Correct !'
                : `❌ Incorrect — bonne réponse : ${correctLetters.join(', ')}`}
            </div>

            {q.radar?.signal && (
              <p className="signal">🧭 <strong>Signal :</strong> {q.radar.signal}</p>
            )}

            {!showHints && q.radar?.declencheurs?.length > 0 && (
              <div className="hintbox in-feedback">
                <span className="hint-title">🎯 Déclencheurs :</span>
                {q.radar.declencheurs.map((d) => (
                  <span key={d} className="trigger-chip">{d}</span>
                ))}
              </div>
            )}

            <p className="explication">{q.explication}</p>

            {q.radar?.scores && (
              <div className="radar-scores">
                {THEMES.map((t) => {
                  const v = q.radar.scores[t.key] ?? 0
                  return (
                    <div key={t.key} className="radar-row">
                      <span className="radar-label">{t.label}</span>
                      <span className="radar-track"><i style={{ width: `${v * 20}%` }} /></span>
                      <span className="radar-val">{v}/5</span>
                    </div>
                  )
                })}
              </div>
            )}

            <button type="button" className="primary big" onClick={next}>
              {index + 1 >= session.length ? 'Voir le bilan' : 'Question suivante →'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
