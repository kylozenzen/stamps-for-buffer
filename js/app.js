'use strict';
(function(){
  var U=window.ReceiptsUtil,API=window.ReceiptsAPI,UI=window.ReceiptsUI,Auth=window.ReceiptsAuth;
  var app=document.getElementById('app');
  var state={page:'board',data:null,session:null,reviewToken:null,room:null};

  function getReviewToken(){var m=window.location.pathname.match(/^\/(?:review|r)\/([^/]+)/);if(m)return decodeURIComponent(m[1]);var q=new URLSearchParams(window.location.search);return q.get('review')||q.get('stamp');}
  function render(){if(state.reviewToken){if(state.room)app.innerHTML=UI.reviewRoom(state.room,state.reviewToken);return;}if(API.getMode()==='remote'&&!state.session){app.innerHTML=UI.login();return;}if(!state.data){app.innerHTML=UI.loading();return;}app.innerHTML=UI.renderCreator(state);}
  async function loadCreator(){app.innerHTML=UI.loading('Loading your approval board…');try{state.data=await API.bootstrap();render();}catch(e){app.innerHTML=UI.error(e.message);}}
  async function loadRoom(){app.innerHTML=UI.loading('Opening approval room…');try{state.room=await API.getReviewRoom(state.reviewToken);render();}catch(e){app.innerHTML=UI.error(e.message);}}
  async function refresh(){if(state.reviewToken)return loadRoom();return loadCreator();}
  async function boot(){app.innerHTML=UI.loading();try{var auth=await Auth.init();state.session=auth.session;state.reviewToken=getReviewToken();if(state.reviewToken)return loadRoom();if(auth.mode==='remote'&&!auth.session){render();return;}await loadCreator();}catch(e){app.innerHTML=UI.error(e.message);}}
  function onAuthChange(session){state.session=session;if(state.reviewToken)return;if(session)loadCreator();else{state.data=null;render();}}
  async function run(task,success){try{await task();if(success)U.toast(success);await refresh();}catch(e){U.toast(e.message||'Something went wrong');}}

  window.ReceiptsActions={
    go:function(page){state.page=page;render();window.scrollTo(0,0);},
    sync:function(){var token=API.getBufferToken();run(function(){return API.syncBuffer(token);},'Buffer sync complete');},
    newClient:function(){U.openModal(UI.newClientModal());},
    createClient:function(){var company=document.getElementById('new-company').value.trim(),owner=document.getElementById('new-owner').value.trim(),email=document.getElementById('new-email').value.trim();if(!company||!owner||!email){U.toast('Company, owner, and email are required');return;}var payload={company:company,name:owner,approvalOwner:owner,email:email,approvalNote:document.getElementById('new-note').value.trim(),color:document.getElementById('new-color').value};run(function(){return API.createClient(payload);},'Client room created');U.closeModal();},
    openPost:async function(id){try{var detail=await API.getPostDetail(id);U.openModal(UI.postModal(detail,state.data));}catch(e){U.toast(e.message);}},
    assign:function(postId,clientId){run(function(){return API.assignPost(postId,clientId||null);},clientId?'Client assigned':'Post unassigned');U.closeModal();},
    sendReview:function(postId){run(function(){return API.sendForReview(postId);},'Latest Buffer snapshot sent for review');U.closeModal();},
    creatorComment:function(postId){var el=document.getElementById('creator-comment'),body=el?el.value.trim():'';if(!body){U.toast('Write a note first');return;}run(function(){return API.addCreatorComment(postId,body);},'Creator note added');U.closeModal();},
    copyRoom:function(clientId){var c=(state.data.clients||[]).find(function(x){return x.id===clientId;});if(c&&c.roomToken)U.copy(U.roomUrl(c.roomToken),'Approval room copied');else U.toast('Rotate the room link to create a new one');},
    copyKit:function(clientId){var c=(state.data.clients||[]).find(function(x){return x.id===clientId;});if(!c||!c.roomToken||!c.approvalCode){U.toast('Rotate the missing link or code first');return;}U.copy('Approval room: '+U.roomUrl(c.roomToken)+'\nOwner code: '+c.approvalCode+'\n\nThe team comments. The owner stamps final approval.','Owner kit copied');},
    invite:function(clientId){run(async function(){var out=await API.inviteClient(clientId);if(!out.sent&&out.preview)U.copy(out.preview,'Email is not configured—invite copied instead');},'Invite handled');},
    rotate:function(clientId,kind){if(!window.confirm('Rotate this '+(kind==='room'?'room link':'owner code')+'? The old one will stop working.'))return;run(function(){return API.rotateClient(clientId,kind);},kind==='room'?'Room link rotated':'Owner code rotated');},
    openReceipt:function(id){var r=(state.data.receipts||[]).find(function(x){return x.id===id;});if(r)U.openModal(UI.receiptModal(r));},
    saveToken:function(){var el=document.getElementById('buffer-token');API.saveBufferToken(el?el.value.trim():'');U.toast('Buffer token saved in this browser');},
    clearToken:function(){API.saveBufferToken('');var el=document.getElementById('buffer-token');if(el)el.value='';U.toast('Buffer token cleared');},
    resetDemo:function(){if(!window.confirm('Reset the interactive demo?'))return;run(function(){return API.reset();},'Demo restored');},
    login:async function(){var el=document.getElementById('login-email'),email=el?el.value.trim():'';if(!email){U.toast('Enter your email');return;}try{await Auth.sendMagicLink(email);U.toast('Magic link sent—check your email');}catch(e){U.toast(e.message);}},
    signOut:async function(){await Auth.signOut();}
  };

  function reviewValues(postId){var name=document.getElementById('review-name-'+postId),body=document.getElementById('review-body-'+postId);return {name:name?name.value.trim():'Client',body:body?body.value.trim():''};}
  window.ReviewActions={
    comment:function(token,postId){var v=reviewValues(postId);if(!v.body){U.toast('Write a comment first');return;}run(function(){return API.addReviewComment(token,postId,v.name,v.body);},'Comment added');},
    changes:function(token,postId){var v=reviewValues(postId);if(!v.body){U.toast('Describe the requested change first');return;}run(function(){return API.requestChanges(token,postId,v.name,v.body);},'Changes requested');},
    approveModal:function(token,postId){U.openModal(UI.approveModal(token,postId));setTimeout(function(){var el=document.getElementById('approval-code');if(el)el.focus();},50);},
    approve:function(token,postId){var name=document.getElementById('approval-name'),code=document.getElementById('approval-code');var n=name?name.value.trim():'',c=code?code.value.trim():'';if(!n||!/^\d{6}$/.test(c)){U.toast('Enter your name and six-digit owner code');return;}run(function(){return API.approvePost(token,postId,n,c);},'Approval stamped and receipt saved');U.closeModal();}
  };

  window.ReceiptsApp={state:state,onAuthChange:onAuthChange,refresh:refresh};
  boot();
})();
