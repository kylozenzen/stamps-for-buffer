import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { noteSubject, noteInput, deliveredMatch, feedbackText } from '../server/notes.js';
import { cipher } from '../server/security.js';
import { diagnostic, filterSignatures } from '../scripts/buffer-schema.js';
test('note subjects distinguish Posts and Content Items; no author override or mixed subject',()=>{
 assert.deepEqual(noteSubject('post','p'),{postId:'p'});
 assert.deepEqual(noteSubject('content_item','c'),{contentItemId:'c'});
 assert.throws(()=>noteSubject('other','p'));
 assert.throws(()=>noteInput({postId:'p',contentItemId:'c'},'text'));
 assert.throws(()=>noteInput({},'text'));
 assert.throws(()=>noteInput({postId:'p',author:'override'},'text'));
 assert.deepEqual(noteInput({postId:'p'},'Reviewer: feedback'),{subject:{postId:'p'},text:'Reviewer: feedback'});
});
test('reconciliation needs a unique exact match, not marker fragments or negative reads',()=>{
 const delivery={id:'delivery',author_name:'Name',body:'Feedback'},text=feedbackText(delivery);
 assert.equal(deliveredMatch([],delivery),null);
 assert.equal(deliveredMatch([{id:'wrong',text:text+' appended'}],delivery),null);
 assert.equal(deliveredMatch([{id:'a',text},{id:'b',text}],delivery),null);
 assert.equal(deliveredMatch([{id:'a',text},{id:'a',text}],delivery).id,'a');
});
test('signature report retains only the six supplied operations',()=>{
 const root={name:'Query',fields:[{name:'posts'},{name:'unknownOtherField'}]};
 const result=filterSignatures({__schema:{queryType:root,mutationType:{name:'Mutation',fields:[{name:'createCollaborationNote'}]}}});
 assert.deepEqual(result.queryType.fields,[{name:'posts'}]);
});
test('schema diagnostic uses existing encrypted credentials without refresh/write operations',async()=>{
 const key=randomBytes(32).toString('base64'),creatorId='4bbd4d5c-e3bc-46f7-8e3c-6fc13b34a06a';
 const row={id:creatorId,tokens_ciphertext:cipher(key).seal({accessToken:'test-only',expiresAt:Date.now()+60000},`creator:${creatorId}`)};
 let querySeen=false;
 const options={creatorId,env:{RECEIPTS_ENCRYPTION_KEY:key},store:{one:async()=>row},buffer:{graphql:async(token,query,variables)=>{
  assert.equal(token,'test-only');assert.ok(query.includes('__schema'));assert.equal(query.includes('mutation '),false);
  assert.deepEqual(variables,{});querySeen=true;
  return {__schema:{queryType:{name:'Query',fields:[]},mutationType:{name:'Mutation',fields:[]}}};
 }}};
 assert.ok(await diagnostic(options));assert.ok(querySeen);
 row.tokens_ciphertext=cipher(key).seal({accessToken:'test-only',expiresAt:0},`creator:${creatorId}`);
 await assert.rejects(diagnostic(options),/never refreshes/);
});
