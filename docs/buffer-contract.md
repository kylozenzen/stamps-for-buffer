# Buffer integration contract and handoff

Updated 2026-11-03. **The Posts and Notes adapters are implemented.** They use documentation evidence supplied by the user as verified against Buffer's official documentation on that date. Contract-based tests are mocked; no live Buffer account, OAuth grant, or deployed function was validated. Nothing has been deployed.

Official references for the supplied evidence:

- https://developers.buffer.com/reference.html
- https://developers.buffer.com/guides/authentication.html
- https://developers.buffer.com/guides/building-apps.html

Previous direct documentation/introspection requests returned proxy HTTP 403. That access limitation no longer blocks implementation of the supplied contracts. Narrow optional type diagnostics remain available; do not describe the adapters as disabled pending access to the website.

## Permissions and identity

Enable and request this exact set on the registered Buffer app client:

```text
account:read posts:read notes:read notes:write offline_access
```

`server/buffer.js` uses this set by default. If `BUFFER_SCOPES` is set, it must contain every required permission; stale identity-only overrides fail with a configuration error. OAuth requests use `prompt=consent`. Existing connections must reconnect for newly enabled permissions. Settings flags stored grants missing the required scopes. If the token endpoint omits `scope`, the initial grant records the requested scope set; a refresh retains the previous scope when omitted.

OAuth follows Buffer's official sample at `bufferapp/buffer-sample-apps`, commit `789b545b4cc66243bc44ad54624b505e0012455e`: PKCE S256, `https://auth.buffer.com/auth`, form-encoded exchange at `https://auth.buffer.com/token`, and GraphQL at `https://api.buffer.com`. Confidential clients send the secret in the form body. Creator identity uses `account { id name email organizations { id name } }`; no separate email signup.

Refresh tokens are single-use and rotate. Database RPCs serialize each connection's refresh and atomically store the encrypted replacement pair while releasing its lock. Concurrent calls cannot consume the same refresh token twice. A crash/save failure leaves the lock held; reconnect instead of replaying a potentially consumed token. The service also checks lock ownership after reading current credentials so an intervening reconnect cannot be overwritten by the refresh.

## Posts adapter

Implemented operation:

```graphql
query ReceiptsDrafts($after: String, $first: Int, $input: PostsInput!) {
  posts(after: $after, first: $first, input: $input) {
    edges { cursor node { id text status } }
    pageInfo { endCursor hasNextPage }
  }
}
```

Input is `{ organizationId, filter: { status: [draft] } }`. Selected tag IDs add `filter.tags.in`; an empty selection omits `tags` entirely. `organizationId` has the supplied `OrganizationId!` field type inside `PostsInput`. The query passes the input as variables and does not invent ID scalar declarations. Status values supplied by the documentation are `draft`, `needs_approval`, `scheduled`, `sending`, `sent`, `error`; the initial workflow imports drafts only.

The adapter uses 50-edge pages, follows `endCursor` while `hasNextPage`, detects missing/repeated cursors, deduplicates source IDs, and completes every page before returning any list for persistence. Later-page errors therefore do not produce partial imports. A 1,000-page safety bound fails explicitly rather than returning incomplete data. Source IDs remain unchanged with `sourceKind: post`; idempotent storage keys include creator, organization, kind and source ID. No Content Item/Post coercion occurs.

The minimal Post fields `id`, `text`, and `status` were already present in the current official sample's `PostActionSuccess.post` selection. The list adapter uses those Post fields only. It does not need `channels` or `post` queries for the initial text-only draft workflow; those operation names remain known but no speculative query was added.

### Narrow preview fields still requiring verification

The initial preview displays plain `Post.text`, generic platform “Buffer”, and no media image. The following are deliberately not guessed and are **not blockers to draft assignment or Notes delivery**:

- Whether `Post.text` alone contains all platform-specific overrides, rich text or long-form caption variants.
- Channel/service/display-name response fields and their relationships for social-platform labels.
- Media asset response types and fields for image URLs, thumbnails, carousels, video previews, alt text, and platform-specific asset transformations.
- Source revision/update-time fields needed to detect changes beyond the selected plain text. Current fingerprints cover only selected preview fields; media-only edits cannot yet be detected.

## Notes read and write adapters

Read uses the supplied `CollaborationNotesInput!` and returns all cursor pages:

```graphql
query ReceiptsNotes($after: String, $first: Int, $input: CollaborationNotesInput!) {
  collaborationNotes(after: $after, first: $first, input: $input) {
    edges { cursor node { id text createdAt updatedAt } }
    pageInfo { endCursor hasNextPage }
  }
}
```

Input is `{ subject: { postId } }` for Posts. The helper can also represent `{ subject: { contentItemId } }`, but Content Item import/feedback is deferred. Exactly one subject field is accepted. Content Item threads are never substituted for their Posts' threads. Notes are read newest first, with `first: 100` within the documented 1–100 range. Overlapping note IDs are deduplicated. A closed thread can still be read; write failure does not disable reads.

Mutation:

```graphql
mutation ReceiptsCreateNote($input: CreateCollaborationNoteInput!) {
  createCollaborationNote(input: $input) {
    __typename
    ... on CreateCollaborationNoteSuccess {
      edge { cursor node { id text createdAt updatedAt } }
    }
  }
}
```

Input includes only `subject` and `text`; optional annotations are omitted. Readable external reviewer attribution is in the text. There is no author override and no `addPostNote` mutation. Returned note IDs are persisted atomically with explicit room visibility on confirmed success.

Top-level GraphQL errors, HTTP errors, malformed responses, missing note IDs and non-success `__typename` values are handled without automatic write retries. **The supplied evidence does not name the mutation error member types or their fields.** The implementation selects `__typename`, detects every non-success branch, and returns a conservative unconfirmed-delivery error rather than inventing a `message` interface/field. Exact error type names and fields remain a narrow diagnostic question for improved rejection messages and safe definitive-failure classification; they do not block the success adapter. The mocked closed-thread error typename is labelled synthetic, not claimed as a documented Buffer typename.

## Room visibility and ambiguous delivery safety

Room token validation, active shared-version membership and creator ownership remain required. Comment reads are filtered by both delivered records and the room/review's stored Buffer note IDs **before** serialization. Internal notes are not exposed by reading a thread, matching comment text, or having a matching marker. Deleted notes disappear; failed reads show an explicit unavailable notice without substituting cached text.

The stable submission identifier is `feedback_deliveries.id`, generated server-side by PostgreSQL `gen_random_uuid()` before a write. It is distinct from the browser's idempotency key. Every attempt for that stored submission reuses this attribution and marker:

```text
Reviewer name (external reviewer via Receipts):
Feedback body

[Receipts feedback SERVER_GENERATED_DELIVERY_UUID]
```

The browser key prevents duplicate local claims, but does not establish remote exactly-once execution. A timeout or lost persistence after a write remains uncertain and cannot trigger a new mutation. Reading the same source thread can identify one exact marker/attribution/body candidate; zero matches, multiple matches or failed reads do not establish absence and never authorize resending.

**A matching candidate does not automatically grant visibility or mark delivery complete.** In Settings → Uncertain feedback, the authenticated creator can inspect the candidate and explicitly choose “Confirm and share this note.” The server revalidates creator ownership, active room/version membership and the candidate note ID, rereads the thread, then atomically saves that explicitly authorized note ID. Reviewers cannot call this creator action. Without confirmation, even an internal note copying the entire marker/text stays invisible. No automatic remote idempotency or server-enforced exactly-once guarantee is claimed.

## Remaining configuration steps

1. Allow `auth.buffer.com` and `api.buffer.com`, plus the actual `<project>.supabase.co` hostname, through environment networking. Documentation access additionally needs `developers.buffer.com` and `buffer.com`. Preserve unrelated existing allowlist entries. The previously saved Buffer-domain draft must be applied if runtime access is still restricted.
2. Apply `supabase/migrations/001_receipts.sql` to the test project's empty application schema. This continuation needs **no new migration**.
3. Securely configure `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BUFFER_CLIENT_ID`, `RECEIPTS_ENCRYPTION_KEY`, and `BUFFER_CLIENT_SECRET` for a confidential client. The encryption key is 32 random bytes in base64. Never commit or print values.
4. Enable all five scopes above on the registered Buffer client. Remove an obsolete `BUFFER_SCOPES` override or set it to the complete exact scope string in `.env.example`.
5. Register the callback exactly as `${APP_BASE_URL}/.netlify/functions/oauth-callback`. No real origin has been supplied. For the example origin, the complete example is `https://receipts.example.com/.netlify/functions/oauth-callback`.
6. Existing connections must reconnect and consent again. The replacement tokens stay encrypted on the server. Local OAuth additionally requires trusted `DEV_TLS_CERT`/`DEV_TLS_KEY` files and HTTPS; `PORT` defaults to 8888. Hosted Netlify supplies HTTPS.
7. Run `npm ci`, `npm test`, `npm run check`, `npm run build`, then start the app in the configured test environment. Deployment remains deferred until requested.

## Live acceptance, still unrun

Connect Buffer → select organization → sync one real Post draft (optionally tagged) → sync again and verify one source record → assign client → confirm the fresh-browser room is empty before sharing → send for review → open its stable URL without login → submit a named comment → verify the attributed note and returned ID in Buffer → confirm only that stored visible note appears in the room. Test internal-note exclusion and a lost-response retry, including creator confirmation before recovering a candidate. Exercise refresh with concurrent requests and disconnect.

Tests execute real local PostgreSQL constraints/RPCs in PGlite, while all Buffer responses are mocked. They validate the supplied contract shape and local controls, not actual Buffer schema compatibility, OAuth permissions, hosted Supabase, deployed Netlify behavior, full media previews, or cross-device production acceptance.

## Optional read-only diagnostics

`npm run buffer:schema -- CREATOR_UUID` and `npm run buffer:schema -- CREATOR_UUID EXACT_RETURNED_TYPE_NAME` use an existing non-expired encrypted connection, without token output, refresh, data writes or mutations. The narrow query files are `docs/graphql/operation-signatures.graphql` and `type-definition.graphql`. To improve error handling, inspect the actual `CreateCollaborationNotePayload` union members, then each returned error member's fields. For media work, inspect the actual `Post` and its returned asset/channel types. These diagnostics are optional refinements rather than an adapter readiness gate.
