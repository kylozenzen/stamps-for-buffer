import { Store } from './store.js';
import { BufferClient } from './buffer.js';
import { Receipts } from './service.js';
import { HttpError, cookies, cookie, requireOrigin } from './security.js';
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
  'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
function json(statusCode, body, extra = {}) { return { statusCode, headers: { ...headers, ...extra }, body: JSON.stringify(body) }; }
function redirect(location, cookieValue) { return { statusCode: 302, headers: { ...headers, location, 'set-cookie': cookieValue }, body: '' }; }
export function createHandler(action, { env = process.env, service } = {}) {
  return async event => {
    try {
      const h = Object.fromEntries(Object.entries(event.headers || {}).map(([k,v]) => [k.toLowerCase(),v]));
      const jar = cookies(h.cookie);
      const api = service || new Receipts({ env, store: new Store(env), buffer: new BufferClient(env) });
      if (action === 'config') {
        if (event.httpMethod !== 'GET') throw new HttpError(405, 'Method not allowed.');
        return json(200, { mode: 'production', backendConfigured: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY), sessionPresent: !!jar['__Host-receipts_session'], oauthConfigured: !!(env.APP_BASE_URL && env.BUFFER_CLIENT_ID && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.RECEIPTS_ENCRYPTION_KEY), approvalsEnabled: false });
      }
      let origin;
      try { const url = new URL(env.APP_BASE_URL); if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error(); origin = url.origin; }
      catch { throw new HttpError(503, 'APP_BASE_URL must be a configured HTTPS origin.'); }
      if (action === 'oauth-start') {
        if (event.httpMethod !== 'GET') throw new HttpError(405, 'Method not allowed.');
        const result = await api.startOAuth();
        return redirect(result.location, cookie('__Host-receipts_oauth', result.state, 600));
      }
      if (action === 'oauth-callback') {
        if (event.httpMethod !== 'GET') throw new HttpError(405, 'Method not allowed.');
        const session = await api.finishOAuth(event.queryStringParameters || {}, jar['__Host-receipts_oauth']);
        return { ...redirect('/app', cookie('__Host-receipts_session', session, 7 * 86400)), multiValueHeaders: { 'set-cookie': [cookie('__Host-receipts_session', session, 7 * 86400), cookie('__Host-receipts_oauth', '', 0)] }, headers: { ...headers, location: '/app' } };
      }
      if (event.httpMethod !== 'POST') throw new HttpError(405, 'Method not allowed.');
      requireOrigin(h, origin);
      if (!h['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON body required.');
      if (Buffer.byteLength(event.body || '') > 20000) throw new HttpError(413, 'Request is too large.');
      let input;
      try { input = JSON.parse(event.body || '{}'); if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error(); }
      catch { throw new HttpError(400, 'Invalid JSON.'); }
      const payload = input.payload || {};
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new HttpError(400, 'Invalid payload.');
      if (action === 'review-api') {
        if (input.action === 'getRoom') return json(200, await api.reviewRoom(input.token));
        if (input.action === 'addComment') {
          const result = await api.feedback(input.token, payload);
          return json(result.status === 'delivered' ? 200 : 202, result);
        }
        throw new HttpError(501, 'Production approvals and change requests are not enabled. Use named comments.');
      }
      if (action !== 'creator-api') throw new HttpError(404, 'Not found.');
      const creator = await api.authenticate(jar['__Host-receipts_session']);
      switch (input.action) {
        case 'inspectFeedback': return json(200, await api.inspectFeedback(creator, payload));
        case 'confirmFeedback': return json(200, await api.confirmFeedback(creator, payload));
        case 'bootstrap': return json(200, await api.bootstrap(creator));
        case 'createClient': return json(200, await api.createClient(creator, payload));
        case 'rotateClientSecret': return json(200, await api.rotateRoom(creator, payload));
        case 'selectOrganization': return json(200, await api.selectOrganization(creator, payload.organizationId));
        case 'syncBuffer': return json(200, await api.sync(creator, payload));
        case 'assignPost': return json(200, await api.assign(creator, payload));
        case 'sendForReview': return json(200, await api.share(creator, payload));
        case 'postDetail': return json(200, await api.postDetail(creator, payload));
        case 'disconnect': return json(200, await api.disconnect(creator), { 'set-cookie': cookie('__Host-receipts_session', '', 0) });
        default: throw new HttpError(501, 'This action is not enabled in production.');
      }
    } catch (error) {
      // Never echo upstream responses, token bodies, SQL errors, or request contents.
      return json(error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : 'Receipts could not complete the request.' });
    }
  };
}
