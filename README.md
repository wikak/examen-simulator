# AWS Exam Simulator (React)

Simulateur d'examen pour deux certifications, sélectionnables en haut de l'écran :

- **AWS Certified Machine Learning Engineer – Associate (MLA-C02)** — banque `src/data/questions_mla_c02.json` (examen + entraînement)
- **AWS Certified Solutions Architect – Associate (SAA-C03)** — banques `src/data/questions.json` (examen) et `src/data/resultat_enrichi_final.json` (entraînement)

La progression d'entraînement est enregistrée séparément pour chaque certification.

## Démarrer

```bash
cd aws-exam-simulator
npm install
npm run dev
```

Puis ouvrir l'URL affichée (par défaut http://localhost:5173).

## Fonctionnalités

- **Format réel simulé** : 65 questions (50 notées + 15 non notées), 130 min, score sur une échelle **100–1000**, réussite à **720**.
- Sessions configurables : 10 / 20 / 50 / 65 / toutes les questions, mode chronométré on/off.
- Une question à la fois, navigateur de questions, marquage (flag), QCM simple **et** multiple (`answer: "B, C"`).
- **Évaluation** : score mis à l'échelle, RÉUSSI/ÉCHOUÉ, précision globale, temps utilisé, et **correction détaillée** (bonne réponse vs votre choix).
- Les catégories/domaines sont affichées à titre indicatif mais **ne servent pas à la notation**.

## Charger votre propre banque de questions

Sur l'écran d'accueil, bouton « Charger votre propre banque de questions (JSON) ».
Format attendu (tableau) :

```json
[
  {
    "id": 41,
    "question": "A solutions architect needs to host a high performance computing (HPC) workload ...",
    "options": {
      "A": "Use Amazon Elastic File System (Amazon EFS) ...",
      "B": "Mount an Amazon S3 bucket ...",
      "C": "Use Amazon FSx for Lustre ...",
      "D": "Configure AWS Resource Access Manager ..."
    },
    "answer": "C"
  }
]
```

- `answer` accepte une lettre (`"C"`) ou plusieurs (`"B, C"`) pour les questions « Choose two/three ».
- Une banque de **885 questions** SAA-C03 (extraites de `resultat_extraction.txt`) est incluse dans `src/data/questions.json`, et une banque de **358 questions** MLA-C02 dans `src/data/questions_mla_c02.json`.
- Le champ optionnel `domain` affiche un badge de domaine coloré.

## Notation

Le score affiché est une approximation : `score = 100 + 900 × (bonnes_réponses_notées / nombre_notées)`, réussite à 720.
Le barème exact d'AWS (scaled scoring) n'est pas public.
