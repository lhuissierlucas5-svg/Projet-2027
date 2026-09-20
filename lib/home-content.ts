/** Shared editorial defaults and limits. No HTML or destination URLs are editable. */
export const homeFields = [
  { key: 'eyebrow', label: 'Surtitre', group: 'En-tête', max: 80, default: 'PRÉSIDENTIELLE FRANÇAISE · 2027' },
  { key: 'title', label: 'Titre principal', group: 'En-tête', max: 120, default: 'Comprendre les programmes. Éclairer votre choix.' },
  { key: 'subtitle', label: 'Sous-titre', group: 'En-tête', max: 400, default: 'Les personnalités, leurs propositions et les temps forts de la campagne présidentielle, réunis pour vous aider à comparer les idées et à remonter aux sources.' },
  { key: 'primary_label', label: 'Bouton vers les candidats', group: 'En-tête', max: 45, default: 'Explorer les candidats' },
  { key: 'secondary_label', label: 'Bouton vers le comparateur', group: 'En-tête', max: 45, default: 'Comparer les propositions' },
  { key: 'banner', label: 'Bandeau éditorial', group: 'Repères', max: 200, default: 'Des faits datés, des sources accessibles. À vous de vous faire une opinion.' },
  { key: 'figures_title', label: 'Titre des chiffres clés', group: 'Repères', max: 80, default: 'La campagne, en repères' },
  { key: 'profiles_label', label: 'Libellé du nombre de profils', group: 'Repères', max: 60, default: 'personnalités suivies' },
  { key: 'positions_label', label: 'Libellé du nombre de propositions', group: 'Repères', max: 60, default: 'propositions documentées' },
  { key: 'events_label', label: 'Libellé du nombre de rendez-vous', group: 'Repères', max: 60, default: 'rendez-vous à venir ou en cours' },
  { key: 'candidates_title', label: 'Titre de la section candidats', group: 'Rubriques', max: 100, default: 'Les personnalités et leurs idées' },
  { key: 'primaries_title', label: 'Titre de la section primaires', group: 'Rubriques', max: 100, default: 'Les étapes avant la présidentielle' },
  { key: 'primaries_description', label: 'Description de la section primaires', group: 'Rubriques', max: 250, default: 'Primaires, désignations et dates clés : comprendre comment se dessine la campagne.' },
  { key: 'methodology', label: 'Note méthodologique', group: 'Méthode', max: 1200, default: 'Les profils suivis ne constituent pas une liste officielle de candidats. Les propositions sont présentées avec leur date et leur source ; leur présence ne vaut pas approbation. Les sondages décrivent une enquête et un scénario donnés, pas un résultat électoral. Consultez les sources et la méthode avant toute comparaison.' },
] as const;
export type HomeKey = (typeof homeFields)[number]['key'];
export type HomeContent = Record<HomeKey, string>;
export const defaultHomeContent = Object.fromEntries(homeFields.map(field => [field.key, field.default])) as HomeContent;
export function readHomeContent(value: Record<string, unknown> | null | undefined): HomeContent {
  return Object.fromEntries(homeFields.map(field => {
    const text = value?.[field.key];
    return [field.key, typeof text === 'string' && text.trim() && text.length <= field.max ? text : field.default];
  })) as HomeContent;
}
export type HomeCounts = { profiles: number | null; positions: number | null; events: number | null };
