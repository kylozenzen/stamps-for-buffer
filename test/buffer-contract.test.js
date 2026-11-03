// MOCKED contract tests against user-supplied official-doc evidence dated 2026-11-03.
// No live Buffer API, permission, schema validation, or account access is exercised.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BufferClient, POSTS_QUERY, NOTES_QUERY, CREATE_NOTE, REQUIRED_SCOPES } from '../server/buffer.js';
const page=(nodes,endCursor=null,hasNextPage=false)=>({edges:nodes.map((node,i)=>({cursor:`edge-${i}`,node})),pageInfo:{endCursor,hasNextPage}});
function mocked(responses){const calls=[];const client=new BufferClient({},async(url,options)=>{
 const body=JSON.parse(options.body);calls.push({url,...body});const next=responses.shift();if(next instanceof Error)throw next;
 return Response.json(next);
});return {client,calls};}
test('mocked Buffer contract: exact required OAuth permissions and stale override rejected',()=>{
 const client=new BufferClient({APP_BASE_URL:'https://receipts.example.com',BUFFER_CLIENT_ID:'client'});
 assert.equal(new URL(client.authorize('state','challenge')).searchParams.get('scope'),REQUIRED_SCOPES);
 client.env.BUFFER_SCOPES='account:read offline_access';assert.throws(()=>client.authorize('s','c'),e=>e.status===503);
});
test('mocked Buffer contract: drafts paginate with organization, draft status and tags.in',async()=>{
 const {client,calls}=mocked([{data:{posts:page([{id:'p1',text:'First caption',status:'draft'}],'next',true)}},{data:{posts:page([{id:'p1',text:'First caption',status:'draft'},{id:'p2',text:'Second',status:'draft'}])}}]);
 const posts=await client.listDrafts('token','org',['tag-a','tag-a']);
 assert.deepEqual(posts.map(p=>p.id),['p1','p2']);assert.equal(posts[0].text,'First caption');
 assert.deepEqual(calls[0].variables,{after:null,first:50,input:{organizationId:'org',filter:{status:['draft'],tags:{in:['tag-a']}}}});
 assert.equal(calls[1].variables.after,'next');assert.equal(calls[0].query,POSTS_QUERY);
 assert.equal(posts[0].sourceKind,'post');assert.equal(posts[0].image,'');
});
test('mocked Buffer contract: no tags filter when unselected; incomplete pagination fails',async()=>{
 const {client,calls}=mocked([{data:{posts:page([{id:'p',text:'text',status:'draft'}])}}]);
 await client.listDrafts('t','org');assert.equal('tags' in calls[0].variables.input.filter,false);
 const broken=mocked([{data:{posts:page([],'stuck',true)}},{data:{posts:page([],'stuck',true)}}]);
 await assert.rejects(broken.client.listDrafts('t','org'),/did not advance/);
});
test('mocked Buffer contract: failure on later page returns no partial import list',async()=>{
 const {client}=mocked([{data:{posts:page([{id:'p',text:'text',status:'draft'}],'next',true)}},new Error('timeout')]);
 await assert.rejects(client.listDrafts('t','org'),/not received/);
});
test('mocked Buffer contract: notes use exclusive subject and newest-first cursor pages of 100',async()=>{
 const n=id=>({id,text:id,createdAt:'2026-11-03T00:00:00Z',updatedAt:'2026-11-03T00:00:00Z'});
 const {client,calls}=mocked([{data:{collaborationNotes:page([n('new')],'older',true)}},{data:{collaborationNotes:page([n('new'),n('old')])}}]);
 const notes=await client.collaborationNotes('t',{postId:'p'});
 assert.deepEqual(notes.map(n=>n.id),['new','old']);assert.deepEqual(calls[0].variables,{after:null,first:100,input:{subject:{postId:'p'}}});
 assert.equal(calls[1].variables.after,'older');assert.equal(calls[0].query,NOTES_QUERY);
 const item=mocked([{data:{collaborationNotes:page([])}}]);await item.client.collaborationNotes('t',{contentItemId:'item'});
 assert.deepEqual(item.calls[0].variables.input.subject,{contentItemId:'item'});
});
test('mocked Buffer contract: createCollaborationNote input and success edge, no annotations/author override',async()=>{
 const {client,calls}=mocked([{data:{createCollaborationNote:{__typename:'CreateCollaborationNoteSuccess',edge:{cursor:'cursor',node:{id:'note',text:'Reviewer: feedback',createdAt:'now',updatedAt:'now'}}}}}]);
 const result=await client.createCollaborationNote('t',{subject:{postId:'p'},text:'Reviewer: feedback',author:'not allowed'});
 assert.equal(result.id,'note');assert.equal(calls[0].query,CREATE_NOTE);assert.ok(CREATE_NOTE.includes('__typename'));
 assert.deepEqual(calls[0].variables,{input:{subject:{postId:'p'},text:'Reviewer: feedback'}});
});
test('mocked Buffer contract: non-success typed payload, top-level errors, and timeouts do not retry writes',async()=>{
 for(const response of [
  {data:{createCollaborationNote:{__typename:'MockClosedThreadError'}}},
  {errors:[{message:'mock permission error'}]},new Error('ambiguous timeout'),
  {data:{createCollaborationNote:{__typename:'CreateCollaborationNoteSuccess',edge:{node:{text:'missing ID'}}}}}
 ]){
  const {client,calls}=mocked([response]);await assert.rejects(client.createCollaborationNote('t',{subject:{postId:'p'},text:'text'}),e=>e.status===502);assert.equal(calls.length,1);
 }
});
test('mocked Buffer contract: closed-thread read remains independent of write failure',async()=>{
 const {client}=mocked([{data:{collaborationNotes:page([{id:'existing',text:'readable',createdAt:'now',updatedAt:'now'}])}}, {data:{createCollaborationNote:{__typename:'MockClosedThreadError'}}}]);
 assert.equal((await client.collaborationNotes('t',{postId:'p'}))[0].text,'readable');
 await assert.rejects(client.createCollaborationNote('t',{subject:{postId:'p'},text:'new text'}),e=>e.status===502);
});
