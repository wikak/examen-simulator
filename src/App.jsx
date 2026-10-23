import { useEffect, useState } from 'react'
import StartScreen from './components/StartScreen.jsx'
import ExamScreen from './components/ExamScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import TrainingScreen from './components/TrainingScreen.jsx'
import { buildExam, evaluate, EXAM } from './lib/exam.js'
import { CERTS, loadCert, saveCert } from './lib/certs.js'

export default function App() {
  const [cert, setCert] = useState(loadCert)
  const [mode, setMode] = useState('training') // training | exam
  const [phase, setPhase] = useState('start') // start | exam | results
  const [bank, setBank] = useState(() => cert.examBank)
  const [settings, setSettings] = useState({ count: 65, timed: true, domain: 'all' })
  const [exam, setExam] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    document.title = `AWS ${cert.code} — Exam Simulator`
  }, [cert])

  function startExam(opts) {
    const cfg = { ...settings, ...opts }
    setSettings(cfg)
    const pool = cfg.domain && cfg.domain !== 'all' ? bank.filter((q) => q.domain === cfg.domain) : bank
    const count = Math.min(cfg.count, pool.length)
    setExam(buildExam(pool, count))
    setResult(null)
    setPhase('exam')
  }

  function finishExam(answers, timeUsed) {
    setResult({ ...evaluate(exam, answers), answers, timeUsed })
    setPhase('results')
    window.scrollTo(0, 0)
  }

  function switchMode(m) {
    if (m === mode) return
    if (phase === 'exam' && !window.confirm('Quitter la simulation en cours ?')) return
    setMode(m)
    setPhase('start')
    window.scrollTo(0, 0)
  }

  function switchCert(c) {
    if (c.key === cert.key) return
    if (mode === 'exam' && phase === 'exam' && !window.confirm('Quitter la simulation en cours ?')) return
    saveCert(c)
    setCert(c)
    setBank(c.examBank)
    setSettings((s) => ({ ...s, domain: 'all' }))
    setExam([])
    setResult(null)
    setPhase('start')
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">AWS</span>
        <div className="topbar-title">
          <h1>{cert.title} ({cert.code})</h1>
          <p className="subtitle">Exam Simulator</p>
        </div>
        <div className="cert-switch" role="group" aria-label="Certification">
          {CERTS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`cert-btn ${c.key === cert.key ? 'active' : ''}`}
              aria-pressed={c.key === cert.key}
              onClick={() => switchCert(c)}
            >
              {c.code}
            </button>
          ))}
        </div>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={`tab ${mode === 'training' ? 'active' : ''}`}
          onClick={() => switchMode('training')}
        >
          🧪 Entraînement
        </button>
        <button
          type="button"
          className={`tab ${mode === 'exam' ? 'active' : ''}`}
          onClick={() => switchMode('exam')}
        >
          🎯 Simulation d'examen
        </button>
      </nav>

      {mode === 'training' && <TrainingScreen key={cert.key} cert={cert} />}

      {mode === 'exam' && phase === 'start' && (
        <StartScreen
          key={cert.key}
          cert={cert}
          bank={bank}
          setBank={setBank}
          settings={settings}
          onStart={startExam}
        />
      )}

      {mode === 'exam' && phase === 'exam' && (
        <ExamScreen
          exam={exam}
          timed={settings.timed}
          timeLimit={exam.length * EXAM.SECONDS_PER_QUESTION}
          onSubmit={finishExam}
          onQuit={() => setPhase('start')}
        />
      )}

      {mode === 'exam' && phase === 'results' && (
        <ResultsScreen
          result={result}
          onRestart={() => setPhase('start')}
          onRetry={() => startExam({})}
        />
      )}

      <footer className="footer">
        Outil d'entraînement non officiel · Score simulé (échelle 100–1000, réussite à {EXAM.PASS_SCORE}).
      </footer>
    </div>
  )
}
