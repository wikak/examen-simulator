import { useState } from 'react'
import StartScreen from './components/StartScreen.jsx'
import ExamScreen from './components/ExamScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import { buildExam, evaluate, EXAM } from './lib/exam.js'
import defaultBank from './data/questions.json'

export default function App() {
  const [phase, setPhase] = useState('start') // start | exam | results
  const [bank, setBank] = useState(defaultBank)
  const [settings, setSettings] = useState({ count: 65, timed: true })
  const [exam, setExam] = useState([])
  const [result, setResult] = useState(null)

  function startExam(opts) {
    const cfg = { ...settings, ...opts }
    setSettings(cfg)
    const count = Math.min(cfg.count, bank.length)
    setExam(buildExam(bank, count))
    setResult(null)
    setPhase('exam')
  }

  function finishExam(answers, timeUsed) {
    setResult({ ...evaluate(exam, answers), answers, timeUsed })
    setPhase('results')
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">AWS</span>
        <div>
          <h1>Solutions Architect Associate (SAA-C03)</h1>
          <p className="subtitle">Exam Simulator</p>
        </div>
      </header>

      {phase === 'start' && (
        <StartScreen
          bank={bank}
          setBank={setBank}
          settings={settings}
          onStart={startExam}
        />
      )}

      {phase === 'exam' && (
        <ExamScreen
          exam={exam}
          timed={settings.timed}
          timeLimit={exam.length * EXAM.SECONDS_PER_QUESTION}
          onSubmit={finishExam}
          onQuit={() => setPhase('start')}
        />
      )}

      {phase === 'results' && (
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
