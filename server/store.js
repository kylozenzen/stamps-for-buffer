import { HttpError } from './security.js';
export class Store {
  constructor(env, fetcher = fetch) {
    this.url = env.SUPABASE_URL?.replace(/\/+$/, ''); this.key = env.SUPABASE_SERVICE_ROLE_KEY; this.fetch = fetcher;
  }
  async request(path, { method = 'GET', body, prefer = 'return=representation' } = {}) {
    if (!this.url || !this.key) throw new HttpError(503, 'Shared persistence is not configured.');
    let response;
    try { response = await this.fetch(`${this.url}/rest/v1/${path}`, {
      method, headers: { apikey: this.key, authorization: `Bearer ${this.key}`, 'content-type': 'application/json', prefer },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    }); } catch { throw new HttpError(503, 'Shared persistence is unavailable.'); }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const known = {
        'Room not found': [404, 'Room not found.'],
        'Review not shared': [404, 'This review is not shared in the room.'],
        'Idempotency key conflict': [409, 'This retry key belongs to different feedback.'],
        'Room rate limited': [429, 'Too many comments in this room. Please wait a minute.'],
        'Assign content first': [400, 'Assign a client first.']
      };
      const mapped = error.code === 'P0001' && known[error.message];
      if (mapped) throw new HttpError(...mapped);
      throw new HttpError(503, 'Shared persistence rejected the operation.');
    }
    return response.status === 204 ? null : response.json();
  }
  async rows(table, filters = {}) {
    const query = new URLSearchParams({ select: '*', ...filters });
    return this.request(`${table}?${query}`);
  }
  async one(table, filters) { return (await this.rows(table, filters))[0] || null; }
  async insert(table, value) { return (await this.request(table, { method: 'POST', body: value }))[0]; }
  async patch(table, filters, value) { return this.request(`${table}?${new URLSearchParams(filters)}`, { method: 'PATCH', body: value }); }
  async delete(table, filters) { return this.request(`${table}?${new URLSearchParams(filters)}`, { method: 'DELETE' }); }
  async rpc(name, body) {
    const result = await this.request(`rpc/${name}`, { method: 'POST', body });
    // PostgREST returns table/composite functions as row arrays; callers need
    // one record. Scalar boolean RPCs must retain false rather than unwrap it.
    if (['import_post', 'share_content', 'queue_feedback'].includes(name)) {
      const row = Array.isArray(result) ? (result.length === 1 ? result[0] : null) : result;
      if (!row || typeof row !== 'object' || typeof row.id !== 'string') throw new HttpError(503, 'Shared persistence returned an invalid record.');
      return row;
    }
    if (typeof result !== 'boolean') throw new HttpError(503, 'Shared persistence returned an invalid confirmation.');
    return result;
  }
  async owned(table, creatorId, rowId) {
    const row = await this.one(table, { id: `eq.${rowId}`, creator_id: `eq.${creatorId}` });
    if (!row) throw new HttpError(404, 'Record not found.');
    return row;
  }
}
