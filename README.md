# Quickstart: PMP Exam Practice

## Prerequisites

- Docker and Docker Compose installed locally
- One or more PMP exam CSV files available in `csv/`
a
## 1. Build and start the full stack

From the project root, build and start all services:

```powershell
docker compose up --build -d
```

Expected services:

- `frontend`: serves the vanilla HTML, CSS, and JavaScript application
- `backend`: exposes the API and session logic
- `postgres`: stores imported questions and learner sessions

## 2. Initialize the database schema

Apply the database schema inside the backend container:

```powershell
docker compose exec backend node src/db/migrate.js
```

## 3. Import exam CSV files into PostgreSQL

Run the dedicated import script from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-data.ps1
```

Expected result:

- All `csv/*.csv` files are validated and imported into PostgreSQL.
- Invalid rows are skipped according to the current specification.
- Imported exam sets remain startable even when skipped rows produce fewer than 200 valid questions.
- Imported exam sets are available to the frontend and backend services.

## 4. Open the application

Open the frontend in a browser:

- [http://localhost:3000](http://localhost:3000) or the configured frontend port from `docker-compose.yml`

## 5. Validate Practice mode

1. Choose an available exam set.
2. Start Practice mode.
3. Answer a question.
4. Confirm the correct answer and explanation appear immediately.
5. Finish the session.
6. Confirm the result screen shows correct, incorrect, and unanswered counts.

## 6. Validate Exam mode

1. Start Exam mode.
2. Confirm the 180-minute countdown is visible.
3. Answer questions and confirm no correctness feedback is shown during the session.
4. Refresh the browser and confirm the in-progress Exam session resumes.
5. Finish the session or let the timer expire.
6. Confirm the final results show counts, percentages, correct answers, and explanations.
7. Confirm unanswered questions are counted in both the unanswered total and the incorrect percentage.

## 7. Run automated tests

Run backend and frontend tests from the backend container:

```powershell
docker compose exec backend node tests/run-tests.js
```

If Docker-based test execution is not available, run the same suite locally from the backend workspace:

```powershell
cd backend
npm.cmd test
```

## 8. Sync study progress between computers

PostgreSQL data is stored in the Docker volume named `postgres-data`, so it is not automatically included when you push the repository to GitHub. To move your study progress between two computers, create a database dump, commit it, then restore it on the other computer.

From the app UI:

1. Open the app and log in.
2. Use `Download Backup` in the `Sync progress` section.
3. Save the downloaded JSON file into `backups/`, then commit and push it to GitHub.
4. On the other computer, pull from GitHub and use `Restore Backup` in the same UI section.

The UI backup is a portable JSON file and works when the app is running through Docker.

Progress resume is database-backed. The browser only remembers your username for convenience; when the app opens it logs in again, asks the backend for your latest `in_progress` session, and resumes from that session's current question.

Command-line alternative:

On computer 1, after studying:

```powershell
docker compose up -d
powershell -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
git add backups/pmp_learning_app.dump
git commit -m "Backup PMP study progress"
git push
```

On computer 2, before continuing:

```powershell
git pull
docker compose up --build -d
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1
```

The restore step replaces the local PostgreSQL database with the backup file. If you studied separately on both computers before syncing, choose which machine has the latest progress before restoring.

## 9. Deployment notes

- The full app is deployed through one `docker-compose.yml` file.
- The frontend and backend run as separate containers.
- PostgreSQL is the only persistence service in the stack.
- The import workflow is intentionally separate from normal application startup so data loading can be rerun independently.
- `docker compose config` is the fastest smoke check for Compose wiring before a full startup.
