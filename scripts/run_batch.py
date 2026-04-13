import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from backend.batch_layer import generate_batch_analytics


if __name__ == "__main__":
    results = generate_batch_analytics()

    print("Batch analytics generated successfully.")
    print(f"Most popular subject: {results['most_popular_subject']}")
    print(f"Peak registration time: {results['peak_registration_time']}")
    print("Registrations per subject:")

    for item in results["registrations_per_subject"]:
        print(f"- {item['subject']}: {item['registration_count']}")
