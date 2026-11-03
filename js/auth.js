'use strict';
(function(){
  async function init(){
    var started=await window.ReceiptsAPI.init();
    return {mode:started.mode,session:started.mode==='demo'?{user:{id:'demo_user'}}:started.config.sessionPresent?{pending:true}:null};
  }
  async function signOut(){await window.ReceiptsAPI.disconnect();window.location.assign('/app');}
  window.ReceiptsAuth={init:init,signOut:signOut};
})();
