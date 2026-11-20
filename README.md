# Projet-Visualisation-Donnees# Projet – Analyse et visualisation de données

## Présentation du projet  

Le projet porte sur la transformation d'un jeu de données de réponses à une enquête sur l’usage d’outils d’intelligence artificielle en un tableau de bord interactif. Les 300 lignes du fichier source décrivent notamment le profil des répondants (type d’utilisateur, pays, niveau d’études), l’outil et l’objectif d’utilisation, le temps d’usage quotidien, le gain de temps hebdomadaire, la précision perçue et la satisfaction. Le nettoyage et la transformation des données a permis de produire une version CSV de la dataset plus propre et utilisée par l’application.

Le tableau de bord permet de comparer les outils et les objectifs, d’examiner la satisfaction et les habitudes d’utilisation, puis de croiser les résultats avec le pays et le niveau d’études. Des filtres coordonnés, des indicateurs synthétiques, des infobulles et des détails accessibles au clic soutiennent l’exploration. Les vues répondent à des questions descriptives sur les répondants observés : elles ne démontrent pas, à elles seules, qu’un outil cause un gain de productivité, et l’échantillon ne doit pas être considéré comme représentatif sans analyse supplémentaire étant données que certaines données n'ont pas pu être justifier au regard des
informations présentes sur le site ou les données ont été récupérées. Il s'agit nottement du revenue pour lequel il n'y a aucune présicion sur le fait qu'il soit convertir en dollars pour tous les pays, ou s'il était enregsitré selon la devise de chaque pays.  

## Présentation de l'équipe
Mourichidatou BIOKOU
Yohan MÉNAGER
Nirisoa RATSIMBAZAFY

## Utilisateurs visés et besoins

### Utilisateur 1   : Etablissement universitaire et écoles (Etudiants et enseignants )
#### Problématique : Comment les étudiants utilisent-ils l'IA dans leurs études et quel impact perçoivent-ils sur leur travail ?
#### Tâches : 
   - Identifier les outils d'IA les plus utilisés par les étudiants.
   - Comparer les pratiques d'utilisation de l'IA selon le niveau d'études et le pays.
   - Identifier les objectifs pour lesquels les étudiants utilisent principalement l'IA et comparer leur niveau de satisfaction selon ces objectifs.
   - Explorer la relation entre le temps consacré à l'utilisation de l'IA et le gain de temps déclaré par les étudiants.
   - Évaluer la satisfaction des étudiants et comparer la précision perçue des différents outils d'IA.
### Utilisateurs 2 : Entreprise et RH (Professionnels et managers)
#### Problématique : Comment les professionnels intègrent-ils l'IA dans leur travail et quels bénéfices perçoivent-ils ?
#### Tâches 
   - Identifier les professions qui utilisent le plus l'IA.
   - Comparer les outils utilisés selon les professions.
   - Identifier les tâches professionnelles réalisées avec l'IA.
   - Comparer le temps gagné et la productivité perçue.
   - Analyser les dépenses mensuelles liées aux outils d'IA.
   - Identifier les professions ayant les niveaux de satisfaction les plus élevés.

### Utilisateurs 3 : Développeurs et entreprises d'outils d'IA
#### Problématique : Quels outils d'IA répondent le mieux aux attentes des utilisateurs ?
#### Tâches 
   - Identifier les outils d'IA les plus populaires.
   - Comparer les outils selon leurs usages et leurs objectifs.
   - Comparer les scores de précision perçue.
   - Identifier les outils ayant les meilleurs scores de satisfaction.
   - Identifier les outils les plus recommandés.
   - Comparer les préférences des étudiants et des professionnels.

## Pipeline de visualisation 

### Pipeline de préparation des données 

#### Step 1 — Collecte des données brutes
Importer le jeu de données initial au format CSV et conserver une copie intacte des données brutes afin de garantir la traçabilité et la reproductibilité.

#### Step 2  — Exploration des données
Analyser la structure du jeu de données, notamment ses 19 variables, les types de données, les valeurs distinctes et les valeurs manquantes, afin d'identifier d'éventuels problèmes de qualité.

#### Step 3 — Traitement des valeurs manquantes
Repérer les valeurs manquantes (`NaN`, `None`), les cellules vides et les entrées composées uniquement d'espaces, puis les remplacer par la mention « Non renseigné ».

#### Step 4 — Nettoyage et normalisation des données
Corriger les erreurs de saisie, supprimer les espaces superflus et harmoniser les valeurs, formats et unités de mesure dans l'ensemble des colonnes.

#### Step 5 — Conversion des types de données
Convertir les variables numériques et catégorielles dans les types de données appropriés afin d'assurer leur compatibilité avec les analyses statistiques et la visualisation de données.

#### Step 6 — Traduction et renommage des colonnes
Traduire les valeurs catégorielles en français et renommer les colonnes du jeu de données en suivant une convention de nommage cohérente et explicite.

#### Step 7 — Validation des données
Détecter les enregistrements en doublon, identifier les valeurs aberrantes potentielles, vérifier que les valeurs se situent dans des plages acceptables, et contrôler la cohérence globale ainsi que la fiabilité du jeu de données nettoyé.

#### Step 8 — Exportation du jeu de données nettoyé
Exporter le jeu de données final nettoyé aux formats CSV, afin de permettre la création des visualisations interactives via D3.js.

>**Résultat final** : un jeu de données propre, cohérent et prêt pour la visualisation.

> **À noter :** Le pipeline de préparation est documenté dans [`notebooks/data_cleaning.ipynb`] 

### ### Encodages visuels et techniques

L’application charge le fichier CSV nettoyé à l’aide de D3.js. Elle associe les colonnes du jeu de données aux variables utilisées dans les visualisations, puis effectue les calculs nécessaires, notamment les effectifs et les moyennes. Les graphiques sont actualisés automatiquement en fonction des filtres appliqués par l’utilisateur.

Les menus permettent de filtrer les données selon le type d’utilisateur, le niveau d’études, le pays, l’outil d’IA et l’objectif d’utilisation. Une option permet également d’exclure les répondants déclarant plus de 12 heures d’utilisation par jour. Certains éléments des graphiques sont interactifs : un clic peut appliquer un filtre ou ouvrir un panneau présentant des informations détaillées. Les quatre indicateurs principaux affichent le nombre de répondants sélectionnés, la durée moyenne d’utilisation quotidienne, le gain de temps moyen déclaré et le niveau moyen de satisfaction.

Les variables quantitatives sont principalement encodées par la **position sur un axe**, ce qui facilite leur comparaison. Les variables catégorielles sont représentées sur des axes catégoriels ou différenciées par la **couleur**. Les couleurs des outils et des objectifs sont attribuées à l’aide de palettes catégorielles D3 (*Tableau 10*) : chaque catégorie possède une couleur distincte, sans que celle-ci exprime une valeur plus ou moins élevée. Les valeurs manquantes sont représentées en gris lorsqu’elles sont présentes dans les visualisations. La carte thermique utilise une échelle séquentielle de bleus : plus la teinte est foncée, plus la valeur représentée est élevée. Enfin, les éléments sélectionnés sont mis en évidence, tandis que les éléments qui ne correspondent pas à la sélection sont atténués.

| Vue | Mapping des données vers les variables visuelles | À quoi sert la technique |
|---|---|---|
| **Bulles — évaluation des outils** | Chaque bulle représente un outil. **X** = précision perçue moyenne (sur 5) ; **Y** = satisfaction moyenne (sur 10) ; **aire de la bulle** = nombre d’utilisateurs ; **couleur** = outil. | Comparer simultanément la popularité des outils, leur précision perçue et la satisfaction des utilisateurs. La position représente deux mesures quantitatives, tandis que la taille ajoute une troisième dimension. |
| **Nuage de points — usage et gain de temps** | Chaque point représente un répondant. **X** = heures d’utilisation par jour ; **Y** = gain de temps hebdomadaire déclaré ; **couleur** = objectif d’utilisation de l’IA. Une droite de tendance et le coefficient de corrélation *r* résument la relation entre les deux variables pour les répondants sélectionnés. | Explorer une éventuelle association entre deux mesures quantitatives, observer leur dispersion et repérer des groupes ou des valeurs atypiques. Une corrélation ne signifie pas nécessairement qu’il existe un lien de causalité. |
| **Carte thermique — pays et niveaux d’études** | **Colonnes** = niveaux d’études ; **lignes** = pays ; **intensité du bleu** = effectif ou moyenne des heures d’utilisation quotidienne, selon la mesure sélectionnée ; **texte dans chaque cellule** = valeur correspondante ; gris = absence de valeur. | Repérer rapidement les cellules présentant les effectifs ou les moyennes les plus élevés et comparer les profils selon le pays et le niveau d’études. |
| **Histogramme — satisfaction** | **X** = notes de satisfaction arrondies ; **hauteur des barres** = nombre de répondants correspondant à chaque note. | Visualiser la distribution des niveaux de satisfaction, leur concentration et leur dispersion, plutôt que de se limiter à une moyenne générale. |
| **Barres horizontales — satisfaction par objectif** *(exploration détaillée)* | **Y** = objectifs d’utilisation, classés par satisfaction moyenne décroissante ; **longueur des barres** = satisfaction moyenne sur 10 ; **étiquettes** = effectif et moyenne ; **couleur** = objectif. | Comparer les niveaux moyens de satisfaction selon les objectifs d’utilisation et observer les effectifs associés à chaque catégorie. |
| **Barres horizontales — outils utilisés** *(exploration détaillée)* | **Y** = outils d’IA ; **longueur des barres** = nombre de répondants utilisant chaque outil ; **couleur** = outil ; **étiquette** = effectif. Le graphique affiche au maximum les huit outils les plus représentés dans la sélection actuelle. | Comparer la fréquence d’utilisation des différents outils et permettre à l’utilisateur de sélectionner un outil afin de filtrer les autres visualisations. |

Les quatre premiers graphiques composent la **vue globale**, qui permet d'obtenir une première lecture des données. Les deux graphiques en barres sont accessibles dans la partie **Exploration détaillée**, accompagnés d'un panneau affichant des informations complémentaires sur le répondant, l'outil ou l'objectif sélectionné. L'ensemble des visualisations partage les mêmes filtres afin de garantir la cohérence de l'exploration entre les différentes vues.

Les visualisations décrites correspondent aux graphiques présents dans l’application. Le dépôt ne précise pas la répartition des responsabilités entre les membres de l’équipe pour leur réalisation.

### Présentation du pipeline sous forme de workflow 
![alt text](image.png)

## Architechture du projet 
[data/dataset_original.csv](../data/dataset_original.csv) : données source.
[data/dataset_clean.csv](../data/dataset_clean.csv) et [data/dataset_clean.json](../data/dataset_clean.json) : sorties du nettoyage.
[notebooks/data_cleaning.ipynb](../notebooks/data_cleaning.ipynb) : fichier  d'inspection,  de préparation et d'export des données.
[scripts/data_cleaning.py](../scripts/data_cleaning.py) : fichier contenant les scripts pythons.
[web/index.html](../web/index.html), [web/js/main.js](../web/js/main.js) et [web/css/style.css](../web/css/style.css) : interface, visualisations et présentation du tableau de bord.
[/requirements.txt]: fichier fournissant les dépendances Python.


## Technologies utilisées
- Python 3.12
- Jupyter Notebook
- NumPy
- Pandas
- Matplotlib
- Seaborn

## Installation

### 1. Cloner le dépôt GitHub

```bash
git clone URL_DU_DEPOT
```

### 2. Créer un environnement virtuel

```bash
python -m venv .venv
```

### 3. Activer l'environnement virtuel

Sous Windows :

```bash
.venv\Scripts\activate
```

Sous macOS/Linux :

```bash
source .venv/bin/activate
```

### 4. Installer les dépendances

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 5. Lancer Jupyter Notebook

```bash
python -m jupyter notebook
```

### 6. Utiliser le projet

Ouvrir le notebook situé dans le dossier `notebooks/`.

**Important :** sélectionner le kernel Python correspondant à l'environnement `.venv`.

