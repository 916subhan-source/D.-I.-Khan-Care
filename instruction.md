# User Instructions & Project Directives

This document tracks all direct requirements, constraints, preferences, and operational instructions given by the user for the **D.I. Khan Doctor Appointment System**.

---

## 1. Primary Directives & Architecture Instructions
  
1. **System Scope & Purpose:**
   - Multi-tier local healthcare platform designed for clinics, polyclinics, and doctors in **Dera Ismail Khan (D.I. Khan)**.
   - Core portals:
     1. **Patient Portal** (Discovery, booking, verification, live tracking).
     2. **Doctor Portal** (Schedule, shift management, self-service assistant linking, analytics).
     3. **Assistant Portal** (Live real-time desk queue, smart rescheduling, in-clinic cash handling).
     4. **Admin / Developer Portal** (Exclusive Spotlight doctor controller, doctor account verification, platform audit logs).

2. **Technology Stack:**
   - **Frontend:** React + TypeScript (Vite), Tailwind CSS, TanStack Query, Supabase Realtime JS client.
   - **Backend:** Python 3.11+ / 3.13 with FastAPI (async/await), Pydantic v2 validation models, and SQLAlchemy 2.0 ORM.
   - **Database:** PostgreSQL via Supabase with ACID transactions, Row Level Security (RLS), and a composite unique constraint `(doctor_id, start_time)` to strictly block double-bookings at the DB level.
   - **In-Memory Cache & Concurrency (Redis):** Use Redis memory for distributed slot locking (`SET NX EX 600`), 6-digit OTP rate limiting, and sub-millisecond doctor directory caching.

3. **Verification & Authentication Rules:**
   - **Patients:** Passwordless login/booking via a 6-digit verification code (10-minute validity, 3 attempts per 15 minutes). No permanent password required for patients.
   - **Staff (Doctor / Assistant / Admin):** Credential login with Argon2-hashed passwords and JWT access/refresh tokens.
   - **Code Delivery:** Development mode provides a live floating UI banner/toast with the code; architecture must include an extensible driver interface for production WhatsApp/SMS gateways.

4. **Payment Processing:**
   - **Cash Only at Clinic Reception:** Patient pays in person on arrival.
   - Assistant views `PENDING_CASH` appointments on the Assistant Desk and marks them `PAID`.
   - No external online payment gateway (Stripe/JazzCash/EasyPaisa) required.

5. **Notification System:**
   - **In-App Realtime Updates Only:** Supabase Realtime subscriptions stream queue and status mutations live to the Patient Dashboard, Assistant Desk, and Doctor Agenda.
   - No outbound email or SMS service required for notifications.

6. **Doctor & Assistant Governance:**
   - **Self-Service Assistant Management:** Doctors must be able to directly create, link, or revoke assistant accounts from their portal without requiring admin intervention.
   - **Multi-Doctor Assistant Desk:** Assistants in polyclinics must be able to switch between multiple doctors they manage.

7. **Admin Privileges:**
   - **Exclusive Spotlight Control:** Only Admin / Developer accounts can toggle `is_spotlight` to pin featured doctors at the top of the D.I. Khan directory.

---

## 2. Project Execution Instructions

1. **4-Part Development Breakdown:**
   The project must be executed in 4 sequential, well-defined parts:
   - **Part 1:** Database Foundation, Supabase PostgreSQL Schema, Redis In-Memory Layer, Security & Auth Architecture.
   - **Part 2:** Redis-Powered Verification Engine, Rate Limiter, Patient Directory & Booking Experience with temporary slot hold.
   - **Part 3:** Assistant Live Desk (Supabase Realtime), Multi-Doctor Switcher, Smart Rescheduling, Digital Slip Number Generator (`DIK-YYYYMMDD-XXX`), and Cash Desk Operations (`Mark as Paid`).
   - **Part 4:** Doctor Portal (Schedule & Shift manager, Self-Service Assistant linking, Recharts analytics), Admin Control Center (Spotlight toggles, PMDC verification, Audit logs), and System Hardening.

2. **Documentation & Tracking Files:**
   - [`IMPLEMENTATION_PLAN.md`](file:///c:/Users/Admin/Downloads/Docter%20Appointment%20system/IMPLEMENTATION_PLAN.md): Detailed roadmap, technical milestones, deliverable matrix, and execution steps.
   - [`design.md`](file:///c:/Users/Admin/Downloads/Docter%20Appointment%20system/design.md): System architecture, component diagrams, database ERD, data flow charts, and security design.
   - [`instruction.md`](file:///c:/Users/Admin/Downloads/Docter%20Appointment%20system/instruction.md): Complete record of user directives, operational constraints, and development guidelines.

---

## 3. Operational Log & Future User Instructions
*This section will be continuously updated as new instructions, feature requests, or design modifications are provided by the user.*

- **Single Test & Execution Runner Script Rule:**
  All testing, diagnostic runs, database checks, API testing, and workflow executions must take place strictly inside a single dedicated runner: `test_runner.py`. Whenever new test logic or execution steps are needed, update/overwrite `test_runner.py` directly rather than creating separate disposable test scripts.

- **Part 3 Completed & Verified:**
  - `slip_service.py` implemented: Human-friendly Digital Slip Number generator formatted as `DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ]-[JITTER]` (e.g. `DIK-CARD-20260930-002-12`).
  - `audit_service.py` implemented: Immutable activity ledger recording all status changes, reschedules, and cash collections with actor ID and before/after values.
  - `routers/assistants.py` implemented:
    - `/api/v1/assistant/my-doctors`: Multi-Doctor Switcher enabling receptionists in shared polyclinics (e.g. on Circular Road) to switch contexts between linked doctors.
    - `/api/v1/assistant/queue`: Real-time queue fetching verified patient requests (`PENDING_ASSISTANT_APPROVAL`, `CONFIRMED`, etc.).
    - `/api/v1/assistant/appointments/{id}/approve`: Request approval, slot confirmed as `booked`, Digital Slip Number assigned, and audit logged.
    - `/api/v1/assistant/appointments/{id}/reschedule`: Collision resolution, releases old slot back to `available`, assigns new slot, and records reason.
    - `/api/v1/assistant/appointments/{id}/mark-paid`: In-clinic cash collection endpoint setting payment status to `PAID`, recording collection timestamp, and logging the receiving receptionist.
- **Part 4 Completed & Verified:**
  - `routers/doctor_portal.py` implemented:
    - `/api/v1/doctor/profile`: Doctor clinic profile and fee settings.
    - `/api/v1/doctor/assistants`: **Doctor Self-Service Assistant Management** — doctors directly create, link, or revoke assistant accounts for their desk without admin intervention.
    - `/api/v1/doctor/slots/generate`: Batch schedule generator for daily/shift slots (e.g., 20-min slots for evening shifts).
    - `/api/v1/doctor/analytics`: Summary of total appointments, confirmed visits, pending approval queue, and cash collections (PKR).
  - `routers/admin.py` implemented:
    - `/api/v1/admin/doctors/{id}/spotlight`: **Exclusive Admin Spotlight Controller** — toggling pinned doctor state on the directory and atomically purging Redis cache.
    - `/api/v1/admin/doctors/{id}/verify`: Doctor credential review and licensing status verification.
    - `/api/v1/admin/audit-logs`: System-wide immutable activity trail viewer.
  - Master test suite passed with 100% success across all 4 parts in `test_runner.py`.
- **Frontend Architecture & Live Server Verified:**
  - Node.js LTS v24.19.0 installed.
  - React 18 + TypeScript + Vite + Tailwind CSS scaffold created under `frontend/`.
  - TanStack Query client & Supabase Realtime client configured in `src/lib/api.ts`.
  - Core navigation and portals (Patient Spotlight Directory, Assistant Live Desk, Doctor Portal, Admin Governance) initialized.
  - Vite development server actively running on `http://127.0.0.1:5173` with reverse proxy to FastAPI backend `http://127.0.0.1:8000`.
- **Full End-to-End Interactive Frontend Wired & Verified:**
  - **Part 2 Patient Portal:** Dynamic D.I. Khan doctor directory, specialty & sub-region filters, interactive booking modal with live slot selection, Redis 10-minute temporary reservation lock, 6-digit OTP verification dialog with demo code preview, and passwordless "Track My Appointment" digital slip lookup.
  - **Part 3 Assistant Live Desk:** Receptionist login, live queue table displaying incoming verified requests, one-click "Approve & Issue Digital Slip" (`DIK-YYYYMMDD-XXX`), and "Mark as Paid" clinic cash collection button.
  - **Part 4 Doctor & Admin Portals:** Self-service assistant account appointment form and exclusive Admin Spotlight directory toggling with automatic Redis cache purging.


- **Gap Fixes Completed (Session 2 — 2026-10-01):**
  - **Gap #1 Fixed:** `POST /api/v1/assistant/appointments/{id}/reject` added to `routers/assistants.py`.
    - Transitions status to `REJECTED`, releases slot back to `available`, records audit log.
    - Also added `handleReject()` and a **Reject** button to the Assistant Live Desk in `App.tsx`.
  - **Gap #2 Fixed:** Blackout Calendar added to `routers/doctor_portal.py`:
    - `PATCH /api/v1/doctor/slots/{id}/block` — blocks a single slot.
    - `PATCH /api/v1/doctor/slots/{id}/unblock` — restores a blocked slot.
    - `POST /api/v1/doctor/blackout?date=YYYY-MM-DD` — bulk-blocks all available slots on a date.
  - **Gap #3 Fixed:** `GET /api/v1/admin/redis/status` added to `routers/admin.py`.
    - Returns active slot locks, directory cache entries, OTP sessions, and rate-limit counters.
    - Works in both real-Redis and in-memory fallback modes.
  - **Gap #4 Fixed:** `.env` updated with `DATABASE_URL` (Supabase PostgreSQL asyncpg), `SECRET_KEY`, `ENVIRONMENT`, `DEBUG`, and Vite frontend env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE`). `config.py` updated with `RESEND_API_KEY` and `SYSTEM_SENDER_EMAIL` fields.
    - **Action required:** Replace `[YOUR-DB-PASSWORD]` in `.env` `DATABASE_URL` with actual Supabase DB password.
  - **Gap #5 Fixed:** Supabase Realtime wired in `App.tsx` `AssistantSection`:
    - `supabase.channel('assistant-queue-live')` subscription on `postgres_changes` for `appointments` table.
    - Queue auto-refreshes on any INSERT/UPDATE without manual refresh.
    - Added pulsing green "Realtime Live" badge in the desk header.

