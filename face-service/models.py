from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class EnrollResponse(BaseModel):
    ok: bool
    quality_message: str
    enrollment_count: Optional[int] = None


class IdentifyResult(BaseModel):
    match: bool
    confidence: Literal["high", "medium", "low"]
    person_id: Optional[str] = None
    name: Optional[str] = None
    relationship: Optional[str] = None
    distance: Optional[float] = None
    # "no_face" | "no_enrollments" | "no_match" | None
    reason: Optional[str] = None


class EnrollmentInfo(BaseModel):
    person_id: str
    name: str
    relationship: str
    photo_count: int


class EnrollmentListResponse(BaseModel):
    enrollments: list[EnrollmentInfo]
