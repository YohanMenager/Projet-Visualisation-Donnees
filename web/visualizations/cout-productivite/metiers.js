// La colonne "Profession" est du texte libre multilingue : on la regroupe en familles de métiers.
// L'ordre des règles compte (la première qui correspond gagne).
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const RULES = [
  ['Administratif / saisie', /administrativ|data entry|saisie/],
  ['Développement logiciel', /developer|developpeur|desenvolv|entwickl|engineer|engenheiro|full stack|web dev/],
  ['Support client', /customer|support|atendimento|kunden|client/],
  ['Data / analyse', /data|dados|daten|analyst|analyste|analista|business intelligence/],
  ['Recherche', /research|pesquisa|scientist|academic/],
  ['Contenu / marketing', /content|conteudo|contenu|writer|marketing|social media|multimedia|communications/],
];

export function metier(profession) {
  const s = norm(profession);
  if (!s || s === 'non renseigne') return 'Non renseigné';
  return RULES.find(([, re]) => re.test(s))?.[0] ?? 'Autre';
}
