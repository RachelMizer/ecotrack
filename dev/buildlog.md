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

### 2026-09-29 (Site 2)
> All work from here on was done at **Site 2** until further notice.

- Cloned `RachelMizer/ecotrack` to `Desktop\EcoTrack` on the Site 2 machine
- Installed Python 3.13.15 (user install via winget); Node v24.19.0 was already installed
- Backend: created `backend/.venv`, installed `requirements.txt`, ran `migrate` and `seed_farm` (local SQLite; demo user `rachel` created)
- Frontend: ran `npm install` in `frontend/`
- Started both servers: API at http://localhost:8000, web app at http://localhost:5173. Verified demo login and that the API returns all 43 animals
- Stopped both servers, cleared `Desktop\EcoTrack` and recloned to pick up Site 1's push (`24d622c`, "Refine UI: login photo, dashboard layout, map labels, nutrition tabs"). The local setup above (`.venv`, `node_modules`, SQLite database) was removed with it
- Redid local setup on the new clone (`.venv` + `requirements.txt`, `migrate`, `seed_farm`, `npm install`) and restarted both servers. Verified demo login and all 43 animals
- Renamed boar piglet **Pork Solo** to **Ham Solo** (`farm_data.py`, `dev/animal data/Pigs.txt`); photo is now `ham-solo.jpg` in `images_needed.txt`. Re-ran `seed_farm`

---

## Next Up
- [ ] Add 44 photos listed in `images_needed.txt` (login chicken background + one per animal)
- [ ] Add licensed Milky Vintage / A Pompadour font files to `frontend/public/fonts/`
- [ ] Review `medication_suggestions.md` and name the unnamed heifer calf
- [ ] Push to GitHub, deploy API to Railway (Postgres) and web to Netlify
