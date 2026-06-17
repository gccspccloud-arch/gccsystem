# GCC Attendance Monitoring System

> **Gospel Coalition Church — San Pablo City, Laguna, Philippines**
> *"Sharing Christ, Changing Lives"*

A full-stack web application for managing church attendance, member records, and spiritual growth tracking (Life Development Progress) for a Filipino congregation of ~100 members.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **TanStack Query v5** | Server state & data fetching (5-min stale time) |
| **React Router v6** | Client-side routing |
| **React Hook Form** | Form handling & validation |
| **Axios** | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 4** | REST API server |
| **MongoDB Atlas** | Cloud database |
| **Mongoose 8** | ODM / data modeling |
| **JSON Web Tokens (JWT)** | Authentication |
| **bcryptjs** | Password hashing |
| **Helmet** | Security headers |
| **Morgan** | HTTP request logging |
| **express-validator** | Input validation |

### Deployment & Infrastructure
| Technology | Purpose |
|---|---|
| **Render (Free Tier)** | Hosting (API as web service, client as static site) |
| **render.yaml** | Infrastructure-as-code blueprint |
| **MongoDB Atlas** | Cloud-hosted database cluster |
| **UptimeRobot / cron-job.org** | Keep-alive pinging (`/healthz`) to prevent free-tier sleep |

### Brand Colors
- **Primary (Teal):** `#009688`
- **Accent (Red):** `#E53935`
- **Gold:** `#C8A951`

---

## System Functionalities

### 1. Authentication & Role-Based Access Control
- JWT-based authentication with three roles:
  - **Super Admin** — Full system access, including member deletion
  - **Admin** — Member CRUD, LDP categories, meeting/event types, attendance for any target
  - **Staff** — Read-only on most features; can only mark attendance for targets where they are the assigned teacher/minister
- Linked Member-User accounts via reference
- **Password visibility toggle** (eye icon) on login form

### 2. Member Management
- Full CRUD operations for church members
- PH-localized validation (Philippine address formats, contact numbers)
- 92 members (91 imported from Google Sheet + super admin)
- Member profile pages with tabbed views (Overview / Life Development)
- Birthdates are real data from the Google Sheet — never overwritten by seeds

### 3. Meetings
- Create and manage church meetings (DG, LH, Prayer Meeting, Prayer Watch, PDL, Tuklasin 1/2/3, LEAD)
- Configurable meeting types with descriptions
- Assign teacher and ministers per meeting
- Schedule with date/time and duration

### 4. Events
- Separate event management (e.g., Worship Service — Onsite & Online)
- Configurable event types
- Same scheduling and assignment capabilities as meetings

### 5. Outreach
- Dedicated outreach program management
- **Outreach Sessions** — meetings held under an outreach program
- **Outreach Attendees** — locals being discipled (analogous to visitors)
- Attendee profiles with a "Promote to Member" button (back-fills existing visitor attendance records)
- Outreach sessions appear on the calendar with purple dots

### 6. Attendance Tracking
- Mark attendance for any target: Meeting, Event, or Outreach Session
- Polymorphic target system (`{ kind, ref }` via Mongoose `refPath`)
- Visitor support — record attendance for non-members by name
- Optional `enteredAt` field for time-of-entry tracking
- Duplicate prevention via sparse unique index per (target, member)

### 7. Life Development Progress (LDP) — Core Feature
The LDP system tracks each member's spiritual growth across **12 categories**:

| Category | Type |
|---|---|
| DG / LH | Select |
| Worship Service | Select |
| Prayer Meeting | Select |
| Family Altar | Select |
| Prayer Watch | Select |
| PDL | Select |
| Tuklasin 1 / 2 / 3 | Select |
| LEAD | Select |
| Remarks | Text (freeform) |

#### Two Update Mechanisms

**Direct Assignment**
- Meeting/Event creators select LDP values at creation time (`ldpAssignments[]`)
- When attendance is marked, the selected value is written directly to the attendee's LDP
- Used for: DG, LH, Prayer Meeting, Worship Service (Onsite/Online), etc.

**Threshold Recompute (Automatic)**
- Counts a member's attendance at linked meeting/event types within a configurable window (default: 56 days / 8 weeks)
- Matches against threshold rules (e.g., >=6 = Regular, >=1 = Irregular, 0 = Not Yet)
- Used for: Prayer Meeting, Prayer Watch

Both mechanisms trigger automatically on attendance toggle/delete/visitor-promote via `setImmediate` (non-blocking). Manual recompute buttons are available on member profiles and the Manage LDP modal.

#### Worship Service Special Handling
- Split into two Event Types: **Onsite** and **Online**
- Both link to the single "Worship Service" LDP category
- "Both", "Irregularly Attending", "Visitor" require manual override

### 8. Calendar
- Unified calendar view showing all three target kinds:
  - **Meetings** — color-coded dots
  - **Events** — color-coded dots
  - **Outreach Sessions** — purple dots
- Quick navigation and scheduling overview

### 9. Reports & Printing
Seven report tabs, each with **CSV export** and **built-in print** functionality:

| Tab | Description |
|---|---|
| **Matrix** | Day-by-day attendance grid per member (defaults landscape) |
| **Attendance** | Flat list of all attendance records with filters |
| **By Event/Meeting** | Grouped by target with expandable attendee lists (defaults landscape) |
| **Regulars** | Member attendance summary ranked by count |
| **Visitors** | Visitor-only records with repeat-visitor sidebar |
| **Outreach** | Per-outreach summary + per-attendee breakdown |
| **Celebrants** | Birthdays and wedding anniversaries in date range |

#### Print Feature
- **Print header** — GCC logo (centered), church name, tagline, address, report title, date range
- **Print footer** (fixed, every page) — "Printed on [date/time] by [user name]"
- **Orientation toggle** — Portrait/Landscape selector (icon buttons) next to the Print button; defaults vary by report type
- **Print CSS** — Hides nav, sidebar, filters, buttons; forces background colors; removes overflow restrictions; repeats `thead` on every page
- Component: `client/src/components/PrintHeader.jsx`
- Print styles: `client/src/index.css` (`@media print` block)
- Orientation is injected dynamically via a `<style>` tag before `window.print()`

### 10. Admin Tools

#### Manage LDP Categories (Admin Only)
- Two-column modal: category list (left), edit/create form (right)
- Configure: name, description, order, active status, type (select/text), dropdown options, auto mode, linked types, window days, thresholds
- Rename option with automatic migration across all member records
- "Recompute All Members" bulk action

#### Manage Meeting / Event Types
- CRUD for meeting and event types
- "Feeds LDP" badge showing which LDP categories are linked
- Chip selector to wire types to LDP categories (auto-flips manual categories to attendance mode)

### 11. Cross-Collection Description Sync
- Meeting Types, Event Types, and LDP Categories can share names (e.g., "PDL")
- Editing a description in one collection automatically syncs to matching records in the others
- Prevents data inconsistency without manual updates

---

## Project Structure

```
gccsystem/
├── client/                    # React + Vite frontend
│   ├── public/                # Static assets (logo.jpg)
│   ├── src/
│   │   ├── assets/            # Images (logo.jpg)
│   │   ├── components/        # Reusable UI (PrintHeader.jsx, Navbar, etc.)
│   │   ├── pages/             # Page-level components (ReportsPage.jsx, LoginPage.jsx, etc.)
│   │   ├── services/          # API client functions
│   │   ├── context/           # React context providers (AuthContext)
│   │   ├── utils/             # Helpers (csv.js)
│   │   └── main.jsx           # App entry point
│   └── package.json
│
├── server/                    # Express API server
│   ├── server.js              # Entry point
│   ├── src/
│   │   ├── app.js             # Express app config
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API route definitions
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, validation, etc.
│   │   ├── services/          # Business logic (LDP recompute, etc.)
│   │   ├── utils/             # Helpers (description sync, etc.)
│   │   └── seed/              # Database seed scripts
│   └── package.json
│
├── render.yaml                # Render deployment blueprint
├── DEPLOY.md                  # Deployment guide
└── PROJECT_SUMMARY.md         # This file
```

---

## Seed Scripts

All idempotent (skip-by-name) unless marked destructive. Run from `server/` directory.

| Script | Command | Notes |
|---|---|---|
| Super Admin | `npm run seed:admin` | Creates from env vars |
| Meeting Types | `npm run seed:meeting-types` | Destructive (requires `FORCE_CLEAR_MEETINGS=1` if meetings exist) |
| Event Types | `npm run seed:event-types` | Destructive (requires `FORCE_CLEAR_EVENTS=1` if events exist) |
| LDP Categories | `npm run seed:ldp-categories` | Idempotent — 11 categories |
| LDP Wiring | `npm run seed:ldp-wiring` | Wires thresholds & linked types |
| Members | `npm run seed:members` | 91 members from Google Sheet (real birthdates) |
| **Sample Data** | `npm run seed:sample-data` | 30 meetings, 12 events, 1 outreach + 4 sessions, ~1500 attendance records, marriage dates for married members. Skips if already seeded. Titles prefixed with `[Sample]`. |
| Sync Descriptions | `node src/seed/syncAllDescriptions.js` | One-shot cross-collection alignment |

---

## Sample Data (seeded 2026-06-10)

For testing reports and the full UI:
- **30 meetings** — 5 types x 6 weeks (DG, LH, Prayer Meeting, Prayer Watch, PDL)
- **12 events** — Worship Service Onsite + Online x 6 Sundays
- **1 outreach** ("Brgy. San Lucas Outreach") + 4 weekly sessions
- **~1,514 attendance records** — 15-60 members + 1-8 visitors per target
- **Marriage dates** patched on married members who were missing them
- All sample records are prefixed with `[Sample]` for easy identification
- Birthdates are real data from the Google Sheet and are NOT modified

---

## Known Limitations

- No cron-scheduled LDP recompute (button-triggered only)
- No automatic "Both" detection for Worship Service (manual override required)
- No bulk-attendance import flow
- No audit log / LDP history table — only `updatedAt` / `updatedBy` on the latest value
- No name-sync across collections (descriptions only)
- Render free tier may sleep after 15 minutes of inactivity

---

*Last updated: June 10, 2026*
