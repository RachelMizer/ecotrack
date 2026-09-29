# EcoTrack

*Where animal health meets land insight.*

Livestock tracking and health monitoring for cows, pigs and chickens: movement trails on a farm map, per-animal
weight and temperature history, feeder levels, vaccinations and medications, and a daily feeding and medication
schedule that adapts to each animal.

| Layer | Technology | Folder |
|---|---|---|
| Database | PostgreSQL (SQLite fallback locally) | — |
| Backend / API | Django 6.1 + Django REST Framework | `backend/` |
| Frontend | React 19 + Vite, Recharts, React Router | `frontend/` |
| Backend hosting | Railway | `backend/railway.json` |
| Frontend hosting | Netlify | `netlify.toml` |

## Run it locally

Two terminals.

**API (http://localhost:8000)**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_farm      # creates the farm data and the demo login
python manage.py runserver
```

**Web app (http://localhost:5173)**

```bash
cd frontend
npm install
npm run dev
```

Demo login: **rachel / EcoTrack2026!**. Change it before deploying (`/admin/` or `manage.py changepassword rachel`).

Re-running `seed_farm` rebuilds all data relative to today's date. Ages in `dev/animal data` are measured back from
the day it runs.

## Pages

| Page | Route | What it shows |
|---|---|---|
| Login | `/login` | Chicken background and login form |
| Dashboard | `/dashboard` | Temperature scatter by day of month, weight-by-age scatters, health, feed and egg tiles. Filter by month, species, group, life stage, animal and health, with a clear-filters button. |
| Catalog | `/catalog`, `/catalog/cows` … | Cows / Pigs / Chickens buttons, then each animal's photo and stats. Weight and temperature link to history. |
| Records | `/catalog/:group/:animal/weights` · `/temperatures` | Filterable table and chart. Weights are weekly from birth; temperatures every 2 days. |
| Tracker | `/tracker` | Farm map with 6/24/72 h trails. Click an area to zoom into the coops, pens or enclosures; click a dot to open that animal in the catalog. |
| Nutrition | `/nutrition` | Feeder contents, levels and refill dates, plus vaccinations and medications for every animal |
| Schedule | `/schedule` | Daily feed and dose plan per animal (or as a run sheet by time) and what's due in the next 21 days |
| Account | `/account` | User and farm details (editable) |
| Developer's Notes | `/developer-notes` | Frameworks, scripts, files, API and deployment notes (linked in the footer) |

## Deploy

**Railway (API)**
1. New project from the GitHub repo, with the service's root directory set to `backend`.
2. Add a PostgreSQL database. Railway injects `DATABASE_URL`.
3. Set the variables listed in `backend/.env.example` (`DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`,
   `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` = your Netlify URL).
4. Deploy. `railway.json` runs migrations and collectstatic, then starts gunicorn.
5. Run `python manage.py seed_farm` once from the Railway shell.

**Netlify (web)**: import the repo. `netlify.toml` builds `frontend/`. Set `VITE_API_URL` to the Railway URL.

## Assets still needed

- **Photos:** see `dev/images_needed.txt` (44 images). Drop files in and they appear, no code changes needed.
- **Fonts:** Milky Vintage and A Pompadour are commercial fonts and are not bundled. Put licensed files in
  `frontend/public/fonts/` as `MilkyVintage.woff2` and `APompadour.woff2` (`.otf`/`.ttf` also work).
  Until then Caprasimo and Jost from Google Fonts stand in.
- **Medical data review:** see `dev/medication_suggestions.md`.
