import { HttpError, randomToken } from './security.js';
import { noteInput } from './notes.js';
import { createHash } from 'node:crypto';
// Verified against bufferapp/buffer-sample-apps at 789b545b4cc66243bc44ad54624b505e0012455e.
export const AUTH_URL = 'https://auth.buffer.com/auth';
export const TOKEN_URL = 'https://auth.buffer.com/token';
export const API_URL = 'https://api.buffer.com';
export const REQUIRED_SCOPES = 'account:read posts:read notes:read notes:write offline_access';
export const hasRequiredScopes = scope => { const granted = new Set((scope || '').split(/\s+/)); return REQUIRED_SCOPES.split(' ').every(s => granted.has(s)); };
export const POSTS_QUERY = `query ReceiptsDrafts($after: String, $first: Int, $input: PostsInput!) {
  posts(after: $after, first: $first, input: $input) {
    edges { cursor node { id text status } }
    pageInfo { endCursor hasNextPage }
  }
}`;
export const NOTES_QUERY = `query ReceiptsNotes($after: String, $first: Int, $input: CollaborationNotesInput!) {
  collaborationNotes(after: $after, first: $first, input: $input) {
    edges { cursor node { id text createdAt updatedAt } }
    pageInfo { endCursor hasNextPage }
  }
}`;
export const CREATE_NOTE = `mutation ReceiptsCreateNote($input: CreateCollaborationNoteInput!) {
  createCollaborationNote(input: $input) {
    __typename
    ... on CreateCollaborationNoteSuccess {
      edge { cursor node { id text createdAt updatedAt } }
    }
  }
}`;
export const ACCOUNT_QUERY = 'query ReceiptsAccount { account { id name email organizations { id name } } }';
export const callbackUrl = origin => `${origin.replace(/\/$/, '')}/.netlify/functions/oauth-callback`;
export function pkce() {
  const verifier = randomToken();
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}
export class BufferClient {
  constructor(env, fetcher = fetch) { this.env = env; this.fetch = fetcher; }
  scopes() {
    const configured = this.env.BUFFER_SCOPES || REQUIRED_SCOPES;
    const scopes = new Set(configured.split(/\s+/).filter(Boolean));
    if (REQUIRED_SCOPES.split(' ').some(scope => !scopes.has(scope))) throw new HttpError(503, 'BUFFER_SCOPES must include the required Posts and Notes permissions.');
    return [...scopes].join(' ');
  }
  authorize(state, challenge) {
    if (!this.env.BUFFER_CLIENT_ID) throw new HttpError(503, 'Buffer OAuth is not configured.');
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({ client_id: this.env.BUFFER_CLIENT_ID, redirect_uri: callbackUrl(this.env.APP_BASE_URL),
      response_type: 'code', scope: this.scopes(), state,
      code_challenge: challenge, code_challenge_method: 'S256', prompt: 'consent' }).toString();
    return url.toString();
  }
  async tokens(params) {
    const body = new URLSearchParams({ client_id: this.env.BUFFER_CLIENT_ID, ...params });
    if (this.env.BUFFER_CLIENT_SECRET) body.set('client_secret', this.env.BUFFER_CLIENT_SECRET);
    let response;
    try { response = await this.fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000) }); }
    catch { throw new HttpError(502, 'Buffer token exchange failed. Reconnect to continue.'); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token || !result.refresh_token || !(Number(result.expires_in) > 0)) throw new HttpError(502, 'Buffer did not return a usable rotating token pair. Reconnect to continue.');
    return { accessToken: result.access_token, refreshToken: result.refresh_token,
      expiresAt: Date.now() + Number(result.expires_in) * 1000 - 30000, scope: result.scope || '' };
  }
  exchange(code, verifier) { return this.tokens({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: callbackUrl(this.env.APP_BASE_URL) }); }
  async refresh(previous) { const replacement = await this.tokens({ grant_type: 'refresh_token', refresh_token: previous.refreshToken }); return { ...replacement, scope: replacement.scope || previous.scope || '' }; }
  async graphql(accessToken, query, variables = {}) {
    let response;
    try { response = await this.fetch(API_URL, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000) }); }
    catch { throw new HttpError(502, 'Buffer response was not received.'); }
    if (response.status === 429) throw new HttpError(429, 'Buffer rate limit reached. Try again later.');
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.errors?.length || !json.data) throw new HttpError(502, 'Buffer rejected the operation.');
    return json.data;
  }
  async account(token) { return (await this.graphql(token, ACCOUNT_QUERY)).account; }
  async connection(accessToken, query, field, input, first) {
    const nodes = new Map(), cursors = new Set();
    let after = null;
    for (let page = 0; page < 1000; page++) {
      const data = await this.graphql(accessToken, query, { after, first, input });
      const result = data[field];
      if (!result || !Array.isArray(result.edges) || typeof result.pageInfo?.hasNextPage !== 'boolean') throw new HttpError(502, 'Buffer pagination response is invalid.');
      for (const edge of result.edges) {
        const node = edge?.node;
        if (!node || typeof node.id !== 'string' || !node.id) throw new HttpError(502, 'Buffer returned an invalid source ID.');
        // Keep the first occurrence: notes are newest first, and pages can overlap.
        if (!nodes.has(node.id)) nodes.set(node.id, node);
      }
      if (!result.pageInfo.hasNextPage) return [...nodes.values()];
      const next = result.pageInfo.endCursor;
      if (typeof next !== 'string' || !next || cursors.has(next)) throw new HttpError(502, 'Buffer pagination did not advance.');
      cursors.add(next); after = next;
    }
    throw new HttpError(502, 'Buffer result exceeds the pagination safety limit. Nothing was imported.');
  }
  async listDrafts(accessToken, organizationId, tags = []) {
    if (typeof organizationId !== 'string' || !organizationId || !Array.isArray(tags) || tags.some(t => typeof t !== 'string' || !t)) throw new HttpError(400, 'Invalid draft filters.');
    const filter = { status: ['draft'] };
    if (tags.length) filter.tags = { in: [...new Set(tags)] };
    const nodes = await this.connection(accessToken, POSTS_QUERY, 'posts', { organizationId, filter }, 50);
    return nodes.filter(n => n.status === 'draft').map(n => {
      if (n.text !== null && typeof n.text !== 'string') throw new HttpError(502, 'Buffer returned invalid Post text.');
      return { sourceKind: 'post', id: n.id, text: n.text || '', platform: 'Buffer', image: '' };
    });
  }
  async collaborationNotes(accessToken, subject) {
    const validated = noteInput(subject, 'subject validation').subject;
    const notes = await this.connection(accessToken, NOTES_QUERY, 'collaborationNotes', { subject: validated }, 100);
    if (notes.some(n => typeof n.text !== 'string')) throw new HttpError(502, 'Buffer returned invalid note text.');
    return notes.map(({ id, text, createdAt, updatedAt }) => ({ id, text, createdAt, updatedAt }));
  }
  async createCollaborationNote(accessToken, input) {
    const validated = noteInput(input?.subject, input?.text);
    // Never automatically retry this mutation, including HTTP errors and timeouts.
    const data = await this.graphql(accessToken, CREATE_NOTE, { input: validated });
    const payload = data.createCollaborationNote;
    if (payload?.__typename !== 'CreateCollaborationNoteSuccess') {
      // Error member field/type definitions have not been supplied. Handle every
      // non-success conservatively, without inventing a message field/interface.
      throw new HttpError(502, 'Buffer did not confirm note creation. The thread may be closed or permissions may have changed.');
    }
    const node = payload.edge?.node;
    if (typeof node?.id !== 'string' || !node.id || typeof node.text !== 'string') throw new HttpError(502, 'Buffer did not return a usable note confirmation.');
    return { id: node.id, text: node.text, createdAt: node.createdAt, updatedAt: node.updatedAt };
  }
}
