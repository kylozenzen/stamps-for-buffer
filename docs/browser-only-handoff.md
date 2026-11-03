# Browser-only handoff

No local terminal, ZIP extraction, local Git or folder upload is required. Nothing is deployed by these steps. The repository is connected at https://github.com/kylozenzen/stamps-for-buffer. The handoff branch is `codex/receipts-netlify-test-handoff`; verify its published status in the chat handoff before using it.

## 1. Review the GitHub work

Use the PR link supplied in chat. Review the Files changed tab and the test/deployment notes. Merge only when you are ready to make this the repository's main implementation. Merging is not a Netlify deployment command, but if you have already connected this repository to a site with automatic deploys, pause that site's automatic builds first.

If automatic PR creation is blocked by the Codex network policy, the published branch can still be reviewed entirely in your browser:

https://github.com/kylozenzen/stamps-for-buffer/compare/main...codex/receipts-netlify-test-handoff?expand=1

Choose base `main`, compare `codex/receipts-netlify-test-handoff`, then Create pull request. This compare URL is not itself an existing PR. Do not use the older source ZIP as a substitute for a published branch unless the handoff explicitly says the push failed.

The Codex environment's GitHub API access may need `api.github.com` applied in its network settings. A saved draft alone does not activate it. Native Git access and GitHub API access are separate; no personal token needs to be pasted into chat.

## 2. Create Supabase in your browser

1. Open https://supabase.com/dashboard and create a new test project. Save its database password in your password manager; that password is not an application variable.
2. Wait for the project to finish provisioning.
3. Open the standalone `001_receipts.sql` download from chat. Alternatively open `supabase/migrations/001_receipts.sql` on the handoff branch in GitHub, choose Raw, and copy the entire text. No extraction is needed.
4. In Supabase choose SQL Editor → New query. Paste the complete SQL and Run it once against the empty application schema. Do not run this initial migration over unrelated tables with the same names.
5. Confirm the application's tables/functions exist in `public`. Keep RLS enabled and do not add anonymous read policies. Ensure the Data API exposes `public`.
6. In project settings, copy the project HTTPS URL for `SUPABASE_URL`. In API key settings, copy the legacy `service_role` JWT for `SUPABASE_SERVICE_ROLE_KEY`. Do not use the anon/publishable key, database password, or an unverified new key format. Keep this key private.

## 3. Obtain the encryption key privately

Codex can generate the key in its existing execution environment; you do not have to run commands. For this handoff, a key file is prepared outside the repository at `/workspace/private/receipts-encryption-key.txt`, with a private directory and owner-only file permissions. Its value is never printed in the chat/tool output, included in Git, or added to the source archive.

The generation uses Python's cryptographic `secrets.token_bytes(32)` and standard base64 encoding. The result is exactly 32 random bytes encoded as 44 characters, ending in `=`. It is not hex or an arbitrary password. This is the exact format expected by the AES-256-GCM code.

Use the private key-file link in chat to open/download it, copy its single line into Netlify's secret `RECEIPTS_ENCRYPTION_KEY` field, and save a backup in your password manager. Do not paste the value back into chat, GitHub, screenshots, issues or the PR. Do not use a public online key generator. The file itself contains a secret: treat it as sensitive and do not share its download link.

This is a newly generated key for a new test database. If you already have live encrypted connections/room links using another key, retain that existing key instead. Keep the chosen key stable across redeploys. After you have securely entered/backed it up, Codex can delete its workspace copy when you ask; avoid publishing a cloud-environment filesystem snapshot while the private key file remains.

## 4. Begin Netlify's GitHub import, without deploying

1. Sign in at https://app.netlify.com in your browser.
2. Choose Add new project → Import an existing project (labels can vary), then GitHub.
3. Authorize Netlify's GitHub application for this repository if prompted. This is different from authorizing Buffer.
4. Select `kylozenzen/stamps-for-buffer`. After the PR is merged, select branch `main`; otherwise use the published handoff branch for an isolated test only.
5. Stop at the build/configuration screen. Set the base directory to the repository root, framework to Other/static, build command to `npm run build`, publish directory to `dist`. `netlify.toml` provides Functions directory `netlify/functions`, esbuild bundling, routing and Node 24. Do not drag/drop static files.
6. If the screen offers a project/site name, choose a unique, stable lowercase test name. For an actually available name `receipts-buffer-test-12345`, the intended origin is `https://receipts-buffer-test-12345.netlify.app`. That is an example, not a site created here. Use the real name shown by Netlify.
7. If the screen does not let you determine the canonical site URL before deployment, stop and report the non-secret screen/project-name information in chat. Do not deploy merely to discover it or invent an `APP_BASE_URL`.
8. Do not click Deploy, Deploy site or Deploy project yet. GitHub import commonly launches the first deployment at that final button. Creating a new imported project and triggering its initial build may be combined in the UI; stopping at the final screen respects the no-deploy instruction.

## 5. Configure Buffer and environment values

In Buffer's registered app client, enable:

`account:read posts:read notes:read notes:write offline_access`

Register exactly your canonical HTTPS origin plus:

`/.netlify/functions/oauth-callback`

For the concrete example site name above, the callback would be:

`https://receipts-buffer-test-12345.netlify.app/.netlify/functions/oauth-callback`

Replace the example hostname with your actual test-site hostname. Do not use `/app` or a preview/branch alias as the callback. Existing connections need Reconnect Buffer and renewed consent after adding scopes.

In Netlify's import screen environment section, or Project configuration → Environment variables if the project already exists, add each variable securely:

| Name | Value source |
| --- | --- |
| `APP_BASE_URL` | The actual stable Netlify HTTPS origin, with no trailing slash/path/query/fragment. |
| `SUPABASE_URL` | Your Supabase project HTTPS URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase legacy `service_role` JWT, secret. |
| `BUFFER_CLIENT_ID` | Your registered Buffer client ID. |
| `BUFFER_CLIENT_SECRET` | Buffer confidential-client secret; omit only for a client explicitly registered public. |
| `RECEIPTS_ENCRYPTION_KEY` | The private key-file's single line, secret. |
| `BUFFER_SCOPES` | `account:read posts:read notes:read notes:write offline_access` (also the code's default). |

These values must be available to **Functions/runtime** in the **Production context** of the dedicated test site. Build-only variables are insufficient. If your plan offers only all scopes, ensure that includes Functions. Mark secret values secret where supported. Do not prefix them `VITE_` or `NEXT_PUBLIC_`, and do not commit `.env` or use a repository file to deliver runtime secrets. Do not enter Codex proxy variables, CA paths, `DEV_TLS_CERT`, `DEV_TLS_KEY` or `PORT` for hosted Netlify.

If the project has no environment-settings page until the final create/deploy button, use the import screen's environment-variable section and confirm those values include runtime scope. If the screen only offers build-only variables, stop and tell Codex the screen labels without any secret values. Do not use a deployment as an unrequested workaround.

Codex's network allowlist controls only this development machine. Netlify's deployed runtime must independently reach Buffer and Supabase via HTTPS; it does not inherit Codex's proxy/allowlist or secret bindings.

## 6. Stop, then request deployment explicitly

Once the PR is reviewed, Supabase migration succeeds, the canonical origin is known and runtime values/callback are configured, report only that these steps are complete. No secret values are needed in chat. Do not click the final deployment button until you choose to authorize deployment.

After an authorized deployment, follow `docs/live-acceptance.txt`: connect → sync twice without duplicates → assign → explicitly share → separate browser → comment → verify Buffer note ID → refresh both views → rotate link and confirm old access stops.

Media review and media-only change detection remain incomplete. Production approval stamps are not enabled. Receipts does not block, gate or prevent Buffer from publishing.
