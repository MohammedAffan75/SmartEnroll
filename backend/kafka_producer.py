import json

from backend.config import settings

try:
    from kafka import KafkaProducer
except ImportError:  # pragma: no cover
    KafkaProducer = None


class RegistrationEventProducer:
    def __init__(self) -> None:
        self._producer = None

        if settings.kafka_enabled and KafkaProducer is not None:
            self._producer = KafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            )

    def send_registration_event(self, event: dict) -> None:
        if self._producer is None:
            return

        self._producer.send(settings.kafka_topic, event)
        self._producer.flush()


registration_event_producer = RegistrationEventProducer()
