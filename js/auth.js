'use strict';
(function(){
  var client=null;
  var session=null;
  async function init(){
    var started=await window.ReceiptsAPI.init();
    if(started.mode==='demo'){
      session={user:{id:'demo_user',email:'demo@receipts.local'},access_token:'demo'};
      window.ReceiptsAPI.setSession(session);
      return {mode:'demo',session:session};
    }
    if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase client library did not load.');
    client=window.supabase.createClient(started.config.supabaseUrl,started.config.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
    var result=await client.auth.getSession();
    session=result.data.session||null;
    window.ReceiptsAPI.setSession(session);
    client.auth.onAuthStateChange(function(_event,next){session=next||null;window.ReceiptsAPI.setSession(session);if(window.ReceiptsApp&&window.ReceiptsApp.onAuthChange)window.ReceiptsApp.onAuthChange(session);});
    return {mode:'remote',session:session};
  }
  async function sendMagicLink(email){if(!client)throw new Error('Authentication is not configured.');var redirect=window.location.origin+'/app';var result=await client.auth.signInWithOtp({email:email,options:{emailRedirectTo:redirect}});if(result.error)throw result.error;return true;}
  async function signOut(){if(client)await client.auth.signOut();session=null;window.ReceiptsAPI.setSession(null);}
  function getSession(){return session;}
  window.ReceiptsAuth={init:init,sendMagicLink:sendMagicLink,signOut:signOut,getSession:getSession};
})();
