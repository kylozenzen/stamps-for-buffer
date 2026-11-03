# Receipts for Buffer

Receipts is a Buffer companion with a creator dashboard and stable no-login client rooms. Buffer owns content and feedback; Receipts tracks connections, assignments, explicitly shared review versions, room access, note visibility, and delivery records.

**Status:** Posts and Notes adapters are implemented from user-supplied official documentation evidence verified on November 3, 2026. OAuth, persistence, room controls and UI are preserved. Contract tests use mocked Buffer responses; no live Buffer/Supabase/Netlify acceptance or deployment has occurred. The initial preview is plain text, without verified media/channel enrichment. See [contract and configuration handoff](docs/buffer-contract.md).

For the first hosted test, follow the [numbered Netlify setup guide](docs/netlify-test-deployment.md) and [text-only live acceptance checklist](docs/live-acceptance.txt). No deployment is authorized or performed.

**Limitations:** media review and media-only change detection are incomplete. Receipts approvals never prevent Buffer from publishing.

For a workflow with no local tools, use the [browser-only handoff](docs/browser-only-handoff.md).

## Run locally

Node 24+, npm, no Docker required.

```sh
npm ci
npm test
npm run check
npm run build
npm start
```

The local server listens on port 8888. `/` serves the supplied landing page, `/app` is the production creator dashboard, and `/review/:token` is a public review room. The explicit browser-only demo is `/app?demo=1`. Demo room links retain this flag. No server credentials or backend are needed for the demo, and its comments/approvals never reach Buffer. Production never falls back to demo.

The build copies only the active entry points, scripts, and styles into `dist/`. Netlify publishes `dist/` and bundles `netlify/functions/`. Legacy files remain intact and are excluded from the build. See [repository inspection](docs/inspection.md).

## Configure shared persistence and OAuth

1. Create a Supabase project. Execute **`supabase/migrations/001_receipts.sql`** using its SQL editor. This initial migration is for an empty application schema; do not run it over an unrelated app with colliding table names. RLS is enabled and `anon`/`authenticated` have no access to these tables or RPCs. All operations use server functions with the service-role key.
2. Copy `.env.example` to the ignored `.env` for local development, or enter variables securely in your hosting environment. Never put values in chat, source files, browser code, or Git.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BUFFER_CLIENT_ID`, `APP_BASE_URL`, and `RECEIPTS_ENCRYPTION_KEY`. `BUFFER_CLIENT_SECRET` is required for a confidential Buffer client; omit only for a registered public client. Generate the encryption key with `openssl rand -base64 32` and store it securely. Changing it requires reconnecting Buffer and rotating room links; it encrypts retained access/refresh tokens and recoverable room links with AES-256-GCM.
4. Register a Buffer app client with the **exact callback**:

   ```text
   https://YOUR-RECEIPTS-HOST/.netlify/functions/oauth-callback
   ```

   For the example `APP_BASE_URL=https://receipts.example.com`, the exact callback is `https://receipts.example.com/.netlify/functions/oauth-callback`. This must byte-match the registered callback. Use an HTTPS origin with no path/query/fragment. No Supabase email signup is used.
5. Enable and request exactly `account:read posts:read notes:read notes:write offline_access` for this workflow. Remove a stale identity-only `BUFFER_SCOPES` override or update it to this set. Existing connections must reconnect and consent to the added permissions. Settings flags missing grants.
6. For local OAuth, Buffer requires HTTPS. Supply trusted development TLS files through `DEV_TLS_CERT` and `DEV_TLS_KEY`, set `APP_BASE_URL` to that HTTPS origin, and register the matching callback. `npm start` loads `.env` if it exists. HTTP local mode is suitable for the demo and route checks only. Keep TLS verification enabled.

Creator sessions are opaque random identifiers stored only in Secure, HttpOnly, SameSite=Lax host cookies; hashes and expirations live in Supabase. PKCE verifiers are encrypted, browser-bound state is single-use and expires after ten minutes. All API writes require the exact application Origin and JSON. Token refresh uses a database mutex and saves rotating replacements before use. A crashed refresh may require reconnection rather than replaying a potentially consumed refresh token. Disconnect deletes local credentials and sessions; revoke the application in Buffer to revoke remote consent.

Required outbound destinations: your project's `<project>.supabase.co`, `auth.buffer.com`, and `api.buffer.com`. Developer documentation requires `developers.buffer.com` and `buffer.com`. Optional visual assets use `fonts.googleapis.com`, `fonts.gstatic.com`, and `images.unsplash.com`. Do not replace an existing allowlist without preserving its other required destinations.

## Data and room rules

- Source identity is `(creator, organization, source kind, Buffer source ID)`. Re-importing does not duplicate records. Content Items cannot be treated as Posts.
- Assignment is private. **Send for review** records an immutable version and explicitly exposes it in the selected room. Reassignment removes the old active share. An edit imported later cannot replace the already shared snapshot; resend creates a new active version.
- Rooms use 256-bit random tokens; only hashes are used for access checks. An encrypted recoverable copy lets the creator re-share their stable link. Rotation revokes the old token.
- Every public read/write validates the room. Writes target an active review ID in that room, never an arbitrary supplied Buffer ID. Reviewer names are self-reported, not verified identities.
- Delivered note IDs must appear in the room's visibility table. Internal Buffer notes are never bulk-exposed. Room text comes from Buffer note reads, filtered by the visibility table and delivered records. Deleted/internal notes are not shown. A failed read reports unavailable without substituting cached feedback.
- Feedback has a browser-retained idempotency key and durable outbox. Unknown delivery outcomes are reported as uncertain and are not blindly resent. An uncertain retry reads the same source thread to identify a candidate using its server-generated submission UUID. A text/marker match never grants visibility by itself: the authenticated creator must inspect and explicitly confirm the candidate in Settings → Uncertain feedback. Zero/multiple matches or a failed read never trigger a resend. See `docs/buffer-contract.md`.

## Validation

`npm test` runs the actual migration, constraints, and transactional SQL functions in embedded PostgreSQL (PGlite). It tests ownership, room isolation, rotation, explicit sharing, immutable versions, note visibility, concurrent/retried feedback, database/network failures, session invalidation, and token rotation. Protocol/UI-unit tests use mocked Buffer responses. `npm run check` validates active JavaScript; unused legacy scripts are intentionally excluded. `npm run build` verifies the production static artifact.

Headless Chromium smoke checks passed for the demo dashboard, post modal, settings, demo review room, production login, and explicit missing-configuration errors on a nested review route. Optional external fonts/images were blocked for that browser check. Local HTTP checks confirmed the landing route and that `.env` returns 404. These checks are not cross-device production acceptance.

**Not validated live:** deployed Netlify functions, Supabase's hosted PostgREST/auth roles, Buffer OAuth credentials/consent, real Posts queries, tag filtering, real Notes delivery, and cross-device production behavior. No deployment has been performed. Use the following acceptance checklist after configuring credentials.

## Live acceptance checklist

- [ ] Enable the five documented scopes on the registered client, update configuration and reconnect existing connections for renewed consent.
- [ ] Apply the migration in a test Supabase project and configure all required server variables. Confirm anon/authenticated cannot read app tables.
- [ ] Register the exact HTTPS callback, connect a real Buffer account, and confirm account identity and organization selection. Confirm tokens never appear in browser storage, JSON responses, or logs.
- [ ] Import one real **Post draft**, using an optional documented tag filter. Sync twice: same source ID, no duplicate. Confirm Unassigned view.
- [ ] Create a client and assign the draft. Open the room in a fresh browser: no content until **Send for review**. After sending, confirm the correct immutable version appears without login.
- [ ] In the fresh browser enter a name, submit feedback, and confirm readable external attribution in Buffer Notes. Match the returned note ID to the room-visible ID. Confirm the room shows only explicitly visible notes, never an internal Buffer note.
- [ ] Retry the same request after a simulated lost response; confirm no duplicate remote note. Confirm uncertain status is honest; use creator-confirmed recovery and never blindly resend.
- [ ] Tamper with review IDs/room tokens and try another creator session: all cross-owner/cross-room reads and writes rejected.
- [ ] Edit the Post in Buffer and sync: room retains the old review version and flags the change. Resend explicitly. Rotate the room link: old URL cannot read or comment.
- [ ] Exercise token refresh, reconnect, and disconnect. Old sessions stop working; production failures never show sample data.
- [ ] Confirm production offers comments only; approval stamps are clearly limited to the demo.

## Contract tests and optional diagnostics

`test/buffer-contract.test.js` is explicitly labelled mocked. It checks Posts filters, multiple cursor pages, Notes subjects/pagination, the success mutation shape, non-success payloads and no automatic write retries. Local SQL tests cover visibility, creator-only recovery authorization, stored server submission IDs, concurrent single-use refresh and save failures. None proves live compatibility.

The supplied documentation resolves the adapter contracts. Remaining narrow questions concern error member fields for more precise messages and Post media/channel/rich-caption enrichment, not a whole-adapter blocker. [The handoff](docs/buffer-contract.md) lists them and exact remaining configuration steps. Optional read-only diagnostics are:

```sh
npm run buffer:schema -- CREATOR_UUID
npm run buffer:schema -- CREATOR_UUID EXACT_TYPE_NAME_FROM_FIRST_RESULT
```

These use an existing encrypted connection, print only schema metadata, and perform no refresh, database write, or Buffer mutation. No extra access-token variable is needed.

Deployment is deferred until explicitly requested.
