"""
Face embedding backend.

Public API: get_embeddings(image_bytes) -> list[np.ndarray]

Each returned array is a 128-d float64 vector.
Returns an empty list when no faces are detected.

Backend: face_recognition (dlib HOG detector + ResNet descriptor).
To swap to a different backend (e.g. facenet-pytorch), replace only
the body of get_embeddings() — the rest of the service is unchanged.
"""

import io
import logging

import numpy as np
from PIL import Image, UnidentifiedImageError

log = logging.getLogger(__name__)

try:
    import face_recognition  # dlib-backed
    _BACKEND = "face_recognition"
    log.info("Face recognition backend: face_recognition (dlib)")
except ImportError:
    _BACKEND = None
    log.error("face_recognition is not installed — no embedding backend available")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_embeddings(image_bytes: bytes) -> list[np.ndarray]:
    """
    Detect all faces in *image_bytes* and return their 128-d embeddings.

    Args:
        image_bytes: Raw bytes of any PIL-readable image (JPEG, PNG, WebP…).

    Returns:
        A list of numpy arrays, one per detected face.
        Empty list  → no faces detected.

    Raises:
        RuntimeError: If no backend is installed.
        ValueError:   If the image cannot be decoded.
    """
    if _BACKEND is None:
        raise RuntimeError(
            "No face recognition backend available. "
            "Install 'face_recognition' (see requirements.txt)."
        )

    # Decode image
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, Exception) as exc:
        raise ValueError(f"Cannot decode image: {exc}") from exc

    # Downscale very large images to speed up HOG detection
    # (face_recognition accuracy is not affected for typical portrait shots)
    max_dim = 1600
    if max(pil_img.size) > max_dim:
        pil_img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    arr = np.array(pil_img)

    # HOG is fast; CNN ("cnn") is more accurate but requires more CPU/GPU
    face_locations = face_recognition.face_locations(arr, model="hog")

    if not face_locations:
        return []

    encodings = face_recognition.face_encodings(arr, face_locations)
    return list(encodings)


# ---------------------------------------------------------------------------
# Distance helpers
# ---------------------------------------------------------------------------

THRESHOLD_HIGH   = 0.42   # distance < this → high confidence match
THRESHOLD_MATCH  = 0.60   # distance < this → medium confidence match
                          # distance >= 0.60 → no match


def nearest_match(
    query: np.ndarray,
    candidates: list[dict],  # each: {"person_id": str, "embedding": list[float]}
) -> tuple[str | None, float]:
    """
    Find the person whose stored embeddings are nearest to *query*.

    Returns (person_id, min_distance) where person_id is None if no
    candidates are provided.
    """
    best_person_id: str | None = None
    best_dist = float("inf")

    for row in candidates:
        stored = np.array(row["embedding"], dtype=np.float64)
        dist = float(np.linalg.norm(query - stored))
        if dist < best_dist:
            best_dist = dist
            best_person_id = row["person_id"]

    return best_person_id, best_dist


def confidence_band(distance: float) -> str:
    if distance < THRESHOLD_HIGH:
        return "high"
    if distance < THRESHOLD_MATCH:
        return "medium"
    return "low"
