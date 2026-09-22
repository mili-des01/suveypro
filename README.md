# SurveyPro

Professional land surveying company website & booking management platform.

**Stack:** Node.js + Express · PostgreSQL · HTML5/CSS3/Vanilla JS · Lucide Icons

## Quick start

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET
npm run migrate             # create schema
npm run seed                # optional: demo content + admin account
npm start                   # http://localhost:3000
```

| Area | URL |
|---|---|
| Public website | http://localhost:3000 |
| Booking form | http://localhost:3000/booking |
| Admin login | http://localhost:3000/admin/login.html |
| Admin dashboard | http://localhost:3000/admin/dashboard.html |

## Structure

```
backend/    Express server, routes, controllers, models, services
frontend/   Static public pages, admin pages, CSS, JS, assets
migrations/ SQL migrations (run with npm run migrate)
scripts/    migrate.js · seed.js
```

## Roles

`admin` (full access) · `manager` (no user management) · `surveyor` (read-only) · `staff` (read-only)

## Notes

- Files are uploaded to Cloudinary/S3 when configured; otherwise a local
  `backend/uploads/` folder is used (never stored inside PostgreSQL).
- PostgreSQL stores metadata only — file URLs, storage keys and sizes.
