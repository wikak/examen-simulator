import { useEffect, useMemo, useState } from 'react'
import RichText from './RichText.jsx'
import { isCorrect, parseLetters } from '../lib/exam.js'
import { domainClass } from '../lib/certs.js'
import {
  THEMES,
  THEME_LABELS,
  buildTrainingSession,
  clearProgress,
  dominantTheme,
  filterBank,
  isMastered,
  loadLastSession,
  loadProgress,
  recordAnswer,
  saveLastSession,
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

const TRACK_FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'seen', label: 'Déjà vues' },
  { key: 'new', label: 'Jamais vues' },
  { key: 'wrong', label: 'Ratées' },
  { key: 'mastered', label: 'Maîtrisées' },
]
const TRACK_SORTS = [
  { key: 'id', label: 'N°' },
  { key: 'attempts', label: 'Plus vues' },
  { key: 'recent', label: 'Récentes' },
]

function formatLast(ts) {
  if (!ts) return ''
  const min = Math.round((Date.now() - ts) / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}

export default function TrainingScreen({ cert }) {
  const bank = cert.trainingBank
  const [phase, setPhase] = useState('config') // config | run | summary
  const [progress, setProgress] = useState(() => loadProgress(cert.progressKey))

  // Session settings
  const [domain, setDomain] = useState('all')
  const [theme, setTheme] = useState('all')
  const [status, setStatus] = useState('all')
  const [qtype, setQtype] = useState('all')
  const [count, setCount] = useState(20)
  const [order, setOrder] = useState('random')
  const [showHints, setShowHints] = useState(true)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')

  // Tracking view
  const [trackFilter, setTrackFilter] = useState('seen')
  const [trackSort, setTrackSort] = useState('recent')
  const [trackSearch, setTrackSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  // Running session
  const [session, setSession] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState([])
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([]) // [{ q, selected, ok }]

  const maxId = useMemo(() => bank.reduce((m, q) => Math.max(m, q.id), 0), [bank])
  const parsedFrom = rangeFrom === '' ? null : Math.max(1, parseInt(rangeFrom, 10) || 1)
  const parsedTo = rangeTo === '' ? null : Math.max(1, parseInt(rangeTo, 10) || 1)
  const cfg = { domain, theme, status, qtype, count, order, rangeFrom: parsedFrom, rangeTo: parsedTo }
  const pool = useMemo(
    () => filterBank(bank, progress, cfg),
    [bank, progress, domain, theme, status, qtype, parsedFrom, parsedTo],
  )
  const domainCounts = useMemo(() => {
    const c = {}
    for (const q of bank) if (q.domain) c[q.domain] = (c[q.domain] || 0) + 1
    return c
  }, [bank])
  const lastSeries = useMemo(() => loadLastSession(cert.lastSessionKey, bank), [bank, phase])

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

  function launch(list, { save = false } = {}) {
    if (!list || list.length === 0) return
    if (save) saveLastSession(cert.lastSessionKey, list)
    setSession(list)
    setIndex(0)
    setSelected([])
    setRevealed(false)
    setResults([])
    setPhase('run')
    window.scrollTo(0, 0)
  }

  function startSession() {
    launch(buildTrainingSession(bank, progress, cfg), { save: true })
  }

  function replaySeries() {
    launch(session)
  }

  function replayLastSeries() {
    launch(loadLastSession(cert.lastSessionKey, bank))
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
      saveProgress(cert.progressKey, next)
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
    launch(results.filter((r) => !r.ok).map((r) => r.q))
  }

  function resetProgress() {
    if (!window.confirm(`Réinitialiser toute la progression d’entraînement ${cert.code} ?`)) return
    clearProgress(cert.progressKey)
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
          <h2>🧪 Mode entraînement · {cert.code}</h2>
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
          <div className="btn-row">
            <button
              type="button"
              className="ghost small-btn"
              onClick={() => { setExpandedId(null); setPhase('tracking'); window.scrollTo(0, 0) }}
            >
              📊 Suivi des questions
            </button>
            {stats.seen > 0 && (
              <button type="button" className="ghost small-btn" onClick={resetProgress}>
                Réinitialiser la progression
              </button>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Paramètres de la session</h2>

          <label className="field">
            <span>Domaine</span>
            <div className="chips">
              <button
                type="button"
                className={`chip ${domain === 'all' ? 'active' : ''}`}
                onClick={() => setDomain('all')}
              >
                Tous les domaines
              </button>
              {cert.domains.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  title={d.name}
                  className={`chip ${domain === d.name ? 'active' : ''}`}
                  disabled={!domainCounts[d.name]}
                  onClick={() => setDomain(d.name)}
                >
                  <span className={`dom-dot ${domainClass(d.name)}`} />
                  Spécial {d.short} ({domainCounts[d.name] || 0})
                </button>
              ))}
            </div>
          </label>

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
            <span>Plage de questions <span className="muted">(n° d'identifiant, optionnel)</span></span>
            <div className="range-inputs">
              <span className="muted">De</span>
              <input
                type="number"
                min="1"
                max={maxId}
                placeholder="1"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
              <span className="muted">à</span>
              <input
                type="number"
                min="1"
                max={maxId}
                placeholder={String(maxId)}
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
              {(rangeFrom !== '' || rangeTo !== '') && (
                <button
                  type="button"
                  className="ghost small-btn"
                  onClick={() => { setRangeFrom(''); setRangeTo('') }}
                >
                  Effacer
                </button>
              )}
            </div>
            {parsedFrom != null && parsedTo != null && parsedFrom > parsedTo && (
              <small className="err">La borne « De » doit être ≤ à la borne « à ».</small>
            )}
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
          {lastSeries && (
            <button type="button" className="ghost big-ghost" onClick={replayLastSeries}>
              🔁 Rejouer la dernière série ({lastSeries.length} questions)
            </button>
          )}
          <p className="muted small">
            {pool.length} question(s) correspondent aux filtres. Raccourcis pendant la
            session : touches A–F pour choisir, Entrée pour valider puis passer à la
            suivante.
          </p>
        </section>
      </main>
    )
  }

  /* ---------- Tracking ---------- */
  if (phase === 'tracking') {
    const search = trackSearch.trim().toLowerCase()
    const matches = (q) => {
      const p = progress[q.id]
      if (trackFilter === 'seen' && !p) return false
      if (trackFilter === 'new' && p) return false
      if (trackFilter === 'wrong' && !(p && p.lastOk === false)) return false
      if (trackFilter === 'mastered' && !isMastered(p)) return false
      if (search) {
        const hay = (q.id + ' ' + q.question + ' ' + Object.values(q.options).join(' ')).toLowerCase()
        if (!hay.includes(search)) return false
      }
      return true
    }
    const list = bank.filter(matches).sort((a, b) => {
      const pa = progress[a.id]
      const pb = progress[b.id]
      if (trackSort === 'attempts') return (pb?.attempts || 0) - (pa?.attempts || 0) || a.id - b.id
      if (trackSort === 'recent') return (pb?.last || 0) - (pa?.last || 0) || a.id - b.id
      return a.id - b.id
    })
    const counts = {}
    for (const f of TRACK_FILTERS) counts[f.key] = 0
    for (const q of bank) {
      const p = progress[q.id]
      counts.all++
      if (p) counts.seen++
      else counts.new++
      if (p && p.lastOk === false) counts.wrong++
      if (isMastered(p)) counts.mastered++
    }

    return (
      <main className="screen training">
        <div className="training-main">
          <div className="exam-head">
            <h2 className="track-title">📊 Suivi des questions</h2>
            <button type="button" className="ghost small-btn" onClick={() => setPhase('config')}>
              ← Retour
            </button>
          </div>

          <div className="card">
            <div className="chips">
              {TRACK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`chip ${trackFilter === f.key ? 'active' : ''}`}
                  onClick={() => setTrackFilter(f.key)}
                >
                  {f.label} ({counts[f.key]})
                </button>
              ))}
            </div>
            <div className="track-tools">
              <input
                type="search"
                className="track-search"
                placeholder="Rechercher (mot-clé, service AWS, n°…)"
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
              />
              <div className="chips">
                {TRACK_SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`chip ${trackSort === s.key ? 'active' : ''}`}
                    onClick={() => setTrackSort(s.key)}
                  >
                    Tri : {s.label}
                  </button>
                ))}
              </div>
            </div>
            {list.length > 0 && (
              <button
                type="button"
                className="ghost big-ghost"
                onClick={() => launch(list, { save: true })}
              >
                🎓 S'entraîner sur ces {list.length} question(s)
              </button>
            )}
          </div>

          {list.length === 0 && (
            <div className="card"><p className="muted">Aucune question ne correspond.</p></div>
          )}

          <ul className="track-list">
            {list.map((tq) => {
              const p = progress[tq.id]
              const tk = dominantTheme(tq)
              const open = expandedId === tq.id
              const statusTag = isMastered(p)
                ? <span className="tag ok">maîtrisée</span>
                : p?.lastOk === false
                  ? <span className="tag ko">ratée</span>
                  : p
                    ? <span className="tag unscored">en cours</span>
                    : <span className="tag unscored">jamais vue</span>
              const correctLtrs = parseLetters(tq.answer)
              return (
                <li key={tq.id} className={`track-item ${open ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="track-row"
                    onClick={() => setExpandedId(open ? null : tq.id)}
                  >
                    <span className="track-id">#{tq.id}</span>
                    {statusTag}
                    <span className="track-text">{tq.question}</span>
                    <span className="track-meta">
                      <strong>{p?.attempts || 0}×</strong> vue{(p?.attempts || 0) > 1 ? 's' : ''}
                      {p ? ` · ✓ ${p.correct}` : ''}
                    </span>
                  </button>
                  {open && (
                    <div className="track-detail">
                      <div className="badges-row">
                        {tq.domain && <span className={`domain-badge ${domainClass(tq.domain)}`}>{tq.domain}</span>}
                        {tk && <span className="theme-badge">{THEME_LABELS[tk]}</span>}
                        {p && (
                          <span className="theme-badge">
                            {p.attempts} rencontre{p.attempts > 1 ? 's' : ''} · {p.correct} bonne{p.correct > 1 ? 's' : ''} (
                            {Math.round((p.correct / p.attempts) * 100)}%) · série : {p.streak} · {formatLast(p.last)}
                          </span>
                        )}
                      </div>
                      <div className="question-text"><RichText text={tq.question} /></div>
                      <ul className="review-opts">
                        {Object.keys(tq.options).map((k) => (
                          <li key={k} className={correctLtrs.includes(k) ? 'correct' : ''}>
                            <strong>{k}.</strong> <RichText text={tq.options[k]} />
                            {correctLtrs.includes(k) && <em className="mark">✓ bonne réponse</em>}
                          </li>
                        ))}
                      </ul>
                      {tq.radar?.signal && (
                        <p className="signal">🧭 <strong>Signal :</strong> {tq.radar.signal}</p>
                      )}
                      <p className="explication">{tq.explication}</p>
                      <button
                        type="button"
                        className="ghost small-btn"
                        onClick={() => launch([tq])}
                      >
                        🎓 S'entraîner sur cette question
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
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
            <button type="button" className="ghost" onClick={replaySeries}>
              ↻ Rejouer cette série
            </button>
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
            {q.domain && <span className={`domain-badge ${domainClass(q.domain)}`}>{q.domain}</span>}
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
