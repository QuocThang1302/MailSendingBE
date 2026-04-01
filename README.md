# Email Marketing Backend

Node.js + Express backend for the email marketing schema in `email_marketing_complete.sql`.

## Tech Stack

- Node.js
- Express
- Supabase (`@supabase/supabase-js`)
- JWT auth (`jsonwebtoken`)
- Validation (`zod`)

## Project Structure

```text
src/
  config/
  common/
  middlewares/
  modules/
    auth/
    contacts/
    templates/
    emailAccounts/
    campaigns/
    dashboard/
  routes/
  app.js
  server.js
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and configure Supabase connection:

```bash
copy .env.example .env
```

3. Import schema from `email_marketing_complete.sql` into your Supabase Postgres database (SQL Editor).

4. Run designer migration for drag-drop template support:

```bash
psql -f src/scripts/sql/20260330_add_template_designer_tables.sql
```

5. Run scheduler migration for scheduled campaign queue/lock:

```bash
psql -f src/scripts/sql/20260331_add_campaign_scheduler_queue.sql
```

6. Start in development mode:

```bash
npm run dev
```

Server base URL: `http://localhost:5000/api/v1`

Scheduler environment variables (optional):

- `SCHEDULER_ENABLED=true`
- `SCHEDULER_INTERVAL_MS=15000`
- `SCHEDULER_BATCH_SIZE=50`
- `SCHEDULER_LOCK_TTL_SECONDS=25`

## Important Note About Seed User

The seed admin password in SQL is a placeholder hash. You can:

- Register a new admin user via `POST /api/v1/auth/register`, or
- Hash a password and update DB manually:

```bash
node src/scripts/hashPassword.js your_password
```

Then update `users.password` with the generated hash.

## API Overview

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET/POST/PATCH/DELETE /contacts`
- `POST /contacts/import` (multipart file field: `file`, supports `.csv`/`.xlsx`)
- `GET /contacts/export?format=csv|xlsx`
- `GET/POST /contacts/fields`
- `PATCH/DELETE /contacts/fields/:fieldId`
- `GET/PUT /contacts/:id/fields`
- `GET/POST /contacts/tags`
- `PUT /contacts/:id/tags`
- `GET/POST/PATCH/DELETE /templates`
- `GET /templates/:id/designer`
- `PUT /templates/:id/designer`
- `POST /templates/:id/designer/publish`
- `GET /templates/:id/designer/versions`
- `GET /templates/:id/designer/versions/:versionId`
- `POST /templates/:id/designer/versions/:versionId/restore`

Designer notes:

- `layout` is the source of truth for drag-drop blocks/components.
- Backend now auto-renders `renderedHtml` and `renderedText` from `layout` if these fields are omitted.
- You can still send `renderedHtml` / `renderedText` explicitly to override auto-render output.
- `GET/POST/PATCH/DELETE /email-accounts`
- `POST /email-accounts/:id/default`
- `GET/POST /campaigns`
- `GET /campaigns/:id`
- `GET /campaigns/:id/recipients`
- `POST /campaigns/:id/start`
- `POST /campaigns/:id/pause`
- `GET /dashboard/overview`

## Authentication

Protected routes use Bearer token:

```http
Authorization: Bearer <jwt_token>
```
