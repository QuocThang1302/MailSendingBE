# Email Marketing Backend

Node.js + Express backend for the email marketing schema in `email_marketing_complete.sql`.

## Tech Stack

- Node.js
- Express
- Supabase (`@supabase/supabase-js`)
- Nodemailer (SMTP delivery)
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

6. Run role constraint migration:

```bash
psql -f src/scripts/sql/20260531_restrict_user_roles.sql
6. Run individual email tracking migration:

```bash
psql -f src/scripts/sql/20260527_add_individual_email_tracking.sql
```

7. Start in development mode:

```bash
npm run dev
```

Server base URL: `http://localhost:5000/api/v1`

Scheduler environment variables (optional):

- `SCHEDULER_ENABLED=true`
- `SCHEDULER_INTERVAL_MS=15000`
- `SCHEDULER_BATCH_SIZE=50`
- `SCHEDULER_LOCK_TTL_SECONDS=25`

SMTP sending:

- Real email sending now uses the SMTP settings stored in `email_accounts`.
- Required fields for an active sending account: `email_address`, `smtp_host`, `smtp_port`, optional `smtp_username`, `smtp_password`, `use_tls`.
- `POST /campaigns/:id/start` now sends real emails, stores rendered content per recipient, and records SMTP failures in `campaign_recipients.error_message` / `email_logs`.
- `POST /email-accounts/:id/test` sends a test email using that account. Body supports `toEmail`, `subject`, `message`.

Email tracking:

- Set `PUBLIC_BASE_URL` to the publicly reachable backend URL before sending campaigns. For real email delivery, use an HTTPS branded domain such as `https://track.example.com`, not localhost, raw IP, or temporary tunnel domains.
- Set a private `TRACKING_SECRET` used to sign per-recipient tracking links.
- `EMAIL_TRACKING_REQUIRE_HTTPS=true` prevents tracking URLs from being generated when `PUBLIC_BASE_URL` is not HTTPS.
- `EMAIL_OPEN_TRACKING_ENABLED=false` disables the 1x1 open pixel by default. Set it to `true` only after your sending domain, tracking domain, SPF, DKIM, and DMARC are configured.
- `EMAIL_CLICK_TRACKING_MODE=marked` only rewrites links that are explicitly marked with `data-track-click="true"` or `data-mail-track-click="true"`. Use `none` to disable click tracking, or `all` to rewrite every external link.
- `EMAIL_APPEND_UNSUBSCRIBE_FOOTER=true` appends a visible unsubscribe footer when the template does not already include `{{unsubscribe_url}}`.
- `{{unsubscribe_url}}` renders a confirmation-based unsubscribe link.
- Public endpoints are `GET /tracking/open/:token.gif`, `GET /tracking/click/:token`, and `GET/POST /tracking/unsubscribe/:token`.
- Individual emails sent after the tracking migration store delivered HTML snapshots and tracking activity.

AI media generation for email:

- `AI_MEDIA_PROVIDER` controls the provider. Use `pollinations` for Pollinations or `openai` for OpenAI.
- For Pollinations, configure `POLLINATIONS_API_KEY` on the backend only if your account/API tier requires it.
- For OpenAI, configure `OPENAI_API_KEY` on the backend only.
- `MEDIA_STORAGE_PROVIDER=supabase` uploads generated files to Supabase Storage and returns a public Supabase URL.
- `SUPABASE_STORAGE_BUCKET` controls the public bucket name. Default: `generated-media`.
- `SUPABASE_STORAGE_FOLDER` controls the folder inside the bucket. Default: `generated`.
- Use a Supabase service-role/secret key on the backend if you want the server to create the bucket automatically.
- If `MEDIA_STORAGE_PROVIDER=local`, generated files are stored in `public/media/generated` and served from `/media/generated/...`.
- With local storage, set `PUBLIC_BASE_URL` or `MEDIA_PUBLIC_BASE_URL` to a public URL before sending real emails, because email clients must be able to fetch the image/video thumbnail over the internet.
- Use image URLs directly in email HTML.
- For video, use a thumbnail or button that links to the stored MP4 or a landing page. Most email clients do not reliably play embedded video.

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
- For Google-style marketing emails, use `columns`/`grid` with `featureCard` blocks. The renderer outputs email-client-friendly table HTML with inline styles and stacks columns on mobile.

Example designer layout:

```json
{
  "schemaVersion": 1,
  "blocks": [
    {
      "type": "columns",
      "props": { "columns": 2, "gap": 28 },
      "children": [
        {
          "type": "featureCard",
          "props": {
            "imageUrl": "https://example.com/gemini.jpg",
            "imageAlt": "Gemini app",
            "title": "Gemini app",
            "description": "Chat with Gemini, a personal AI assistant from Google.",
            "linkLabel": "Try Gemini in Pro >",
            "linkUrl": "https://example.com/gemini"
          }
        },
        {
          "type": "featureCard",
          "props": {
            "imageUrl": "https://example.com/flow.jpg",
            "imageAlt": "Flow",
            "title": "Flow",
            "description": "Built with and for creatives, Flow is an AI filmmaking tool.",
            "linkLabel": "Try Flow in Pro >",
            "linkUrl": "https://example.com/flow"
          }
        }
      ]
    }
  ]
}
```
- `GET/POST/PATCH/DELETE /email-accounts`
- `POST /email-accounts/:id/default`
- `POST /email-accounts/:id/test`
- `GET /individual-emails`
- `GET /individual-emails/:id` (sent HTML snapshot and tracking events)
- `POST /individual-emails/send`
- `POST /individual-emails/preview`
- `GET/POST /campaigns`
- `GET /campaigns/:id`
- `GET /campaigns/:id/recipients`
- `GET /campaigns/:id/recipients/:recipientId` (sent HTML snapshot and tracking events)
- `POST /campaigns/:id/start`
- `POST /campaigns/:id/pause`
- `GET /dashboard/overview`
- `POST /ai-media/images`
- `POST /ai-media/videos`
- `GET /ai-media/videos/:videoId`
- `POST /ai-media/videos/:videoId/download`
- `POST /ai-media/video-email-snippet`
- `GET /admin/overview` (admin only)
- `GET /admin/users` (admin only)
- `GET /admin/users/:id` (admin only)
- `PATCH /admin/users/:id/role` (admin only)
- `PATCH /admin/users/:id/status` (admin only)
- `DELETE /admin/templates/:id` (admin only)
- `POST /admin/campaigns/:id/pause` (admin only)
- `DELETE /admin/campaigns/:id` (admin only)

Role-aware read routes:

- `user` sees only their own contacts, tags, fields, email accounts, templates, campaigns, and dashboard data.
- `admin` sees system-wide data on the same read routes, for example `GET /contacts`, `GET /email-accounts`, `GET /templates`, `GET /campaigns`, and `GET /dashboard/overview`.
- `GET /email-accounts` never exposes stored SMTP passwords.
- Admin read routes that support owner filtering accept `userId`, for example `GET /contacts?userId=5`, `GET /email-accounts?userId=5`, `GET /templates?userId=5`, and `GET /campaigns?userId=5`.
- Admin management actions stay under `/admin/*`, such as role changes, user deactivation, deleting templates, pausing campaigns, and deleting campaigns.

AI media examples:

Provider env example:

```env
PUBLIC_BASE_URL=https://api.example.com
TRACKING_SECRET=change_me_for_public_email_tracking
AI_MEDIA_PROVIDER=pollinations
POLLINATIONS_API_KEY=your_pollinations_api_key
POLLINATIONS_BASE_URL=https://gen.pollinations.ai
POLLINATIONS_IMAGE_MODEL=flux
POLLINATIONS_VIDEO_MODEL=
```

```http
POST /api/v1/ai-media/images
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "prompt": "Banner email khuyến mãi cà phê Việt Nam, phong cách cao cấp, nền sáng",
  "altText": "Khuyến mãi cà phê",
  "size": "1536x1024",
  "emailWidth": 600
}
```

The response includes `url` and `emailHtml`, which can be saved into a template image/html block.

```http
POST /api/v1/ai-media/videos
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "prompt": "Video 8 giây giới thiệu sản phẩm cà phê rang xay, ánh sáng tự nhiên",
  "size": "1280x720",
  "seconds": 8
}
```

For OpenAI, poll `GET /api/v1/ai-media/videos/:videoId`, then call `POST /api/v1/ai-media/videos/:videoId/download` after the status is `completed`.
For Pollinations, the backend downloads and stores the MP4 during `POST /api/v1/ai-media/videos`, so the response can already include `status: "completed"`, `url`, and `emailHtml`.

## Authentication

Protected routes use Bearer token:

```http
Authorization: Bearer <jwt_token>
```

Roles are `user` and `admin`. Read routes are role-aware: `user` gets their own
data, while `admin` gets system-wide data and can filter by `userId` where
supported. Cross-user management actions are available only under `/admin/*`.
