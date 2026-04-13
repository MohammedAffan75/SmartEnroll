import json
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from backend.database import engine


DATA_DIR = Path("data")
BATCH_OUTPUT_FILE = DATA_DIR / "batch_analytics.json"


def _default_batch_analytics() -> dict:
    return {
        "most_popular_subject": None,
        "registrations_per_subject": [],
        "registration_trends": [],
        "peak_registration_time": None,
        "total_registrations": 0,
    }


def generate_batch_analytics() -> dict:
    DATA_DIR.mkdir(exist_ok=True)

    query = text(
        """
        SELECT
            id,
            student_id,
            student_name,
            subject,
            timestamp
        FROM registrations
        ORDER BY timestamp ASC
        """
    )

    with engine.connect() as connection:
        registrations_df = pd.read_sql(query, connection)

    if registrations_df.empty:
        analytics = _default_batch_analytics()
        BATCH_OUTPUT_FILE.write_text(json.dumps(analytics, indent=2), encoding="utf-8")
        return analytics

    registrations_df["timestamp"] = pd.to_datetime(registrations_df["timestamp"])
    registrations_df["trend_label"] = registrations_df["timestamp"].dt.strftime("%Y-%m-%d %H:00")
    registrations_df["hour_label"] = registrations_df["timestamp"].dt.strftime("%H:00")

    registrations_per_subject = (
        registrations_df.groupby("subject")
        .size()
        .reset_index(name="registration_count")
        .sort_values("registration_count", ascending=False)
    )

    registration_trends = (
        registrations_df.groupby("trend_label")
        .size()
        .reset_index(name="registration_count")
        .sort_values("trend_label")
    )

    peak_hour = (
        registrations_df.groupby("hour_label")
        .size()
        .reset_index(name="registration_count")
        .sort_values("registration_count", ascending=False)
        .iloc[0]
    )

    most_popular_subject = registrations_per_subject.iloc[0]

    analytics = {
        "most_popular_subject": {
            "subject": str(most_popular_subject["subject"]),
            "registration_count": int(most_popular_subject["registration_count"]),
        },
        "registrations_per_subject": registrations_per_subject.to_dict(orient="records"),
        "registration_trends": registration_trends.to_dict(orient="records"),
        "peak_registration_time": {
            "time": str(peak_hour["hour_label"]),
            "registration_count": int(peak_hour["registration_count"]),
        },
        "total_registrations": int(len(registrations_df)),
    }

    BATCH_OUTPUT_FILE.write_text(json.dumps(analytics, indent=2), encoding="utf-8")
    return analytics


def load_batch_analytics() -> dict:
    if not BATCH_OUTPUT_FILE.exists():
        return _default_batch_analytics()

    return json.loads(BATCH_OUTPUT_FILE.read_text(encoding="utf-8"))
