# First Netlify test deployment: preparation and setup

Prepared November 3, 2026. **No site has been created, no credentials entered, and nothing deployed by this task.** This guide prepares a dedicated test site. Stop before deployment until you request it.

The application is suitable for a **text-only integration test after configuration**, not yet live-validated. Media review, social-channel enrichment, and media-only change detection are incomplete. Approval stamps remain demo-only. **Receipts does not block, gate, delay, or prevent Buffer from publishing.** Buffer's own settings and schedule control publication.

## Deployment readiness

Locally verified:

- Netlify CLI 27.16.2, Netlify Build 37.7.5: an actual `netlify build --offline --context production` succeeds and packages all five Functions using esbuild for `nodejs24.x`. `npm run build` alone is only the static build; the offline Netlify check additionally verifies function imports/bundling.
- The runtime has no production dependencies; server logic uses Node built-ins and HTTPS APIs. Node 24 is pinned in `netlify.toml` and `.nvmrc`. PGlite is a development/test dependency, not bundled into the Functions.
- The static allowlist publishes only the active landing/app files and assets. Server sources, database migration, tests, `.env`, `.git`, dependencies and credentials are not public assets.
- `/app` and `/review/*` rewrite to `app.html`; assets use root-relative paths. `/.netlify/functions/*` is not swallowed by a catch-all rewrite.
- OAuth uses the function callback path, browser-bound PKCE state and two separate Secure/HttpOnly cookies on callback. All JSON writes require the exact configured Origin.
- PostgREST composite RPC responses are normalized from one-row arrays or objects. Boolean RPCs preserve `false`. Database isolation and creator ownership are exercised with the actual migration in embedded PostgreSQL.
- The offline Netlify router/Node Functions emulator is checked separately. Its unused Edge Functions downloader is disabled for this local test because the cloud blocks its bootstrap; the app has no Edge Functions. Its static server overrides HTML Cache-Control, so configured hosted HTML `no-store` behavior must still be confirmed after deployment. API JSON supplies its own `no-store` header.
- The creator post-detail view now loads delivered, explicitly room-visible Buffer comments, so refreshing/reopening it can verify the same note as the public room.

Still prevents live operation until configured:

- Missing Netlify site/canonical HTTPS origin and all application runtime variables.
- Missing Supabase project, migration, enabled Data API/public schema, and correct server service-role key.
- Missing Buffer registered client with enabled scopes and exact callback; existing grants require renewed consent.
- Hosted Netlify → Buffer/Supabase authorization and connectivity have not been tested. Codex's proxy restrictions are separate and are not a deployed Netlify egress policy.
- A site-wide login/password gate would also block no-login reviewers; do not enable one for the public-room acceptance test, or resolve that access gate before testing.

Large-account sync/read pagination is synchronous. A very large account or slow upstream services may exceed the Netlify function execution limit. Start with one or a few drafts/a selected tag. Unknown note-write outcomes remain uncertain and must not be blindly resent.

## Numbered setup guide

1. **Prepare the source package on your machine.**

   Extract `receipts-netlify-test-source.zip`. Its top-level folder is `receipts-netlify-test/`; this is the project/base directory. Hidden files such as `.nvmrc`, `.env.example` and `.gitignore` belong with it. The package includes active sources, the lockfile, migration, tests, documentation and Netlify configuration, without credentials or local dependencies. Do **not** drag/drop only `dist/` into Netlify: static-only uploads do not build these Functions.

   Use Node 24. Run `npm ci`, `npm test`, `npm run check`, and `npm run build`. You can additionally run `npx --yes netlify-cli@27.16.2 build --offline --context production`; this packages locally without creating or deploying a site. A Git-based deployment later needs these prepared changes committed/pushed first; the existing remote baseline does not contain the uncommitted implementation.

2. **Create an unpublished, dedicated Netlify test site and choose its canonical origin.**

   On your own machine, log in with `npx --yes netlify-cli@27.16.2 login`, then create a site with `npx --yes netlify-cli@27.16.2 sites:create --name YOUR-UNIQUE-TEST-SITE-NAME`. Choose your Netlify team if prompted. Site creation is separate from deployment. Alternatively reserve an empty project through the dashboard if that option is available. Do not attach Git in a flow that automatically deploys until you intend to authorize that first build.

   Copy the site's stable HTTPS URL from Netlify. For a site actually named `receipts-buffer-test-12345`, the origin would be `https://receipts-buffer-test-12345.netlify.app`. This is an **example**, not a site created here.

   Set `APP_BASE_URL` to your actual origin with **no trailing slash, path, query or fragment**. Use this same host for creator login and review rooms. Avoid deploy-preview/branch aliases during the first test: a different host causes Origin or OAuth-cookie mismatch. Configure the test site's **Production** deploy context; “Production” here means the canonical URL of this dedicated test site, not your real production app. Keep that domain stable throughout OAuth testing.

3. **Create Supabase and apply migration 001.**

   Create a new test Supabase project, using a strong project database password stored in your password manager. Wait for provisioning. The database password is **not** the application's service-role key and is not needed by this code.

   Open the SQL editor and run the entire `supabase/migrations/001_receipts.sql` once against the empty application schema. Do not apply it over unrelated tables with the same names. No second migration is required. Confirm the app tables and RPCs exist in `public`, RLS is enabled, and the Data API is enabled/exposes the `public` schema. Do not add anonymous/public read policies: the application uses server-only access.

   Copy the project URL for `SUPABASE_URL`. In the API-key settings, use the **legacy `service_role` JWT key** for `SUPABASE_SERVICE_ROLE_KEY`, not `anon`, a publishable key, the database password, or an unverified replacement key format. This code sends it as both the Supabase `apikey` and Bearer credential. Keep it server-side.

4. **Generate the encryption key in the required format.**

   Run the following on your private local machine, not in chat or a public build log:

   ```sh
   openssl rand -base64 32
   ```

   This produces **32 cryptographically random bytes encoded as standard base64: 44 characters, normally ending in `=`**. Paste that single line into `RECEIPTS_ENCRYPTION_KEY` without surrounding quotes, spaces or line breaks. It is not a hex string, an arbitrary password, a Supabase key, or a URL-safe token. The code decodes base64 and requires exactly 32 bytes for AES-256-GCM.

   Store a copy in your password manager and keep it stable across test redeploys. Replacing it makes existing encrypted connections and room links unreadable. Never place this value in `netlify.toml`, source code, Git, the deployment archive, screenshots or chat.

5. **Enter Netlify runtime variables securely.**

   In the test site's configuration → Environment variables, add the following. Mark credential values as secret where Netlify offers it. Give application variables the **Functions/runtime scope** for the **Production context**. Build-only scope is insufficient. If your plan only offers all scopes, those values must still be available to Functions; the static build does not read or inline them.

   | Variable | Enter |
   | --- | --- |
   | `APP_BASE_URL` | Actual stable HTTPS origin chosen in step 2, no trailing slash. |
   | `SUPABASE_URL` | Project HTTPS URL, e.g. `https://YOUR-PROJECT.supabase.co`. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Legacy Supabase `service_role` JWT, server-only secret. |
   | `BUFFER_CLIENT_ID` | The registered Buffer app-client ID. |
   | `BUFFER_CLIENT_SECRET` | The confidential app-client secret. Omit only for a client explicitly registered as public. |
   | `RECEIPTS_ENCRYPTION_KEY` | The exact base64 key from step 4. |
   | `BUFFER_SCOPES` | `account:read posts:read notes:read notes:write offline_access` (or omit to use this same default). |

   `NODE_VERSION=24` is already committed as a non-secret **build** setting in `netlify.toml`. Remove conflicting dashboard build/runtime overrides; if an existing `AWS_LAMBDA_JS_RUNTIME` override is present, remove it or select `nodejs24.x` for this site. The locally produced function manifest selects `nodejs24.x`.

   Do **not** set `DEV_TLS_CERT`, `DEV_TLS_KEY`, `PORT`, Codex proxy variables, CA file paths, or an `OPENAI_*`/public frontend variable for hosted Netlify. Netlify supplies HTTPS. Never use `VITE_*`, `NEXT_PUBLIC_*` or another frontend-public prefix for these secrets. Do not use command-line `--auth SECRET` or paste secret-bearing shell commands into history.

   Future changes to hosted variables need a fresh authorized deploy to guarantee the function runtime picks them up. Saving values does not itself prove the runtime sees them.

6. **Register/configure the Buffer app client.**

   Enable these exact permissions on the registered client:

   ```text
   account:read posts:read notes:read notes:write offline_access
   ```

   Register the callback **exactly** as your actual `APP_BASE_URL` followed by `/.netlify/functions/oauth-callback`. For the concrete example site name from step 2:

   ```text
   https://receipts-buffer-test-12345.netlify.app/.netlify/functions/oauth-callback
   ```

   Replace the example hostname with the one actually reserved for your test site. No real hostname has been supplied yet, so the example must not be registered unchanged unless you own that exact site. Do not use `/app` as the callback. Buffer and Netlify must use the same exact canonical HTTPS origin. No Supabase email signup/provider callback is needed.

   Put the resulting client ID/secret into the Netlify variables from step 5. Existing Buffer connections need **Reconnect Buffer** and fresh consent after the scope additions. The app requests consent and serializes rotating single-use refresh tokens. A failed/unknown refresh persistence requires reconnecting rather than reusing an old token.

7. **Check the two distinct networking environments.**

   **Codex development:** its restricted proxy allowlist controls requests made from this cloud workspace only. To run live debugging here, allow `auth.buffer.com`, `api.buffer.com`, and your exact Supabase hostname; documentation additionally needs `developers.buffer.com` and `buffer.com`. Apply the environment settings draft through the product. Preserve inherited proxy/CA settings and TLS verification. These settings do not create a Netlify site or configure hosted Functions.

   **Deployed Netlify:** Functions make HTTPS requests from Netlify to Buffer and Supabase using the runtime variables entered above. They do not inherit Codex's allowlist, proxy placeholders, VPN or CA paths. A Codex HTTP 403 does not prove Netlify is blocked, and a local successful request does not prove Netlify credentials work. Standard hosted Supabase Data API access uses HTTPS, not a direct database-port connection. If you separately configure organization egress controls or Supabase access restrictions, ensure the hosted API path is permitted.

   **Reviewer browser:** needs the Netlify site and its same-origin Functions. Google Fonts is optional visual traffic; demo sample images use Unsplash. Neither is required for the plain-text production acceptance test. Browser code never connects directly to the Supabase service-role API or holds Buffer tokens.

8. **Stop before deployment; then run acceptance only after authorization.**

   Confirm the build settings below and preserve the source package. No missing-secret values need to be sent in chat. Once you explicitly request deployment, deploy this prepared source through Netlify's build pipeline/CLI with Functions included, not a static drag/drop. Then run `docs/live-acceptance.txt` against the stable HTTPS site.

## Build settings

| Setting | Value |
| --- | --- |
| Base directory | Package's `receipts-netlify-test/` root (repository root when using Git). |
| Framework | Other/static; no Next.js/Vite preset required. |
| Dependency install | `npm ci` using `package-lock.json` (Netlify performs dependency installation). |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Functions bundler | `esbuild` |
| Build Node | `24` |
| Verified bundled runtime | `nodejs24.x`, legacy handler API v1 |
| Test site's intended context | `production` on its canonical test-site URL |
| Function names | `config`, `creator-api`, `oauth-start`, `oauth-callback`, `review-api` |

## First failures to diagnose

- Static page works but `/.netlify/functions/config` is 404: Functions were not built/deployed, the base directory is wrong, or the site was uploaded as static files only.
- Config reports missing setup: variables are absent from Functions/Production scope or no new deploy picked them up. The flags show presence, not credential validity.
- OAuth starts but callback fails: wrong registered URL, different hostname, stale consent/client scopes, callback state expired, encryption key mismatch, or migration/database access missing.
- POST returns 403: the browser's exact origin differs from `APP_BASE_URL` (common with preview aliases).
- Supabase operation rejected: wrong legacy service-role key, paused/unprovisioned project, disabled Data API/public schema, missing migration/RPC permissions, or API connectivity failure.
- Shared room has no posts: assignment is not sharing; press “Send latest snapshot” explicitly. Reassignment revokes the previous active share.
- Feedback is uncertain: do not create another copy. Retry the same submission to check status; if a unique candidate exists, the creator can inspect/confirm it in Settings. Marker/text alone never grants room visibility.
- Review link rotated: old page content already in memory cannot be erased remotely, but refresh and every subsequent read/write must fail. Rotation does not delete the underlying Buffer content or Notes.
