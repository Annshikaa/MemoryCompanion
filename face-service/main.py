"""
Memory Companion — Face Recognition Microservice
FastAPI app · dlib-backed embeddings · Supabase storage
"""

from __future__ import annotations

import logging
import os
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from database import db
from embeddings import (
    THRESHOLD_MATCH,
    confidence_band,
    get_embeddings,
    nearest_match,
)
from models import (
    EnrollmentInfo,
    EnrollmentListResponse,
    EnrollResponse,
    HealthResponse,
    IdentifyResult,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

_SERVICE_SECRET = os.environ.get("SERVICE_SECRET", "")
_ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "http://localhost:3000")

app = FastAPI(
    title="Memory Companion Face Service",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_ALLOWED_ORIGIN, "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["X-Service-Key", "Content-Type"],
)


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _require_key(x_service_key: str | None) -> None:
    """Raise 401 if the X-Service-Key header is missing or wrong."""
    if not _SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="SERVICE_SECRET not configured on server")
    if x_service_key != _SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Service-Key")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    """Render health check — no auth required."""
    return HealthResponse()


@app.post("/enroll", response_model=EnrollResponse, tags=["face"])
async def enroll(
    person_id:      str        = Form(...),
    family_id:      str        = Form(...),
    image:          UploadFile = File(..., description="JPEG/PNG photo of the person"),
    x_service_key:  str | None = Header(None, alias="X-Service-Key"),
) -> EnrollResponse:
    """
    Detect a face in the uploaded photo, compute its 128-d embedding,
    and store it in face_enrollments scoped to (family_id, person_id).

    - 0 faces detected  → ok=False with guidance message
    - >1 faces detected → ok=False asking for a solo photo
    - 1 face detected   → ok=True, row inserted, enrollment_count updated
    """
    _require_key(x_service_key)

    # Validate that the person belongs to the stated family
    person_rows = (
        db.table("people")
        .select("id, name")
        .eq("id", person_id)
        .eq("family_id", family_id)
        .execute()
    )
    if not person_rows.data:
        raise HTTPException(status_code=404, detail="Person not found in this family")

    # Read image bytes
    if image.size and image.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")

    image_bytes = await image.read()

    # Detect & embed
    try:
        embeddings = get_embeddings(image_bytes)
    except ValueError as exc:
        return EnrollResponse(ok=False, quality_message=f"Could not read image: {exc}")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    if len(embeddings) == 0:
        return EnrollResponse(
            ok=False,
            quality_message=(
                "No face detected. Please use a clearer photo with good lighting "
                "and the person looking towards the camera."
            ),
        )

    if len(embeddings) > 1:
        return EnrollResponse(
            ok=False,
            quality_message=(
                f"{len(embeddings)} faces detected. Please use a photo with "
                "only this one person — no other faces in the frame."
            ),
        )

    # Store embedding (service role bypasses RLS — family_id is manually enforced above)
    db.table("face_enrollments").insert(
        {
            "family_id": family_id,
            "person_id": person_id,
            "embedding": embeddings[0].tolist(),
        }
    ).execute()

    # Get updated count for this person
    count_resp = (
        db.table("face_enrollments")
        .select("id", count="exact")
        .eq("person_id", person_id)
        .execute()
    )
    count: int = count_resp.count or 1
    person_name: str = person_rows.data[0]["name"]

    return EnrollResponse(
        ok=True,
        quality_message=(
            f"Face enrolled clearly for {person_name}. "
            f"{count} photo{'s' if count != 1 else ''} stored — "
            "more photos from different angles improve accuracy."
        ),
        enrollment_count=count,
    )


@app.post("/identify", response_model=IdentifyResult, tags=["face"])
async def identify(
    family_id:     str        = Form(...),
    image:         UploadFile = File(..., description="Photo/frame to identify"),
    x_service_key: str | None = Header(None, alias="X-Service-Key"),
) -> IdentifyResult:
    """
    Given a face image, return the best-matching enrolled person within
    *family_id* ONLY. Never crosses family boundaries.

    Confidence bands (Euclidean distance on 128-d embedding):
      high   → distance < 0.42
      medium → distance < 0.60
      low    → distance ≥ 0.60 (no match returned)
    """
    _require_key(x_service_key)

    image_bytes = await image.read()

    try:
        query_embeddings = get_embeddings(image_bytes)
    except ValueError as exc:
        return IdentifyResult(match=False, confidence="low", reason="bad_image",
                              distance=None)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    if not query_embeddings:
        return IdentifyResult(match=False, confidence="low", reason="no_face")

    # Use the first detected face for identification
    query_vec = query_embeddings[0]

    # Fetch ALL embeddings for this family only (never leak across families)
    rows = (
        db.table("face_enrollments")
        .select("person_id, embedding")
        .eq("family_id", family_id)
        .execute()
    )

    if not rows.data:
        return IdentifyResult(match=False, confidence="low", reason="no_enrollments")

    best_person_id, best_dist = nearest_match(query_vec, rows.data)

    conf = confidence_band(best_dist)

    if conf == "low":
        return IdentifyResult(
            match=False,
            confidence="low",
            reason="no_match",
            distance=round(best_dist, 4),
        )

    # Fetch person details — still scoped to family_id
    person_rows = (
        db.table("people")
        .select("name, relationship")
        .eq("id", best_person_id)
        .eq("family_id", family_id)
        .execute()
    )

    if not person_rows.data:
        # Embedding exists but person was deleted — treat as no match
        return IdentifyResult(match=False, confidence="low", reason="no_match",
                              distance=round(best_dist, 4))

    person = person_rows.data[0]

    return IdentifyResult(
        match=True,
        confidence=conf,
        person_id=best_person_id,
        name=person["name"],
        relationship=person["relationship"],
        distance=round(best_dist, 4),
    )


@app.get("/enrollments", response_model=EnrollmentListResponse, tags=["face"])
async def list_enrollments(
    family_id:     str,
    x_service_key: str | None = Header(None, alias="X-Service-Key"),
) -> EnrollmentListResponse:
    """
    Return enrollment status for every enrolled person in the family.
    Used by the caregiver UI to show "3 photos enrolled / not enrolled yet".
    """
    _require_key(x_service_key)

    # Count enrollments per person
    rows = (
        db.table("face_enrollments")
        .select("person_id")
        .eq("family_id", family_id)
        .execute()
    )

    counts: dict[str, int] = defaultdict(int)
    for row in rows.data:
        counts[row["person_id"]] += 1

    if not counts:
        return EnrollmentListResponse(enrollments=[])

    # Fetch person names for enrolled person_ids
    person_ids = list(counts.keys())
    people_rows = (
        db.table("people")
        .select("id, name, relationship")
        .in_("id", person_ids)
        .eq("family_id", family_id)
        .execute()
    )

    enrollments = [
        EnrollmentInfo(
            person_id=p["id"],
            name=p["name"],
            relationship=p["relationship"],
            photo_count=counts[p["id"]],
        )
        for p in people_rows.data
    ]

    return EnrollmentListResponse(enrollments=enrollments)
