import http from 'node:http';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import { createHandler } from '../server/http.js';
const allowed = new Set(['index.html','app.html','thanks.html','robots.txt',
  ...['demo-data','utils','api','auth','ui','app'].map(f=>`js/${f}.js`), 'styles/landing.css','styles/app.css']);
const endpoints = new Set(['config','creator-api','review-api','oauth-start','oauth-callback']);
const mime = { html:'text/html', js:'text/javascript', css:'text/css', txt:'text/plain' };
const listener = async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const endpoint = url.pathname.replace('/.netlify/functions/', '');
    if (url.pathname.startsWith('/.netlify/functions/') && endpoints.has(endpoint)) {
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 20000) { response.writeHead(413); response.end(); return; } chunks.push(chunk); }
      const result = await createHandler(endpoint)({ httpMethod: request.method, headers: request.headers, queryStringParameters: Object.fromEntries(url.searchParams), body: Buffer.concat(chunks).toString() });
      response.writeHead(result.statusCode, { ...result.headers, ...result.multiValueHeaders }); response.end(result.body); return;
    }
    let file = url.pathname.slice(1);
    if (!file) file = 'index.html';
    if (file === 'app' || /^review\/[A-Za-z0-9_-]+$/.test(file)) file = 'app.html';
    if (!allowed.has(file)) { response.writeHead(404); response.end('Not found'); return; }
    const data = await readFile(new URL(`../${file}`, import.meta.url));
    response.writeHead(200, { 'content-type': mime[file.split('.').pop()], 'cache-control':'no-store', 'referrer-policy':'no-referrer', 'x-content-type-options':'nosniff' });
    response.end(data);
  } catch { response.writeHead(500); response.end('Local server error'); }
};
const tls = process.env.DEV_TLS_CERT && process.env.DEV_TLS_KEY;
const server = tls ? https.createServer({ cert: await readFile(process.env.DEV_TLS_CERT), key: await readFile(process.env.DEV_TLS_KEY) }, listener) : http.createServer(listener);
server.listen(Number(process.env.PORT || 8888), '127.0.0.1', () => console.log(`Receipts local ${tls ? 'HTTPS' : 'HTTP'} server listening on port ${process.env.PORT || 8888}. Live OAuth requires HTTPS and APP_BASE_URL.`));
