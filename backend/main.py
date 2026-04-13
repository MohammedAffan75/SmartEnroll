from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.batch_layer import load_batch_analytics
from backend.config import settings
from backend.constants import SUBJECT_CATALOG, get_subject_names
from backend.database import Base, engine, get_db
from backend.kafka_producer import registration_event_producer
from backend.models import Registration
from backend.realtime import realtime_processor
from backend.schemas import RegistrationCreate, RegistrationResponse


app = FastAPI(title="SmartEnroll API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:8000", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/", include_in_schema=False)
def serve_frontend() -> FileResponse:
    return FileResponse(Path("frontend/index.html"))


@app.get("/student", include_in_schema=False)
def serve_student_page() -> FileResponse:
    return FileResponse(Path("frontend/student.html"))


@app.get("/admin", include_in_schema=False)
def serve_admin_page() -> FileResponse:
    return FileResponse(Path("frontend/admin.html"))


@app.post("/register", response_model=RegistrationResponse)
def register_student(payload: RegistrationCreate, db: Session = Depends(get_db)):
    if payload.subject not in get_subject_names():
        raise HTTPException(status_code=400, detail="Invalid subject selected")

    current_count = (
        db.query(func.count(Registration.id))
        .filter(Registration.subject == payload.subject)
        .scalar()
    )
    subject_info = next(item for item in SUBJECT_CATALOG if item["name"] == payload.subject)

    if current_count >= subject_info["total_seats"]:
        raise HTTPException(status_code=400, detail="No seats available for this subject")

    registration = Registration(
        student_id=payload.student_id,
        student_name=payload.student_name,
        subject=payload.subject,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    event = {
        "student_id": registration.student_id,
        "student_name": registration.student_name,
        "subject": registration.subject,
        "timestamp": registration.timestamp.isoformat(),
    }
    realtime_processor.publish(event)
    registration_event_producer.send_registration_event(event)

    return registration


@app.get("/subjects")
def get_subject_counts(db: Session = Depends(get_db)):
    grouped = dict(
        db.query(Registration.subject, func.count(Registration.id))
        .group_by(Registration.subject)
        .all()
    )
    live_snapshot = realtime_processor.get_snapshot()

    return [
        {
            "subject": subject["name"],
            "total_seats": subject["total_seats"],
            "registration_count": int(grouped.get(subject["name"], 0)),
            "available_seats": int(subject["total_seats"] - grouped.get(subject["name"], 0)),
            "live_count": int(live_snapshot["live_counts"].get(subject["name"], 0)),
        }
        for subject in SUBJECT_CATALOG
    ]


@app.get("/analytics/popular-subjects")
def get_popular_subjects():
    batch_data = load_batch_analytics()
    return {
        "most_popular_subject": batch_data["most_popular_subject"],
        "registrations_per_subject": batch_data["registrations_per_subject"],
    }


@app.get("/analytics/registration-trends")
def get_registration_trends():
    batch_data = load_batch_analytics()
    return {
        "registration_trends": batch_data["registration_trends"],
        "peak_registration_time": batch_data["peak_registration_time"],
        "total_registrations": batch_data["total_registrations"],
    }


@app.get("/analytics/live-counts")
def get_live_counts(db: Session = Depends(get_db)):
    live_snapshot = realtime_processor.get_snapshot()
    grouped = dict(
        db.query(Registration.subject, func.count(Registration.id))
        .group_by(Registration.subject)
        .all()
    )

    counts = []
    for subject in SUBJECT_CATALOG:
        historical_count = int(grouped.get(subject["name"], 0))
        counts.append(
            {
                "subject": subject["name"],
                "historical_count": historical_count,
                "live_count": int(live_snapshot["live_counts"].get(subject["name"], 0)),
                "total_seats": subject["total_seats"],
                "available_seats": subject["total_seats"] - historical_count,
            }
        )

    return {
        "live_counts": counts,
        "recent_events": live_snapshot["recent_events"],
    }


@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return {
        "subjects": get_subject_counts(db),
        "popular_subjects": get_popular_subjects(),
        "registration_trends": get_registration_trends(),
        "live_counts": get_live_counts(db),
    }
