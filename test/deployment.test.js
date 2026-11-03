// Local deployment checks. PostgREST and Buffer responses are mocked here;
// Netlify bundling is additionally checked with the actual offline Netlify build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Store } from '../server/store.js';
import { createHandler } from '../server/http.js';
import { cipher } from '../server/security.js';
import { randomBytes } from 'node:crypto';
test('PostgREST composite RPC array and object responses normalize; boolean false stays false',async()=>{
 for(const result of [[{id:'record',status:'pending'}],{id:'record',status:'pending'}]){
  const store=new Store({SUPABASE_URL:'https://project.supabase.co/',SUPABASE_SERVICE_ROLE_KEY:'test-only'},async(url,options)=>{
   assert.equal(url,'https://project.supabase.co/rest/v1/rpc/queue_feedback');
   assert.equal(options.method,'POST');return Response.json(result);
  });
  assert.equal((await store.rpc('queue_feedback',{})).status,'pending');
 }
 const store=new Store({SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only'},async()=>Response.json(false));
 assert.equal(await store.rpc('acquire_refresh',{}),false);
 for(const invalid of [[],[{id:'a'},{id:'b'}],null]){
  store.fetch=async()=>Response.json(invalid);await assert.rejects(store.rpc('queue_feedback',{}),e=>e.status===503);
 }
});
test('Netlify callback response issues two separate Secure cookies and redirects to /app',async()=>{
 const handler=createHandler('oauth-callback',{env:{APP_BASE_URL:'https://test.netlify.app'},service:{finishOAuth:async(params,state)=>{
  assert.equal(params.code,'test-code');assert.equal(state,'test-state');return 'test-session';
 }}});
 const response=await handler({httpMethod:'GET',headers:{cookie:'__Host-receipts_oauth=test-state'},queryStringParameters:{code:'test-code'}});
 assert.equal(response.statusCode,302);assert.equal(response.headers.location,'/app');
 const cookies=response.multiValueHeaders['set-cookie'];assert.equal(cookies.length,2);
 assert.ok(cookies[0].startsWith('__Host-receipts_session='));assert.ok(cookies[1].includes('Max-Age=0'));
 for(const cookie of cookies)for(const flag of ['Secure','HttpOnly','SameSite=Lax','Path=/'])assert.ok(cookie.includes(flag));
 assert.equal(response.body.includes('test-session'),false);
});
test('encryption key generator format is canonical 44-character base64 for 32 bytes',()=>{
 const key=randomBytes(32).toString('base64');assert.match(key,/^[A-Za-z0-9+/]{43}=$/);
 const crypto=cipher(key),value=crypto.seal({test:true},'test');assert.equal(crypto.open(value,'test').test,true);
});
test('Netlify rewrites preserve function endpoints and use root-relative app assets',async()=>{
 const config=await readFile(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.ok(config.includes('publish = "dist"'));assert.ok(config.includes('functions = "netlify/functions"'));
 for(const path of ['/app','/review/*'])assert.ok(config.includes(`from = "${path}"`));
 assert.equal(config.includes('from = "/*"'),false);
 const html=await readFile(new URL('../app.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g))assert.ok(match[1].startsWith('/'));
});
