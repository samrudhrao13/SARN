# SARN — SDS & Data Quality Workflow Management Platform

SARN (built by SARN Technologies) is an internal workflow management system for handling **Safety Data Sheet (SDS) processing, Data Quality (DQ) review, and batch document verification**. It supports role-based access for Super Admins, Admins, and Workers, and tracks each document through a multi-stage pipeline from upload to billing.

## Tech Stack

**Frontend**
- React 18 + Vite
- React Router v6 (role-protected routing)
- Axios for API calls
- React Icons

**Backend**
- Node.js + Express
- Firebase Admin SDK (Firestore as the database, Cloud Storage for files)
- `xlsx` for Excel import/export
- `pdfkit` for PDF generation
- `node-cron` for scheduled tasks
- Containerized with Docker, deployed to Google Cloud Run (`asia-south1`)

**Hosting / Infra**
- Frontend: Firebase Hosting
- Backend: Google Cloud Run
- A `functions/` directory exists with Firebase Cloud Functions scaffolding, but it's currently just boilerplate and isn't in active use.

## Roles

| Role | Capabilities |
|---|---|
| **Super Admin** | Creates and deletes users, force-resets passwords, views attendance records |
| **Admin** | Uploads reference/batch sheets, assigns work to users, manages workflow stages, views billing and reports |
| **User / DQ User** | Works through tasks assigned to them at whichever workflow stage they're responsible for |

Login is username/password based (custom auth against Firestore, not Firebase Authentication), and every login is logged for attendance tracking (session duration vs. an expected workday length).

## Core Modules

The app is organized into three parallel workflow types, each with its own admin and user-facing pages:

**SDS Workflow** — the primary pipeline. Documents move through four stages: **Search → Supersede → Transcription → Billing**. Admins upload reference Excel sheets and assign records to users; users complete their assigned stage through a dedicated form (`SearchForm`, `SupersedeForm`, `TranscriptionForm`).

**DQ (Data Quality) Workflow** — a review/audit pipeline running in parallel to SDS, with its own upload, assignment, and reporting pages for both admins and users.

**Batch Workflow** — a third pipeline for processing records in bulk, including a verification step before items move to billing, with its own dashboard, assignment, and export tooling.

Each workflow type has matching Admin pages (Dashboard, Upload, Assign, Workflow, Billing, Reports/Database) and User pages (assigned tasks, in-progress work, completed work).

**Attendance Tracking** — every login/logout is recorded with session duration, compared against an expected workday (currently hardcoded to 420 minutes / 7 hours), visible to Super Admins.

**User Management** — Super Admins create new accounts; the system auto-generates a user ID (`SARN####`) and a temporary password that must be reset on first login.

## Project Structure

```
SARN Final/
├── frontend/                  React + Vite app
│   └── src/
│       ├── pages/
│       │   ├── Auth/          Login, password reset
│       │   ├── Admin/         SDS admin pages
│       │   ├── AdminDQ/       DQ admin pages
│       │   ├── AdminBatch/    Batch admin pages
│       │   ├── User/          SDS worker pages
│       │   ├── UserDQ/        DQ worker pages
│       │   ├── UserBatch/     Batch worker pages
│       │   └── SuperAdmin/    User management, attendance
│       ├── components/        Sidebars, toggles
│       ├── layouts/            Per-role page layouts
│       ├── api/                API call wrappers
│       └── config/apiClient.js Axios instance (reads VITE_API_BASE)
│
└── backend/                   Express server
    ├── server.js               All API routes (auth, upload, assign, workflow stages, billing, exports)
    ├── firestore.rules          Role-based Firestore security rules
    ├── storage.rules            Cloud Storage security rules
    ├── Dockerfile               Cloud Run deployment image
    └── functions/                Firebase Functions scaffold (unused)
```

## Local Development Setup

### Backend
```bash
cd backend
npm install
```
The backend needs Google Cloud credentials to reach Firestore/Storage. For local development, authenticate with:
```bash
gcloud auth application-default login
```
(Do **not** use a downloaded service account JSON key for this — see Security Notes below.)

Start the server:
```bash
node server.js
```
Runs on port `8080` by default, or whatever `PORT` is set to in your environment.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` by default. The frontend reads its backend URL from `VITE_API_BASE` — set this in a local `.env` (e.g. `VITE_API_BASE=http://localhost:8080`) to match wherever your backend is actually running.

### Production build
```bash
cd frontend
npm run build
```
Outputs to `dist/`, which Firebase Hosting serves directly (see `firebase.json`).

## Security Notes (please address before going further)

- A hardcoded super-admin credential bypass currently exists in `server.js`'s login route. This should be removed and replaced with a properly stored, rotatable admin account.
- User passwords are stored and compared in plaintext in Firestore. These should be hashed (e.g. with bcrypt) before storage.
- Default and reset passwords follow a predictable pattern and should be replaced with securely generated random values, ideally combined with forced reset via a proper invite/reset-token flow.
- Do not commit `.env`, `.env.production`, or any service account JSON key files. Make sure `*.json` service account keys are excluded in `.gitignore` for the `backend/` folder specifically.
- If a service account key has ever been exposed (committed, shared, etc.), rotate it immediately via the GCP Console.

## Known Limitations

- No automated tests currently exist.
- The `functions/` directory is unused boilerplate from `firebase init` and can likely be removed if not planned for use.
- Authentication is custom-built rather than using Firebase Auth, which means no built-in features like email verification, MFA, or session/token expiry are currently available.
