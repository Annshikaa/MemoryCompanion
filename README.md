<div align="center">

# 🧠 Memory Companion

### *A compassionate digital companion for Alzheimer's & dementia care*

A two-sided web application that helps patients stay oriented and connected — while giving caregivers powerful tools to manage care, track wellbeing, and stay informed.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python_FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Caregiver Features](#-caregiver-features)
- [Patient Features](#-patient-features)
- [AI Features](#-ai-features)
- [Face Recognition Service](#-face-recognition-service)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Database Setup](#-database-setup)
- [Architecture](#-architecture)
- [Privacy & Safety](#-privacy--safety)

---

## Overview

Memory Companion is built around a simple idea: **the patient's world should feel calm, familiar, and safe — and the caregiver's tools should be powerful but never overwhelming.**

The app has two completely separate interfaces:

| | Patient UI | Caregiver Dashboard |
|---|---|---|
| **Goal** | Orientation, comfort, connection | Management, monitoring, insight |
| **Design** | Cream & blue, large text, big touch targets | Warm clinical, rich typography |
| **AI** | Retrieval-grounded companion (safe) | Memory builder, summaries, prompts |
| **Access** | Simplified patient login | Email/password auth |

All data is **family-scoped** — one family can never see another's records. Row Level Security (RLS) is enforced at the database level on every table.

---

## 🩺 Caregiver Features

### Care Management

| Feature | Route | Description |
|---|---|---|
| **Dashboard** | `/caregiver` | Overview of patient status, alert summary, counts of people/routines/reminders |
| **Patient Profile** | `/caregiver/profile` | Edit patient name, photo, home location text |
| **Loved Ones** | `/caregiver/people` | Add & manage family members — names, relationships, photos, voice notes |
| **Medical Info** | `/caregiver/medical-info` | Allergies, medications, conditions with visibility toggles for the emergency card |
| **Emergency Card** | `/caregiver/emergency-card` | QR-coded shareable card with patient's critical medical info (public token, no auth required for readers) |

### Daily Routines & Reminders

| Feature | Route | Description |
|---|---|---|
| **Routines** | `/caregiver/routines` | Time-based recurring activities (medications at 8am, walk at 3pm, etc.) |
| **Reminders** | `/caregiver/reminders` | Medication, activity, and appointment reminders with confirmation tracking |
| **Memories** | `/caregiver/reminiscence` | Upload photos, music, and memory topics for patient engagement |

### Monitoring & Insights

| Feature | Route | Description |
|---|---|---|
| **Monitoring** | `/caregiver/monitoring` | Real-time activity, mood, and cognition metrics |
| **Weekly Reports** | `/caregiver/monitoring/reports` | Auto-generated cognitive & wellness reports with visualizations |
| **Mood History** | `/caregiver/moods` | Chart of the patient's daily mood check-ins |
| **Notifications** | `/caregiver/notifications` | Feed of all alerts — SOS, location, missed reminders, cognitive flags |
| **Digital Twin** | `/caregiver/digital-twin` | AI-powered predictive insights about the patient's condition |

### Safety & Identification

| Feature | Route | Description |
|---|---|---|
| **Face Enroll** | `/caregiver/faces` | Upload photos to enroll family members for AI face recognition |
| **Location Safety** | `/caregiver/location` | GPS tracking with geofence alerts |
| **Emergency Contacts** | `/caregiver/contacts` | Quick-dial list for the caregiver |

---

## 🌸 Patient Features

The patient interface is designed for **accessibility first** — minimum 22px text, 64px touch targets, calm cream background, persistent navigation always visible.

### Always Present
- **Floating SOS button** — bottom right, always visible, one tap sends emergency alert with GPS location
- **Floating Home button** — bottom left, always accessible
- **Reminder prompts** — gentle overlays when a reminder is due
- **Background location tracker** — continuous GPS with caregiver geofence alerts

### Core Pages

| Feature | Route | Description |
|---|---|---|
| **Home** | `/patient` | Warm greeting, today's date, affirmation, location, upcoming reminders |
| **Today's Plan** | `/patient/today` | Today's routines and reminders in scheduled order |
| **My Family** | `/patient/family` | Browse loved ones with photos, relationships, and voice notes |
| **Who is this?** | `/patient/identify` | Point camera at someone → AI identifies them from enrolled family members |
| **Reminders** | `/patient/reminders` | View and confirm upcoming reminders |

### Feel Good

| Feature | Route | Description |
|---|---|---|
| **Remember When** | `/patient/memories` | Browse caregiver-curated photos, music, and memory stories |
| **How I Feel** | `/patient/mood` | Daily mood check-in (happy / okay / sad / anxious) with optional note |
| **Gratitude Jar** | `/patient/gratitude` | Write one good thing from today |
| **Take a Breath** | `/patient/breathe` | Guided breathing and calming exercise |

### Activities

| Feature | Route | Description |
|---|---|---|
| **Memory Game** | `/patient/game` | AI shows a person's photo — patient guesses who it is |
| **Guess the Memory** | `/patient/guess-memory` | Given a topic or era, patient guesses the associated memory |
| **Soothing Sounds** | `/patient/sounds` | Curated ambient audio library |
| **Talk to Me** | `/patient/companion` | Retrieval-grounded AI companion — answers only from family data |

---

## 🤖 AI Features

All AI is powered by **Groq** (fast inference) with structured prompts. Every API key is **server-side only** — never sent to the browser. Every call goes through a Next.js API route.

### Memory Builder — `/caregiver/ai-builder`

Paste free-form caregiver notes (e.g. *"Mum was a teacher in Pune, loves Kishore Kumar, has two kids Priya and Arjun..."*) and the AI extracts structured suggestions across four categories:

- **People** — names and relationships to add to Loved Ones
- **Memories** — music, places, stories for Reminiscence
- **Routines** — time-based habits to add to Routines
- **Patient Profile** — patient name and home location

Each suggestion is shown as an accept/reject card. **Nothing is saved without caregiver confirmation.**

> `POST /api/ai/parse-notes` → `POST /api/ai/save-suggestions`

---

### Reminiscence Prompt Generator — `/caregiver/reminiscence/suggest`

Enter a person, era, and background — the AI generates 6–8 gentle conversation prompts and memory topics tailored to that person's life. Each prompt can be saved to Reminiscence with one click.

> `POST /api/ai/suggest-prompts`

---

### Daily Summary — `/caregiver/ai-summary`

One click generates a plain-language summary of the patient's last 24 hours — reminders completed/missed, SOS events, location alerts, mood. The tone is warm and factual, like a handover note.

> `POST /api/ai/daily-summary`

---

### "Talk to Me" Companion — `/patient/companion`

A gentle AI companion the patient can speak or type to. **Strictly retrieval-grounded** — it can only answer from caregiver-approved data in the family database.

Before every AI call, the route fetches:
- Patient name and home location
- All family members with relationships
- Today's routines and reminders
- Favourite memories and topics
- Emergency contacts and caregiver name

The system prompt enforces:
1. **Never invent** a person, fact, or event not in context
2. **Defer gracefully** — *"I'm not sure. Let's ask [caregiver name]."*
3. **Short answers** — 1–3 simple sentences
4. **Calm and warm tone** — no alarmist language
5. **No medical advice** ever

**Input:** Large push-to-talk button (browser `SpeechRecognition` with text fallback)  
**Output:** Displayed on screen and read aloud via `SpeechSynthesis`

Every question and deferral is logged in `events_log` for full caregiver visibility.

> `POST /api/ai/companion`

---

### Digital Twin — `/caregiver/digital-twin`

AI-powered predictive insights about the patient's current state, patterns, and wellbeing trends — synthesized from mood history, routine completion, cognitive activity scores, and notification data.

---

## 👁️ Face Recognition Service

A standalone **Python FastAPI microservice** that handles face enrollment and real-time identification.

### How it works

```
Caregiver uploads photo  →  dlib detects face  →  128-d embedding stored in Supabase
Patient points camera    →  embedding computed  →  nearest-neighbor match in family DB
```

**Confidence bands** (Euclidean distance):
| Band | Distance | Meaning |
|---|---|---|
| `high` | < 0.42 | "This is [Name], your [relationship]" |
| `medium` | 0.42 – 0.60 | "This might be [Name] — let's check" |
| `low` | ≥ 0.60 | "I'm not sure who this is" |

### Security
- Service-to-service auth via shared `X-Service-Key` header
- All queries scoped to `family_id` — never leaks across families
- Image processed in memory, never stored — only the 128-float embedding is persisted
- 10 MB upload limit

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/enroll` | Detect face → compute embedding → store |
| `POST` | `/identify` | Match uploaded photo against family embeddings |
| `GET` | `/enrollments` | List enrollment status for all people in family |

### Face Service Setup (Windows)

> ⚠️ `face_recognition` requires dlib. On Windows, use the pre-compiled wheel to skip C++ compilation.

```bash
cd face-service
python -m venv venv
.\venv\Scripts\Activate.ps1

pip install dlib-bin==19.24.6
pip install face_recognition==1.3.0 --no-deps
pip install -r requirements.txt

# Copy and fill in env vars
copy .env.example .env

uvicorn main:app --reload --port 8000
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js App Router | 15.1.0 |
| **Language** | TypeScript (strict) | 5.7.2 |
| **Database & Auth** | Supabase (Postgres + Auth + Storage + Realtime) | latest |
| **Supabase SDK** | @supabase/ssr | latest |
| **AI Inference** | Groq SDK | 0.9.0 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Animation** | Framer Motion | 11.15.0 |
| **State Management** | Zustand | 5.0.2 |
| **Icons** | Lucide React | 0.469.0 |
| **Face Recognition** | dlib (via Python) | 19.24.6 |
| **Face Service Framework** | FastAPI + uvicorn | 0.111.0 |
| **Face Service Validation** | Pydantic | 2.7.1 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for face service)
- A [Supabase](https://supabase.com) project (free tier works)
- A [Groq](https://console.groq.com) API key (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/your-username/memory-companion.git
cd memory-companion
npm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
# .env.local

# Supabase (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Groq AI — get a free key at https://console.groq.com
GROQ_API_KEY=gsk_...

# Face recognition microservice
FACE_SERVICE_URL=http://localhost:8000
FACE_SERVICE_SECRET=change-me-to-a-long-random-string
```

### 3. Set up the database

Run all migrations in the Supabase SQL editor in order, or use the combined file:

```
supabase/run-in-supabase-sql-editor.sql
```

Create the `family-media` storage bucket in your Supabase dashboard (Storage → New bucket → `family-media`, public).

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up as a caregiver, complete onboarding, then open a new tab at `/patient-login` to test the patient side.

### 5. Run the face service (optional)

Only needed for the "Who is this?" camera feature. See [Face Service Setup](#face-service-setup-windows) above.

---

## 🗄️ Database Setup

All tables are family-scoped and protected by Row Level Security. Key tables:

| Table | Purpose |
|---|---|
| `families` | Family group with unique invite code |
| `profiles` | User accounts (role: `caregiver` \| `patient`) |
| `patients` | Single patient record per family |
| `people` | Loved ones (name, relationship, photo, voice note) |
| `routines` | Recurring daily activities |
| `reminders` | Medication / activity / appointment reminders |
| `reminiscence_items` | Caregiver-curated photos, music, memory stories |
| `mood_checkins` | Daily patient mood logs |
| `notifications` | Alerts (SOS, location, missed reminders, cognitive flags) |
| `cognitive_activities` | Memory game and activity scores |
| `cognitive_reports` | Weekly wellness reports |
| `face_enrollments` | Face embeddings for recognition |
| `patient_medical_info` | Allergies, medications, public emergency token |
| `events_log` | Audit trail of all patient interactions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 App                       │
│                                                         │
│  ┌─────────────────┐      ┌──────────────────────────┐  │
│  │  Patient UI      │      │   Caregiver Dashboard    │  │
│  │  /patient/*      │      │   /caregiver/*           │  │
│  │                 │      │                          │  │
│  │  • Calm design  │      │  • Rich dashboard        │  │
│  │  • Large text   │      │  • Charts & reports      │  │
│  │  • SOS + GPS    │      │  • AI tools              │  │
│  └─────────────────┘      └──────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Next.js API Routes                  │    │
│  │  /api/ai/*   /api/faces/*   /api/alerts/*        │    │
│  └─────────────────────────────────────────────────┘    │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
    ┌───────────▼──────────┐  ┌───────▼─────────────────┐
    │   Supabase           │  │  Python Face Service     │
    │                      │  │  FastAPI + dlib          │
    │  • Postgres + RLS    │  │                          │
    │  • Auth              │  │  • Face enrollment       │
    │  • Storage           │  │  • Face identification   │
    │  • Realtime          │  │  • Embedding storage     │
    └──────────────────────┘  └─────────────────────────┘
                │
    ┌───────────▼──────────┐
    │   Groq API           │
    │  (AI inference)      │
    │  • Memory Builder    │
    │  • Companion AI      │
    │  • Daily Summaries   │
    │  • Prompt Generator  │
    └──────────────────────┘
```

---

## 🔒 Privacy & Safety

**Data isolation**
Every table is scoped to `family_id`. Supabase Row Level Security enforces this at the database level — a compromised API key cannot leak one family's data to another.

**AI safety**
The patient-facing AI companion is strictly retrieval-grounded. It reads from caregiver-approved data only — it cannot invent people, facts, or events. Every question and response is logged so caregivers have full visibility.

**Face recognition**
Uploaded photos are processed in memory and immediately discarded. Only the 128-float embedding is stored. Images never leave the server unprocessed.

**Emergency card**
The public emergency card uses a random `public_token` — it is not tied to any account and can be revoked by regenerating the token in settings.

> This app is a supportive aid, not a medical device.

---

<div align="center">

Built with care for families navigating Alzheimer's and dementia.

</div>
