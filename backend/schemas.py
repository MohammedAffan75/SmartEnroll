from datetime import datetime

from pydantic import BaseModel


class RegistrationCreate(BaseModel):
    student_id: str
    student_name: str
    subject: str


class RegistrationResponse(BaseModel):
    id: int
    student_id: str
    student_name: str
    subject: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class SubjectSummary(BaseModel):
    subject: str
    total_seats: int
    registration_count: int
    available_seats: int
    live_count: int
