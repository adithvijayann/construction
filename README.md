# Construction Log Management System

Production-ready MERN application for construction companies to manage contractors, clients, supervisors, projects, worker logs, material usage, progress updates, files, expenses, and client progress visibility.

## Stack

- React + Vite frontend with role-based dashboards
- Node.js + Express backend
- MongoDB + Mongoose
- JWT auth + bcrypt password hashing
- Multer uploads with strict file validation
- Gmail SMTP email service for account credentials

## Roles

- `admin`: manages contractors, users, projects, clients, supervisors, expenses, and reports.
- `contractor`: creates clients, supervisors, projects, agreement files, plot photos, and views project expenses/progress.
- `supervisor`: updates only assigned projects with worker logs, material logs, and optional progress photos.
- `client`: views only their own project details, timeline, progress updates, photos, and status.

## Business Rules Implemented

- Client accounts belong to exactly one contractor.
- Projects belong to one contractor and one client, with optional assigned supervisor.
- Supervisors can update only assigned projects.
- Clients can only read their own project data.
- Agreement upload accepts only JPG or PDF.
- Plot and progress photos accept only JPG.
- Passwords are always hashed.
- Contractor-created clients receive a generated temporary password by email when notifications are enabled.
- Supervisor worker/material entries support `daily` or `monthly` usage periods.

## Quick Start

```bash
npm install
npm run seed
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:5000`

## Demo Accounts

- Admin: `admin@example.com` / `Password123!`
- Contractor: `contractor@example.com` / `Password123!`
- Supervisor: `supervisor@example.com` / `Password123!`
- Client: `client@example.com` / `Password123!`

## Environment

Backend: set these in `server/.env`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
API_PUBLIC_URL=http://localhost:5000
MONGO_URI=mongodb://127.0.0.1:27017/construction_daily_log
JWT_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-long-random-refresh-secret
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=your-google-app-password
EMAIL_SEND_TIMEOUT_MS=15000
```

Frontend: set this in `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Keep the real MongoDB URI and Gmail app password in env files or your deployment provider secrets, not in source control.

## API Reference

Auth:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Admin:

- `GET /api/admin/overview`
- `GET /api/admin/reports`
- `GET /api/admin/contractors`
- `POST /api/admin/contractors`
- `PUT /api/admin/contractors/:contractorId`
- `PATCH /api/admin/contractors/:contractorId/deactivate`

Contractor:

- `GET /api/contractor/clients`
- `POST /api/contractor/clients`
- `GET /api/contractor/supervisors`
- `POST /api/contractor/supervisors`
- `GET /api/contractor/projects`
- `POST /api/contractor/projects`
- `GET /api/contractor/projects/:projectId`
- `GET /api/contractor/expenses`

Supervisor:

- `GET /api/supervisor/projects`
- `GET /api/supervisor/work-logs`
- `POST /api/supervisor/work-logs`
- `GET /api/supervisor/material-logs`
- `POST /api/supervisor/material-logs`
- `GET /api/supervisor/progress-updates`
- `POST /api/supervisor/progress-updates`

Client:

- `GET /api/client/project-details`
- `GET /api/client/progress`

Files:

- `GET /api/files/:documentId/download`

## Upload Fields

Create project:

- `agreementFile`: JPG or PDF
- `plotPhoto`: JPG only

Progress update:

- `photos`: JPG only, optional

Uploaded files are organized under:

- `uploads/agreements`
- `uploads/plot-photos`
- `uploads/progress-photos`

## Deployment

- Use MongoDB Atlas or Railway MongoDB for `MONGO_URI`.
- Deploy API to Render/Railway as a Node service.
- Deploy frontend to Vercel/Render static site with `VITE_API_URL`.
- Store `JWT_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_USER`, and `EMAIL_PASS` as provider secrets.
- `render.yaml` is included as a deployment starting point.

## Verification

```bash
npm audit --omit=dev
npm run check
npm run seed
```
