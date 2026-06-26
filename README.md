# SARN — Full-Stack Reference Management System

A full-stack web application for managing Safety Data Sheet (SDS) references through multi-stage workflows, with role-based access for Super Admin, Admin, and Users. Includes an AI-powered chatbot, SDS document scanner, real-time calls & meetings via Google Meet, and comprehensive billing/reporting.

---

## Deployment

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Firebase Hosting | Deployed via `firebase deploy` |
| Backend | Google Cloud Run (asia-south1) | `https://sarn-backend-862276535294.asia-south1.run.app` |
| SDS Scanner | Python Flask (local / separate deploy) | `http://localhost:5050` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Node.js + Express.js |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Authentication |
| AI (Chatbot & Scanner) | Groq API (LLaMA 3.3 70B) |
| SDS Scanner Microservice | Python 3 + Flask |
| PDF Generation | PDFKit |
| Excel Parsing | SheetJS (xlsx) |
| Calls & Meetings | Google Calendar API v3 + Google Meet |
| Email Notifications | Nodemailer (Gmail SMTP) |
| Google Drive | Google Drive API v3 |
| Dev Runner | concurrently (backend + frontend + scanner) |

---

## Features

### Role-Based Access Control
- Three roles: **Super Admin**, **Admin**, and **User**
- Protected routes per role — unauthorized access redirects to login
- Role-aware sidebar navigation and dashboards

### SDS Workflow (4-Stage Pipeline)
Manages Safety Data Sheet processing through four sequential stages:
1. **Search** — Locate and verify SDS documents
2. **Supersede** — Check for newer/superseding versions
3. **Transcription** — Data entry from source SDS documents
4. **Billing** — Generate billing records for completed work

### Batch Workflow
- Bulk SDS processing with batch assignment and upload
- Batch tracking dashboard with per-user progress
- Batch billing and report generation
- **Batch Workflow Control** — admin control panel to manage batch pipeline stages

### DQ (Data Quality) Workflow
- Data quality review pipeline for uploaded references
- DQ assignment, processing forms, and sign-off
- DQ billing integration and reporting

### Reference Database
- Browse, filter, and manage all uploaded references
- Per-company, per-sheet filtering
- Export and search capabilities

### Excel Upload
- Bulk upload references via `.xlsx` / `.xls` files
- Automatic parsing and Firestore insertion
- Supported across SDS, Batch, and DQ workflows

### Reports & Billing
- Per-user, per-sheet billing reports for all three workflows (SDS, Batch, DQ)
- Super Admin consolidated reports across all users and businesses
- Columns: Assigned, Completed, **Prev. Completed**, **Total Pending**, Billed
- All-time completed tracking vs period-filtered completed (correctly differentiated)
- PDF report generation (downloadable) and on-screen table view
- Date-range filtering for period-based reporting

### AI-Powered Chatbot
- Floating chatbot widget available across all pages
- Powered by **Groq API (LLaMA 3.3 70B)**
- **PDF Upload & Q&A** — upload any PDF and ask questions about its contents
- **PDF Translation** — translate PDF sections line-by-line with side-by-side view:
  - Original text on the left, translated text on the right
  - Sentence-level splitting with numbered-list LLM prompting guarantees perfect 1:1 alignment
  - Supports all major languages

### SDS Scanner (AI Microservice)
- Standalone Python + Flask microservice (`sds-scanner/`)
- Upload any SDS PDF and automatically extract:
  - Product name, manufacturer, CAS numbers
  - GHS hazard pictograms (detected via image recognition)
  - Physical/chemical properties, hazard statements, first aid measures
  - Storage, disposal, and emergency contact information
- Powered by Groq (LLaMA 3.3 70B) for field extraction
- Handles both text-based and scanned (image) PDFs
- Results displayed in the **SDS Scanner** admin page with copy-to-clipboard

### Calls & Meetings (Google Meet Integration)
- **Group Calls** — call all currently online users with one click
- **Direct Calls** — 1-on-1 direct call between any two users
- **Schedule Meetings** — schedule future meetings with title, time, duration, description
- **Google Meet links** automatically generated via Google Calendar API v3 (OAuth2)
- Real-time **call notification overlays** across all layouts (User, Admin, SuperAdmin) — poll every 5 seconds
- **CallRoom page** — Google Meet transition screen that opens Meet in a new tab, tracks join/leave status
- **My Meetings tab** — view all scheduled meetings with join link and copy-to-clipboard
- Role-aware navigation and call history per user

### Attendance Tracking
- Super Admin attendance management
- View and manage attendance records per user

### User Management
- Admins can create users and assign roles
- Super Admin user list with edit capabilities
- Status tracking (online/offline/busy)

### Notifications
- Admin and Super Admin notification pages
- System-level alerts and call notifications

### Google Drive Integration
- Linked Google Drive access for SDS document retrieval
- Drive API v3 with service account credentials

---

## Project Structure

```
SARN Final/
├── frontend/                        # React + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth/                # Login, ResetPassword
│   │   │   ├── Admin/               # Dashboard, Upload, References, Workflow,
│   │   │   │                        # SDSReports, SDSBilling, SDSScanner,
│   │   │   │                        # Database, Notifications
│   │   │   ├── AdminBatch/          # BatchAssign, BatchUpload, BatchBilling,
│   │   │   │                        # BatchReport, BatchWorkflowControl
│   │   │   ├── AdminDQ/             # DQDatabase, DQUpload, DQBilling, DQReports
│   │   │   ├── SuperAdmin/          # Dashboard, CreateUser, UserList,
│   │   │   │                        # AttendancePage, Reports, Notifications
│   │   │   ├── User/                # UserDashboard, AssignedSDSWork,
│   │   │   │                        # CompletedSDSWork, WorkflowUserView,
│   │   │   │                        # Forms/ (SupersedeForm, TranscriptionForm)
│   │   │   ├── UserBatch/           # BatchTasks, BatchCompleted, BatchWorkflow
│   │   │   ├── UserDQ/              # AssignedDQWork, CompletedDQWork, DQWorkForm
│   │   │   └── CallsMeetings.jsx    # Calls & Meetings hub (all roles)
│   │   │   └── User/CallRoom.jsx    # Google Meet transition room page
│   │   ├── components/
│   │   │   ├── ChatBot.jsx          # AI chatbot with PDF Q&A and translation
│   │   │   ├── CallNotificationOverlay.jsx  # Real-time incoming call overlay
│   │   │   ├── AdminSidebar.jsx
│   │   │   ├── UserSidebar.jsx
│   │   │   ├── SuperAdminSidebar.jsx
│   │   │   └── StatusPicker.jsx     # User status selector
│   │   ├── layouts/                 # AdminLayout, UserLayout, SuperAdminLayout
│   │   ├── config/                  # apiClient (Axios instance)
│   │   ├── App.jsx                  # Routes + Protected Components
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── index.html
│
├── backend/                         # Express.js server (Cloud Run)
│   ├── server.js                    # Main server — all API endpoints
│   ├── sarn-drive-access.json       # Google Drive service account (gitignored, included in Cloud Run)
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── package.json
│
├── sds-scanner/                     # Python Flask AI microservice
│   ├── app.py                       # Flask app — /scan endpoint
│   ├── requirements.txt
│   ├── utils/
│   │   ├── pdf_text.py              # PDF text extraction
│   │   ├── pdf_images.py            # PDF-to-image rendering
│   │   ├── pictogram.py             # GHS pictogram detection
│   │   └── groq_llm.py              # Groq LLM field extraction
│   ├── templates/index.html         # Scanner standalone UI
│   ├── ghs_templates/               # GHS pictogram reference images
│   └── .env.example
│
├── package.json                     # Root — concurrently runner
├── firebase.json                    # Firebase project config
├── .firebaserc                      # Firebase project alias
├── .gitignore
└── .gcloudignore
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.9+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK: `gcloud` CLI

### 1. Clone the Repository

```bash
git clone https://github.com/samrudhrao13/SARN.git
cd SARN
```

### 2. Install All Dependencies

```bash
# Root runner
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# SDS Scanner (Python)
cd sds-scanner
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

**Backend** — create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key
```

**SDS Scanner** — create `sds-scanner/.env`:
```env
GROQ_API_KEY=your_groq_api_key
```

**Cloud Run (production)** — set via gcloud:
```bash
gcloud run services update sarn-backend --region=asia-south1 \
  --update-env-vars="GROQ_API_KEY=...,GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=...,GOOGLE_REFRESH_TOKEN=..."
```

**Service account credentials** (never commit these):
- `backend/sarn-technologies-21d6e-a45c0f181abc.json` — Firebase Admin SDK
- `backend/sarn-drive-access.json` — Google Drive API

### 4. Run Locally (All Services)

```bash
npm start
```

This starts all three services concurrently:
- Backend at `http://localhost:4002`
- Frontend at `http://localhost:5173`
- SDS Scanner at `http://localhost:5050`

Or run individually:
```bash
npm run backend    # Express server
npm run frontend   # Vite dev server
npm run scanner    # Python Flask scanner
```

---

## API Endpoints

### References
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-excel` | Upload Excel file with references |
| GET | `/references` | List references (`company`, `sheet` query params) |
| GET | `/references/:company/:sheet/:refId` | Get single reference |

### SDS Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workflow/search` | Submit Search stage |
| POST | `/workflow/supersede` | Submit Supersede stage |
| POST | `/workflow/transcription` | Submit Transcription stage |
| POST | `/workflow/billing` | Submit Billing stage |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assign` | Assign users to workflow stages |
| GET | `/assigned/:email` | Get assignments for a user |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/reports/sds` | SDS billing report (date range) |
| GET | `/admin/reports/batch` | Batch report (date range) |
| GET | `/admin/reports/dq` | DQ report (date range) |
| GET | `/super-admin/reports` | Consolidated super admin report |

### Calls & Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/calls/create` | Create group call room (generates Meet link) |
| POST | `/calls/direct` | Create direct call between two users |
| POST | `/calls/join` | Mark user as joined a call room |
| POST | `/calls/leave` | Mark user as left a call room |
| GET | `/calls/room/:roomId` | Get call room details and Meet link |
| GET | `/calls/users` | List online users for calling |
| GET | `/calls/active` | List active call rooms |
| POST | `/meetings/schedule` | Schedule a meeting (generates Meet link + sends email) |
| GET | `/meetings/mine` | Get meetings for current user |

### AI (Chatbot)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/pdf/upload` | Upload PDF for chatbot context |
| POST | `/admin/pdf/ask` | Ask a question about uploaded PDF |
| POST | `/admin/pdf/translate-section` | Translate PDF section line-by-line |

---

## User Roles

| Role | Access |
|------|--------|
| **Super Admin** | Full system access — create users, manage attendance, view all workflows, consolidated reports, notifications |
| **Admin** | Upload references, assign work, monitor all workflow stages, generate reports, access SDS Scanner, manage calls/meetings |
| **User** | View and complete assigned workflow tasks, join calls/meetings, view own reports |

---

## Workflows

### SDS Workflow
Manages Safety Data Sheet processing through four sequential stages:
1. **Search** — Locate SDS documents
2. **Supersede** — Check for newer/superseding versions
3. **Transcription** — Data entry from source documents
4. **Billing** — Generate billing records

### Batch Workflow
Handles bulk SDS processing with batch assignment, tracking, and reporting. Admin has a Workflow Control panel to manage batch pipeline stages.

### DQ (Data Quality) Workflow
Quality review pipeline covering data validation, processing, and sign-off with billing integration.

---

## Google Meet Integration

Calls and meetings use the **Google Calendar API v3** with OAuth2 to generate real `meet.google.com` links:

1. A Google OAuth2 client is configured with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`
2. Every call/meeting creation automatically creates a Google Calendar event with a Google Meet conference
3. The Meet link is stored in Firestore and returned to users
4. Users open Meet in a new tab; the CallRoom page tracks join/leave status

---

## SDS Scanner Microservice

The `sds-scanner/` directory is a standalone Python Flask service:

- **Endpoint:** `POST /scan` — accepts a PDF file, returns extracted SDS fields as JSON
- Supports text-based and scanned PDFs
- GHS pictogram detection via image matching
- Field extraction via Groq LLaMA 3.3 70B
- CORS configured for the Vite dev server

---

## Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `GROQ_API_KEY` | Cloud Run + local `.env` | Groq API key for AI features |
| `GOOGLE_CLIENT_ID` | Cloud Run env var | OAuth2 client ID for Google Meet |
| `GOOGLE_CLIENT_SECRET` | Cloud Run env var | OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | Cloud Run env var | OAuth2 refresh token (sarnproduction@sarntech.in) |

---

## License

This project is proprietary. All rights reserved.
