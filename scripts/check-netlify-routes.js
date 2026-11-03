// Run against an already-running local Netlify Node Functions emulator.
// Does not start, create, authenticate, or deploy a remote site.
import assert from 'node:assert/strict';
const base = new URL(process.argv[2] || 'http://127.0.0.1:8991');
if (!['localhost','127.0.0.1'].includes(base.hostname)) throw new Error('This check targets a local emulator only.');
for (const path of ['/','/app','/review/test-token','/js/app.js','/styles/app.css']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  const body = await response.text();
  if (path === '/app' || path.startsWith('/review/')) assert.ok(body.includes('<div id="app">'));
  if (path.startsWith('/review/')) {
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    if (!response.headers.get('cache-control')?.includes('no-store')) console.log('UNVERIFIED hosted HTML no-store: CLI static server overrides Cache-Control; verify configured rule on the test site.');
  }
  console.log(`PASS ${path} HTTP 200`);
}
for (const path of ['/.env','/server/service.js','/supabase/migrations/001_receipts.sql']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 404, path);
  console.log(`PASS ${path} HTTP 404`);
}
const response = await fetch(new URL('/.netlify/functions/config', base));
assert.equal(response.status, 200);
assert.ok(response.headers.get('cache-control')?.includes('no-store'));
const config = await response.json();
assert.equal(config.mode, 'production');
assert.equal(typeof config.oauthConfigured, 'boolean');
console.log('PASS actual Netlify config Function HTTP 200, production mode');
if (!config.oauthConfigured) {
  const missing = await fetch(new URL('/.netlify/functions/oauth-start', base));
  assert.equal(missing.status, 503);
  console.log('PASS actual OAuth Function explicit missing-config HTTP 503');
}
