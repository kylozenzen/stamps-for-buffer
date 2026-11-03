import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { SQLStore } from './sql-store.js';
import { BufferClient, REQUIRED_SCOPES } from '../server/buffer.js';
import { Receipts } from '../server/service.js';
import { cipher, hash, randomToken, fingerprint } from '../server/security.js';
const db=new PGlite(), env={RECEIPTS_ENCRYPTION_KEY:randomBytes(32).toString('base64')}, store=new SQLStore(db);
let service, a,b,roomA,roomB,tokenA,tokenB,postA,postB,reviewA,reviewB, calls, buffer;
before(async()=>{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../supabase/migrations/001_receipts.sql',import.meta.url),'utf8'));
});
after(()=>db.close());
beforeEach(async()=>{
 await db.exec('truncate creators, oauth_flows cascade');
 calls=0;
 buffer={notes:[],
  collaborationNotes:async(_token,subject)=>{assert.deepEqual(subject,{postId:'source-a'});return buffer.notes;},
  createCollaborationNote:async(_token,note)=>{
   assert.deepEqual(note.subject,{postId:'source-a'});assert.equal('author' in note,false);
   assert.match(note.text,/External Reviewer \(external reviewer via Receipts\):/);
   assert.match(note.text,/\[Receipts feedback [0-9a-f-]+\]/);
   calls++;const result={id:'note-'+calls,text:note.text,createdAt:new Date().toISOString()};buffer.notes.push(result);return result;
  },refresh:async()=>({accessToken:'rotated',refreshToken:'new-refresh',scope:REQUIRED_SCOPES,expiresAt:Date.now()+3600000})};
 service=new Receipts({env,store,buffer});
 const makeCreator=async account=>{
  const id=randomUUID();return store.insert('creators',{id,buffer_account_id:account,profile:{name:account},organizations:[{id:'org-'+account,name:account}],organization_id:'org-'+account,tokens_ciphertext:cipher(env.RECEIPTS_ENCRYPTION_KEY).seal({accessToken:'test-only',refreshToken:'test-refresh',scope:REQUIRED_SCOPES,expiresAt:Date.now()+3600000},`creator:${id}`)});
 };
 a=await makeCreator('a');b=await makeCreator('b');
 roomA=(await service.createClient(a,{company:'A',name:'Contact A'})).client;
 roomB=(await service.createClient(b,{company:'B',name:'Contact B'})).client;
 tokenA=roomA.roomToken;tokenB=roomB.roomToken;
 const makePost=async(creator,source)=>store.rpc('import_post',{p_creator:creator.id,p_org:creator.organization_id,p_source:source,p_snapshot:{caption:'Original',title:source,platform:'Buffer',image:''},p_fingerprint:fingerprint(source)});
 postA=await makePost(a,'source-a');postB=await makePost(b,'source-b');
 await service.assign(a,{postId:postA.id,clientId:roomA.id});await service.share(a,{postId:postA.id});
 await service.assign(b,{postId:postB.id,clientId:roomB.id});await service.share(b,{postId:postB.id});
 reviewA=(await service.reviewRoom(tokenA)).posts[0];reviewB=(await service.reviewRoom(tokenB)).posts[0];
});
const payload=(review,key=randomUUID())=>({postId:review.id,idempotencyKey:key,name:'External Reviewer',body:'Please revise the introduction.'});
test('migration denies anonymous table access and privileged RPC execution',async()=>{
 await db.exec('set role anon');
 try {
  await assert.rejects(db.query('select * from creators'),/permission denied/);
  await assert.rejects(db.query('select * from content_refs'),/permission denied/);
  await assert.rejects(db.query('select public.share_content($1,$2)',[a.id,postA.id]),/permission denied/);
 }finally{await db.exec('reset role');}
});
test('creator cannot read, assign, share, or select another creator organization',async()=>{
 await assert.rejects(store.owned('content_refs',b.id,postA.id),e=>e.status===404);
 await assert.rejects(service.assign(b,{postId:postA.id,clientId:roomB.id}),e=>e.status===404);
 await assert.rejects(service.share(b,{postId:postA.id}),e=>e.status===404);
 await assert.rejects(service.assign(a,{postId:postA.id,clientId:roomB.id}),e=>e.status===404);
 await assert.rejects(service.selectOrganization(a,b.organization_id),e=>e.status===403);
 await assert.rejects(store.patch('content_refs',{id:`eq.${postA.id}`},{client_id:roomB.id}),/foreign key/);
});
test('room reads and writes are isolated; arbitrary source/post IDs are rejected',async()=>{
 assert.deepEqual((await service.reviewRoom(tokenA)).posts.map(p=>p.bufferId),['source-a']);
 await assert.rejects(service.feedback(tokenA,payload(reviewB)),e=>e.status===404);
 await assert.rejects(service.feedback(randomToken(),payload(reviewA)),e=>e.status===404);
 await assert.rejects(service.feedback(tokenA,{...payload(reviewA),postId:postB.id}),e=>e.status===404);
});
test('assignment alone does not publish; reassignment revokes the previous share',async()=>{
 await service.assign(a,{postId:postA.id,clientId:null});
 assert.equal((await service.reviewRoom(tokenA)).posts.length,0);
 await service.assign(a,{postId:postA.id,clientId:roomA.id});
 assert.equal((await service.reviewRoom(tokenA)).posts.length,0);
 await service.share(a,{postId:postA.id});assert.equal((await service.reviewRoom(tokenA)).posts.length,1);
});
test('room rotation revokes old tokens for reads and writes',async()=>{
 await service.rotateRoom(a,{clientId:roomA.id,kind:'room'});
 await assert.rejects(service.reviewRoom(tokenA),e=>e.status===404);
 await assert.rejects(service.feedback(tokenA,payload(reviewA)),e=>e.status===404);
 const next=(await service.bootstrap(a)).clients[0].roomToken;
 assert.notEqual(next,tokenA);assert.equal((await service.reviewRoom(next)).posts.length,1);
});
test('successful feedback persists Buffer note ID and retries do not duplicate',async()=>{
 const p=payload(reviewA),first=await service.feedback(tokenA,p),second=await service.feedback(tokenA,p);
 assert.equal(first.status,'delivered');assert.deepEqual(second,first);assert.equal(calls,1);
 const room=await service.reviewRoom(tokenA);assert.equal(room.posts[0].comments[0].noteId,'note-1');
 assert.equal((await service.reviewRoom(tokenB)).posts[0].comments.length,0);
});
test('only explicitly room-visible note IDs are returned; internal/unlisted notes stay private',async()=>{
 await service.feedback(tokenA,payload(reviewA));
 await store.delete('room_note_visibility',{client_id:`eq.${roomA.id}`});
 assert.equal((await service.reviewRoom(tokenA)).posts[0].comments.length,0);
 assert.equal((await store.rows('feedback_deliveries')).length,1);
});
test('same idempotency key with changed text is rejected',async()=>{
 const p=payload(reviewA);await service.feedback(tokenA,p);
 await assert.rejects(service.feedback(tokenA,{...p,body:'Changed text'}),/Idempotency key conflict/);
 assert.equal(calls,1);
});
test('lost Buffer response becomes uncertain and is never automatically resent',async()=>{
 buffer.createCollaborationNote=async()=>{calls++;throw Error('simulated timeout after remote acceptance');};
 const p=payload(reviewA);assert.equal((await service.feedback(tokenA,p)).status,'uncertain');
 assert.equal((await service.feedback(tokenA,p)).status,'uncertain');assert.equal(calls,1);
 assert.equal((await service.reviewRoom(tokenA)).posts[0].comments.length,0);
});
test('concurrent retries claim at most one Buffer mutation',async()=>{
 const p=payload(reviewA);await Promise.all([service.feedback(tokenA,p),service.feedback(tokenA,p)]);
 assert.equal(calls,1);assert.equal((await service.feedback(tokenA,p)).status,'delivered');
});
test('database completion failure after Buffer success does not cause duplicate delivery',async()=>{
 const actual=store.rpc.bind(store);let fail=true;
 store.rpc=async(name,args)=>{if(name==='complete_feedback'&&fail)throw Error('database unavailable');return actual(name,args);};
 try {
  const p=payload(reviewA);await assert.rejects(service.feedback(tokenA,p),/database unavailable/);
  fail=false;assert.equal((await service.feedback(tokenA,p)).status,'uncertain');assert.equal(calls,1);
  const candidate=await service.inspectFeedback(a,{deliveryId:(await store.rows('feedback_deliveries'))[0].id});
  await service.confirmFeedback(a,{deliveryId:candidate.deliveryId,noteId:candidate.candidate.id});
  assert.equal((await service.feedback(tokenA,p)).status,'delivered');
 }finally{store.rpc=actual;}
});
test('pre-delivery connection failure stays pending and can safely retry',async()=>{
 const p=payload(reviewA),original=a.tokens_ciphertext;
 await store.patch('creators',{id:`eq.${a.id}`},{tokens_ciphertext:null});
 await assert.rejects(service.feedback(tokenA,p),e=>e.status===503);
 assert.equal(calls,0);assert.equal((await store.rows('feedback_deliveries'))[0].status,'pending');
 await store.patch('creators',{id:`eq.${a.id}`},{tokens_ciphertext:original});
 assert.equal((await service.feedback(tokenA,p)).status,'delivered');assert.equal(calls,1);
});
test('repeat import preserves source ID without duplicates and increments only changed versions',async()=>{
 const args={p_creator:a.id,p_org:a.organization_id,p_source:postA.source_id,p_snapshot:postA.snapshot,p_fingerprint:postA.fingerprint};
 const same=await store.rpc('import_post',args);assert.equal(same.id,postA.id);assert.equal(same.version,1);
 const next=await store.rpc('import_post',{...args,p_snapshot:{caption:'Edited'},p_fingerprint:'changed'});
 assert.equal(next.id,postA.id);assert.equal(next.version,2);
 assert.equal((await store.rows('content_refs',{creator_id:`eq.${a.id}`})).length,1);
 const room=await service.reviewRoom(tokenA);assert.equal(room.posts[0].caption,'Original');assert.equal(room.posts[0].changedSinceReview,true);
 await service.share(a,{postId:postA.id});
 const resent=await service.reviewRoom(tokenA);assert.equal(resent.posts.length,1);assert.equal(resent.posts[0].caption,'Edited');
 await assert.rejects(service.feedback(tokenA,payload(reviewA)),e=>e.status===404);
});
test('Content Items remain distinct and cannot use the Posts feedback adapter',async()=>{
 await store.patch('content_refs',{id:`eq.${postA.id}`},{source_kind:'content_item'});
 await assert.rejects(service.feedback(tokenA,payload(reviewA)),e=>e.status===501);assert.equal(calls,0);
});
test('refresh rotates encrypted tokens and disconnect invalidates sessions',async()=>{
 const expired={accessToken:'old',refreshToken:'old-refresh',scope:REQUIRED_SCOPES,scope:REQUIRED_SCOPES,expiresAt:0};
 await store.patch('creators',{id:`eq.${a.id}`},{tokens_ciphertext:cipher(env.RECEIPTS_ENCRYPTION_KEY).seal(expired,`creator:${a.id}`)});
 a=await store.one('creators',{id:`eq.${a.id}`});assert.equal(await service.accessToken(a),'rotated');
 const saved=await store.one('creators',{id:`eq.${a.id}`});
 assert.equal(cipher(env.RECEIPTS_ENCRYPTION_KEY).open(saved.tokens_ciphertext,`creator:${a.id}`).refreshToken,'new-refresh');
 const session=randomToken();await store.insert('creator_sessions',{token_hash:hash(session),creator_id:a.id,expires_at:new Date(Date.now()+10000).toISOString()});
 assert.equal((await service.authenticate(session)).id,a.id);
 await service.disconnect(a);await assert.rejects(service.authenticate(session),e=>e.status===401);
});

test('lost write response reconciles only from a positive exact note match without resending',async()=>{
 buffer.createCollaborationNote=async(_token,input)=>{calls++;buffer.notes.push({id:'remote-accepted',text:input.text});throw Error('timeout');};
 const p=payload(reviewA);
 assert.equal((await service.feedback(tokenA,p)).status,'uncertain');
 const result=await service.feedback(tokenA,p);
 assert.equal(result.status,'uncertain');assert.equal(result.reconciliation,'creator_review_required');
 assert.equal((await service.reviewRoom(tokenA)).posts[0].comments.length,0);
 await assert.rejects(service.inspectFeedback(b,{deliveryId:result.deliveryId}),e=>e.status===404);
 await assert.rejects(service.confirmFeedback(a,{deliveryId:result.deliveryId,noteId:'internal-other'}),e=>e.status===409);
 await service.confirmFeedback(a,{deliveryId:result.deliveryId,noteId:'remote-accepted'});
 assert.equal(calls,1);assert.equal((await service.reviewRoom(tokenA)).posts[0].comments[0].noteId,'remote-accepted');
});
test('multiple matching remote notes remain uncertain; no arbitrary ID becomes visible',async()=>{
 buffer.createCollaborationNote=async(_token,input)=>{calls++;buffer.notes.push({id:'one',text:input.text},{id:'two',text:input.text});throw Error('timeout');};
 const p=payload(reviewA);await service.feedback(tokenA,p);
 assert.equal((await service.feedback(tokenA,p)).status,'uncertain');assert.equal(calls,1);
 assert.equal((await service.reviewRoom(tokenA)).posts[0].comments.length,0);
});
test('Buffer is comment source of truth; internal notes and deleted notes are excluded',async()=>{
 await service.feedback(tokenA,payload(reviewA));
 buffer.notes[0].text='Updated in Buffer';
 buffer.notes.push({id:'internal-secret',text:'Internal team-only note'});
 const comments=(await service.reviewRoom(tokenA)).posts[0].comments;
 assert.equal(comments.length,1);assert.equal(comments[0].body,'Updated in Buffer');
 assert.equal(JSON.stringify(comments).includes('team-only'),false);
 buffer.notes=[];assert.equal((await service.reviewRoom(tokenA)).posts[0].comments.length,0);
});
test('failed Buffer note read preserves shared posts and reports unavailable without cached feedback',async()=>{
 await service.feedback(tokenA,payload(reviewA));
 buffer.collaborationNotes=async()=>{throw Error('Buffer unavailable');};
 const room=await service.reviewRoom(tokenA);
 assert.equal(room.posts.length,1);assert.equal(room.posts[0].commentsStatus,'unavailable');assert.deepEqual(room.posts[0].comments,[]);
});
test('failed reconciliation read never clears uncertain status or retries the mutation',async()=>{
 buffer.createCollaborationNote=async()=>{calls++;throw Error('timeout');};
 const p=payload(reviewA);await service.feedback(tokenA,p);
 buffer.collaborationNotes=async()=>{throw Error('read forbidden');};
 assert.equal((await service.feedback(tokenA,p)).status,'uncertain');assert.equal(calls,1);
});
test('sync orchestration passes organization and tags, imports Posts idempotently',async()=>{
 buffer.listDrafts=async(access,organization,tags)=>{
  assert.equal(access,'test-only');assert.equal(organization,a.organization_id);assert.deepEqual(tags,['tag-a']);
  return [{sourceKind:'post',id:'buffer-real-shaped-fixture',text:'A draft',platform:'instagram'}];
 };
 await service.sync(a,{tags:['tag-a']});await service.sync(a,{tags:['tag-a']});
 const refs=await store.rows('content_refs',{creator_id:`eq.${a.id}`,source_id:'eq.buffer-real-shaped-fixture'});
 assert.equal(refs.length,1);assert.equal(refs[0].version,1);assert.equal(refs[0].source_kind,'post');
});

test('identical reviewer text without the server submission marker never recovers or shares internal notes',async()=>{
 buffer.createCollaborationNote=async()=>{calls++;throw Error('timeout');};
 const p=payload(reviewA);await service.feedback(tokenA,p);
 const d=(await store.rows('feedback_deliveries'))[0];
 assert.notEqual(d.id,p.idempotencyKey);assert.match(d.id,/^[0-9a-f-]{36}$/);
 buffer.notes=[{id:'internal',text:p.body},{id:'other-submission',text:`${p.name} (external reviewer via Receipts):\n${p.body}\n\n[Receipts feedback ${randomUUID()}]`}];
 assert.equal((await service.feedback(tokenA,p)).status,'uncertain');
 assert.equal((await service.inspectFeedback(a,{deliveryId:d.id})).candidate,null);
 assert.equal((await service.reviewRoom(tokenA)).posts[0].comments.length,0);assert.equal(calls,1);
});
test('parallel refreshes serialize single-use tokens and atomic save releases the lock',async()=>{
 let refreshes=0;
 buffer.refresh=async()=>{refreshes++;return {accessToken:'replacement',refreshToken:'replacement-refresh',scope:REQUIRED_SCOPES,expiresAt:Date.now()+60000};};
 await store.patch('creators',{id:`eq.${a.id}`},{tokens_ciphertext:cipher(env.RECEIPTS_ENCRYPTION_KEY).seal({accessToken:'expired',refreshToken:'single-use',scope:REQUIRED_SCOPES,expiresAt:0},`creator:${a.id}`)});
 const expired=await store.one('creators',{id:`eq.${a.id}`});
 const results=await Promise.allSettled([service.accessToken(expired),service.accessToken(expired)]);
 assert.equal(refreshes,1);assert.ok(results.some(r=>r.status==='fulfilled'));
 const saved=await store.one('creators',{id:`eq.${a.id}`});assert.equal(saved.refresh_lock,null);
 assert.equal(cipher(env.RECEIPTS_ENCRYPTION_KEY).open(saved.tokens_ciphertext,`creator:${a.id}`).refreshToken,'replacement-refresh');
});
test('lost persistence after refresh never reuses the consumed refresh token',async()=>{
 let refreshes=0;buffer.refresh=async()=>{refreshes++;return {accessToken:'replacement',refreshToken:'new',scope:REQUIRED_SCOPES,expiresAt:Date.now()+60000};};
 await store.patch('creators',{id:`eq.${a.id}`},{tokens_ciphertext:cipher(env.RECEIPTS_ENCRYPTION_KEY).seal({accessToken:'expired',refreshToken:'single-use',scope:REQUIRED_SCOPES,expiresAt:0},`creator:${a.id}`)});
 const expired=await store.one('creators',{id:`eq.${a.id}`}),actual=store.rpc.bind(store);
 store.rpc=async(name,args)=>{if(name==='save_refreshed_tokens')throw Error('save unavailable');return actual(name,args);};
 try {await assert.rejects(service.accessToken(expired),/save unavailable/);await assert.rejects(service.accessToken(expired),e=>e.status===409);assert.equal(refreshes,1);}
 finally{store.rpc=actual;}
});

test('old connections require renewed consent before using new Posts and Notes workflow',async()=>{
 const old={accessToken:'old',refreshToken:'refresh',expiresAt:Date.now()+60000,scope:'account:read offline_access'};
 await store.patch('creators',{id:`eq.${a.id}`},{tokens_ciphertext:cipher(env.RECEIPTS_ENCRYPTION_KEY).seal(old,`creator:${a.id}`)});
 const creator=await store.one('creators',{id:`eq.${a.id}`});
 assert.equal((await service.bootstrap(creator)).needsConsent,true);
 await assert.rejects(service.accessToken(creator),e=>e.status===401&&e.message.includes('Reconnect'));
});

test('MOCKED end-to-end supplied contract: import, assign, share, fresh service room, attributed Buffer note',async()=>{
 const remoteNotes=[{id:'internal',text:'Internal team note',createdAt:'2026-11-03T00:00:00Z',updatedAt:'2026-11-03T00:00:00Z'}];
 let mutations=0;
 const client=new BufferClient({},async(_url,options)=>{
  const {query,variables}=JSON.parse(options.body);
  const connection=nodes=>({edges:nodes.map(node=>({cursor:node.id,node})),pageInfo:{endCursor:null,hasNextPage:false}});
  if(query.includes('query ReceiptsDrafts'))return Response.json({data:{posts:connection([{id:'live-shaped-post',text:'Real-shaped plain caption',status:'draft'}])}});
  if(query.includes('mutation ReceiptsCreateNote')){
   mutations++;assert.deepEqual(variables.input.subject,{postId:'live-shaped-post'});
   const node={id:'external-note',text:variables.input.text,createdAt:'2026-11-03T00:00:00Z',updatedAt:'2026-11-03T00:00:00Z'};
   remoteNotes.unshift(node);return Response.json({data:{createCollaborationNote:{__typename:'CreateCollaborationNoteSuccess',edge:{cursor:'note-cursor',node}}}});
  }
  if(query.includes('query ReceiptsNotes'))return Response.json({data:{collaborationNotes:connection(remoteNotes)}});
  throw Error('Unexpected mocked operation');
 });
 const creatorService=new Receipts({env,store,buffer:client});
 await creatorService.sync(a,{});await creatorService.sync(a,{});
 const post=(await store.rows('content_refs',{source_id:'eq.live-shaped-post'}))[0];
 const room=(await creatorService.createClient(a,{company:'Fresh client',name:'Contact'})).client;
 await creatorService.assign(a,{postId:post.id,clientId:room.id});
 const publicService=new Receipts({env,store,buffer:client});
 assert.equal((await publicService.reviewRoom(room.roomToken)).posts.length,0);
 await creatorService.share(a,{postId:post.id});
 const shared=(await publicService.reviewRoom(room.roomToken)).posts[0];assert.equal(shared.caption,'Real-shaped plain caption');
 const p={postId:shared.id,idempotencyKey:randomUUID(),name:'Reviewer',body:'Please shorten the caption.'};
 assert.equal((await publicService.feedback(room.roomToken,p)).noteId,'external-note');
 await publicService.feedback(room.roomToken,p);assert.equal(mutations,1);
 const visible=(await publicService.reviewRoom(room.roomToken)).posts[0].comments;
 assert.equal(visible.length,1);assert.equal(visible[0].noteId,'external-note');assert.match(visible[0].body,/Reviewer \(external reviewer/);
 assert.equal(JSON.stringify(visible).includes('Internal team note'),false);
});
test('creator post detail refresh shows only delivered room-visible Buffer comments',async()=>{
 await service.feedback(tokenA,payload(reviewA));
 buffer.notes.push({id:'internal',text:'Team-only note'});
 const detail=await service.postDetail(a,{postId:postA.id});
 assert.equal(detail.post.id,postA.id);assert.equal(detail.comments.length,1);assert.equal(detail.comments[0].noteId,'note-1');
 await assert.rejects(service.postDetail(b,{postId:postA.id}),e=>e.status===404);
 buffer.collaborationNotes=async()=>{throw Error('read unavailable');};
 const unavailable=await service.postDetail(a,{postId:postA.id});assert.equal(unavailable.post.commentsStatus,'unavailable');assert.deepEqual(unavailable.comments,[]);
});
