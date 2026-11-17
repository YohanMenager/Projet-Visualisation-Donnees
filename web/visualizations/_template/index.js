// GABARIT : copier ce dossier vers web/visualizations/<mon-id>/ puis ajouter une ligne dans web/js/registry.js.
export default {
  id: 'mon-id',                          // identique à l'id mis dans registry.js
  title: 'Titre affiché dans le menu',
  mount(root, { d3, store, on }) {
    // store.rows   : lignes du dataset (nombres déjà convertis, chaque ligne a un champ __id)
    // store.schema : { numeric: [...], categorical: [...] }
    const draw = () => {
      d3.select(root).html('');
      d3.select(root).append('p')
        .text(`${store.rows.length} lignes ; colonnes numériques : ${store.schema.numeric.join(', ')}`);
      // ... votre visualisation D3 ici ...
    };
    on('data', draw);                    // le dataset a changé (import d'un autre fichier)
    on('selection', (ids, source) => {}); // optionnel : sélection venant d'une autre vue (Set d'__id ou null)
    // Pour émettre une sélection : store.setSelection(new Set([...ids]), 'mon-id')
    if (store.rows.length) draw();
  },
};
