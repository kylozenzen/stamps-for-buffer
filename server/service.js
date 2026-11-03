import { randomUUID } from 'node:crypto';
import { HttpError, randomToken, hash, fingerprint, cipher, text, id, tokenHash, equal } from './security.js';
import { pkce, hasRequiredScopes, REQUIRED_SCOPES } from './buffer.js';
import { noteSubject, noteInput, feedbackText, deliveredMatch } from './notes.js';
export class Receipts {
  constructor({ env, store, buffer }) { this.env = env; this.store = store; this.buffer = buffer; }
  crypto() { return cipher(this.env.RECEIPTS_ENCRYPTION_KEY); }
  async startOAuth() {
    const state = randomToken(), pair = pkce();
    const location = this.buffer.authorize(state, pair.challenge);
    await this.store.insert('oauth_flows', { state_hash: hash(state), verifier_ciphertext: this.crypto().seal(pair.verifier, 'oauth'), expires_at: new Date(Date.now() + 600000).toISOString() });
    return { state, location };
  }
  async finishOAuth(params, browserState) {
    const state = params.state;
    if (!equal(state, browserState) || !/^[A-Za-z0-9_-]{43}$/.test(state || '')) throw new HttpError(400, 'OAuth state is invalid. Connect again.');
    const flows = await this.store.delete('oauth_flows', { state_hash: `eq.${hash(state)}`, expires_at: `gt.${new Date().toISOString()}` });
    if (!flows?.length) throw new HttpError(400, 'OAuth request expired or was already used.');
    if (params.error) throw new HttpError(400, 'Buffer authorization was declined.');
    const code = text(params.code, 'authorization code', 2048);
    const tokens = await this.buffer.exchange(code, this.crypto().open(flows[0].verifier_ciphertext, 'oauth'));
    tokens.scope ||= this.buffer.scopes ? this.buffer.scopes() : REQUIRED_SCOPES;
    const account = await this.buffer.account(tokens.accessToken);
    if (!account?.id || !Array.isArray(account.organizations)) throw new HttpError(502, 'Buffer account identity is unavailable.');
    const previous = await this.store.one('creators', { buffer_account_id: `eq.${account.id}` });
    const creatorId = previous?.id || randomUUID();
    const orgIds = account.organizations.map(x => x.id);
    const values = { buffer_account_id: account.id, profile: { id: account.id, name: account.name || '', email: account.email || '' },
      organizations: account.organizations, organization_id: orgIds.includes(previous?.organization_id) ? previous.organization_id : orgIds[0] || null,
      tokens_ciphertext: this.crypto().seal(tokens, `creator:${creatorId}`), refresh_lock: null, refresh_lock_until: null };
    if (previous) {
      await this.store.patch('creators', { id: `eq.${creatorId}` }, values);
    } else {
      // Ignore a simultaneous first connection rather than changing another row's ID.
      const inserted = await this.store.request('creators?on_conflict=buffer_account_id', {
        method: 'POST', body: { id: creatorId, ...values }, prefer: 'resolution=ignore-duplicates,return=representation'
      });
      if (!inserted.length) throw new HttpError(409, 'Another connection completed. Connect again.');
    }
    const creator = { id: creatorId };
    await this.store.delete('creator_sessions', { creator_id: `eq.${creator.id}` });
    const session = randomToken();
    await this.store.insert('creator_sessions', { token_hash: hash(session), creator_id: creator.id, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
    return session;
  }
  async authenticate(session) {
    if (typeof session !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(session)) throw new HttpError(401, 'Connect Buffer to continue.');
    const record = await this.store.one('creator_sessions', { token_hash: `eq.${hash(session)}`, expires_at: `gt.${new Date().toISOString()}` });
    if (!record) throw new HttpError(401, 'Your session expired. Connect Buffer again.');
    const creator = await this.store.one('creators', { id: `eq.${record.creator_id}` });
    if (!creator?.tokens_ciphertext) throw new HttpError(401, 'Connect Buffer to continue.');
    return creator;
  }
  async accessToken(creator) {
    let tokens = this.crypto().open(creator.tokens_ciphertext, `creator:${creator.id}`);
    if (!hasRequiredScopes(tokens.scope)) throw new HttpError(401, 'Reconnect Buffer and grant the required Posts and Notes permissions.');
    if (tokens.expiresAt > Date.now()) return tokens.accessToken;
    const lock = randomUUID();
    if (!await this.store.rpc('acquire_refresh', { p_creator: creator.id, p_lock: lock })) throw new HttpError(409, 'Buffer connection is refreshing or requires reconnection. Try again, then reconnect if needed.');
    // Reload after acquiring the lock: a previous request may have rotated tokens.
    const current = await this.store.one('creators', { id: `eq.${creator.id}` });
    if (current?.refresh_lock !== lock) throw new HttpError(409, 'Buffer connection changed. Try again.');
    if (!current?.tokens_ciphertext) throw new HttpError(401, 'Buffer is disconnected.');
    tokens = this.crypto().open(current.tokens_ciphertext, `creator:${creator.id}`);
    let replacement;
    try { replacement = tokens.expiresAt > Date.now() ? tokens : await this.buffer.refresh(tokens); }
    catch {
      await this.store.patch('creators', { id: `eq.${creator.id}`, refresh_lock: `eq.${lock}` }, { tokens_ciphertext: null, refresh_lock: null, refresh_lock_until: null });
      throw new HttpError(401, 'Buffer connection expired. Reconnect to continue.');
    }
    replacement.scope ||= tokens.scope;
    const saved = await this.store.rpc('save_refreshed_tokens', { p_creator: creator.id, p_lock: lock, p_tokens: this.crypto().seal(replacement, `creator:${creator.id}`) });
    if (!saved) throw new HttpError(409, 'Buffer connection changed. Reconnect to continue.');
    if (!hasRequiredScopes(replacement.scope)) throw new HttpError(401, 'Reconnect Buffer and grant the required Posts and Notes permissions.');
    return replacement.accessToken;
  }
  client(row) {
    return { id: row.id, company: row.company, name: row.name, approvalOwner: row.name, email: row.email,
      approvalNote: row.approval_note, color: row.color, roomToken: this.crypto().open(row.room_token_ciphertext, `room:${row.id}`) };
  }
  post(row, review, comments = []) {
    const snapshot = review?.snapshot || row.snapshot;
    return { id: review?.id || row.id, contentId: row.id, sourceKind: row.source_kind, bufferId: row.source_id,
      ...snapshot, clientId: row.client_id, version: review?.version || row.version,
      status: review ? 'review' : 'draft', changedSinceReview: !!review && review.fingerprint !== row.fingerprint, comments };
  }
  async bootstrap(creator) {
    const [clients, refs, reviews] = await Promise.all([
      this.store.rows('clients', { creator_id: `eq.${creator.id}`, active: 'eq.true' }),
      this.store.rows('content_refs', { creator_id: `eq.${creator.id}`, organization_id: `eq.${creator.organization_id || ''}` }),
      this.store.rows('review_versions', { creator_id: `eq.${creator.id}`, active: 'eq.true' })
    ]);
    const deliveries = (await Promise.all(reviews.map(r => this.store.rows('feedback_deliveries', {
      review_id: `eq.${r.id}`, client_id: `eq.${r.client_id}`
    })))).flat();
    const pendingFeedback = deliveries.filter(d => ['sending','uncertain'].includes(d.status)).map(d => ({ id: d.id, name: d.author_name, status: 'uncertain' }));
    return { needsConsent: !hasRequiredScopes(this.crypto().open(creator.tokens_ciphertext, `creator:${creator.id}`).scope), pendingFeedback, profile: creator.profile, organizations: creator.organizations, organizationId: creator.organization_id,
      clients: clients.map(c => this.client(c)), posts: refs.map(r => ({ ...this.post(r, reviews.find(v => v.content_id === r.id)), id: r.id })), receipts: [] };
  }
  async postDetail(creator, payload) {
    const ref = await this.store.owned('content_refs', creator.id, id(payload.postId));
    const review = await this.store.one('review_versions', { creator_id: `eq.${creator.id}`, content_id: `eq.${ref.id}`, active: 'eq.true' });
    const client = ref.client_id ? await this.store.owned('clients', creator.id, ref.client_id) : null;
    let comments = [], commentsStatus = 'available';
    if (review && client) {
      try { comments = await this.visibleComments(client.id, review.id, ref); }
      catch { commentsStatus = 'unavailable'; }
    }
    return { post: { ...this.post(ref, review, comments), id: ref.id, commentsStatus }, client: client ? this.client(client) : null, comments };
  }
  async createClient(creator, payload) {
    const clientId = randomUUID(), token = randomToken();
    const row = await this.store.insert('clients', { id: clientId, creator_id: creator.id, company: text(payload.company, 'company'),
      name: text(payload.name || payload.approvalOwner, 'contact name', 100), email: String(payload.email || '').slice(0, 254),
      approval_note: String(payload.approvalNote || '').slice(0, 1000), color: /^#[a-f0-9]{6}$/i.test(payload.color || '') ? payload.color : '#cafd00',
      room_token_hash: hash(token), room_token_ciphertext: this.crypto().seal(token, `room:${clientId}`) });
    return { client: this.client(row) };
  }
  async rotateRoom(creator, payload) {
    const room = await this.store.owned('clients', creator.id, id(payload.clientId));
    if (payload.kind !== 'room') throw new HttpError(501, 'Production owner-code approval is not implemented.');
    const token = randomToken();
    await this.store.patch('clients', { id: `eq.${room.id}`, creator_id: `eq.${creator.id}` }, { room_token_hash: hash(token), room_token_ciphertext: this.crypto().seal(token, `room:${room.id}`) });
    return { ok: true };
  }
  async selectOrganization(creator, organizationId) {
    if (!creator.organizations.some(x => x.id === organizationId)) throw new HttpError(403, 'Organization is not connected to this Buffer account.');
    await this.store.patch('creators', { id: `eq.${creator.id}` }, { organization_id: organizationId });
    return { ok: true };
  }
  async sync(creator, payload) {
    if (!creator.organization_id) throw new HttpError(400, 'Select a Buffer organization first.');
    const tags = payload.tags === undefined ? [] : payload.tags;
    if (!Array.isArray(tags) || tags.length > 50 || tags.some(t => typeof t !== 'string' || !t.length || t.length > 200)) throw new HttpError(400, 'Invalid tag filters.');
    // Adapter must paginate completely and return Posts only. No Content Item coercion.
    const drafts = await this.buffer.listDrafts(await this.accessToken(creator), creator.organization_id, tags);
    let imported = 0;
    for (const draft of drafts) {
      if (draft.sourceKind !== 'post' || typeof draft.id !== 'string') throw new HttpError(502, 'Unsupported Buffer source.');
      const snapshot = { title: draft.text?.slice(0, 70) || 'Untitled Buffer post', caption: draft.text || '', platform: draft.platform || 'Buffer', image: draft.image || '' };
      await this.store.rpc('import_post', { p_creator: creator.id, p_org: creator.organization_id, p_source: draft.id, p_snapshot: snapshot, p_fingerprint: fingerprint(snapshot) });
      imported++;
    }
    return { imported };
  }
  async assign(creator, payload) {
    await this.store.owned('content_refs', creator.id, id(payload.postId));
    if (payload.clientId) await this.store.owned('clients', creator.id, id(payload.clientId));
    await this.store.rpc('assign_content', { p_creator: creator.id, p_content: payload.postId, p_client: payload.clientId || null });
    return { ok: true };
  }
  async share(creator, payload) {
    const ref = await this.store.owned('content_refs', creator.id, id(payload.postId));
    if (!ref.client_id) throw new HttpError(400, 'Assign a client first.');
    await this.store.owned('clients', creator.id, ref.client_id);
    await this.store.rpc('share_content', { p_creator: creator.id, p_content: ref.id });
    return { ok: true };
  }
  async visibleComments(roomId, reviewId, ref) {
    const [visibility, deliveries] = await Promise.all([
      this.store.rows('room_note_visibility', { client_id: `eq.${roomId}`, review_id: `eq.${reviewId}` }),
      this.store.rows('feedback_deliveries', { client_id: `eq.${roomId}`, review_id: `eq.${reviewId}`, status: 'eq.delivered', order: 'created_at.asc' })
    ]);
    const visible = new Set(visibility.map(x => x.buffer_note_id));
    const allowed = new Map(deliveries.filter(d => visible.has(d.buffer_note_id)).map(d => [d.buffer_note_id, d]));
    if (!allowed.size) return [];
    const creator = await this.store.one('creators', { id: `eq.${ref.creator_id}` });
    if (!creator?.tokens_ciphertext) throw new HttpError(503, 'Buffer notes are unavailable until the creator reconnects.');
    const notes = await this.buffer.collaborationNotes(await this.accessToken(creator), noteSubject(ref.source_kind, ref.source_id));
    if (!Array.isArray(notes)) throw new HttpError(502, 'Buffer notes response could not be read.');
    const comments = [], seen = new Set();
    for (const note of notes) {
      const delivery = allowed.get(note.id);
      // Filter before serializing. Do not expose other note bodies, authors, or counts.
      if (!delivery || typeof note.text !== 'string' || seen.has(note.id)) continue;
      seen.add(note.id);
      comments.push({ authorName: delivery.author_name, body: note.text, authorType: 'client', kind: 'comment',
        createdAt: note.createdAt || delivery.created_at, noteId: note.id });
    }
    return comments;
  }
  async reconcileFeedback(delivery, ref) {
    // Read-only reconciliation: NEVER claim/re-send a previously attempted write.
    try {
      const creator = await this.store.one('creators', { id: `eq.${ref.creator_id}` });
      if (!creator?.tokens_ciphertext) return null;
      const notes = await this.buffer.collaborationNotes(await this.accessToken(creator), noteSubject(ref.source_kind, ref.source_id));
      if (!Array.isArray(notes)) return null;
      const match = deliveredMatch(notes, delivery);
      if (!match) return null;
      // Marker/text identifies a candidate, not authority to expose an internal note.
      // Only an authenticated creator can explicitly authorize recovery visibility.
      return { status: 'uncertain', deliveryId: delivery.id, reconciliation: 'creator_review_required' };
    } catch {
      // Permissions, an incomplete/failed read, or a persistence failure prove no absence.
      return null;
    }
  }
  async inspectFeedback(creator, payload) {
    const delivery = await this.store.one('feedback_deliveries', { id: `eq.${id(payload.deliveryId)}` });
    if (!delivery) throw new HttpError(404, 'Feedback not found.');
    const room = await this.store.owned('clients', creator.id, delivery.client_id);
    const review = await this.store.owned('review_versions', creator.id, delivery.review_id);
    const ref = await this.store.owned('content_refs', creator.id, review.content_id);
    if (!room.active || !review.active || ref.client_id !== room.id || !['sending','uncertain'].includes(delivery.status)) throw new HttpError(409, 'Feedback is not available for recovery.');
    const notes = await this.buffer.collaborationNotes(await this.accessToken(creator), noteSubject(ref.source_kind, ref.source_id));
    const candidate = deliveredMatch(notes, delivery);
    return { deliveryId: delivery.id, candidate: candidate ? { id: candidate.id, text: candidate.text } : null };
  }
  async confirmFeedback(creator, payload) {
    const inspected = await this.inspectFeedback(creator, payload);
    if (!inspected.candidate || inspected.candidate.id !== payload.noteId) throw new HttpError(409, 'No unique matching submission was found. Nothing was resent or shared.');
    // This explicit creator action, NOT a text match, grants room visibility.
    await this.store.rpc('complete_feedback', { p_delivery: inspected.deliveryId, p_note: inspected.candidate.id });
    return { status: 'delivered', noteId: inspected.candidate.id };
  }
  async room(token) {
    const room = await this.store.one('clients', { room_token_hash: `eq.${tokenHash(token)}`, active: 'eq.true' });
    if (!room) throw new HttpError(404, 'Room not found.');
    return room;
  }
  async reviewRoom(token) {
    const room = await this.room(token);
    const reviews = await this.store.rows('review_versions', { client_id: `eq.${room.id}`, active: 'eq.true', order: 'shared_at.desc' });
    const posts = [];
    for (const review of reviews) {
      const ref = await this.store.owned('content_refs', room.creator_id, review.content_id);
      if (ref.client_id !== room.id) continue;
      let comments = [], commentsStatus = 'available';
      try { comments = await this.visibleComments(room.id, review.id, ref); }
      catch { commentsStatus = 'unavailable'; }
      posts.push({ ...this.post(ref, review, comments), commentsStatus });
    }
    return { client: { company: room.company, approvalNote: room.approval_note }, posts, demo: false, approvalsEnabled: false };
  }
  async feedback(token, payload) {
    const room = await this.room(token), reviewId = id(payload.postId), key = id(payload.idempotencyKey);
    const name = text(payload.name, 'reviewer name', 100), body = text(payload.body, 'feedback', 5000);
    if (/[\r\n\u0000-\u001f]/.test(name)) throw new HttpError(400, 'Enter your name on one line.');
    const review = await this.store.one('review_versions', { id: `eq.${reviewId}`, client_id: `eq.${room.id}`, active: 'eq.true' });
    if (!review) throw new HttpError(404, 'This post is not shared in this room.');
    let delivery = await this.store.rpc('queue_feedback', { p_room_hash: tokenHash(token), p_review: reviewId, p_key: key, p_name: name, p_body: body, p_payload_hash: fingerprint([reviewId, name, body]) });
    if (delivery.status === 'delivered') return { status: 'delivered', noteId: delivery.buffer_note_id };
    const ref = await this.store.owned('content_refs', room.creator_id, review.content_id);
    if (ref.client_id !== room.id) throw new HttpError(404, 'This post is not shared in this room.');
    if (delivery.status !== 'pending' && delivery.status !== 'failed') {
      const reconciled = await this.reconcileFeedback(delivery, ref);
      return reconciled || { status: delivery.status === 'sending' ? 'uncertain' : delivery.status, deliveryId: delivery.id };
    }
    if (ref.source_kind !== 'post') throw new HttpError(501, 'Content Item feedback is not supported yet.');
    const creator = await this.store.one('creators', { id: `eq.${room.creator_id}` });
    // Resolve setup/refresh failures before claiming delivery: no remote note has been attempted yet.
    if (!creator?.tokens_ciphertext) throw new HttpError(503, 'The creator needs to reconnect Buffer. Your feedback is pending.');
    const accessToken = await this.accessToken(creator);
    const claimed = await this.store.patch('feedback_deliveries', { id: `eq.${delivery.id}`, status: `eq.${delivery.status}` }, { status: 'sending' });
    if (!claimed.length) return { status: 'uncertain', deliveryId: delivery.id };
    let note;
    try {
      note = await this.buffer.createCollaborationNote(accessToken, noteInput(noteSubject(ref.source_kind, ref.source_id), feedbackText(delivery)));
      if (!note?.id) throw new Error('Missing note ID');
    } catch {
      await this.store.patch('feedback_deliveries', { id: `eq.${delivery.id}`, status: 'eq.sending' }, { status: 'uncertain' });
      return { status: 'uncertain', deliveryId: delivery.id };
    }
    // If this transaction fails after Buffer accepted, keep sending. Never blindly resend.
    await this.store.rpc('complete_feedback', { p_delivery: delivery.id, p_note: note.id });
    return { status: 'delivered', noteId: note.id };
  }
  async disconnect(creator) {
    // Local disconnect deletes rotating tokens and every local session. No invented revocation endpoint.
    await this.store.patch('creators', { id: `eq.${creator.id}` }, { tokens_ciphertext: null, refresh_lock: null, refresh_lock_until: null });
    await this.store.delete('creator_sessions', { creator_id: `eq.${creator.id}` });
    return { ok: true };
  }
}
