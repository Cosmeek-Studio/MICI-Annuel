/* Données par édition : DA des écrans du plateau + contenus des panneaux.
   Seule l'édition 2026 reprend la DA réelle du plateau (photos de référence).
   Les intervenants, résumés et trailers sont des contenus provisoires à remplacer. */

const speakers = (n) => Array.from({ length: n }, (_, i) => ({
  name: `Intervenant·e ${i + 1}`,
  role: 'Hépato-gastroentérologue — à confirmer',
}));

export const EDITIONS = {
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
    theme: 'Regards croisés',
    lectern: ['Regards', 'croisés'],
    date: '2025', time: 'En replay',
    teamA: { label: 'Équipe', tag: '#1', color: '#35d6c0', speakers: speakers(3) },
    teamB: { label: 'Équipe', tag: '#2', color: '#bfff4d', speakers: speakers(3) },
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
    trailer: '', // URL .mp4 ou lien d'intégration YouTube/Vimeo
    summary: 'Diagnostic, suivi, décision thérapeutique : l’intelligence artificielle s’invite dans la prise en charge des MICI. Deux équipes d’experts confrontent leurs arguments en plateau, pendant que les professionnels de santé participent en ligne et adressent leurs questions aux intervenants.',
  },
};

export const DEFAULT_EDITION = 2026;
