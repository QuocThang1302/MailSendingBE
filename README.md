# MailSendingBE — Personalized Email Marketing Platform Backend

A robust, modular, and scalable Node.js + Express 5 backend for end-to-end personalized email marketing campaigns, transactional email delivery, visual drag-and-drop template compilation, contact list segmentation, real-time engagement tracking (opens, clicks, unsubscribes), and AI-powered media generation.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture & Project Structure](#architecture--project-structure)
- [Prerequisites](#prerequisites)
- [Local Installation & Setup](#local-installation--setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Database Setup & Sequential Migrations](#4-database-setup--sequential-migrations)
  - [5. Initial Administrator Account Setup](#5-initial-administrator-account-setup)
  - [6. Start the Server](#6-start-the-server)
- [Available NPM Scripts](#available-npm-scripts)
- [Campaign Dispatch & Background Scheduler](#campaign-dispatch--background-scheduler)
- [Email Tracking & Deliverability](#email-tracking--deliverability)
- [Visual Template Designer](#visual-template-designer)
- [AI Media Generation](#ai-media-generation)
- [API Endpoints Reference](#api-endpoints-reference)
- [Code Quality & Git Hooks](#code-quality--git-hooks)
- [License](#license)

---

## Features

- **Asynchronous Campaign Delivery**: Trigger bulk campaigns with immediate `202 Accepted` response. Background scheduler processes queue batches safely with transactional locks, rate-limiting, and error logging.
- **Layered Architecture**: Clear separation of concerns following Controller-Service-Repository-DTO patterns.
- **Multi-Account SMTP Delivery**: Manage multiple SMTP sender accounts per user or organization with daily rate quotas, TLS options, and live connection testing.
- **Visual Drag-and-Drop Template Designer**: JSON-based layout tree compiled automatically into email-client-friendly nested tables with mobile-responsive stacked styling.
- **Contact Segmentation & Custom Attributes**: Manage contacts with tags and custom dynamic fields. Bulk import and export via CSV and Excel (`.xlsx`).
- **Individual & Transactional Email Delivery**: Direct single-recipient email delivery with personalized variable interpolation, HTML snapshot retention, and live tracking.
- **Privacy-Conscious Engagement Tracking**:
  - 1x1 transparent tracking pixel for open rate tracking.
  - Signed tracking tokens for click-through redirection.
  - One-click unsubscribe links with preference management.
- **AI Media Generation**: Generate email marketing images and videos directly via Pollinations or OpenAI, hosted on Supabase Storage or local static media serving.
- **Enterprise Security & RBAC**:
  - Role-based authorization (`user` vs `admin`).
  - 2-factor OTP verification for user registration and password updates.
  - Passwords hashed with `bcryptjs`.
  - HTTP protection with `helmet`, CORS, and Zod input validation.

---

## Tech Stack

| Component           | Technology                                                       |
| ------------------- | ---------------------------------------------------------------- |
| **Runtime**         | Node.js (v18+, v20+ or v24+ recommended)                         |
| **Web Framework**   | Express 5.x                                                      |
| **Database**        | PostgreSQL 14+ (hosted on Supabase)                              |
| **Database Client** | `@supabase/supabase-js`                                          |
| **Email Transport** | Nodemailer (SMTP connection pooling & verification)              |
| **Validation**      | Zod                                                              |
| **Security**        | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`   |
| **File Processing** | `multer` (multipart uploads), `xlsx` (Excel & CSV import/export) |
| **Code Quality**    | ESLint (flat config), Prettier, Husky, lint-staged, Nodemon      |

---

## Architecture & Project Structure

The project follows a modular, layered architecture inspired by pragmatic NestJS patterns while keeping the simplicity and speed of Express:

```text
MailSendingBE/
├── .husky/                  # Git pre-commit hooks (Husky + lint-staged)
├── public/
│   └── media/               # Locally stored/generated AI media assets
├── src/
│   ├── config/              # Centralized environment variables & Supabase client
│   ├── common/              # Shared utilities (mailService, roles, constants)
│   ├── middlewares/         # JWT authentication, role authorization, error handling
│   ├── modules/
│   │   ├── admin/           # Administrative overview, user/role management
│   │   ├── aiMedia/         # AI image/video generation (Pollinations / OpenAI)
│   │   ├── auth/            # Registration, login, OTP validation, passwords
│   │   ├── campaigns/       # Campaign management, DTOs, async queue scheduler
│   │   ├── contacts/        # Contacts, tags, custom fields, CSV/Excel import/export
│   │   ├── dashboard/       # Analytics and delivery metrics
│   │   ├── emailAccounts/   # SMTP credentials and connection testing
│   │   ├── individualEmails/# Single personalized emails and previews
│   │   ├── templates/       # Email templates, visual designer & HTML compiler
│   │   └── tracking/        # Open tracking pixel, link redirect, unsubscribes
│   ├── routes/              # Central API v1 router index
│   ├── scripts/             # CLI utilities (hashPassword.js) and SQL migrations
│   │   └── sql/             # Incremental database migrations
│   ├── app.js               # Express application initialization & middleware
│   └── server.js            # HTTP server entry point & scheduler boot
├── email_marketing_complete.sql # Complete base PostgreSQL database schema
├── eslint.config.js         # ESLint configuration (Flat config format)
├── .prettierrc              # Prettier code formatting rules
├── .env.example             # Template for environment variables
└── package.json             # NPM scripts and dependencies
```

---

## Prerequisites

Before running the project locally, ensure you have:

1. **Node.js**: `v18.0.0` or higher (`v20+` or `v24+` recommended). Check with `node -v`.
2. **NPM**: `v9.0.0` or higher. Check with `npm -v`.
3. **PostgreSQL Database**: A running PostgreSQL instance or a free [Supabase](https://supabase.com) project.
4. **SMTP Sending Account**: A valid SMTP account (e.g. Gmail App Password, SendGrid, Amazon SES, or Mailgun) for sending real emails and OTP verification codes.

---

## Local Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MailSendingBE
```

### 2. Install Dependencies

Install all project dependencies and initialize Husky git hooks:

```bash
npm install
```

### 3. Configure Environment Variables

Create your local `.env` file from the example template:

```bash
# On Windows (cmd / PowerShell):
copy .env.example .env

# On Linux / macOS:
cp .env.example .env
```

Open `.env` in your editor and configure the parameters according to your local environment:

#### Core Server & Database

| Variable          | Description                                            | Default / Example                      |
| ----------------- | ------------------------------------------------------ | -------------------------------------- |
| `PORT`            | Local HTTP server port                                 | `5000`                                 |
| `NODE_ENV`        | Application environment (`development` / `production`) | `development`                          |
| `SUPABASE_URL`    | Supabase project URL                                   | `https://your-project-ref.supabase.co` |
| `SUPABASE_KEY`    | Supabase API key (service-role or anon key)            | `your_supabase_key`                    |
| `PUBLIC_BASE_URL` | Public URL for email tracking and media assets         | `http://localhost:5000`                |

#### Authentication & Security

| Variable              | Description                                        | Default / Example         |
| --------------------- | -------------------------------------------------- | ------------------------- |
| `JWT_SECRET`          | Secret key for signing JSON Web Tokens             | `change_me_in_production` |
| `JWT_EXPIRES_IN`      | JWT token validity window                          | `7d`                      |
| `BCRYPT_SALT_ROUNDS`  | Password hashing salt rounds                       | `10`                      |
| `OTP_SECRET`          | Secret key for hashing OTP codes                   | `change_me_for_otp`       |
| `OTP_EXPIRES_MINUTES` | Expiration time for OTP codes in minutes           | `3`                       |
| `OTP_MAX_ATTEMPTS`    | Maximum failed verification attempts before expiry | `5`                       |

#### OTP SMTP Email Delivery

| Variable            | Description                                    | Default / Example                    |
| ------------------- | ---------------------------------------------- | ------------------------------------ |
| `OTP_EMAIL_FROM`    | Sender email address for OTP emails            | `"ChadMailer <support@example.com>"` |
| `OTP_SMTP_HOST`     | SMTP server host for sending OTP emails        | `smtp.gmail.com`                     |
| `OTP_SMTP_PORT`     | SMTP port (`587` for STARTTLS, `465` for SSL)  | `587`                                |
| `OTP_SMTP_USERNAME` | SMTP account username                          | `user@example.com`                   |
| `OTP_SMTP_PASSWORD` | SMTP account password or app-specific password | `your_smtp_app_password`             |
| `OTP_SMTP_USE_TLS`  | Enable TLS/STARTTLS connection                 | `true`                               |

> **Note**: In development mode (`NODE_ENV=development`), if OTP SMTP credentials are not configured, generated OTP codes will be printed directly to the server terminal console for testing.

#### Email Tracking & Deliverability

| Variable                          | Description                                 | Default / Example                  |
| --------------------------------- | ------------------------------------------- | ---------------------------------- |
| `TRACKING_SECRET`                 | Secret key for signing HMAC tracking tokens | `change_me_for_tracking`           |
| `EMAIL_OPEN_TRACKING_ENABLED`     | Enable 1x1 transparent open tracking pixel  | `false`                            |
| `EMAIL_CLICK_TRACKING_MODE`       | Link rewrite mode (`none`, `marked`, `all`) | `marked`                           |
| `EMAIL_TRACKING_REQUIRE_HTTPS`    | Enforce HTTPS for tracking links in emails  | `true` (set `false` for localhost) |
| `EMAIL_APPEND_UNSUBSCRIBE_FOOTER` | Append unsubscribe footer if missing        | `true`                             |

#### Background Campaign Scheduler

| Variable                     | Description                                  | Default / Example    |
| ---------------------------- | -------------------------------------------- | -------------------- |
| `SCHEDULER_ENABLED`          | Enable automatic background queue processing | `true`               |
| `SCHEDULER_INTERVAL_MS`      | Poll interval for scheduler worker loop      | `15000` (15 seconds) |
| `SCHEDULER_BATCH_SIZE`       | Recipient batch size per dispatch tick       | `50`                 |
| `SCHEDULER_LOCK_TTL_SECONDS` | Expiration timeout for active campaign locks | `25`                 |

#### AI Media Generation (Optional)

| Variable                  | Description                                       | Default / Example |
| ------------------------- | ------------------------------------------------- | ----------------- |
| `AI_MEDIA_PROVIDER`       | AI provider (`pollinations` or `openai`)          | `pollinations`    |
| `POLLINATIONS_API_KEY`    | Optional API key for Pollinations                 | `your_key`        |
| `OPENAI_API_KEY`          | OpenAI API key (required if provider is `openai`) | `sk-...`          |
| `MEDIA_STORAGE_PROVIDER`  | Storage engine (`supabase` or `local`)            | `supabase`        |
| `SUPABASE_STORAGE_BUCKET` | Supabase Storage bucket name                      | `generated-media` |

---

### 4. Database Setup & Sequential Migrations

You must execute the database scripts against your PostgreSQL / Supabase database. You can run them via the **Supabase Dashboard SQL Editor** or via the PostgreSQL CLI tool `psql`:

#### Step 4.1: Execute Base Schema

Execute the complete base schema located at the root of the repository:

```bash
psql -h <db-host> -U <db-user> -d <db-name> -f email_marketing_complete.sql
```

_(Or paste the entire content of `email_marketing_complete.sql` into the Supabase SQL Editor and run it)._

#### Step 4.2: Execute Incremental Migrations in Sequence

Run each migration script in chronological order from `src/scripts/sql/`:

```bash
psql -f src/scripts/sql/20260330_add_template_designer_tables.sql
psql -f src/scripts/sql/20260331_add_campaign_scheduler_queue.sql
psql -f src/scripts/sql/20260514_default_user_role.sql
psql -f src/scripts/sql/20260524_add_template_owner.sql
psql -f src/scripts/sql/20260527_add_individual_email_tracking.sql
psql -f src/scripts/sql/20260531_restrict_user_roles.sql
psql -f src/scripts/sql/20260601_add_auth_otp_codes.sql
psql -f src/scripts/sql/20260601_allow_profile_email_change_otps.sql
psql -f src/scripts/sql/20260602_allow_password_reset_otps.sql
```

---

### 5. Initial Administrator Account Setup

The initial database script includes a default user, but the password hash is a placeholder. You can set up your admin user using either of the following methods:

#### Option A: Using the CLI Hash Script

1. Run the hashing script with your desired password:
   ```bash
   npm run hash:password -- YourSecurePassword123
   ```
2. Copy the resulting bcrypt hash output (e.g., `$2a$10$...`).
3. Update the admin user record in your database:
   ```sql
   UPDATE users
   SET password = '<GENERATED_BCRYPT_HASH>', role = 'admin', is_active = TRUE
   WHERE email = 'admin@example.com';
   ```

#### Option B: Registering via the API

1. Call `POST /api/v1/auth/register` with your admin email and password.
2. Verify the registration OTP via `POST /api/v1/auth/register/verify-otp`.
3. In your database, elevate the user to admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

---

### 6. Start the Server

#### Development Mode (with auto-reload via Nodemon):

```bash
npm run dev
```

#### Production Mode:

```bash
npm start
```

Once running, verify the server status:

- Base API Endpoint: `http://localhost:5000/api/v1`
- Health Check: `http://localhost:5000/api/v1/health`

---

## Available NPM Scripts

| Script                  | Command                            | Description                                             |
| ----------------------- | ---------------------------------- | ------------------------------------------------------- |
| `npm run dev`           | `nodemon src/server.js`            | Starts server with automatic file watcher & reload      |
| `npm start`             | `node src/server.js`               | Starts server in standard production mode               |
| `npm run check`         | `node --check src/server.js`       | Validates JavaScript syntax without starting the server |
| `npm run hash:password` | `node src/scripts/hashPassword.js` | Generates a bcrypt password hash for database seeding   |
| `npm run lint`          | `eslint .`                         | Runs ESLint over all project files                      |
| `npm run lint:fix`      | `eslint . --fix`                   | Automatically fixes autofixable ESLint issues           |
| `npm run format`        | `prettier --write .`               | Formats all code, JSON, and Markdown files              |
| `npm run format:check`  | `prettier --check .`               | Verifies whether all files comply with Prettier rules   |
| `npm run prepare`       | `husky`                            | Initializes Husky git pre-commit hooks                  |

---

## Campaign Dispatch & Background Scheduler

1. **Asynchronous Dispatch**:
   - Calling `POST /api/v1/campaigns/:id/start` validates campaign requirements, locks recipients, updates campaign status to `sending`, and immediately returns **`202 Accepted`**.
2. **Worker Processing**:
   - The background scheduler (`src/modules/campaigns/campaignScheduler.js`) runs every `SCHEDULER_INTERVAL_MS` (default: 15s).
   - In each tick, the worker searches for `sending` campaigns and delegates batch dispatch to `campaignsService.processCampaignDispatch()`.
   - The service fetches the next batch of recipients (`SCHEDULER_BATCH_SIZE`, default: 50), compiles personalized HTML for each contact, and transmits emails using the campaign's configured SMTP account pool (`mailService.js`).
   - Delivery statuses and error details are recorded per recipient in `campaign_recipients`. Once all recipients are processed, the campaign status automatically transitions to `completed`.

---

## Email Tracking & Deliverability

To enable deliverability tracking:

1. **Tracking Domain**: Set `PUBLIC_BASE_URL` to your public backend URL. In production, use a branded HTTPS domain (e.g., `https://track.yourdomain.com`).
2. **Open Tracking**: When `EMAIL_OPEN_TRACKING_ENABLED=true`, a transparent 1x1 GIF tracking pixel (`GET /api/v1/tracking/open/:token.gif`) is embedded into outgoing emails.
3. **Click Tracking**:
   - `EMAIL_CLICK_TRACKING_MODE=marked` (default): Rewrites only links with `data-track-click="true"` or `data-mail-track-click="true"` to route through `GET /api/v1/tracking/click/:token`.
   - `EMAIL_CLICK_TRACKING_MODE=all`: Rewrites all external links in the email body.
   - `EMAIL_CLICK_TRACKING_MODE=none`: Disables click tracking rewrites.
4. **Unsubscribe Handling**:
   - Outgoing emails include the `{{unsubscribe_url}}` merge tag pointing to `GET /api/v1/tracking/unsubscribe/:token`.
   - If missing from the template, setting `EMAIL_APPEND_UNSUBSCRIBE_FOOTER=true` appends a compliant footer automatically.

---

## Visual Template Designer

The template system supports visual drag-and-drop layouts:

- The `layout` property contains the tree of blocks (e.g. `columns`, `featureCard`, `button`, `heading`, `text`, `divider`, `spacer`).
- When saving a template (`PUT /api/v1/templates/:id/designer`), the backend compiler (`templateRenderer.js`) parses `layout` and generates clean, responsive HTML tables with inline CSS for cross-client compatibility.
- You can query saved versions with `GET /api/v1/templates/:id/designer/versions` and restore prior versions via `POST /api/v1/templates/:id/designer/versions/:versionId/restore`.

---

## AI Media Generation

Generate visual assets directly into your email templates:

- **Image Generation**: `POST /api/v1/ai-media/images` accepts a prompt, dimensions, and email width, returning an asset URL and responsive HTML snippet ready to insert into templates.
- **Video Generation**: `POST /api/v1/ai-media/videos` generates short promotional clips. Because email clients do not natively stream video, the API generates a thumbnail button linking directly to the hosted MP4.

---

## API Endpoints Reference

All endpoints are prefixed with `/api/v1`. Protected endpoints require header `Authorization: Bearer <token>`.

### Authentication & Account (`/auth`)

- `POST /auth/register` — Submit email/password; sends 6-digit verification OTP.
- `POST /auth/register/verify-otp` — Verify registration OTP and activate account.
- `POST /auth/login` — Login with email and password; returns JWT token.
- `GET /auth/me` — Retrieve profile info of currently logged-in user.
- `POST /auth/password/request-otp` — Request OTP to change account password.
- `POST /auth/password/verify-otp` — Verify OTP and update account password.

### Contacts & Segmentation (`/contacts`)

- `GET /contacts` — List contacts (supports pagination, search, tag filters).
- `POST /contacts` — Create a new contact.
- `GET/PATCH/DELETE /contacts/:id` — Read, update, or delete a contact.
- `POST /contacts/import` — Bulk import contacts via CSV or Excel (`multipart/form-data`, field: `file`).
- `GET /contacts/export` — Export contacts as `?format=csv` or `?format=xlsx`.
- `GET/POST /contacts/tags` — List or create tags.
- `PUT /contacts/:id/tags` — Associate tags with a contact.
- `GET/POST /contacts/fields` — List or define custom dynamic contact fields.
- `PATCH/DELETE /contacts/fields/:fieldId` — Update or delete custom field definitions.
- `GET/PUT /contacts/:id/fields` — Read or update custom field values for a contact.

### SMTP Email Accounts (`/email-accounts`)

- `GET /email-accounts` — List configured SMTP accounts (passwords sanitized).
- `POST /email-accounts` — Add a new SMTP sending account.
- `PATCH/DELETE /email-accounts/:id` — Update or remove an SMTP account.
- `POST /email-accounts/:id/default` — Mark an account as primary default sender.
- `POST /email-accounts/:id/test` — Send a live test email to verify SMTP configuration.

### Email Templates & Designer (`/templates`)

- `GET /templates` — List user's templates.
- `POST /templates` — Create a new email template.
- `GET/PATCH/DELETE /templates/:id` — Read, update, or remove a template.
- `GET /templates/shared` — View admin-created global templates.
- `GET /templates/:id/designer` — Fetch visual designer block layout.
- `PUT /templates/:id/designer` — Save designer layout (auto-compiles responsive HTML).
- `POST /templates/:id/designer/publish` — Publish designer draft to live template.
- `GET /templates/:id/designer/versions` — View version history of a template.
- `POST /templates/:id/designer/versions/:versionId/restore` — Revert to an earlier layout version.

### Campaigns (`/campaigns`)

- `GET /campaigns` — List marketing campaigns.
- `POST /campaigns` — Create a new campaign.
- `GET/PATCH/DELETE /campaigns/:id` — Read, update, or delete campaign.
- `GET /campaigns/:id/recipients` — View recipient list with delivery and engagement status.
- `GET /campaigns/:id/recipients/:recipientId` — View sent HTML snapshot & tracking events.
- `POST /campaigns/:id/start` — Enqueue campaign dispatch (returns `202 Accepted`).
- `POST /campaigns/:id/pause` — Pause an ongoing campaign dispatch.

### Individual Transactional Emails (`/individual-emails`)

- `GET /individual-emails` — List individual sent emails.
- `GET /individual-emails/:id` — Read email detail, HTML snapshot, and tracking status.
- `POST /individual-emails/preview` — Preview rendered HTML with dynamic contact tags.
- `POST /individual-emails/send` — Send a single personalized email immediately.

### Analytics & Overview (`/dashboard`)

- `GET /dashboard/overview` — Aggregated delivery rates, open rates, and click metrics.

### Tracking Endpoints (`/tracking`)

- `GET /tracking/open/:token.gif` — 1x1 transparent GIF tracking pixel.
- `GET /tracking/click/:token` — Click-through tracking redirect.
- `GET/POST /tracking/unsubscribe/:token` — Unsubscribe landing page and confirmation.

### AI Media Creation (`/ai-media`)

- `POST /ai-media/images` — Generate an image from a prompt for email campaigns.
- `POST /ai-media/videos` — Generate a short video from a prompt.
- `GET /ai-media/videos/:videoId` — Poll video generation status.
- `POST /ai-media/videos/:videoId/download` — Download video to storage bucket.
- `POST /ai-media/video-email-snippet` — Generate responsive email video card HTML.

### Admin Controls (`/admin` — Admin role only)

- `GET /admin/overview` — System-wide platform metrics.
- `GET /admin/users` — List all registered users.
- `GET /admin/users/:id` — View detailed user profile and stats.
- `PATCH /admin/users/:id/role` — Promote/demote user role (`user` / `admin`).
- `PATCH /admin/users/:id/status` — Activate or suspend a user account.
- `DELETE /admin/templates/:id` — Force delete a template across the system.
- `POST /admin/campaigns/:id/pause` — Force pause any active campaign.
- `DELETE /admin/campaigns/:id` — Force delete any campaign.

---

## Code Quality & Git Hooks

This repository enforces strict code style, formatting, and linting standards:

- **ESLint**: Standardized using the ESLint v9 Flat Config format in `eslint.config.js`.
- **Prettier**: Enforces consistent code formatting defined in `.prettierrc`.
- **Husky & lint-staged**: Automatically executes `eslint --fix` and `prettier --write` on staged files on every `git commit`.

To verify your changes locally before committing:

```bash
# Check code syntax
npm run check

# Check for lint errors
npm run lint

# Check formatting
npm run format:check
```

---

## License

This project is licensed under the [ISC License](LICENSE).
