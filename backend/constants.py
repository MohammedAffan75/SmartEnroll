SUBJECT_CATALOG = [
    {"name": "Data Science", "total_seats": 120},
    {"name": "Artificial Intelligence", "total_seats": 100},
    {"name": "Machine Learning", "total_seats": 90},
    {"name": "Cloud Computing", "total_seats": 80},
    {"name": "Cyber Security", "total_seats": 75},
]


def get_subject_names() -> list[str]:
    return [subject["name"] for subject in SUBJECT_CATALOG]
