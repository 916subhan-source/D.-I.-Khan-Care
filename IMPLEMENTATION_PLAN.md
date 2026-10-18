# D.I. Khan Doctor Appointment System — Enhanced Implementation Plan

## 1. Executive Summary & Architectural Overview

The **D.I. Khan Doctor Appointment System** is a high-performance, multi-tier local healthcare platform designed to streamline doctor-patient interactions, clinic visit scheduling, queue handling, and reception operations within Dera Ismail Khan (D.I. Khan).

### Key Architectural Pillars
- **Frontend:** React + TypeScript (Vite), Tailwind CSS, TanStack Query for caching and server state, and Supabase Realtime Client for live desk synchronization.
- **Backend:** Python 3.11+ / 3.13 with FastAPI (async/await), Pydantic v2 validation models, and SQLAlchemy 2.0 ORM.
- **High-Performance In-Memory Layer (Redis):**
  - **Distributed Slot Lock (`SET slot:lock:{id} {patient_id} NX EX 600`):** Atomic 10-minute temporary reservation lock preventing race conditions and double-bookings.
  - **In-Memory OTP & Rate Limiter:** 6-digit verification code stored directly in Redis with 10-minute TTL and atomic sliding-window attempt counters (3 tries / 15 min), completely offloading ephemeral verification traffic from PostgreSQL.
  - **Doctor Directory & Spotlight Cache:** Sub-millisecond doctor listing and D.I. Khan sub-region searches with automatic invalidation on admin/doctor profile edits.
  - **Realtime Session Store:** Frictionless passwordless session management for patients tracking their digital slip.
- **Database:** PostgreSQL (via Supabase) featuring ACID compliance, composite unique constraint `(doctor_id, start_time)` on `doctor_slots` as secondary database-level safety, and Row Level Security (RLS).
- **Verification Engine:** 6-digit code with multi-driver architecture (Dev Mock Banner / In-App Toast for development, extensible to WhatsApp Cloud API / SMS gateway for production).
- **Payment Handling:** In-Clinic Cash Only (`PENDING_CASH` -> `PAID`), managed by assistants directly at the clinic desk. No external payment gateway fees.
- **Notification Pipeline:** Realtime in-app dashboard state streaming via Supabase Realtime subscriptions.

---

## 2. System Roles & Access Matrix

| Role | Access Scope & Key Capabilities |
| :--- | :--- |
| **Patient** | Public doctor directory with D.I. Khan sub-region filters (Circular Rd, Cantt, University Rd, Topanwala, etc.) & Spotlight section; interactive slot booking with 10-minute Redis lock; 6-digit verification; passwordless **Track My Appointment** portal via Phone + Slip Number; live digital slip view. |
| **Doctor** | Analytics dashboard (daily/monthly counts, consultation volume); schedule template & blackout date management; morning/evening shift tag support; **Self-Service Assistant Management** (create/link/revoke staff without Admin intervention); patient consultation logs. |
| **Assistant** | Real-time queue desk (Supabase Realtime) with **Multi-Doctor Switcher** for polyclinics; smart rescheduling & slot collision resolution; in-clinic cash payment processing (`Mark as Paid`); slip issuance. |
| **Admin / Developer** | Exclusive Spotlight toggling (pinning/unpinning doctors in the public directory); doctor account approval & verification; system-wide audit log monitoring; Redis cache status inspection. |

---

## 3. Four-Part Project Breakdown

```
+-----------------------------------------------------------------------------------+
| PART 1: Database Foundation, Redis In-Memory Layer, Security & Auth Architecture  |
| - PostgreSQL DDL, RLS policies, double-booking constraints, seed data             |
| - Redis client integration (distributed locks, caching, session store)            |
| - FastAPI backend initialization, async SQLAlchemy ORM, Argon2 & JWT auth         |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| PART 2: Redis-Powered Verification Engine & Patient Booking Experience            |
| - Redis-backed 6-digit code engine (10 min TTL, atomic attempt limiter)           |
| - Redis distributed slot lock (10 min temporary hold during verification)         |
| - Patient directory with sub-region filters (Circular Rd, Cantt, Topanwala, etc.) |
| - Passwordless "Track My Appointment" (Phone + Slip Number lookup)                |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| PART 3: Assistant Desk, Multi-Doctor Switcher & Cash Desk Operations              |
| - Real-time queue subscription via Supabase Realtime                              |
| - Multi-Doctor switcher for shared receptionists in polyclinics                   |
| - Assistant approval, collision resolution, and alternate slot offering           |
| - Digital Slip Number generator (`DIK-YYYYMMDD-XXX`)                              |
| - In-clinic cash collection (`PENDING_CASH` -> `PAID`) with immutable audit logs  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| PART 4: Doctor Portal, Admin Control Center & System Integration                  |
| - Doctor schedule manager, morning/evening shifts, blackout calendars             |
| - Self-service assistant management (create/link/revoke credentials directly)    |
| - Doctor analytics (Recharts: patient flow, fee collections)                     |
| - Admin Spotlight manager, doctor verification panel & Redis cache controls       |
| - End-to-end integration, performance tuning, and deployment scripts              |
+-----------------------------------------------------------------------------------+
```

---

### Part 1: Database Foundation, Redis In-Memory Layer, Security & Auth Architecture
**Objective:** Establish the persistent PostgreSQL layer, the high-speed Redis in-memory infrastructure, relational constraints, security models, and backend foundation.

1. **Supabase PostgreSQL Schema & Migrations (`supabase/migrations/`)**:
   - `users`: Core table handling all roles (`PATIENT`, `DOCTOR`, `ASSISTANT`, `ADMIN`).
   - `doctors`: Doctor profiles, specialty, D.I. Khan sub-region, clinic address, Google Maps link, fee, shift (`MORNING`, `EVENING`, `BOTH`), `is_spotlight`, `verification_status`.
   - `doctor_assistants`: Self-service mapping table linking doctors to appointed assistants (`doctor_id`, `assistant_user_id`).
   - `doctor_slots`: Slot catalog with `UNIQUE (doctor_id, start_time)` as persistent safety.
   - `appointments`: Lifecycle state engine (`HOLD`, `PENDING_ASSISTANT_APPROVAL`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`).
   - `payments`: Cash ledger (`PENDING_CASH`, `PAID`) with receptionist audit tracking.
   - `audit_logs`: Immutable tracking of status mutations and actors.
   - Row Level Security (RLS) policies + Realtime publication setup on `appointments` and `payments`.
2. **Redis In-Memory Engine Setup (`backend/app/core/redis.py`)**:
   - Asynchronous Redis connection pool via `redis.asyncio`.
   - Lock helper utilities: `acquire_slot_lock(slot_id, patient_id, ttl=600)` and `release_slot_lock(slot_id)`.
   - Caching decorators for doctor directory queries with tag-based invalidation.
3. **Backend Skeleton & Core Services (`backend/`)**:
   - FastAPI modular structure with Pydantic v2 schemas and SQLAlchemy 2.0 async engine (`asyncpg`).
   - Security module: Password hashing using Argon2 and JWT access/refresh token generation.
   - Middleware: CORS configuration, request timing, exception handlers.
4. **Database Seeding (`seed_data.py`)**:
   - Pre-populate D.I. Khan clinic hubs:
     - *Circular Road (Major Clinic Hub)*
     - *Commissionery Bazaar / Topanwala Chowk*
     - *University Road*
     - *Cantt Area*
     - *Tank Road / Qayyum Nagar*
   - Initial Admin account, sample verified doctors with morning/evening shifts, schedule slots, and doctor-assistant links.

---

### Part 2: Redis-Powered Verification Engine & Patient Booking Experience
**Objective:** Deliver the patient-facing discovery portal, interactive booking system, Redis-backed rate-limited code verification, and passwordless appointment tracking.

1. **Redis Verification & Locking Engine (`backend/app/services/otp_service.py`)**:
   - **Atomic Slot Locking:** When booking initiates, Redis sets `slot:lock:{slot_id}` with a 10-minute expiration. If another patient requests it, Redis immediately rejects it before hitting the database.
   - **In-Memory OTP Generation:** Generates 6-digit code, hashes it with Argon2, and stores it in `otp:{phone_or_email}` with 10-minute TTL.
   - **Atomic Rate Limiter:** Key `otp:attempts:{phone_or_email}` with `INCR` and `EXPIRE 900` (max 3 tries per 15 minutes).
   - **Multi-Driver Delivery Adapter:**
     - `MockDriver`: Returns code in response / renders toast in UI for development and testing.
     - `WhatsAppDriver` / `SMSDriver`: Ready interface for real-world SMS/WhatsApp gateways.
2. **Patient Directory & Booking APIs (`backend/app/routers/patients.py`, `booking.py`)**:
   - `GET /api/v1/doctors`: Filter by specialty, D.I. Khan sub-region, and shift; spotlighted doctors sorted first (cached in Redis with 5-minute TTL).
   - `GET /api/v1/doctors/{id}/available-slots`: Dynamic query returning unreserved slots, cross-checked against active Redis locks.
   - `POST /api/v1/booking/request`: Acquires 10-minute Redis lock on slot and issues 6-digit verification code.
   - `POST /api/v1/booking/verify`: Validates code against Redis, releases lock, transitions appointment to `PENDING_ASSISTANT_APPROVAL`, and publishes to Supabase Realtime.
   - `POST /api/v1/patient/track`: Passwordless lookup using **Phone Number + Digital Slip Number** to view booking status.
3. **Frontend Patient Interface (`frontend/src/pages/patient/`)**:
   - Modern Hero section with D.I. Khan sub-region dropdown and specialty search.
   - Spotlight Doctors Carousel / Featured Grid.
   - Interactive Doctor Profile, shift indicator, and Slot Picker modal with live 10-minute lock countdown.
   - 6-Digit Code Verification modal with attempt counter and countdown timer.
   - **"Track My Appointment" Portal** for return visits without passwords.
   - Live Patient Status Tracker showing booking review progress.

---

### Part 3: Assistant Desk, Multi-Doctor Switcher & Cash Desk Operations
**Objective:** Implement the real-time operational hub for clinic receptionists/assistants to manage incoming requests, handle slot collisions, issue digital slips, and collect cash payments.

1. **Assistant Real-time Queue Engine (`frontend/src/pages/assistant/AssistantDesk.tsx`)**:
   - Live subscription to Supabase Realtime channel (`appointments:doctor_id=eq.{id}`).
   - **Multi-Doctor Switcher Dropdown:** Allows polyclinic receptionists managing multiple doctors on Circular Road to switch between or view unified queues.
   - Instant visual and audio cues on incoming `PENDING_ASSISTANT_APPROVAL` requests without page refresh.
2. **Assistant Backend APIs (`backend/app/routers/assistants.py`)**:
   - `GET /api/v1/assistant/queue`: Retrieve pending, confirmed, and active patient queues.
   - `POST /api/v1/assistant/appointments/{id}/approve`: Confirm slot, transition to `CONFIRMED`, generate unique Digital Slip Number.
   - `POST /api/v1/assistant/appointments/{id}/reschedule`: Check slot availability, propose alternative slot with notes.
   - `POST /api/v1/assistant/appointments/{id}/reject`: Decline with structured reason.
   - `POST /api/v1/assistant/appointments/{id}/mark-paid`: Transition payment to `PAID`, record reception timestamp and assistant user ID in `audit_logs`.
3. **Digital Slip Number System (`backend/app/services/slip_service.py`)**:
   - Format: `DIK-[DOCTOR_CODE]-[YYYYMMDD]-[SEQ]` (e.g., `DIK-CARD-20260930-012`).
   - Printable / Mobile-friendly Digital Slip view in Patient Dashboard with QR verification code and Clinic Desk instructions.
4. **Cash Reconciliation Dashboard**:
   - Assistant daily cash counter: total cash collected today, outstanding `PENDING_CASH` appointments, and settled records.

---

### Part 4: Doctor Portal, Admin Control Center & System Integration
**Objective:** Deliver the Doctor management workspace, Admin platform governance, end-to-end integration, and production hardening.

1. **Doctor Portal (`frontend/src/pages/doctor/`)**:
   - **Schedule Manager:** Setup weekly recurring hours (morning/evening shifts, 15/30-minute intervals) and batch slot generation.
   - **Blackout Calendar:** Mark emergency leaves, clinic closures, or off-days with automatic notification/flagging.
   - **Self-Service Assistant Management:** Direct creation and revocation of assistant login credentials linked to their specific clinic desk.
   - **Analytics Suite:** Recharts visualizing daily patient turnaround, peak hours, and cash revenue summary.
2. **Admin Control Center (`frontend/src/pages/admin/`)**:
   - **Spotlight Controller:** Toggle spotlight status for doctors across D.I. Khan to promote clinics at the top of the directory (flushes Redis directory cache).
   - **Doctor Credential Verification:** Review submitted PMDC / medical licenses, clinic addresses, and verify doctor accounts.
   - **System Audit Log Viewer:** Searchable audit trail showing all status mutations, cash confirmations, and staff actions.
   - **Redis Cache Inspector:** Monitor active slot locks, cached directories, and active rate limits.
3. **System Hardening & E2E Validation**:
   - Concurrency testing: Verify that concurrent booking requests for the same slot are intercepted by Redis distributed locks without double-allocating.
   - End-to-end flow test covering all 4 roles: Patient Books -> Code Verified -> Assistant Approves -> Slip Generated -> Cash Paid -> Doctor Agenda Updated.

---

## 4. Deliverables Matrix

| Part | Backend & Redis Artifacts | Frontend Artifacts | Database & Config Artifacts |
| :--- | :--- | :--- | :--- |
| **Part 1** | `app/core/redis.py`, `app/models/`, `app/schemas/`, `auth.py` | Environment setup, Tailwind config, Axios & Supabase client | `supabase/migrations/001_initial_schema.sql`, `seed_data.py` |
| **Part 2** | `otp_service.py` (Redis OTP + locks), `patients.py`, `booking.py` | Directory view with D.I. Khan localities, Slot lock UI, OTP dialog, Track Slip view | RLS policies, composite locks |
| **Part 3** | `assistants.py`, `slip_service.py`, `payments.py` | Assistant Desk, Multi-Doctor Switcher, Realtime live queue, Cash drawer | Realtime triggers, audit logs |
| **Part 4** | `doctors.py`, `admin.py`, `analytics.py`, Redis cache invalidators | Doctor Schedule manager, Assistant manager, Recharts dashboard, Admin Spotlight | Automated smoke tests, Dockerfile / run scripts |

---

## 5. Execution Pre-requisites & Next Action

1. **Node.js LTS**: Install via `winget` so the React + Vite frontend can be built and run.
2. **Python Environment**: Initialize virtual environment (`venv`) and install FastAPI, SQLAlchemy, Pydantic, Passlib/Argon2, Redis (`redis.asyncio`), and Uvicorn.
3. **Redis Instance**: Stand up local Redis server or cloud Redis (Upstash / Redis Cloud) with in-memory fallback for local dev.
4. **Start Part 1**: Write and execute the full PostgreSQL database schema and FastAPI auth/core scaffold.
