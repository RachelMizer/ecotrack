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

## Pending: Site 1 machine
> **Reminder (any site):** when asked for the project status, remind the user of every unchecked step below before anything else.
> Once the user confirms a step is done, check it off here and add a log entry.

Site 2 pushed `d4296cb` (incubator catalog page, plus `0f13fdd` Ham Solo rename). Site 1's database still has the old schema and data. Run these on the **Site 1 machine**:

- [ ] `git pull` in `Desktop\EcoTrack` (should bring `main` to `d4296cb` or later)
- [ ] In `backend/`: `python manage.py migrate` (applies `0002_incubator`, the new incubator tables)
- [ ] In `backend/`: `python manage.py seed_farm --keep-user` (reseeds all farm data: incubator eggs and Ham Solo's new name)
- [ ] Restart the API (`python manage.py runserver`) and the web app (`npm run dev` in `frontend/`), then log in and check that Catalog shows an **Incubator** button with 10 eggs and that the Pigs page lists **Ham Solo**

No new Python or npm packages, so `pip install` and `npm install` aren't needed.

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
- Site 2 machine setup: set PowerShell execution policy to RemoteSigned (CurrentUser) so `npm` works, and installed `requirements.txt` into the main Python 3.13 so `python manage.py runserver` works without activating `.venv`
- Account page: removed the "change your password in the Django admin" note
- Catalog: added an **Incubator** section (`/catalog/incubator`). New `Incubator` / `IncubatorEgg` models (migration `0002_incubator`) and `/api/incubators/` endpoint. Each egg shows the hen that laid it, color, size and weight, shell, candling result, days in the incubator, projected hatch date (set date + 21 days) and last checked date. Seeded 10 eggs in the 12-slot Neverland Incubator (two batches). Re-ran `seed_farm`
- Dashboard: tightened padding on the status pills in the Health tile's "Needs attention" list
- Committed and pushed to GitHub as `d4296cb` ("Add incubator to catalog; tidy account page and dashboard pills"). The push also brought up `0f13fdd` (Ham Solo rename), which hadn't been pushed yet. Site 1 needs to migrate and reseed (see **Pending: Site 1 machine** above)

### 2026-10-08 (`C:\EcoTrack`)
- Deployed: API on Railway (https://ecotrack-production-4729.up.railway.app, Postgres) and web on Netlify (https://rmecotrack.netlify.app). Repo renamed to `RachelMizer/ecotrack`
- Railway ignored `backend/railway.json` (it only reads config at the repo root), so the `Procfile` now runs `migrate` and `collectstatic` before gunicorn and `railway.json` is gone. Railway auto-deploy didn't fire on push; deploys were started with `railway redeploy --from-source`
- Tracker: positions refresh every 5 seconds with a simulated live fix (smooth wander inside each animal's zone), dots glide between fixes
- Roles and classroom features from `dev/10-8 updates.txt` (migration `0003_roles_classes_assignments`):
  - Roles: Student (all existing accounts), Volunteer, Instructor. Demo logins `rachel` (student, also a summer volunteer) and `instructor`
  - Instructor pages: **Classes** (classes by term, create/edit, rosters, add students with a temporary password), **Summer volunteers** tab, **Person** page (details, responsibility schedule, fulfillment history, reset password), **Assignments** (8 task types, several animals at once, daily/weekly repeats)
  - Student/volunteer page: **My Schedule** (tasks by day, links to the animal or feeder, timestamped mark-complete; weights/temperatures can record a reading, refills top up the feeder)
  - Account: instructor office location, hours and message; students and volunteers see their class and instructor; change password
  - Dashboard: Farm Updates bulletin above the herd overview. Animal cards show assigned care with a care-history page; feeder cards show who refilled last and who's next
  - Seasons: 16-week spring and fall semesters; summer is June 1 to August 15, when volunteers do refills, special feedings and weights and a vet does the rest with the instructor
  - Seed: 2 current classes + 1 previous, 16 students, 5 volunteers (2 non-students), ~1,300 assignments across spring, summer and fall, 3 farm updates

---

## Next Up
- [ ] Add 44 photos listed in `images_needed.txt` (login chicken background + one per animal)
- [ ] Add licensed Milky Vintage / A Pompadour font files to `frontend/public/fonts/`
- [ ] Review `medication_suggestions.md` and name the unnamed heifer calf
- [x] Deploy API to Railway (Postgres) and web to Netlify (code is on GitHub; run `migrate` and `seed_farm` on Railway after the first deploy)
- [ ] Turn Railway auto-deploy back on (service Settings → Source) so pushes to `main` redeploy the API
