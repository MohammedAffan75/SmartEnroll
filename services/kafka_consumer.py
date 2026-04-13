import json
import sys
from collections import defaultdict
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import settings

try:
    from kafka import KafkaConsumer
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "Install kafka-python first: pip install kafka-python"
    ) from exc


def consume_registration_events() -> None:
    consumer = KafkaConsumer(
        settings.kafka_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        auto_offset_reset="earliest",
        group_id="smartenroll-analytics",
        value_deserializer=lambda value: json.loads(value.decode("utf-8")),
    )

    live_counts = defaultdict(int)

    print("Kafka consumer started. Waiting for registration events...")

    for message in consumer:
        event = message.value
        live_counts[event["subject"]] += 1

        print("New registration event received")
        print(f'{event["subject"]}: {live_counts[event["subject"]]}')


if __name__ == "__main__":
    consume_registration_events()
