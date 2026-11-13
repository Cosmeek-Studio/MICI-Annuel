/* Données par édition : DA des écrans du plateau + contenus des panneaux.
   Les éditions 2025 et 2026 reprennent la DA réelle du plateau ; 2022 à 2024 sont provisoires.
   Les intervenants (sauf 2026), résumés et teasers sont des contenus provisoires à remplacer. */

const speakers = (n) => Array.from({ length: n }, (_, i) => ({
  name: `Intervenant·e ${i + 1}`,
  role: 'Hépato-gastroentérologue — à confirmer',
}));

export const EDITIONS = {
  2022: {
    year: 2022,
    theme: 'Le lancement du MICI Challenge',
    lectern: ['Le', 'lancement'],
    date: '2022', time: 'En replay',
    teamA: { label: 'Équipe', tag: '#1', color: '#9b7bff', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2', color: '#ffc46b', speakers: speakers(3) },
    teaser: '',
    summary: 'Résumé de l’édition 2022 à renseigner.',
  },
  2023: {
    year: 2023,
    theme: 'Le premier débat',
    lectern: ['Le premier', 'débat'],
    date: '2023', time: 'En replay',
    teamA: { label: 'Équipe', tag: '#1', color: '#8f7bff', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2', color: '#ffb066', speakers: speakers(3) },
    teaser: '',
    summary: 'Résumé de l’édition 2023 à renseigner.',
  },
  2024: {
    year: 2024,
    theme: 'L’édition sportive',
    lectern: ['L’édition', 'sportive'],
    date: '2024', time: 'En replay',
    teamA: { label: 'Équipe', tag: '#1', color: '#a78bfa', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2', color: '#ff9958', speakers: speakers(3) },
    teaser: '',
    summary: 'Résumé de l’édition 2024 à renseigner.',
  },
  2025: {
    year: 2025,
    theme: 'Quand la tradition croise la modernité',
    lectern: ['Tradition', '× modernité'],
    date: '2025', time: 'En replay',
    teamA: { label: 'Tradition', tag: '', color: '#ff8066', speakers: speakers(3) },
    teamB: { label: 'Modernité', tag: '', color: '#58c5e3', speakers: speakers(3) },
    // décor à façades imprimées + visuels fournis (public/assets/…)
    set: 'printed',
    leds: { right: 'B' }, // côté gauche aux couleurs de l'équipe A, côté droit de l'équipe B
    art: {
      wall: 'editions/2025/wall.webp', tvA: 'editions/2025/tv-a.webp', tvB: 'editions/2025/tv-b.webp',
      deskA: 'editions/2025/desk-a.webp', deskB: 'editions/2025/desk-b.webp', lectern: 'editions/2025/lectern.webp',
      monitor: 'editions/2025/monitor.webp', // télé au centre des pupitres d'équipe
    },
    teaser: '',
    summary: 'Résumé de l’édition 2025 à renseigner.',
  },
  2026: {
    year: 2026,
    theme: 'L’IA au cœur des débats',
    lectern: ['Quand l’IA', 'fait débat'],
    date: '30 juin 2026', time: '18h30 – 21h00',
    // Équipes réelles (Figma « Equipe », nœud 2151:1218) : portraits dans public/assets/editions/2026/speakers/
    teamA: {
      label: 'Équipe', tag: '#1.1', color: '#4fb9ea',
      speakers: [
        { name: 'Pr. Vuitton', role: 'Gastro-entérologue', city: 'Besançon', photo: 'editions/2026/speakers/vuitton.webp' },
        { name: 'Pr. Laharie', role: 'Gastro-entérologue', city: 'Bordeaux', photo: 'editions/2026/speakers/laharie.webp' },
        { name: 'Pr. Boschetti', role: 'Gastro-entérologue', city: 'Lyon', photo: 'editions/2026/speakers/boschetti.webp' },
        { name: 'Pr. Buisson', role: 'Gastro-entérologue', city: 'Clermont-Ferrand', photo: 'editions/2026/speakers/buisson.webp' },
      ],
    },
    teamB: {
      label: 'Équipe', tag: '#2.2', color: '#f4573b',
      speakers: [
        { name: 'Pr. Bouhnik', role: 'Gastro-entérologue', city: 'Neuilly-sur-Seine', photo: 'editions/2026/speakers/bouhnik.webp' },
        { name: 'Pr. Roblin', role: 'Gastro-entérologue', city: 'Saint-Etienne', photo: 'editions/2026/speakers/roblin.webp' },
        { name: 'Pr. Fumery', role: 'Gastro-entérologue', city: 'Amiens', photo: 'editions/2026/speakers/fumery.webp' },
        { name: 'Dr. Nachury', role: 'Gastro-entérologue', city: 'Lille', photo: 'editions/2026/speakers/nachury.webp' },
      ],
    },
    art: { monitor: 'editions/2026/monitor.webp' }, // télé au centre des pupitres d'équipe
    teaser: '', // URL .mp4 ou lien d'intégration YouTube/Vimeo
    summary: 'Diagnostic, suivi, décision thérapeutique : l’intelligence artificielle s’invite dans la prise en charge des MICI. Deux équipes d’experts ont confronté leurs arguments en plateau sur quatre questions, pendant que les professionnels de santé votaient en ligne et interpellaient les intervenants. Fil rouge de la soirée : l’IA ne remplace pas le gastroentérologue, elle change sa façon de travailler.',
    // Rappel des débats : question posée en plateau et ce que la soirée en a retenu (contenus provisoires).
    debates: [
      {
        q: 'L’IA, est-ce un partenaire incontournable du diagnostic et du suivi des patients ?',
        a: 'Consensus sur son intérêt pour croiser biologie, imagerie et données remontées par les patients, et repérer plus tôt une rechute. « Incontournable » reste à démontrer : les outils doivent encore faire leurs preuves en vie réelle.',
      },
      {
        q: 'Peut-on faire confiance à l’IA pour guider le diagnostic endoscopique et histologique ?',
        a: 'Les scores automatisés d’activité séduisent par leur reproductibilité d’un centre à l’autre. La salle retient une confiance sous conditions : des algorithmes validés et explicables, et un compte rendu toujours signé par un médecin.',
      },
      {
        q: 'L’IA, est-ce un assistant indispensable dans la pratique quotidienne du gastroentérologue ?',
        a: 'Synthèse des dossiers, préparation des consultations, rédaction des comptes rendus : l’argument du temps rendu au patient a porté. Restent l’intégration aux logiciels existants, la formation des équipes et la protection des données de santé.',
      },
      {
        q: 'IA et choix thérapeutique : complément ou concurrence au médecin ?',
        a: 'Verdict quasi unanime pour le complément. L’IA peut aider à anticiper la réponse à un traitement, mais la décision se construit avec le patient, en tenant compte de son histoire, de ses priorités et de sa qualité de vie.',
      },
    ],
  },
};

export const DEFAULT_EDITION = 2026;
