from queue import Queue
from threading import Lock, Thread
from time import sleep


class RealtimeProcessor:
    def __init__(self) -> None:
        self.queue: Queue[dict] = Queue()
        self.live_counts: dict[str, int] = {}
        self.recent_events: list[dict] = []
        self.lock = Lock()
        self.worker = Thread(target=self._consume_events, daemon=True)
        self.worker.start()

    def publish(self, event: dict) -> None:
        self.queue.put(event)

    def _consume_events(self) -> None:
        while True:
            event = self.queue.get()

            with self.lock:
                subject = event["subject"]
                self.live_counts[subject] = self.live_counts.get(subject, 0) + 1
                self.recent_events.insert(0, event)
                self.recent_events = self.recent_events[:15]

            sleep(0.05)
            self.queue.task_done()

    def get_snapshot(self) -> dict:
        with self.lock:
            return {
                "live_counts": dict(self.live_counts),
                "recent_events": list(self.recent_events),
            }


realtime_processor = RealtimeProcessor()
