<<<<<<< HEAD
# SmartEnroll: Student Subject Registration System using Lambda Architecture

SmartEnroll is a beginner-friendly project that combines FastAPI, PostgreSQL, SQLAlchemy, a Python queue for real-time processing, Pandas for batch analytics, Chart.js for dashboards, and an optional Apache Kafka upgrade path.

## Step 1: PostgreSQL database schema

This project stores registrations in a single `registrations` table.

### Create the database

```sql
CREATE DATABASE smartenroll;
```

### Create the table

```sql
\c smartenroll;

CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(120) NOT NULL,
    subject VARCHAR(120) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registrations_subject ON registrations(subject);
CREATE INDEX idx_registrations_timestamp ON registrations(timestamp);
```

## Step 2: Project structure

```text
Smartenroll/
  backend/
    config.py
    constants.py
    database.py
    kafka_producer.py
    main.py
    models.py
    realtime.py
    schemas.py
    speed_layer.py
    batch_layer.py
  services/
    kafka_consumer.py
  scripts/
    run_batch.py
    print_live_counts.py
  frontend/
    index.html
    style.css
    app.js
  data/
    batch_analytics.json
  requirements.txt
  .env.example
```

## Step 3: Install and configure

### Create a virtual environment

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Create `.env`

Copy `.env.example` to `.env` and use values like:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/smartenroll
FRONTEND_ORIGIN=http://127.0.0.1:8000
KAFKA_ENABLED=false
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC=student-registrations
```

## Step 4: FastAPI + SQLAlchemy connection

`backend/database.py` creates:

- `engine` for PostgreSQL connection
- `SessionLocal` for SQLAlchemy sessions
- `Base` for ORM models

`backend/models.py` maps the `registrations` table to a Python class.

`backend/main.py` uses `Depends(get_db)` to open and close sessions safely for each request.

## Step 5: Backend endpoints

### Core endpoints

- `POST /register`
  - Accepts `student_id`, `student_name`, `subject`
  - Stores the registration in PostgreSQL
  - Sends an event to the real-time queue
  - Optionally sends the event to Kafka

- `GET /subjects`
  - Returns subject-wise registration counts
  - Includes total seats, available seats, and live counts

### Serving layer endpoints

- `GET /analytics/popular-subjects`
- `GET /analytics/registration-trends`
- `GET /analytics/live-counts`
- `GET /dashboard`

These endpoints return JSON ready for dashboards.

## Step 6: Run the FastAPI server

```bash
uvicorn backend.main:app --reload
```

Open:

- API docs: `http://127.0.0.1:8000/docs`
- Dashboard: `http://127.0.0.1:8000/`

## Step 7: Real-time processing with a Python queue

`backend/realtime.py` works as the speed layer:

1. FastAPI publishes registration events into a queue
2. A background thread consumes the events
3. Live subject counts update immediately

You can also run a tiny standalone example:

```bash
python scripts/print_live_counts.py
```

Example output:

```text
Data Science: 2
Artificial Intelligence: 1
```

## Step 8: Batch processing with Pandas

Run:

```bash
python scripts/run_batch.py
```

This reads data from PostgreSQL and computes:

- Most popular subject
- Total registrations per subject
- Registration trends over time
- Peak registration time

Results are saved to `data/batch_analytics.json`.

## Step 9: Apache Kafka upgrade path

Kafka is optional in this project.

### Local Kafka setup

Beginner-friendly Docker setup:

```bash
docker run -d --name zookeeper -p 2181:2181 confluentinc/cp-zookeeper:7.6.1
docker run -d --name kafka -p 9092:9092 -e KAFKA_ZOOKEEPER_CONNECT=host.docker.internal:2181 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 confluentinc/cp-kafka:7.6.1
```

### Topic

- `student-registrations`

### Producer

`backend/kafka_producer.py`

- FastAPI sends registration events after saving them in PostgreSQL

### Consumer

`services/kafka_consumer.py`

- Reads Kafka events
- Maintains live analytics in Python
- Prints updated subject counts

Run the consumer:

```bash
python services/kafka_consumer.py
```

Enable Kafka in `.env`:

```env
KAFKA_ENABLED=true
```

## Step 10: Dashboard

The frontend dashboard shows:

- Subject popularity as a bar chart
- Registration trends as a line chart
- Live seat counts
- Recent registration events

It auto-refreshes every 5 seconds.

## Step 11: Step-by-step startup guide

1. Start PostgreSQL.
2. Create the `smartenroll` database.
3. Run the SQL commands above to create the `registrations` table.
4. Create `.env` from `.env.example`.
5. Install Python dependencies with `pip install -r requirements.txt`.
6. Start FastAPI with `uvicorn backend.main:app --reload`.
7. Open `http://127.0.0.1:8000/`.
8. Submit a few student registrations from the form.
9. Run `python scripts/run_batch.py` to generate batch analytics.
10. Wait for the dashboard auto-refresh or refresh the page manually.
11. Optional: start Kafka and run `python services/kafka_consumer.py`.

## Important note

If you ran an older version of this project that used `subject_id` or `student_email`, recreate the `registrations` table so it matches the new schema.
