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

4. Start in development mode:

```bash
npm run dev
```

Server base URL: `http://localhost:5000/api/v1`

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
- `GET/POST /contacts/tags`
- `PUT /contacts/:id/tags`
- `GET/POST/PATCH/DELETE /templates`
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
