/* Données par édition : DA des écrans du plateau + contenus des panneaux.
   Les éditions 2025 et 2026 reprennent la DA réelle du plateau ; 2022 à 2024 sont provisoires.
   Les intervenants, résumés et trailers sont des contenus provisoires à remplacer. */

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
    trailer: '',
    summary: 'Résumé de l’édition 2022 à renseigner.',
  },
  2023: {
    year: 2023,
    theme: 'Le premier débat',
    lectern: ['Le premier', 'débat'],
    date: '2023', time: 'En replay',
    teamA: { label: 'Équipe', tag: '#1', color: '#8f7bff', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2', color: '#ffb066', speakers: speakers(3) },
    trailer: '',
    summary: 'Résumé de l’édition 2023 à renseigner.',
  },
  2024: {
    year: 2024,
    theme: 'L’édition sportive',
    lectern: ['L’édition', 'sportive'],
    date: '2024', time: 'En replay',
    teamA: { label: 'Équipe', tag: '#1', color: '#a78bfa', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2', color: '#ff9958', speakers: speakers(3) },
    trailer: '',
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
    trailer: '',
    summary: 'Résumé de l’édition 2025 à renseigner.',
  },
  2026: {
    year: 2026,
    theme: 'L’IA au cœur des débats',
    lectern: ['Quand l’IA', 'fait débat'],
    date: '30 juin 2026', time: '18h30 – 21h00',
    teamA: { label: 'Équipe', tag: '#1.1', color: '#4fb9ea', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2.2', color: '#f4573b', speakers: speakers(3) },
    art: { monitor: 'editions/2026/monitor.webp' }, // télé au centre des pupitres d'équipe
    trailer: '', // URL .mp4 ou lien d'intégration YouTube/Vimeo
    summary: 'Diagnostic, suivi, décision thérapeutique : l’intelligence artificielle s’invite dans la prise en charge des MICI. Deux équipes d’experts confrontent leurs arguments en plateau, pendant que les professionnels de santé participent en ligne et adressent leurs questions aux intervenants.',
  },
};

export const DEFAULT_EDITION = 2026;
