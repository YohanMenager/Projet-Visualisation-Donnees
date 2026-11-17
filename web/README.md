# Partie web (D3.js)

## Lancer en local

`fetch` et les modules JS ne marchent pas en `file://` : il faut un petit serveur.

```bash
cd web
python serve.py
```

`serve.py` est un petit serveur qui désactive le cache du navigateur : avec `python -m http.server`, le navigateur peut afficher d'anciennes versions des fichiers JS après une mise à jour (dans ce cas, recharger avec Ctrl+Maj+R).

Puis ouvrir http://localhost:8000. Pour la démo exécutable, le dossier `web/` peut être publié tel quel avec GitHub Pages.

## Ajouter une visualisation (une branche par personne)

1. Créer sa branche : `git checkout -b viz-<prenom>`
2. Copier `visualizations/_template/` vers `visualizations/<mon-id>/` (tout se passe dans ce dossier : vous pouvez y ajouter autant de fichiers que vous voulez).
3. Ajouter **une ligne** dans `js/registry.js` :
   `{ id: 'mon-id', title: 'Mon titre', path: '../visualizations/mon-id/index.js' },`
4. Fusionner dans `main`. Le seul fichier partagé est `registry.js`, et le `.gitattributes` à la racine (`merge=union`) conserve les lignes des deux branches lors d'un `git merge` en local. Si un conflit apparaît quand même (par exemple via l'interface GitHub), il suffit de garder les deux lignes.

## Ce que reçoit une visualisation

`mount(root, { d3, store, on })` :

- `store.rows` : lignes du dataset ; les colonnes numériques sont converties et les valeurs manquantes valent `null`. Chaque ligne a un champ `__id`.
- `store.schema` : `{ numeric, categorical }`, détectés automatiquement (c'est ce qui permet de changer de dataset).
- `on('data', fn)` : appelé quand un autre fichier est chargé. Redessiner dans `fn`.
- `on('selection', fn)` et `store.setSelection(ids, source)` : sélection partagée entre vues.

Colonnes ajoutées automatiquement si présentes : `Formule` (Gratuit / Payant) et `Productivité par heure`.

## Données

`web/data/dataset_clean.json` est généré par `notebooks/data_cleaning.ipynb`. Après chaque modification du nettoyage, relancer le notebook et recopier le JSON ici.
