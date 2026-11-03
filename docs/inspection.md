# Repository inspection

Initial checkout: `ca4861d6048f2f72abed1317529e97c5bf76ba64` on `main`.
No `AGENTS.md` files were present under `/workspace`. The working tree was clean before implementation.

| Area | Finding |
| --- | --- |
| Landing | `index.html` and `styles/landing.css`; latest Receipts branding and layout retained. Approval illustrations are now labelled as demo previews. |
| Active app | `app.html`, `styles/app.css`, `js/demo-data.js`, `js/utils.js`, `js/api.js`, `js/auth.js`, `js/ui.js`, `js/app.js`. Plain browser scripts, no bundler required. |
| Legacy, unused | `js/core/`, `js/components/`, `js/pages/`, `js/data/` (including the older demo dataset), and root `styles.css`. None are loaded by either active entry point. Kept on disk, excluded from production build. |
| Existing integration | Frontend referenced missing Netlify config/creator/review functions, optional Supabase CDN authentication, and a browser-stored BYO Buffer token. No actual server implementation existed. |
| Missing backend | README named `netlify/functions/*`, `supabase/migrations/001_receipts_beta.sql`, and `.env.example`, but none existed. No package manifest, lockfile, CI, or tests existed. |
| External display assets | Google Fonts and Unsplash sample images. Optional to local functional operation; blocked assets can affect appearance. |
| Existing auth/demo issue | Config failure silently chose browser-only demo. Replaced with explicit `?demo=1`; production config failures fail visibly. |

New architecture: a single Netlify site publishes an explicit static allowlist to `dist/`; five server functions import `server/` modules. The local server implements the same routes. Supabase is accessed server-side through PostgREST with a service-role key. Browser roles have no direct database privileges. Creator ownership is checked per operation and enforced by composite foreign keys for assignments/reviews. Post references and Content Item references have distinct source kinds; only Posts have service-level import/feedback support.

Production approvals, creator notes, email invitations, uploads, publishing, invoicing, and Content Item feedback are deliberately unavailable. Existing approval UI remains in the explicit local demo. The Posts/Notes adapter is now implemented from supplied documentation evidence, with live validation still pending; see `buffer-contract.md`.
