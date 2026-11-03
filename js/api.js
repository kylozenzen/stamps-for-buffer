'use strict';
(function(){
  var U=window.ReceiptsUtil;
  var config={backendConfigured:false,appBaseUrl:window.location.origin};
  var session=null;
  var mode='demo';
  var DEMO_KEY='receipts_buffer_beta_demo_v1';

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function loadDemo(){try{var raw=localStorage.getItem(DEMO_KEY);if(raw)return JSON.parse(raw);}catch(e){}var fresh=clone(window.RECEIPTS_DEMO);saveDemo(fresh);return fresh;}
  function saveDemo(data){try{localStorage.setItem(DEMO_KEY,JSON.stringify(data));}catch(e){}}
  function resetDemo(){localStorage.removeItem(DEMO_KEY);return loadDemo();}
  function clientFor(data,id){return (data.clients||[]).find(function(c){return c.id===id;});}
  function postFor(data,id){return (data.posts||[]).find(function(p){return p.id===id;});}
  function demoReceiptCode(){return 'RCP-'+Math.random().toString(36).slice(2,9).toUpperCase();}
  function demoCode(){return String(Math.floor(100000+Math.random()*900000));}
  function demoToken(company){return String(company||'client').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Math.random().toString(36).slice(2,8);}
  function demoFingerprint(post){var src=[post.bufferId,post.caption,post.platform,post.image,post.version].join('|');var h=2166136261;for(var i=0;i<src.length;i++){h^=src.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0')+Math.random().toString(16).slice(2,14);}

  async function init(){
    try{
      var res=await fetch('/.netlify/functions/config',{cache:'no-store'});
      if(res.ok){config=await res.json();}
    }catch(e){}
    mode=config.backendConfigured?'remote':'demo';
    return {config:config,mode:mode};
  }
  function setSession(value){session=value||null;}
  function headers(extra){var h={'content-type':'application/json'};if(session&&session.access_token)h.authorization='Bearer '+session.access_token;Object.keys(extra||{}).forEach(function(k){h[k]=extra[k];});return h;}
  async function request(url,body,extra){var res=await fetch(url,{method:'POST',headers:headers(extra),body:JSON.stringify(body||{})});var data={};try{data=await res.json();}catch(e){}if(!res.ok)throw new Error(data.error||'Request failed ('+res.status+')');return data;}
  function creator(action,payload,extra){return request('/.netlify/functions/creator-api',{action:action,payload:payload||{}},extra);}
  function review(action,token,payload){return request('/.netlify/functions/review-api',{action:action,token:token,payload:payload||{}});}

  async function bootstrap(){if(mode==='remote')return creator('bootstrap');return clone(loadDemo());}
  async function createClient(payload){
    if(mode==='remote')return creator('createClient',payload);
    var data=loadDemo();var c={id:U.id('client'),name:payload.name,company:payload.company,email:payload.email,approvalOwner:payload.approvalOwner||payload.name,approvalNote:payload.approvalNote||'',approvalCode:demoCode(),roomToken:demoToken(payload.company),color:payload.color||'#cafd00',colorText:'#0d0f0c',initials:U.initials(payload.company),active:true};data.clients.push(c);saveDemo(data);return {client:c,data:clone(data)};
  }
  async function rotateClient(clientId,kind){
    if(mode==='remote')return creator('rotateClientSecret',{clientId:clientId,kind:kind});
    var data=loadDemo(),c=clientFor(data,clientId);if(!c)throw new Error('Client not found');if(kind==='room')c.roomToken=demoToken(c.company);else c.approvalCode=demoCode();saveDemo(data);return {client:clone(c),data:clone(data)};
  }
  async function assignPost(postId,clientId){
    if(mode==='remote')return creator('assignPost',{postId:postId,clientId:clientId});
    var data=loadDemo(),p=postFor(data,postId);if(!p)throw new Error('Post not found');p.clientId=clientId||null;saveDemo(data);return {post:clone(p),data:clone(data)};
  }
  async function sendForReview(postId){
    if(mode==='remote')return creator('sendForReview',{postId:postId});
    var data=loadDemo(),p=postFor(data,postId);if(!p)throw new Error('Post not found');if(!p.clientId)throw new Error('Assign a client first');p.status='review';p.changedSinceReview=false;p.feedback='';p.reviewedVersion=p.version;p.comments=p.comments||[];p.comments.push({authorType:'creator',authorName:'You',body:'Sent this Buffer snapshot for approval.',kind:'system',createdAt:new Date().toISOString()});saveDemo(data);return {post:clone(p),data:clone(data)};
  }
  async function addCreatorComment(postId,body){
    if(mode==='remote')return creator('addCreatorComment',{postId:postId,body:body});
    var data=loadDemo(),p=postFor(data,postId);if(!p)throw new Error('Post not found');p.comments=p.comments||[];p.comments.push({authorType:'creator',authorName:'You',body:body,kind:'comment',createdAt:new Date().toISOString()});saveDemo(data);return {data:clone(data)};
  }
  async function syncBuffer(token){
    if(mode==='remote')return creator('syncBuffer',{},token?{'x-buffer-token':token}:{});
    var data=loadDemo();data.lastSync=new Date().toISOString();var unassigned=data.posts.find(function(p){return p.bufferId==='buf_demo_new';});if(!unassigned){data.posts.unshift({id:U.id('post'),bufferId:'buf_demo_new',clientId:null,title:'Fresh Buffer draft',caption:'A newly synced Buffer draft appears here, ready to assign to a client.',image:'',platform:'LinkedIn',service:'linkedin',status:'draft',bufferStatus:'draft',version:1,changedSinceReview:false,createdAt:new Date().toISOString(),comments:[]});}saveDemo(data);await new Promise(function(r){setTimeout(r,450);});return {data:clone(data),added:unassigned?0:1,updated:data.posts.length};
  }
  async function inviteClient(clientId){
    if(mode==='remote')return creator('inviteClient',{clientId:clientId});
    var data=loadDemo(),c=clientFor(data,clientId);if(!c)throw new Error('Client not found');return {sent:false,preview:'Review room: '+U.roomUrl(c.roomToken)+'\nOwner code: '+c.approvalCode};
  }
  async function getPostDetail(postId){
    if(mode==='remote')return creator('postDetail',{postId:postId});
    var data=loadDemo(),p=postFor(data,postId);if(!p)throw new Error('Post not found');return {post:clone(p),client:clone(clientFor(data,p.clientId)||null),comments:clone(p.comments||[])};
  }
  async function getReviewRoom(token){
    if(mode==='remote')return review('getRoom',token);
    var data=loadDemo(),c=(data.clients||[]).find(function(x){return x.roomToken===token;});if(!c)throw new Error('This approval room was not found.');var posts=(data.posts||[]).filter(function(p){return p.clientId===c.id&&p.status!=='draft';});return {client:clone(c),posts:clone(posts),demo:true};
  }
  async function addReviewComment(token,postId,name,body){
    if(mode==='remote')return review('addComment',token,{postId:postId,name:name,body:body});
    var data=loadDemo(),c=(data.clients||[]).find(function(x){return x.roomToken===token;}),p=postFor(data,postId);if(!c||!p||p.clientId!==c.id)throw new Error('Post not found');p.comments=p.comments||[];p.comments.push({authorType:'client',authorName:name||'Client',body:body,kind:'comment',createdAt:new Date().toISOString()});saveDemo(data);return {ok:true};
  }
  async function requestChanges(token,postId,name,body){
    if(mode==='remote')return review('requestChanges',token,{postId:postId,name:name,body:body});
    var data=loadDemo(),c=(data.clients||[]).find(function(x){return x.roomToken===token;}),p=postFor(data,postId);if(!c||!p||p.clientId!==c.id)throw new Error('Post not found');p.status='changes';p.feedback=body;p.comments=p.comments||[];p.comments.push({authorType:'client',authorName:name||'Client',body:body,kind:'change',createdAt:new Date().toISOString()});saveDemo(data);return {ok:true};
  }
  async function approvePost(token,postId,name,code){
    if(mode==='remote')return review('approve',token,{postId:postId,name:name,code:code});
    var data=loadDemo(),c=(data.clients||[]).find(function(x){return x.roomToken===token;}),p=postFor(data,postId);if(!c||!p||p.clientId!==c.id)throw new Error('Post not found');if(code!==c.approvalCode)throw new Error('Owner code does not match.');if(p.changedSinceReview)throw new Error('This post changed in Buffer after review began. Ask the creator to resend it.');var receiptCode=demoReceiptCode(),fingerprint=p.fingerprint||demoFingerprint(p),now=new Date().toISOString();p.status='approved';p.approvedBy=name||c.approvalOwner;p.approvedAt=now;p.receiptCode=receiptCode;p.fingerprint=fingerprint;p.comments=p.comments||[];p.comments.push({authorType:'client',authorName:p.approvedBy,body:'Final approval stamped with the owner code.',kind:'approval',createdAt:now});data.receipts.unshift({id:U.id('receipt'),receiptCode:receiptCode,postId:p.id,clientId:c.id,clientCompany:c.company,title:p.title,platform:p.platform,approverName:p.approvedBy,approvedAt:now,version:p.version,fingerprint:fingerprint,snapshot:{caption:p.caption,image:p.image,platform:p.platform}});saveDemo(data);return {receiptCode:receiptCode,approvedAt:now};
  }
  async function reset(){if(mode==='remote')throw new Error('Reset is only available in demo mode.');return resetDemo();}
  function getMode(){return mode;}
  function getConfig(){return config;}
  function getBufferToken(){try{return localStorage.getItem('receipts_buffer_token')||'';}catch(e){return '';}}
  function saveBufferToken(token){try{if(token)localStorage.setItem('receipts_buffer_token',token);else localStorage.removeItem('receipts_buffer_token');}catch(e){}}

  window.ReceiptsAPI={init:init,setSession:setSession,bootstrap:bootstrap,createClient:createClient,rotateClient:rotateClient,assignPost:assignPost,sendForReview:sendForReview,addCreatorComment:addCreatorComment,syncBuffer:syncBuffer,inviteClient:inviteClient,getPostDetail:getPostDetail,getReviewRoom:getReviewRoom,addReviewComment:addReviewComment,requestChanges:requestChanges,approvePost:approvePost,reset:reset,getMode:getMode,getConfig:getConfig,getBufferToken:getBufferToken,saveBufferToken:saveBufferToken};
})();
