# Receipts for Buffer — approvals-only beta

This build merges the strongest parts of **Stamp** into **Receipts**:

- Buffer is the content source.
- Receipts provides one no-login approval room per client.
- Team members can comment or request changes.
- Only the six-digit owner code can stamp final approval.
- Approval is tied to an immutable Buffer snapshot.
- A stable receipt is generated and stored in the paper trail.

The app runs in **interactive demo mode automatically** when Supabase is not configured. Add the environment variables and it switches to the shared beta backend.

## Product scope

### Included

- Buffer draft / needs-approval / scheduled sync
- Client assignment
- Stable client approval rooms
- Comments and change requests
- Six-digit owner-code approval
- Server-side rate limiting
- Buffer snapshot fingerprints
- Changed-in-Buffer detection
- Link and owner-code rotation
- Searchable receipt list
- Magic-link creator authentication
- Optional Resend invitations and approval notifications

### Intentionally deferred

- Native content composer or file uploads
- Video hosting
- Buffer write / auto-publish actions
- Deals, invoicing, CRM, analytics, and additional schedulers
- Buffer OAuth (the beta uses a browser-stored BYO token)

## Run the visual demo

Serve the folder with any static server. Because no backend variables exist, it will use local demo data.

```bash
python3 -m http.server 8888
```

Open `http://localhost:8888/app.html`.

Static servers cannot emulate Netlify route rewrites, so demo approval rooms use the same app URL only after deploying to Netlify. The creator dashboard itself works locally.

## Activate shared beta mode

### 1. Create a Supabase project

Run:

```text
supabase/migrations/001_receipts_beta.sql
```

in the Supabase SQL editor.

In Supabase Authentication:

- Enable Email / Magic Link.
- Add your Netlify production URL and `/app` callback URL to allowed redirect URLs.

### 2. Deploy to Netlify

Use this folder as the site root. `netlify.toml` already defines the publish directory, functions, review routes, and security headers.

### 3. Add environment variables

Copy the names from `.env.example` into Netlify Site configuration → Environment variables.

Required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RECEIPTS_ENCRYPTION_SECRET`
- `APP_BASE_URL`

Generate the encryption secret with a password manager or:

```bash
openssl rand -base64 48
```

Optional:

- `RESEND_API_KEY`
- `RESEND_FROM`
- `BUFFER_TOKEN` as an owner-only fallback

Redeploy after adding variables.

## Buffer beta workflow

The private beta uses a user-supplied Buffer token:

1. Open Settings.
2. Paste the Buffer access token.
3. Choose **Save token**.
4. Press **Sync Buffer**.

The token stays in the creator's browser and is only sent to the authenticated Netlify Function during a manual sync. It is not stored in Supabase.

For a public launch, replace this with Buffer OAuth and encrypted refresh-token storage.

## Security decisions

- Public room tokens are random and stored as a SHA-256 hash plus an encrypted creator-retrievable copy.
- Owner codes are hashed for validation and encrypted so the creator can copy the owner kit.
- Approval codes are checked only in a server function.
- Five incorrect attempts per client/IP in 15 minutes triggers a temporary lockout.
- Client rooms never receive the owner code from the API.
- Approved receipts contain a snapshot fingerprint and copy of the reviewed snapshot.
- Any Buffer edit creates a new version and invalidates the active approval state.
- Supabase RLS blocks direct browser access to product tables; Netlify Functions use the service role.

## Important beta caveat

The Buffer query intentionally imports text, channel, status, and schedule data without guessing unsupported media fields. Existing media URLs can be displayed when present, but production media preview support should be finalized against the exact Buffer asset schema available to the approved app client.

## Main files

- `index.html` — Receipts landing page
- `app.html` — creator and public approval app
- `js/api.js` — remote/demo data adapter
- `netlify/functions/creator-api.js` — authenticated creator operations and Buffer sync
- `netlify/functions/review-api.js` — public room, comments, change requests, and approval
- `supabase/migrations/001_receipts_beta.sql` — complete data model
