# D.I. Khan Care — Official Database Documentation

**Project Name:** D.I. Khan Doctor Appointment & Healthcare Management System  
**Database Engine:** SQLite 3  
**Database File:** `dikhan_care.db`  
**SQL Script File:** `database_dump.sql` (Full Schema & Data Export)  

---

## 1. Overview & Architecture

The database manages a multi-tenant healthcare appointment and clinic reception workflow in Dera Ismail Khan. It follows a normalized relational structure with UUID primary keys, foreign key constraints, UTC timestamp tracking, and financial audit logs.

### Key Capabilities Managed by the Schema:
- **Role-based Authentication:** Doctors, Assistants (receptionists), Patients, and Admins.
- **Doctor Practice Details:** Medical specialties, shift hours (Morning/Evening/Both), consultation fees, weekly off-days, experience years, portrait images, treated diseases bio, and 3 custom expertise tags.
- **Slot Scheduling & Concurrency Control:** Unique slot allocations preventing double-booking race conditions.
- **Patient Bookings & Queue Management:** Auto-generated sequence slips (e.g. `DIK-CARD-20261017-009-15`) and token sequence numbers.
- **In-Clinic Cash Desk (Payments):** Tracking consultation payments, collection timestamps, and staff actors.
- **Patient Feedback:** Verified patient star ratings and clinical reviews.
- **Audit Logs:** Immutable audit trail of financial collections, slot cancellations, and status modifications.

---

## 2. Database Schema & Tables

The database consists of **8 core tables**:

### 1. `users`
Stores user accounts and authentication credentials.
- `id` (VARCHAR 36, PK): Unique user UUID.
- `email` (VARCHAR 255, Unique): Login email address.
- `password_hash` (VARCHAR 255): Salted PBKDF2 / bcrypt cryptographic password hash.
- `full_name` (VARCHAR 120): User's legal name.
- `phone` (VARCHAR 30): Mobile contact number.
- `role` (VARCHAR 20): Account role (`DOCTOR`, `ASSISTANT`, `PATIENT`, `ADMIN`).
- `is_active` (BOOLEAN): Account status toggle.
- `created_at` / `updated_at`: UTC timestamps.

### 2. `doctors`
Stores doctor clinical profile, scheduling rules, and public booking details.
- `id` (VARCHAR 36, PK): Unique doctor record UUID.
- `user_id` (VARCHAR 36, FK -> `users.id`): Associated user login.
- `specialty` (VARCHAR 100): Clinical specialty (e.g., Cardiologist, Gynecologist).
- `sub_region` (VARCHAR 100): D.I. Khan zone (e.g. Circular Road, University Road).
- `clinic_address` (TEXT): Physical clinic location.
- `google_maps_url` (TEXT): Directions link for patient navigation.
- `fee_clinic` (NUMERIC 10,2): Consultation fee in PKR (e.g. Rs. 1,500).
- `shift` (VARCHAR 20): Shift pattern (`MORNING`, `EVENING`, `BOTH`).
- `morning_start` / `morning_end`: Morning consultation hours (e.g., `09:00` - `13:00`).
- `evening_start` / `evening_end`: Evening consultation hours (e.g., `17:00` - `21:00`).
- `off_days` (TEXT): Weekly off days where slots are suppressed (e.g. `friday,sunday`).
- `experience_years` (INTEGER): Total clinical experience in years (e.g., `15`).
- `bio` (TEXT): Paragraph describing treated diseases and diagnoses.
- `expertise` (VARCHAR 255): 3 custom expertise badges (e.g., `Cardiology, Hypertension, General medicine`).
- `profile_image` (VARCHAR 500): Cloudinary CDN photo URL or local avatar.
- `is_spotlight` (BOOLEAN): Pinned doctor toggle for homepage spotlight.
- `verification_status` (VARCHAR 20): PMDC status (`verified`, `pending`, `rejected`).

### 3. `doctor_assistants`
Maps receptionists to the specific doctor clinic they manage.
- `doctor_id` (VARCHAR 36, PK, FK -> `doctors.id`): Associated doctor.
- `assistant_user_id` (VARCHAR 36, PK, FK -> `users.id`): Linked receptionist.
- `status` (VARCHAR 20): `active` or `revoked`.
- `created_at`: UTC timestamp.

### 4. `doctor_slots`
Pre-generated consultation slots with concurrency locking constraints.
- `id` (VARCHAR 36, PK): Unique slot identifier.
- `doctor_id` (VARCHAR 36, FK -> `doctors.id`): Associated doctor.
- `start_time` (DATETIME): Slot start timestamp (UTC).
- `end_time` (DATETIME): Slot end timestamp (UTC).
- `status` (VARCHAR 20): Availability state (`available`, `hold`, `booked`, `blocked`).
- **Constraint:** `UniqueConstraint("doctor_id", "start_time")` prevents duplicate slots.

### 5. `appointments`
Patient consultation reservations and queue tracking.
- `id` (VARCHAR 36, PK): Unique appointment UUID.
- `patient_id` (VARCHAR 36, FK -> `users.id`): Booked patient user record.
- `doctor_id` (VARCHAR 36, FK -> `doctors.id`): Consulting doctor.
- `slot_id` (VARCHAR 36, FK -> `doctor_slots.id`): Assigned consultation slot.
- `assistant_id` (VARCHAR 36, FK -> `users.id`): Receptionist who approved/checked-in.
- `slip_number` (VARCHAR 50, Unique): Digital slip format (e.g., `DIK-CARD-20261017-009-15`).
- `patient_name`, `patient_phone`, `patient_email`: Patient contact details.
- `status` (VARCHAR 40): Appointment state (`PENDING_ASSISTANT_APPROVAL`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- `notes`: Clinical remarks or symptoms described by patient.

### 6. `payments`
Cash desk collection records for in-clinic governance.
- `id` (VARCHAR 36, PK): Unique payment UUID.
- `appointment_id` (VARCHAR 36, Unique, FK -> `appointments.id`): Linked appointment.
- `amount` (NUMERIC 10,2): Consultation fee amount collected.
- `status` (VARCHAR 20): Payment status (`PENDING_CASH`, `PAID`).
- `paid_at` (DATETIME): Timestamp when fee was received.
- `collected_by` (VARCHAR 36, FK -> `users.id`): Staff member who collected the cash.

### 7. `doctor_reviews`
Verified patient feedback and clinical satisfaction ratings.
- `id` (VARCHAR 36, PK): Review UUID.
- `appointment_id` (VARCHAR 36, Unique, FK -> `appointments.id`): Associated consultation.
- `doctor_id` (VARCHAR 36, FK -> `doctors.id`): Reviewed practitioner.
- `rating` (INTEGER): Rating on a scale of 1 to 5 stars.
- `comment` (TEXT): Patient feedback remarks.
- `is_verified` (BOOLEAN): PMDC verified patient review toggle.

### 8. `audit_logs`
Security and financial accountability audit trail.
- `id` (VARCHAR 36, PK): Audit record UUID.
- `actor_id` (VARCHAR 36): User ID who triggered the action.
- `action` (VARCHAR 100): Action type (e.g., `CASH_PAYMENT_COLLECTED`, `STATUS_CHANGED`).
- `entity` (VARCHAR 50): Target entity (e.g. `Payment`, `Appointment`).
- `entity_id` (VARCHAR 36): Record ID affected.
- `before_value` / `after_value`: State diff before and after action.
- `timestamp`: UTC audit timestamp.

---

## 3. How to Open and Inspect the Database

### Method A: Using DB Browser for SQLite (Recommended)
1. Download & install **[DB Browser for SQLite](https://sqlitebrowser.org/dl/)** (Free & Open Source for Windows/Mac/Linux).
2. Launch DB Browser and click **"Open Database"**.
3. Select the included `dikhan_care.db` file.
4. Click on the **"Browse Data"** tab to view tables like `doctors`, `appointments`, and `payments`.
5. Click on the **"Execute SQL"** tab to run custom SQL queries.

### Method B: Opening in VS Code / Cursor
1. Install the **"SQLite Viewer"** or **"Database Client"** extension in VS Code.
2. Click directly on `dikhan_care.db` to explore tables visually.

### Method C: Importing the SQL Script (`database_dump.sql`)
- You can open `database_dump.sql` directly in any text editor (Notepad, VS Code) to view the complete DDL schema statements and INSERT commands.
- To import into a new SQLite database using the command line:
  ```bash
  sqlite3 new_database.db < database_dump.sql
  ```
