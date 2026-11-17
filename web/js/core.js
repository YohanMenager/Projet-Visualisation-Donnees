// Noyau commun : données partagées + sélection partagée entre les visualisations.
// d3 est chargé globalement (balise <script> dans index.html).

const MISSING = new Set(['', 'non renseigné', 'na', 'n/a', 'nan', 'null']);
const isMissing = v => v == null || MISSING.has(String(v).trim().toLowerCase());

// Détecte les types de colonnes, convertit les nombres, ajoute des colonnes dérivées.
export function prepare(raw) {
  const cols = raw.columns ?? Object.keys(raw[0] ?? {});
  const idKey = cols.find(c => /^(user_)?id$/i.test(c)) ?? null;
  const numeric = [], categorical = [];
  for (const c of cols) {
    if (c === idKey) continue;
    const vals = raw.map(r => r[c]).filter(v => !isMissing(v));
    const nums = vals.filter(v => Number.isFinite(+v));
    if (vals.length && nums.length / vals.length >= 0.9) numeric.push(c);
    else if (new Set(vals).size <= 25) categorical.push(c);
  }
  const rows = raw.map((r, i) => {
    const o = { ...r, __id: idKey ? String(r[idKey]) : String(i) };
    numeric.forEach(c => { o[c] = isMissing(r[c]) ? null : +r[c]; });
    categorical.forEach(c => { o[c] = isMissing(r[c]) ? 'Non renseigné' : String(r[c]); });
    return o;
  });
  // Enrichissement (seulement si les colonnes existent dans le dataset)
  if (cols.includes('Coût mensuel')) {
    rows.forEach(o => { o['Formule'] = o['Coût mensuel'] > 0 ? 'Payant' : 'Gratuit'; });
    categorical.push('Formule');
  }
  if (cols.includes('Score de productivité') && cols.includes('Utilisation par jour')) {
    rows.forEach(o => {
      const h = o['Utilisation par jour'], s = o['Score de productivité'];
      o['Productivité par heure'] = h > 0 && s != null ? s / h : null;
    });
    numeric.push('Productivité par heure');
  }
  return { rows, schema: { numeric, categorical, idKey } };
}

// Store partagé. Événements : 'data' (dataset changé), 'selection' (ids sélectionnés ou null).
export function createStore() {
  const bus = d3.dispatch('data', 'selection');
  const store = {
    bus, rows: [], schema: { numeric: [], categorical: [] }, selection: null,
    setData(raw) {
      const p = prepare(raw);
      Object.assign(store, { rows: p.rows, schema: p.schema, selection: null });
      bus.call('data', null, store);
    },
    setSelection(ids, source) {
      store.selection = ids;
      bus.call('selection', null, ids, source);
    },
  };
  return store;
}

const parse = (text, name) =>
  /\.json$/i.test(name) ? JSON.parse(text) : d3.csvParse(text.replace(/^\uFEFF/, ''));
export const loadUrl = async url => parse(await (await fetch(url)).text(), url);
export const loadFile = async file => parse(await file.text(), file.name);
