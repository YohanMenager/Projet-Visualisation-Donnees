import { createStore, loadUrl, loadFile } from './core.js';
import { REGISTRY } from './registry.js';

const store = createStore();
const stage = d3.select('#stage');
const status = d3.select('#status');
let currentId = null;

// Monte une visualisation. Une visualisation cassée n'empêche pas les autres de fonctionner.
async function show(entry) {
  if (currentId) for (const t of ['data', 'selection']) store.bus.on(`${t}.${currentId}`, null);
  currentId = entry.id;
  location.hash = entry.id;
  d3.selectAll('#nav button').classed('active', d => d.id === entry.id);
  stage.html('');
  try {
    const { default: viz } = await import(entry.path);
    viz.mount(stage.node(), { d3, store, on: (type, fn) => store.bus.on(`${type}.${entry.id}`, fn) });
  } catch (e) {
    console.error(e);
    stage.append('p').attr('class', 'error').text(`Impossible de charger « ${entry.title} » : ${e.message}`);
  }
}

function useData(raw, label) {
  store.setData(raw);
  status.text(`${label} : ${store.rows.length} lignes, ${store.schema.numeric.length} variables numériques`);
}

d3.select('#nav').selectAll('button').data(REGISTRY).join('button')
  .text(d => d.title).on('click', (_, d) => show(d));

d3.select('#file').on('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try { useData(await loadFile(f), f.name); }
  catch (err) { status.text(`Fichier illisible : ${err.message}`); }
});

try { useData(await loadUrl('data/dataset_clean.json'), 'dataset_clean.json'); }
catch (e) { status.text(`Données introuvables : ${e.message}`); }

show(REGISTRY.find(v => v.id === location.hash.slice(1)) ?? REGISTRY[0]);
