# Task Management — simple team task app

One manager assigns tasks to team members; members accept → work → finish → submit a report; the manager reviews reports. In-app notifications on assignment.

**Stack:** React + TypeScript (Vite) frontend · FastAPI backend · PostgreSQL (local, in Docker) · JWT auth. The database URL is a single config value, so the same code runs against a Google **Cloud SQL** instance by changing one environment variable (optional GCP showcase — no public deployment).

You run three things: the database (Docker), the backend (uvicorn, port 8000), and the frontend (Vite, port 5173). Open **http://localhost:5173**.

---

## Run it locally

### 1. Start the database (Docker)

From the project root:

```bash
cp .env.example .env      # then edit the password if you like
docker compose up -d      # Postgres now listening on localhost:5432
```

### 2. Start the backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# load the same DATABASE_URL/JWT_SECRET from the project-root .env:
export $(grep -v '^#' ../.env | xargs)                # Windows PowerShell: see note below
uvicorn app.main:app --reload
```

The API is now at **http://localhost:8000**. Interactive docs (try every endpoint in the browser) at **http://localhost:8000/docs**.

On startup the app creates the tables and seeds the single **manager** account:

- **Email:** `manager@demo.com`  ·  **Password:** `manager123`  *(change these in `.env`)*

Team members create their own accounts via the signup endpoint (their role is always forced to Employee — nobody can self-register as a manager).

> **Windows PowerShell** doesn't use `export ... xargs`. Simplest option: copy `.env` into the `backend/` folder — `pydantic-settings` reads a local `.env` automatically.

### 3. Start the frontend (React)

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Pick a role, log in (manager is `manager@demo.com` / `manager123`; team members sign up their own accounts), and use the app. The frontend talks to the backend at `http://localhost:8000` by default — override with `VITE_API_URL` in `frontend/.env` if needed.

---

## API overview

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/signup` | public | Employee self-registration |
| POST | `/login` | public | Get a JWT |
| GET | `/tasks` | any | Manager: all tasks; Employee: only theirs |
| POST | `/tasks` | Manager | Create + assign a task (writes notifications) |
| GET | `/tasks/employees` | Manager | List assignable employees |
| GET | `/tasks/{id}` | Manager / assignee | Task detail |
| PUT | `/tasks/{id}/accept` | assignee | Assigned → Accepted |
| PUT | `/tasks/{id}/progress` | assignee | Accepted → In Progress |
| PUT | `/tasks/{id}/finish` | assignee | In Progress → Finished |
| POST | `/tasks/{id}/report` | assignee | Submit report (after Finished) |
| GET | `/reports` | Manager | View submitted reports |
| GET | `/notifications` | any | Current user's notifications |
| PUT | `/notifications/{id}/read` | owner | Mark read |

Roles and task ownership are enforced **server-side** on every request — the UI's role choice is never trusted.

---

## Switching the database to Cloud SQL (optional)

Everything above uses local Docker Postgres. To point the *same code* at a Google-managed database, start the Cloud SQL Auth Proxy and change one line in `.env`:

```
DATABASE_URL=postgresql+psycopg://appuser:PASSWORD@127.0.0.1:5432/taskmgmt
```

(The proxy makes the cloud DB reachable at `localhost:5432`; no code changes needed.)
