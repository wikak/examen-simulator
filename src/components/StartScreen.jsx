import { useRef, useState } from 'react'
import { EXAM, normalizeBank } from '../lib/exam.js'
import { domainClass } from '../lib/certs.js'

const COUNT_OPTIONS = [10, 20, 50, 65]

export default function StartScreen({ cert, bank, setBank, settings, onStart }) {
  const [count, setCount] = useState(settings.count)
  const [timed, setTimed] = useState(settings.timed)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState('')
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const norm = normalizeBank(parsed)
        setBank(norm)
        setLoaded(`${norm.length} questions chargées depuis ${file.name}`)
        setError('')
      } catch (err) {
        setError('JSON invalide : ' + err.message)
        setLoaded('')
      }
    }
    reader.readAsText(file)
  }

  const maxCount = Math.min(count, bank.length)

  return (
    <main className="screen">
      <section className="card">
        <h2>Format de l'examen {cert.code}</h2>
        <ul className="facts">
          <li><strong>{EXAM.TOTAL_QUESTIONS} questions</strong> — {EXAM.SCORED_QUESTIONS} comptabilisées + {EXAM.UNSCORED_QUESTIONS} non notées</li>
          <li><strong>Durée :</strong> {EXAM.TIME_MINUTES} minutes (~2 min/question)</li>
          <li><strong>Score :</strong> échelle {EXAM.MIN_SCORE}–{EXAM.MAX_SCORE}, réussite à <strong>{EXAM.PASS_SCORE}</strong></li>
          <li><strong>Expérience recommandée :</strong> {cert.experience}</li>
          {cert.note && <li className="muted small">ℹ️ {cert.note}</li>}
        </ul>

        <h3>Répartition par domaine <span className="muted">(indicatif — non utilisé pour la notation)</span></h3>
        <table className="domains">
          <tbody>
            {cert.domains.map((d) => (
              <tr key={d.name}>
                <td><span className={`dom-dot ${domainClass(d.name)}`} />{d.name}</td>
                <td className="weight">
                  <span className="bar" style={{ width: `${d.weight * 2.5}px` }} />
                  {d.weight}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Configurer la session</h2>

        <label className="field">
          <span>Nombre de questions</span>
          <div className="chips">
            {COUNT_OPTIONS.map((c) => (
              <button
                key={c}
                className={`chip ${count === c ? 'active' : ''}`}
                onClick={() => setCount(c)}
                type="button"
              >
                {c}
              </button>
            ))}
            <button
              className={`chip ${count === bank.length ? 'active' : ''}`}
              onClick={() => setCount(bank.length)}
              type="button"
            >
              Toutes ({bank.length})
            </button>
          </div>
        </label>

        <label className="field switch">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          <span>Mode chronométré</span>
        </label>

        <label className="field">
          <span>Charger votre propre banque de questions (JSON)</span>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} />
          <small className="muted">
            Format attendu : tableau d'objets {'{ id, question, options: { A, B, C, D }, answer: "C" }'}
          </small>
        </label>

        {loaded && <p className="ok">✓ {loaded}</p>}
        {error && <p className="err">✗ {error}</p>}

        <button
          className="primary big"
          type="button"
          disabled={bank.length === 0}
          onClick={() => onStart({ count: maxCount, timed })}
        >
          Démarrer l'examen ({maxCount} questions)
        </button>
        <p className="muted small">
          Banque actuelle : {bank.length} questions.
          {maxCount >= EXAM.TOTAL_QUESTIONS
            ? ` ${EXAM.SCORED_QUESTIONS} seront notées (comme à l'examen réel).`
            : ' Toutes les questions seront notées.'}
        </p>
      </section>
    </main>
  )
}
