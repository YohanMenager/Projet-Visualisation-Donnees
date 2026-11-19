"""Nettoie le jeu de données source et exporte les fichiers CSV et JSON."""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT_DIR / "data" / "dataset_original.csv"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data"

COLUMN_MAPPING = {
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
    "Would_Recommend": "Avis sur la recommandation",
}

CATEGORICAL_COLUMNS = (
    "Age",
    "Gender",
    "Country",
    "User_Type",
    "Education_Level",
    "Profession",
    "AI_Tool",
    "AI_Purpose",
    "Tasks_Performed",
    "Would_Recommend",
)

NUMERIC_COLUMNS = (
    "Revenu mensuel",
    "Utilisation par jour",
    "Coût mensuel",
    "Score de productivité",
    "Précision perçue",
    "Niveau de satisfaction",
    "Gain de temps par semaine",
    "Heures de travail ou d'étude par jour",
)

VALUE_MAPPINGS = {
    "Genre": {
        "male": "Homme",
        "m": "Homme",
        "female": "Femme",
        "f": "Femme",
        "other": "Autre",
        "non-binary": "Non-binaire",
    },
    "Type d'utilisateur": {
        "student": "Étudiant",
        "professional": "Professionnel",
    },
    "Avis sur la recommandation": {
        "yes": "Oui",
        "no": "Non",
        "maybe": "Peut-être",
    },
    "Pays": {
        "france": "France",
        "india": "India",
        "canada": "Canada",
        "united kingdom": "U.K.",
        "united states": "USA",
        "united states of america": "USA",
        "philippines": "Philippines",
        "brazil": "Brésil",
        "australia": "Australie",
        "maybe": "Peut-être",
    },
    "Niveau d'éducation": {
        "master's": "Master",
        "bachelor's": "Licence",
        "undergraduate": "Études de premier cycle",
        "high school": "Lycée",
        "diploma": "Diplômé",
        "phd": "Doctorat",
        "ba/bsc": "Licence",
        "ma/msc": "Master",
        "ph.d.": "Doctorat",
        "masters": "Master",
        "master's degree": "Master",
        "bachelor's degree": "Licence",
        "undergrad": "Licence",
        "bachelors": "Licence",
        "hs": "Lycée",
    },
    "IA utilisée": {
        "chatgpt": "ChatGPT",
        "chat gpt": "ChatGPT",
        "meta ai": "Meta AI",
        "perplexity ai": "Perplexity AI",
        "claude": "Claude",
        "microsoft copilot": "Microsoft Copilot",
        "copilot": "Microsoft Copilot",
        "google gemini": "Google Gemini",
        "gemini": "Google Gemini",
        "grammarly": "Grammarly",
        "deepseek": "DeepSeek",
    },
    "Objectif d'utilisation de l'IA": {
        "office work": "Travail de bureau",
        "customer support": "Service client",
        "coding": "Programmation",
        "data analysis": "Analyse de données",
        "content creation": "Création de contenu",
        "writing": "Rédaction",
        "research": "Recherche",
        "studying": "Études / Apprentissage",
    },
}


def clean_dataset(input_path: Path) -> tuple[pd.DataFrame, int]:
    """Charge et nettoie le CSV source; retourne les données et le nombre de doublons."""
    data = pd.read_csv(input_path)
    missing_columns = set(COLUMN_MAPPING) - set(data.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"Colonnes manquantes dans {input_path}: {missing}")

    for column in data.select_dtypes(include="object").columns:
        data[column] = data[column].astype("string").str.strip().replace("", pd.NA)

    for column, suffix in (
        ("Age", " yrs"),
        ("AI_Usage_Hours_Per_Day", " hrs"),
        ("Time_Saved_Hours_Per_Week", " hrs"),
        ("Work_or_Study_Hours_Per_Day", " hrs"),
    ):
        data[column] = (
            data[column]
            .astype("string")
            .str.replace(suffix, "", regex=False)
            .str.strip()
        )

    for column in CATEGORICAL_COLUMNS:
        data[column] = data[column].fillna("Non renseigné")

    duplicate_count = int(data.duplicated().sum())
    data = data.drop_duplicates()
    data = data.rename(columns=COLUMN_MAPPING)

    for column in NUMERIC_COLUMNS:
        values = (
            data[column]
            .astype("string")
            .str.replace("$", "", regex=False)
            .str.replace(",", "", regex=False)
            .str.strip()
        )
        data[column] = pd.to_numeric(values, errors="coerce").astype("float64")

    for column, mapping in VALUE_MAPPINGS.items():
        normalized = {key.casefold(): value for key, value in mapping.items()}
        data[column] = data[column].map(
            lambda value: normalized.get(value.casefold(), value)
            if isinstance(value, str)
            else value
        )

    for column in NUMERIC_COLUMNS:
        data[column] = data[column].fillna(data[column].median())

    return data, duplicate_count


def export_dataset(data: pd.DataFrame, output_dir: Path) -> tuple[Path, Path]:
    """Exporte les données nettoyées aux formats utilisés par le projet."""
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "dataset_clean.csv"
    json_path = output_dir / "dataset_clean.json"
    data.to_csv(csv_path, index=False, encoding="utf-8-sig")
    data.to_json(json_path, orient="records", force_ascii=False, indent=4)
    return csv_path, json_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Nettoie les données d'usage de l'IA et exporte les fichiers CSV et JSON."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"CSV source (défaut : {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Dossier de sortie (défaut : {DEFAULT_OUTPUT_DIR})",
    )
    args = parser.parse_args()

    data, duplicate_count = clean_dataset(args.input)
    csv_path, json_path = export_dataset(data, args.output_dir)
    print(f"Doublons supprimés : {duplicate_count}")
    print(f"Jeu nettoyé : {len(data)} lignes, {len(data.columns)} colonnes")
    print(f"CSV exporté : {csv_path}")
    print(f"JSON exporté : {json_path}")


if __name__ == "__main__":
    main()