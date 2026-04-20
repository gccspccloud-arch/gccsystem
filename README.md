# GCC Attendance Monitoring System

**Gospel Coalition Church** — *Sharing Christ, Changing Lives*

A lightweight, professional MERN-stack attendance monitoring system for managing church member registration and attendance tracking.

---

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + TanStack Query
- **Backend:** Node.js + Express + Mongoose
- **Database:** MongoDB Atlas
- **Auth (planned):** JWT + bcryptjs

---

## Project Structure

```
gccsystem/
├── server/      # Backend API (Node + Express + MongoDB)
└── client/      # Frontend (React + Vite + Tailwind)
```

---

## Prerequisites

| Tool     | Version |
|----------|---------|
| Node.js  | v18+    |
| npm      | v9+     |
| MongoDB  | Atlas (already configured) |

---

## Setup Instructions

### 1. Place the GCC logo

Save the church logo image to **both** locations (same file, used by Vite for favicon and React for navbar/home):

- `client/public/logo.png`
- `client/src/assets/logo.png`

### 2. Backend Setup

```bash
cd server
npm install
npm run dev
```

API runs at `http://localhost:5000`. Health check: `http://localhost:5000/api/health`

### 3. Frontend Setup

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Web app runs at `http://localhost:5173`

---

## Environment Variables

Both `server/` and `client/` have `.env` (already filled) and `.env.example` (template).

**Never commit `.env` files** — they are listed in `.gitignore`.

---

## Available Scripts

### Backend (`server/`)
- `npm run dev` — Start with auto-reload (nodemon)
- `npm start` — Start production server

### Frontend (`client/`)
- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run preview` — Preview production build

---

## Roadmap

- [x] Project scaffolding
- [ ] Member registration (next)
- [ ] Authentication (admin login)
- [ ] Attendance check-in
- [ ] Reports & analytics
- [ ] QR code-based check-in
