// Supported certifications: question banks, domains and per-cert storage keys.

import mlaBank from '../data/questions_mla_c02.json'
import saaBank from '../data/questions.json'
import saaEnriched from '../data/resultat_enrichi_final.json'

// French translations, split into their own chunk (see lib/i18n.js).
const loadMlaFr = () => import('../data/fr/questions_mla_c02.fr.json')

export const CERTS = [
  {
    key: 'mla-c02',
    code: 'MLA-C02',
    title: 'Machine Learning Engineer – Associate',
    examBank: mlaBank,
    trainingBank: mlaBank,
    examFr: loadMlaFr,
    trainingFr: loadMlaFr,
    experience: "1 an d'expérience avec SageMaker AI, Amazon Bedrock et les services ML d'AWS",
    note: 'Version bêta actuelle : 85 questions en 170 min. La simulation suit le format standard du guide (50 notées + 15 non notées).',
    // Reference only (the breakdown is displayed; categories are NOT used to grade).
    domains: [
      { name: 'Data Preparation for ML and AI', short: 'Préparer les données', weight: 28 },
      { name: 'ML Model and FM Development', short: 'Développer les modèles', weight: 24 },
      { name: 'Deployment and Orchestration of ML and AI Workflows', short: 'Déployer et orchestrer', weight: 24 },
      { name: 'Operating, Monitoring, and Securing ML and AI Solutions', short: 'Surveiller et sécuriser', weight: 24 },
    ],
    progressKey: 'aws-sandbox-progress-mla-c02-v1',
    lastSessionKey: 'aws-sandbox-last-session-mla-c02-v1',
    runKey: 'aws-sandbox-run-mla-c02-v1',
    trainingSettingsKey: 'aws-sandbox-training-settings-mla-c02-v1',
  },
  {
    key: 'saa-c03',
    code: 'SAA-C03',
    title: 'Solutions Architect – Associate',
    examBank: saaBank,
    trainingBank: saaEnriched,
    experience: '1 an de pratique AWS',
    domains: [
      { name: 'Design Secure Architectures', short: 'Architectures sécurisées', weight: 30 },
      { name: 'Design Resilient Architectures', short: 'Architectures résilientes', weight: 26 },
      { name: 'Design High-Performing Architectures', short: 'Architectures performantes', weight: 24 },
      { name: 'Design Cost-Optimized Architectures', short: 'Architectures optimisées en coût', weight: 20 },
    ],
    // Keys kept from the single-cert version so existing progress is preserved.
    progressKey: 'aws-sandbox-progress-v1',
    lastSessionKey: 'aws-sandbox-last-session-v1',
    runKey: 'aws-sandbox-run-v1',
    trainingSettingsKey: 'aws-sandbox-training-settings-v1',
  },
]

export const DEFAULT_CERT = CERTS[0]

const CERT_STORAGE_KEY = 'aws-selected-cert-v1'

export function loadCert() {
  try {
    const key = localStorage.getItem(CERT_STORAGE_KEY)
    return CERTS.find((c) => c.key === key) || DEFAULT_CERT
  } catch {
    return DEFAULT_CERT
  }
}

export function saveCert(cert) {
  try {
    localStorage.setItem(CERT_STORAGE_KEY, cert.key)
  } catch {}
}

// Domain badge colour: position of the domain within its certification (dom-1..dom-4).
const DOMAIN_INDEX = new Map(
  CERTS.flatMap((c) => c.domains.map((d, i) => [d.name, i + 1])),
)

export function domainClass(domain) {
  const i = DOMAIN_INDEX.get(domain)
  return i ? `dom-${i}` : 'dom-default'
}
