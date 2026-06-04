# Memory Companion — Face Service

A standalone FastAPI microservice that handles face **enrollment** and **identification** for the Memory Companion app.  
Lives in `/face-service` of the main repo; deployed separately to Render as a Docker web service.

---

## Architecture

```
Next.js (server-side API routes)
    │  multipart POST + X-Service-Key header
    ▼
face-service  (FastAPI / Python)
    │  service role key (bypasses RLS)
    ▼
Supabase Postgres  ←  face_enrollments table
```

- The **SERVICE_SECRET** and **SUPABASE_SERVICE_ROLE_KEY** never leave the server.
- All face operations are scoped to the correct `family_id`; identification can never cross families.
- Identification frames are **not persisted** — processed in memory and discarded.

---

## Embedding approach

**Backend:** `face_recognition` library (dlib HOG detector + 128-d ResNet descriptor).

**Distance thresholds (Euclidean on 128-d vector):**
| Range | Confidence | Meaning |
|-------|-----------|---------|
| < 0.42 | high | Strong match |
| 0.42 – 0.60 | medium | Probable match |
| ≥ 0.60 | low | No match returned |

To swap backends (e.g. facenet-pytorch), replace only `embeddings.get_embeddings()` — all endpoint logic is backend-agnostic.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Render health check → `{"status":"ok"}` |
| POST | `/enroll` | X-Service-Key | Detect face, store embedding |
| POST | `/identify` | X-Service-Key | Match face against family's enrollments |
| GET | `/enrollments?family_id=` | X-Service-Key | List enrollment counts per person |

### POST /enroll

Form fields:
- `family_id` (str)
- `person_id` (str)
- `image` (file — JPEG/PNG/WebP, max 10 MB)

Response:
```json
{ "ok": true, "quality_message": "Face enrolled clearly for Priya. 2 photos stored.", "enrollment_count": 2 }
{ "ok": false, "quality_message": "No face detected. Please use a clearer photo..." }
{ "ok": false, "quality_message": "Multiple faces detected. Please use a solo photo." }
```

### POST /identify

Form fields:
- `family_id` (str)
- `image` (file)

Response (match):
```json
{ "match": true, "confidence": "high", "person_id": "uuid", "name": "Priya", "relationship": "Daughter", "distance": 0.31 }
```

Response (no match):
```json
{ "match": false, "confidence": "low", "reason": "no_match", "distance": 0.72 }
```

Possible `reason` values: `no_face` · `no_enrollments` · `no_match` · `bad_image`

---

## Local development

### Prerequisites
- Python 3.11
- cmake and build-essential (for dlib) — see Dockerfile for apt packages
- OR: replace `dlib` with `dlib-bin` in requirements.txt (prebuilt wheel, no cmake)

### Setup

```bash
cd face-service
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase URL, service role key, and SERVICE_SECRET
```

### Run

```bash
uvicorn main:app --reload --port 8000
# Interactive docs: http://localhost:8000/docs
```

### Quick curl test

```bash
# Health
curl http://localhost:8000/health

# Enroll a face
curl -X POST http://localhost:8000/enroll \
  -H "X-Service-Key: your-service-secret" \
  -F "family_id=<uuid>" \
  -F "person_id=<uuid>" \
  -F "image=@/path/to/photo.jpg"

# Identify
curl -X POST http://localhost:8000/identify \
  -H "X-Service-Key: your-service-secret" \
  -F "family_id=<uuid>" \
  -F "image=@/path/to/photo.jpg"

# List enrollments
curl "http://localhost:8000/enrollments?family_id=<uuid>" \
  -H "X-Service-Key: your-service-secret"
```

---

## Deploy to Render (Docker)

dlib requires cmake at build time, which Render's native Python environment doesn't provide — **use the Docker runtime**.

### Steps

1. Push repo to GitHub.
2. Render dashboard → **New Web Service** → select repo.
3. **Root Directory:** `face-service`
4. **Runtime:** Docker *(Render detects the Dockerfile automatically)*
5. **Health Check Path:** `/health`
6. **Environment** tab — add these vars:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `SERVICE_SECRET` | random 32-char hex string (must match `FACE_SERVICE_SECRET` in Next.js) |
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` |

7. First deploy takes ~8 min (dlib compilation). Subsequent deploys are fast via Docker layer cache.

> **Plan note:** The Render *Starter* plan (0.5 CPU) works but face detection is ~2–4 s per image. The *Standard* plan (1 CPU) cuts this to ~0.5–1 s.

### dlib-bin alternative (no Dockerfile needed)

If you want to avoid Docker, swap in `dlib-bin`:

```
# requirements.txt — change:
dlib==19.24.4
# to:
dlib-bin==19.24.1
```

Then deploy with Render's **native Python** runtime (no Dockerfile). Works on Python 3.11 + manylinux2014 (Render's default Ubuntu environment). Not guaranteed for Python 3.12+.

---

## Adding to Next.js .env.local

```
FACE_SERVICE_URL=http://localhost:8000        # dev
# FACE_SERVICE_URL=https://your-service.onrender.com   # prod
FACE_SERVICE_SECRET=same-value-as-SERVICE_SECRET
```
