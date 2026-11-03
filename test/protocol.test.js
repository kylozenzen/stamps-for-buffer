import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { BufferClient, pkce, callbackUrl, REQUIRED_SCOPES } from '../server/buffer.js';
import { cipher, hash, randomToken, requireOrigin } from '../server/security.js';
import { createHandler } from '../server/http.js';
import { Receipts } from '../server/service.js';
const env={APP_BASE_URL:'https://receipts.example.com',BUFFER_CLIENT_ID:'test-client',BUFFER_CLIENT_SECRET:'test-secret',RECEIPTS_ENCRYPTION_KEY:randomBytes(32).toString('base64')};
test('official-sample OAuth contract uses PKCE and server callback with offline access',()=>{
 const buffer=new BufferClient(env), pair=pkce(),url=new URL(buffer.authorize('state',pair.challenge));
 assert.equal(pair.verifier.length,43);assert.equal(pair.challenge,Buffer.from(hash(pair.verifier),'hex').toString('base64url'));
 assert.equal(url.origin,'https://auth.buffer.com');assert.equal(url.pathname,'/auth');
 assert.equal(url.searchParams.get('redirect_uri'),'https://receipts.example.com/.netlify/functions/oauth-callback');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.deepEqual(url.searchParams.get('scope').split(' '),REQUIRED_SCOPES.split(' '));
 assert.equal(url.searchParams.has('client_secret'),false);
});
test('code exchange includes verifier and confidential secret only in the form body',async()=>{
 let request;
 const client=new BufferClient(env,async(url,options)=>{request={url,...options};return Response.json({access_token:'access',refresh_token:'rotated-refresh',expires_in:3600});});
 const tokens=await client.exchange('code','verifier');
 assert.equal(request.url,'https://auth.buffer.com/token');assert.equal(request.body.get('code_verifier'),'verifier');
 assert.equal(request.body.get('client_secret'),'test-secret');assert.equal(tokens.refreshToken,'rotated-refresh');
 assert.ok(tokens.expiresAt>Date.now());
});
test('refresh rejects missing replacement refresh token and never invents one',async()=>{
 const client=new BufferClient(env,async()=>Response.json({access_token:'access',expires_in:3600}));
 await assert.rejects(client.refresh({refreshToken:'old'}),e=>e.status===502);
});
test('GraphQL HTTP-200 errors and rate limiting are failures',async()=>{
 const client=new BufferClient(env,async()=>Response.json({errors:[{message:'private upstream detail'}]}));
 await assert.rejects(client.account('access'),e=>e.status===502&&!e.message.includes('private upstream'));
 const limited=new BufferClient(env,async()=>new Response('',{status:429}));
 await assert.rejects(limited.account('access'),e=>e.status===429);
});
test('encrypted secrets are authenticated and bound to their owning context',()=>{
 const c=cipher(env.RECEIPTS_ENCRYPTION_KEY),sealed=c.seal({accessToken:'secret'},'creator:a');
 assert.equal(sealed.includes('secret'),false);assert.equal(c.open(sealed,'creator:a').accessToken,'secret');
 assert.throws(()=>c.open(sealed,'creator:b'));assert.throws(()=>cipher('bad'));
});
test('OAuth state is browser-bound, short-lived, and consumed before token exchange',async()=>{
 const state=randomToken(),c=cipher(env.RECEIPTS_ENCRYPTION_KEY);
 let row={verifier_ciphertext:c.seal('verifier','oauth')}, exchanges=0;
 const service=new Receipts({env,store:{delete:async(_table,filters)=>{
  assert.equal(filters.state_hash,`eq.${hash(state)}`);assert.ok(filters.expires_at.startsWith('gt.'));
  const result=row?[row]:[];row=null;return result;
 }},buffer:{exchange:async()=>{exchanges++;throw Error('stop after state validation');}}});
 await assert.rejects(service.finishOAuth({state,code:'code'},randomToken()),e=>e.status===400);assert.ok(row);
 await assert.rejects(service.finishOAuth({state,code:'code'},state),/stop after state/);
 await assert.rejects(service.finishOAuth({state,code:'code'},state),e=>e.status===400);assert.equal(exchanges,1);
});
test('creator routes require secure session and same-origin JSON',async()=>{
 let authenticated=false;
 const handler=createHandler('creator-api',{env,service:{authenticate:async()=>{authenticated=true;throw Object.assign(new Error('private'),{secret:'never echo'});}}});
 const event={httpMethod:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{"action":"bootstrap"}'};
 assert.equal((await handler(event)).statusCode,403);assert.equal(authenticated,false);
 event.headers.origin=env.APP_BASE_URL;const response=await handler(event);
 assert.equal(response.statusCode,500);assert.equal(response.body.includes('private'),false);
 event.headers['content-type']='text/plain';assert.equal((await handler(event)).statusCode,415);
});
test('OAuth cookies are Secure, HttpOnly, host scoped, and SameSite',async()=>{
 const handler=createHandler('oauth-start',{env,service:{startOAuth:async()=>({state:'test-state',location:'https://auth.buffer.com/auth'})}});
 const response=await handler({httpMethod:'GET',headers:{}});
 assert.equal(response.statusCode,302);
 for(const value of ['__Host-receipts_oauth=','Secure','HttpOnly','SameSite=Lax','Max-Age=600'])assert.ok(response.headers['set-cookie'].includes(value));
 assert.equal(response.headers['set-cookie'].includes('Domain='),false);
});
test('production config is explicit even with no credentials',async()=>{
 const response=await createHandler('config',{env:{}})({httpMethod:'GET'});
 const body=JSON.parse(response.body);assert.equal(body.mode,'production');assert.equal(body.backendConfigured,false);assert.equal(body.oauthConfigured,false);
});
async function browserAPI(search,fetcher){
 const data=new Map();const context={window:{location:{origin:env.APP_BASE_URL,search}},URLSearchParams,fetch:fetcher,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},crypto:globalThis.crypto};
 vm.runInNewContext(await readFile(new URL('../js/api.js',import.meta.url),'utf8'),context);
 return context.window.ReceiptsAPI;
}
test('production config failure never loads demo and explicit demo makes no config request',async()=>{
 const broken=await browserAPI('',async()=>{throw Error('offline');});
 await assert.rejects(broken.init(),/offline/);assert.notEqual(broken.getMode(),'demo');
 const demo=await browserAPI('?demo=1',async()=>{throw Error('must not request production');});
 assert.equal((await demo.init()).mode,'demo');
});
test('feedback UI preserves its idempotency key across unknown network responses',async()=>{
 const keys=[];let attempt=0;
 const api=await browserAPI('',async(url,options)=>{
  if(url.includes('/config'))return Response.json({mode:'production'});
  keys.push(JSON.parse(options.body).payload.idempotencyKey);attempt++;
  if(attempt===1)throw Error('response lost');
  return Response.json({status:'delivered',noteId:'note'});
 });
 await api.init();await assert.rejects(api.addReviewComment('room','post','Name','Feedback'),/response lost/);
 await api.addReviewComment('room','post','Name','Feedback');assert.equal(keys[0],keys[1]);
});
test('app assets resolve at the root on nested public review routes',async()=>{
 const html=await readFile(new URL('../app.html',import.meta.url),'utf8');
 const assets=[...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map(m=>m[1]);
 assert.ok(assets.length>=7);
 for(const asset of assets){const url=new URL(asset,'https://receipts.example.com/review/private-token');assert.equal(url.pathname.startsWith('/review/'),false);}
});

test('mocked settings rendering exposes renewed-consent and creator recovery controls',async()=>{
 const context={window:{ReceiptsAPI:{getMode:()=> 'remote',getConfig:()=>({})}}};
 vm.runInNewContext(await readFile(new URL('../js/utils.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(await readFile(new URL('../js/ui.js',import.meta.url),'utf8'),context);
 const html=context.window.ReceiptsUI.renderCreator({page:'settings',data:{needsConsent:true,profile:{name:'Creator'},organizations:[],pendingFeedback:[{id:'test',name:'<Reviewer>',status:'uncertain'}]}});
 assert.ok(html.includes('required Posts and Notes permissions'));assert.ok(html.includes('Review recovery'));assert.ok(html.includes('&lt;Reviewer&gt;'));
});
