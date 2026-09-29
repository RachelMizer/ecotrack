# EcoVitals Build Log

Wildlife telemetry platform: movement tracking and biometric monitoring for landowners, conservation teams, and property managers.

## Stack

| Layer            | Technology       |
| ---------------- | ---------------- |
| Database         | PostgreSQL       |
| Source control   | GitHub           |
| Backend          | Django / Python  |
| Backend hosting  | Railway          |
| Frontend         | React.js         |
| Frontend hosting | Netlify          |

---

## Log

### 2026-09-27
- Created project folder and `dev/` workspace
- Added `project_info.txt` (app description, stack, landing page requirements)
- Added `info.env`

### 2026-09-28
- Added logo assets (`logo.psd`, `logo.png`)
- Added site plan (`site_plan.psd`, `site_plan.png`)
- Created `buildlog.md`

### 2026-09-29
- Renamed product to **EcoTrack** per `site_description.txt` (livestock tracking for cows, pigs, chickens)
- Backend: Django + DRF API in `backend/` (models, seed script, schedule rules, token auth, Railway config)
- Frontend: React + Vite app in `frontend/`. Pages: Login, Dashboard, Catalog (+ per-animal weight/temperature tables), Tracker, Nutrition, Schedule, Account, Developer's Notes
- Seeded 43 animals with weekly weights, temperatures every 2 days, illness histories, treatments, 12 feeders and 72 h of tracker data
- Added `images_needed.txt` and `medication_suggestions.md`

---

## Next Up
- [ ] Add 44 photos listed in `images_needed.txt` (login chicken background + one per animal)
- [ ] Add licensed Milky Vintage / A Pompadour font files to `frontend/public/fonts/`
- [ ] Review `medication_suggestions.md` and name the unnamed heifer calf
- [ ] Push to GitHub, deploy API to Railway (Postgres) and web to Netlify
