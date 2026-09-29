const STACK = [
  ['Database', 'PostgreSQL', 'Primary data store (Railway Postgres). SQLite is used automatically for local development when DATABASE_URL is not set.'],
  ['Backend', 'Django 6.1 · Python 3.13', 'Data models, admin site, seed script and schedule rules.'],
  ['API', 'Django REST Framework 3.18', 'JSON API with token authentication.'],
  ['Frontend', 'React 19 · Vite 8', 'Single-page app, built to static files.'],
  ['Backend hosting', 'Railway', 'Runs gunicorn; migrations run on each deploy.'],
  ['Frontend hosting', 'Netlify', 'Serves the Vite build with an SPA redirect rule.'],
  ['Source control', 'GitHub', 'Repository: github.com/RachelMizer/ecovitals'],
]

const LIBS = [
  ['react-router-dom 7', 'frontend', 'Page routing, catalog deep links (e.g. /catalog/chickens#amy).'],
  ['recharts 3', 'frontend', 'Scatter plots on the dashboard and record pages.'],
  ['oxlint', 'frontend', 'Linting (npm run lint).'],
  ['djangorestframework + authtoken', 'backend', 'REST endpoints and login tokens.'],
  ['django-cors-headers', 'backend', 'Lets the Netlify site call the Railway API.'],
  ['django-filter', 'backend', 'Query-string filtering support.'],
  ['dj-database-url', 'backend', 'Reads the DATABASE_URL Railway provides.'],
  ['psycopg 3 (binary)', 'backend', 'PostgreSQL driver.'],
  ['gunicorn', 'backend', 'Production WSGI server.'],
  ['whitenoise', 'backend', 'Serves Django admin static files in production.'],
  ['Google Fonts: Caprasimo, Jost', 'frontend', 'Stand-ins for Milky Vintage and A Pompadour until licensed font files are added to /public/fonts.'],
]

const SCRIPTS = [
  ['frontend', 'npm run dev', 'Start the Vite dev server on http://localhost:5173.'],
  ['frontend', 'npm run build', 'Production build into frontend/dist (Netlify runs this).'],
  ['frontend', 'npm run preview', 'Serve the production build locally.'],
  ['frontend', 'npm run lint', 'Lint the source with oxlint.'],
  ['backend', 'python manage.py migrate', 'Create or update database tables.'],
  ['backend', 'python manage.py seed_farm', 'Wipe and reseed all farm data (animals, weekly weights, temperatures every 2 days, illnesses, treatments, feeders, 72 h of tracker pings) and create the demo user.'],
  ['backend', 'python manage.py seed_farm --keep-user', 'Reseed farm data without touching user accounts.'],
  ['backend', 'python manage.py runserver', 'Start the API on http://localhost:8000.'],
  ['backend', 'python manage.py createsuperuser', 'Create an admin login for /admin/.'],
]

const FILES = [
  ['backend/farm/models.py', 'Zone, Animal, WeightRecord, TemperatureRecord, HealthEvent, Treatment, LocationPing, Feeder, FeederContent, UserProfile.'],
  ['backend/farm/views.py', 'API endpoints (auth, animals, readings, summary, tracking, feeders, treatments, schedule).'],
  ['backend/farm/schedule.py', 'Feeding and medication rules by species, life stage, sex and fertility status.'],
  ['backend/farm/management/commands/farm_data.py', 'Source farm data: animals, illnesses, treatments, feeders, map zones.'],
  ['backend/farm/management/commands/seed_farm.py', 'Seed script: Gompertz growth curves, age-adjusted temperature baselines with fever episodes, random-walk tracker trails.'],
  ['frontend/src/pages/*', 'One file per page: Login, Dashboard, Catalog, CatalogGroup, AnimalRecords, Tracker, Nutrition, Schedule, Account, DevNotes.'],
  ['frontend/src/lib/*', 'API client, auth context, species vocabulary and normal temperature ranges.'],
]

const ENDPOINTS = [
  'POST /api/auth/login/', 'POST /api/auth/logout/', 'GET|PATCH /api/account/', 'GET /api/animals/?species=',
  'GET /api/animals/<slug>/', 'GET /api/animals/<slug>/weights/?start=&end=', 'GET /api/animals/<slug>/temperatures/?start=&end=',
  'GET /api/readings/?kind=temperature|weight&start=&end=&species=', 'GET /api/summary/', 'GET /api/zones/',
  'GET /api/tracking/?hours=', 'GET /api/feeders/', 'GET /api/treatments/?species=&kind=', 'GET /api/schedule/?date=&species=',
]

function Table({ head, rows, code = [] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.join()}>{r.map((c, i) => <td key={i}>{code.includes(i) ? <code>{c}</code> : c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DevNotes() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Developer's Notes</h1>
      <p className="tagline">How EcoTrack is built: stack, frameworks, scripts and data.</p>

      <p>
        EcoTrack is a livestock tracking and health-monitoring app for cows, pigs and chickens. A Django REST API
        stores animals, weekly weights, temperatures taken every two days, illnesses, treatments, feeders and tracker
        positions. A React single-page app shows them as a dashboard, catalog, farm map, nutrition overview and daily
        schedule.
      </p>

      <h2>Stack</h2>
      <Table head={['Layer', 'Technology', 'Role']} rows={STACK} />

      <h2>Frameworks &amp; libraries</h2>
      <Table head={['Package', 'Where', 'Used for']} rows={LIBS} />

      <h2>Scripts</h2>
      <Table head={['Folder', 'Command', 'What it does']} rows={SCRIPTS} code={[1]} />

      <h2>Key files</h2>
      <Table head={['Path', 'Contents']} rows={FILES} code={[0]} />

      <h2>API endpoints</h2>
      <div className="card"><ul style={{ margin: 0, columns: '2 300px' }}>{ENDPOINTS.map((e) => <li key={e}><code>{e}</code></li>)}</ul></div>
      <p className="small muted">Every endpoint except login requires an <code>Authorization: Token …</code> header.</p>

      <h2>Data notes</h2>
      <ul>
        <li>Animals come from <code>dev/animal data</code>. Chicken and cow weights were not supplied, so they were assigned within breed norms. One heifer calf in Cows.txt has no name or breed and is listed as “Unnamed Calf”.</li>
        <li>Weight history follows a Gompertz growth curve from a breed-typical birth weight to the recorded current weight, with small weekly noise and dips during illness.</li>
        <li>Temperatures use each species' normal range from the Info files (young animals run warmer). Illness episodes add a fever curve.</li>
        <li>Map coordinates are in a 1000 × 650 farm grid. Tracker pings are generated every 30 minutes for the last 72 hours. Chickens roost in their coop overnight, and the sow visits the farrowing barn to nurse.</li>
        <li>Feeding rules in <code>schedule.py</code> follow common extension-service guidance. All drugs and doses are illustrative and need veterinary confirmation.</li>
      </ul>

      <h2>Deployment</h2>
      <ul>
        <li><b>Railway (API):</b> set root directory to <code>backend</code>, add a PostgreSQL plugin, and set <code>DJANGO_SECRET_KEY</code>, <code>DJANGO_DEBUG=false</code>, <code>DJANGO_ALLOWED_HOSTS</code> and <code>CORS_ALLOWED_ORIGINS</code>. <code>railway.json</code> runs migrations and collectstatic on deploy.</li>
        <li><b>Netlify (web):</b> <code>netlify.toml</code> at the repo root builds <code>frontend</code>. Set <code>VITE_API_URL</code> to the Railway URL.</li>
      </ul>
    </div>
  )
}
