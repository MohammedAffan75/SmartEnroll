from collections import defaultdict
from queue import Queue
from threading import Thread


def process_registration_events(queue: Queue) -> None:
    live_counts = defaultdict(int)

    while True:
        event = queue.get()
        subject = event["subject"]
        live_counts[subject] += 1

        print("Updated live counts")
        for subject_name, count in live_counts.items():
            print(f"{subject_name}: {count}")
        print("-" * 30)

        queue.task_done()


if __name__ == "__main__":
    event_queue: Queue = Queue()
    worker = Thread(target=process_registration_events, args=(event_queue,), daemon=True)
    worker.start()

    sample_events = [
        {"subject": "Data Science"},
        {"subject": "Artificial Intelligence"},
        {"subject": "Data Science"},
    ]

    for sample_event in sample_events:
        event_queue.put(sample_event)

    event_queue.join()
