
# 1. IMPORTATION DES BIBLIOTHÈQUES

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from pathlib import Path

# 2. CHARGEMENT DU DATASET ORIGINAL

# Chemin vers le fichier original
file_path = Path("../data/dataset_original.csv")

# Chargement du dataset
df = pd.read_csv(file_path)

# Afficher les dimensions du dataset
print("Nombre de lignes :", df.shape[0])
print("Nombre de colonnes :", df.shape[1])

# Afficher les premières lignes
print(df.head())


# 3. ANALYSE EXPLORATOIRE DES DONNÉES

# Afficher les noms des colonnes
print(df.columns.tolist())

# Informations générales sur le dataset
df.info()

# Statistiques descriptives
print(df.describe(include="all").T)

# Examiner les modalités de chaque variable
for column in df.columns:

    print("\n" + "=" * 60)
    print(f"COLONNE : {column}")
    print("=" * 60)

    # Compter toutes les modalités, y compris les valeurs manquantes
    counts = df[column].value_counts(dropna=False)

    # Afficher toutes les modalités
    print(counts.to_string())

    # Afficher les totaux
    print("\nNombre de modalités différentes :", len(counts))
    print("Total des occurrences :", counts.sum())
    print("Nombre total de lignes du dataset :", len(df))


# 4. NETTOYAGE DES DONNÉES

# 4.1. Nettoyage des erreurs de saisie

df["Age"] = (
    df["Age"].astype("string")
    .str.replace(" yrs", "", regex=False)
    .str.strip()
)

df["AI_Usage_Hours_Per_Day"] = (
    df["AI_Usage_Hours_Per_Day"].astype("string")
    .str.replace(" hrs", "", regex=False)
    .str.strip()
)

df["Time_Saved_Hours_Per_Week"] = (
    df["Time_Saved_Hours_Per_Week"].astype("string")
    .str.replace(" hrs", "", regex=False)
    .str.strip()
)

df["Work_or_Study_Hours_Per_Day"] = (
    df["Work_or_Study_Hours_Per_Day"].astype("string")
    .str.replace(" hrs", "", regex=False)
    .str.strip()
)


# 4.2. Gestion des doublons

# Identifier les doublons
print("Nombre de doublons :", df.duplicated().sum())

# Supprimer les doublons
df = df.drop_duplicates()

print("Nombre de lignes après suppression :", len(df))


# 4.3. Gestion des valeurs manquantes qualitatives

# Afficher le nombre et le pourcentage de valeurs manquantes
missing_values = df.isnull().sum()

missing_percentage = (
    df.isnull().mean() * 100
).round(2)

missing_report = pd.DataFrame({
    "Valeurs_manquantes": missing_values,
    "Pourcentage": missing_percentage
})

print(missing_report)

# Remplacer les valeurs manquantes des variables qualitatives
# par une modalité explicite
columns_to_fill = [
    "Age",
    "Gender",
    "Country",
    "Subscription Status",
    "Education_Level",
    "Profession",
    "AI_Tool",
    "AI_Purpose",
    "Tasks_Performed",
    "Would_Recommend"
]

for column in columns_to_fill:
    if column in df.columns:
        df[column] = df[column].fillna("Non renseigné")


# 5. TRANSFORMATION DES DONNÉES
# 5.1. Renommage des colonnes

column_mapping = {
    "Age": "Age",
    "Gender": "Genre",
    "Country": "Pays",
    "User_Type": "Type d'utilisateur",
    "Education_Level": "Niveau d'éducation",
    "Profession": "Profession",
    "Monthly_Income": "Revenu mensuel",
    "AI_Tool": "IA utilisée",
    "AI_Purpose": "Objectif d'utilisation de l'IA",
    "AI_Usage_Hours_Per_Day": "Utilisation par jour",
    "Tasks_Performed": "Tâches effectuées",
    "Monthly_AI_Cost": "Coût mensuel",
    "Productivity_Score": "Score de productivité",
    "Accuracy_Rating": "Précision perçue",
    "Satisfaction_Score": "Niveau de satisfaction",
    "Time_Saved_Hours_Per_Week": "Gain de temps par semaine",
    "Work_or_Study_Hours_Per_Day": "Heures de travail ou d'étude par jour",
    "Would_Recommend": "Avis sur la recommandation"
}

df = df.rename(columns=column_mapping)

# Vérification
print(df.columns.tolist())


# 5.2. Transformation des types de données

print("Types avant conversion :")
print(df.dtypes)

# Conversion des variables numériques
numeric_columns = [
    "Age",
    "Revenu mensuel",
    "Utilisation par jour",
    "Coût mensuel",
    "Score de productivité",
    "Précision perçue",
    "Niveau de satisfaction",
    "Gain de temps par semaine",
    "Heures de travail ou d'étude par jour"
]

for col in numeric_columns:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

print("\nTypes après conversion :")
print(df.dtypes)


# 5.3. Transformation des modalités qualitatives

value_mapping = {

    "Genre": {
        "Male": "Homme",
        "MALE": "Homme",
        "male": "Homme",
        "M": "Homme",
        "Female": "Femme",
        "female": "Femme",
        "FEMALE": "Femme",
        "F": "Femme",
        "other": "Autre",
        "Other": "Autre",
        "Non-binary": "Non-binaire"
    },

    "Type d'utilisateur": {
        "Student": "Étudiant",
        "Professional": "Professionnel"
    },

    "Avis sur la recommandation": {
        "Yes": "Oui",
        "No": "Non",
        "Maybe": "Peut-être"
    },

    "Pays": {
        "france": "France",
        "india": "India",
        "canada": "Canada",
        "United Kingdom": "U.K.",
        "United States": "USA",
        "United States of America": "USA",
        "philippines": "Philippines",
        "Brazil": "Brésil",
        "brazil": "Brésil",
        "Australia": "Australie",
        "australia": "Australie"
    },

    "Niveau d'éducation": {
        "Master's": "Master",
        "Bachelor's": "Licence",
        "Undergraduate": "Études de premier cycle",
        "High School": "Lycée",
        "Diploma": "Diplômé",
        "high school": "Lycée",
        "PhD": "Doctorat",
        "BA/BSc": "Licence",
        "MA/MSc": "Master",
        "Ph.D.": "Doctorat",
        "Masters": "Master",
        "master's degree": "Master",
        "bachelor's degree": "Licence",
        "undergrad": "Licence",
        "Bachelors": "Licence",
        "HS": "Lycée"
    },

    "IA utilisée": {
        "ChatGPT": "ChatGPT",
        "Chat GPT": "ChatGPT",
        "Meta AI": "Meta AI",
        "Perplexity AI": "Perplexity AI",
        "Claude": "Claude",
        "chatgpt": "ChatGPT",
        "Microsoft Copilot": "Microsoft Copilot",
        "Google Gemini": "Google Gemini",
        "Grammarly": "Grammarly",
        "DeepSeek": "DeepSeek",
        "Non renseigné": "Non renseigné",
        "Gemini": "Google Gemini",
        "Chatgpt": "ChatGPT",
        "gemini": "Google Gemini",
        "Copilot": "Microsoft Copilot",
        "claude": "Claude",
        "copilot": "Microsoft Copilot"
    },

    "Objectif d'utilisation de l'IA": {
        "Office Work": "Travail de bureau",
        "Customer Support": "Service client",
        "Coding": "Programmation",
        "Non renseigné": "Non renseigné",
        "Data Analysis": "Analyse de données",
        "Content Creation": "Création de contenu",
        "Writing": "Rédaction",
        "Research": "Recherche",
        "Studying": "Études / Apprentissage"
    }
}

# Appliquer les traductions
for column, mapping in value_mapping.items():
    if column in df.columns:
        df[column] = df[column].replace(mapping)

# Vérifier les traductions
for column in value_mapping.keys():
    if column in df.columns:
        print(f"\n--- {column} ---")
        print(df[column].value_counts(dropna=False))


# 5.4. Gestion des valeurs manquantes quantitatives

# Remplacer les valeurs manquantes par la médiane
columns_to_fill_median = [
    "Revenu mensuel",
    "Utilisation par jour",
    "Coût mensuel",
    "Score de productivité",
    "Précision perçue",
    "Niveau de satisfaction",
    "Gain de temps par semaine",
    "Heures de travail ou d'étude par jour"
]

for col in columns_to_fill_median:
    if col in df.columns:
        df[col] = df[col].fillna(df[col].median())



# 6. VÉRIFICATION DE LA COHÉRENCE DES DONNÉES

# Afficher les modalités uniques des variables qualitatives
for column in df.select_dtypes(include=["object", "string"]).columns:
    print(f"\n{column}")
    print(df[column].unique())

# Vérifier les dimensions finales
print("\nDimensions finales :", df.shape)

# Vérifier les valeurs manquantes
print("\nValeurs manquantes :")
print(df.isnull().sum())

# Vérifier les doublons
print("\nDoublons :")
print(df.duplicated().sum())

# Vérifier les types de colonnes
print("\nTypes des colonnes :")
print(df.dtypes)


# 7. EXPORT DU DATASET NETTOYÉ

# Définir le dossier de sortie
output_dir = Path("../data")
output_dir.mkdir(parents=True, exist_ok=True)

# Export au format CSV
df.to_csv(
    output_dir / "dataset_clean.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\nFichier CSV exporté avec succès !")
