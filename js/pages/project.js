'use strict';

// Compatibility shims — project pages reference old global names
function proj(id) { return window.getProject(id); }
function activeProj() { return window.activeProject(); }
function dashboardPage() { return window.homePage(); }
function desktopDashboardPage() { return window.homePage(); }

function projectDetailPage() {
  if (!isMobile()) return desktopProjectDetailPage();

  var p = activeProj();
  if (!p) { S.view = 'dashboard'; return dashboardPage(); }

  var postsHTML = p.posts.length === 0
    ? '<div style="display:flex;flex-direction:column;align-items:center;padding:60px 20px;text-align:center;">'
      +'<div style="width:64px;height:64px;background:#e9e8e3;border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;"><span class="material-symbols-outlined" style="font-size:28px;color:#5b5c58">image</span></div>'
      +'<h3 style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:20px;margin:0 0 8px">No content yet</h3>'
      +'<p style="color:#5b5c58;margin:0 0 24px;font-size:14px">Add your first piece to start the approval flow.</p>'
      +'<button onclick="showAddPostModal()" style="background:#cafd00;color:#3a4a00;padding:12px 28px;border-radius:99px;border:none;font-family:Space Grotesk,sans-serif;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 6px 20px rgba(202,253,0,0.4);" class="hs">Add Content</button>'
      +'</div>'
    : '<div style="display:flex;flex-direction:column;gap:10px;padding:0 16px;">'
      + p.posts.map(function(post){ return mobilePostCard(p, post); }).join('')
      +'</div>';

  var projPicker = S.projects.length > 1
    ? '<div style="display:flex;gap:8px;overflow-x:auto;padding:12px 16px 0;scrollbar-width:none;">'
      + S.projects.map(function(proj){
          var isActive = proj.id === S.activeProject;
          return '<button onclick="S.activeProject=\''+proj.id+'\';S.view=\'project-detail\';saveState();render()" style="flex-shrink:0;padding:7px 14px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-size:12px;font-weight:700;background:'+(isActive?'#0d0f0c':'#e9e8e3')+';color:'+(isActive?'#cafd00':'#5b5c58')+';cursor:pointer;white-space:nowrap;transition:all 0.18s;" class="hs">'+proj.name+'</button>';
        }).join('')
      +'</div>'
    : '';

  return '<div class="anim-slide">'
    +'<div class="top-bar" style="display:flex;align-items:center;gap:12px;">'
    +'<button onclick="setView(\'dashboard\')" style="width:36px;height:36px;border-radius:10px;background:#e9e8e3;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:18px;color:#5b5c58">arrow_back</span></button>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:18px;font-weight:900;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.name+'</div>'
    +'<div style="font-size:12px;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;">'+p.client+' · '+p.posts.length+' pieces</div>'
    +'</div>'
    +'<button onclick="showAddPostModal()" style="width:36px;height:36px;background:#cafd00;border-radius:10px;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(202,253,0,0.4);" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:20px;color:#3a4a00">add</span></button>'
    +'</div>'

    +'<div style="margin:12px 16px 4px;background:#0d0f0c;border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:10px;">'
    +'<span class="material-symbols-outlined fill-icon" style="color:#cafd00;font-size:18px;flex-shrink:0">link</span>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(247,246,241,0.4);margin-bottom:2px">Client Portal</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:12px;color:#f7f6f1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.token+'</div>'
    +'</div>'
    +'<div style="display:flex;gap:6px;flex-shrink:0;">'
    +'<button onclick="previewPortal(\''+p.id+'\')" style="background:rgba(202,253,0,0.15);color:#cafd00;padding:7px 12px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;cursor:pointer;" class="hs">Preview</button>'
    +'<button onclick="sharePortal(\''+p.id+'\')" data-wt="share-portal" style="background:#cafd00;color:#3a4a00;padding:7px 14px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;cursor:pointer;" class="hs">Copy</button>'
    +'</div>'
    +'</div>'

    + projPicker
    +'<div style="padding:16px 0 4px;">'+postsHTML+'</div>'
    +'</div>';
}

function desktopProjectDetailPage() {
  var p = activeProj();
  if (!p) return desktopDashboardPage();

  var postsHTML = p.posts.length===0
    ? '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:90px 0;text-align:center;">'
      +'<div style="width:64px;height:64px;background:#e9e8e3;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;"><span class="material-symbols-outlined" style="font-size:32px;color:#5b5c58">image</span></div>'
      +'<h3 style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:20px;margin:0 0 8px">No content yet</h3>'
      +'<p style="color:#5b5c58;margin:0 0 24px">Add your first piece to start the approval flow.</p>'
      +'<button onclick="showAddPostModal()" style="background:#cafd00;color:#3a4a00;padding:12px 24px;border-radius:99px;border:none;font-family:Space Grotesk,sans-serif;font-weight:900;cursor:pointer" class="hs">Add Content</button>'
      +'</div>'
    : '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;">'
      +p.posts.map(function(post){ return desktopPostCard(p,post); }).join('')
      +'</div>';

  return '<main style="padding:32px;min-height:100%;" class="anim-fade">'
    +'<header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">'
    +'<div style="display:flex;align-items:center;gap:16px;">'
    +'<button onclick="setView(\'dashboard\')" style="width:36px;height:36px;border-radius:50%;background:#e9e8e3;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:18px;color:#5b5c58">arrow_back</span></button>'
    +'<div><h2 style="font-family:Space Grotesk,sans-serif;font-size:28px;font-weight:900;letter-spacing:-0.03em;margin:0">'+p.name+'</h2>'
    +'<p style="color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;font-size:13px;margin:0">'+p.client+' · '+p.posts.length+' pieces</p>'
    +'</div></div>'
    +'<div style="display:flex;gap:12px;">'
    +'<button onclick="sharePortal(\''+p.id+'\')" data-wt="share-portal" style="display:flex;align-items:center;gap:8px;background:#f1f1ec;color:#2e2f2c;padding:10px 20px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;cursor:pointer;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:16px">share</span>Share Portal</button>'
    +'<button onclick="previewPortal(\''+p.id+'\')" style="display:flex;align-items:center;gap:8px;background:#e9e8e3;color:#5b5c58;padding:10px 16px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;cursor:pointer;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:15px">open_in_new</span>Preview</button>'
    +'<button onclick="showAddPostModal()" style="display:flex;align-items:center;gap:8px;background:#cafd00;color:#3a4a00;padding:10px 20px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 15px rgba(202,253,0,0.4);" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:16px">add</span>Add Content</button>'
    +'</div></header>'

    +'<div style="background:#0d0f0c;border-radius:16px;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">'
    +'<div style="display:flex;align-items:center;gap:12px;min-width:0;">'
    +'<span class="material-symbols-outlined fill-icon" style="color:#cafd00;font-size:20px">link</span>'
    +'<div style="min-width:0;"><p style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(247,246,241,0.4);margin:0 0 2px">Client Portal</p>'
    +'<p style="font-family:Space Grotesk,sans-serif;font-weight:700;color:#f7f6f1;font-size:13px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+portalURL(p.token)+'</p></div></div>'
    +'<div style="display:flex;gap:8px;flex-shrink:0;">'
    +'<button onclick="previewPortal(\''+p.id+'\')" style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.08);color:rgba(247,246,241,0.72);padding:8px 14px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;cursor:pointer;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:14px">open_in_new</span>Preview</button>'
    +'<button onclick="sharePortal(\''+p.id+'\')" style="background:#cafd00;color:#3a4a00;padding:8px 20px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;cursor:pointer;" class="hs">Copy Link</button>'
    +'</div>'
    +'</div>'

    +postsHTML+'</main>';
}

function desktopPostCard(p, post) {
  return '<div onclick="openPost(\''+p.id+'\',\''+post.id+'\')" '+(post===p.posts[0]?'data-wt="post-card"':'')+' style="background:#fff;border-radius:12px;box-shadow:0 4px 16px -8px rgba(46,47,44,0.1);transition:all 0.3s;overflow:hidden;cursor:pointer;" onmouseover="this.style.boxShadow=\'0 16px 32px -8px rgba(46,47,44,0.14)\'" onmouseout="this.style.boxShadow=\'0 4px 16px -8px rgba(46,47,44,0.1)\'">'
    +'<div style="aspect-ratio:1;overflow:hidden;position:relative;">'
    +'<img src="'+post.image+'" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>'
    +'<div style="position:absolute;top:10px;right:10px;">'+badge(post.status)+'</div>'
    +(post.status==='changes'?'<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(249,86,48,0.9);padding:6px 12px;"><p style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;color:#520c00;text-transform:uppercase;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+post.feedback+'</p></div>':'')
    +'</div>'
    +'<div style="padding:14px;">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:8px;">'
    +'<h4 style="font-family:Space Grotesk,sans-serif;font-weight:700;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+post.title+'</h4>'
    +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;color:#5b5c58;background:#e9e8e3;padding:2px 8px;border-radius:4px">v'+post.version+'</span></div>'
    +'<p style="font-size:12px;color:#5b5c58;margin:0 0 10px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+post.caption+'</p>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;">'
    +'<span style="display:flex;align-items:center;gap:4px;font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:#5b5c58;">'
    +'<span class="material-symbols-outlined" style="font-size:14px">chat_bubble_outline</span>'+post.comments.length+' notes</span>'
    +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;color:#5b5c58;text-transform:uppercase">'+post.platform+'</span>'
    +'</div></div></div>';
}

function mobilePostCard(p, post) {
  return '<div onclick="openPost(\''+p.id+'\',\''+post.id+'\')" '+(post===p.posts[0]?'data-wt="post-card"':'')+' class="proj-card hs">'
    +'<div style="display:flex;gap:12px;padding:12px 14px;align-items:center;">'
    +'<div style="width:72px;height:72px;border-radius:10px;overflow:hidden;flex-shrink:0;position:relative;">'
    +'<img src="'+post.image+'" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>'
    +(post.status==='approved'
      ? '<div style="position:absolute;inset:0;background:rgba(58,74,0,0.4);display:flex;align-items:center;justify-content:center;">'
        +'<span class="material-symbols-outlined fill-icon" style="font-size:22px;color:#cafd00">check_circle</span></div>'
      : post.status==='changes'
      ? '<div style="position:absolute;inset:0;background:rgba(249,86,48,0.35);display:flex;align-items:center;justify-content:center;">'
        +'<span class="material-symbols-outlined fill-icon" style="font-size:22px;color:#fff">error</span></div>'
      : '')
    +'</div>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+post.title+'</div>'
    +badge(post.status)
    +'</div>'
    +'<div style="font-size:12px;color:#5b5c58;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4;margin-bottom:6px">'+post.caption+'</div>'
    +'<div style="display:flex;align-items:center;gap:8px;">'
    +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;color:#adada9;text-transform:uppercase;letter-spacing:0.05em">'+post.platform+'</span>'
    +'<span style="color:#e9e8e3">·</span>'
    +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;color:#adada9">'+post.comments.length+' notes</span>'
    +'<span style="color:#e9e8e3">·</span>'
    +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;color:#adada9">v'+post.version+'</span>'
    +'</div>'
    +(post.status==='changes' ? '<div style="margin-top:6px;font-size:11px;color:#b02500;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">! '+post.feedback+'</div>' : '')
    +'</div>'
    +'<span class="material-symbols-outlined" style="font-size:18px;color:#adada9;flex-shrink:0">chevron_right</span>'
    +'</div></div>';
}

// -- POST DETAIL --
function postDetailPage(pid, postid) {
  var p = proj(pid);
  var post = p && p.posts.find(function(x){ return x.id===postid; });
  if (!p || !post) return dashboardPage();

  var commentsHTML = '';
  if (post.status === 'approved') {
    commentsHTML += '<div style="background:#f1f1ec;border-left:3px solid #cafd00;padding:12px 14px;border-radius:10px;display:flex;align-items:center;gap:10px;margin-bottom:14px;">'
      +'<span class="material-symbols-outlined fill-icon" style="color:#4e6300;font-size:18px">check_circle</span>'
      +'<div><div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:13px">Approved</div>'
      +'<div style="font-size:11px;color:#5b5c58">'+post.timestamp+'</div></div></div>';
  }
  if (post.status === 'changes') {
    commentsHTML += '<div style="background:rgba(249,86,48,0.08);border-left:3px solid #f95630;padding:12px 14px;border-radius:10px;display:flex;align-items:start;gap:10px;margin-bottom:14px;">'
      +'<span class="material-symbols-outlined" style="color:#b02500;font-size:18px;flex-shrink:0">error_outline</span>'
      +'<div><div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:13px;color:#b02500">Changes Requested</div>'
      +'<div style="font-size:12px;color:#5b5c58;margin-top:2px">'+post.feedback+'</div></div></div>';
  }

  post.comments.forEach(function(c){
    var isClient = c.from === 'client';
    var ac = window.avColors(c.av || 'A'); ac = [ac.bg, ac.text];
    commentsHTML += '<div style="display:flex;gap:8px;'+(isClient?'flex-direction:row-reverse;':'')+' margin-bottom:12px;">'
      +'<div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;background:'+ac[0]+';color:'+ac[1]+';margin-top:2px;">'+c.av+'</div>'
      +'<div style="max-width:78%;display:flex;flex-direction:column;'+(isClient?'align-items:flex-end;':'')+'">'
      +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">'
      +'<span style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:11px">'+c.name+'</span>'
      +'<span style="font-size:10px;color:#adada9;font-family:Plus Jakarta Sans,sans-serif;">'+c.time+'</span></div>'
      +'<div class="'+(isClient?'msg-in':'msg-out')+'"><p style="font-size:13px;line-height:1.5;margin:0">'+c.text+'</p></div>'
      +'</div></div>';
  });

  var actionButtons = post.status !== 'approved'
    ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px;background:#fff;border-top:1px solid #e9e8e3;">'
      +'<button onclick="reqChanges(\''+pid+'\',\''+postid+'\')" style="background:#f1f1ec;color:#2e2f2c;padding:13px;border-radius:12px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;cursor:pointer;" class="hs">Request Changes</button>'
      +'<button onclick="approvePost(\''+pid+'\',\''+postid+'\')" style="background:#cafd00;color:#3a4a00;padding:13px;border-radius:12px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(202,253,0,0.4);" class="hs">OK Approve</button>'
      +'</div>'
    : '<div style="padding:14px 16px;background:#fff;border-top:1px solid #e9e8e3;display:flex;flex-direction:column;gap:8px;">'
      +'<div style="display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(202,253,0,0.15);color:#4e6300;padding:12px;border-radius:12px;">'
      +'<span class="material-symbols-outlined fill-icon" style="font-size:16px">check_circle</span>'
      +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px">Approved</span></div>'
      +'<button onclick="openCertificate(\''+pid+'\',\''+postid+'\')" data-wt="approval-trail" style="display:flex;align-items:center;justify-content:center;gap:7px;background:#0d0f0c;color:#cafd00;padding:12px;border-radius:12px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;cursor:pointer;" class="hs">'
      +'<span class="material-symbols-outlined fill-icon" style="font-size:15px">verified</span>View Certificate</button>'
      +'</div>';

  return '<div class="anim-slide" style="display:flex;flex-direction:column;min-height:100vh;">'
    +'<div class="top-bar" style="display:flex;align-items:center;gap:12px;">'
    +'<button onclick="openProject(\''+pid+'\')" style="width:36px;height:36px;border-radius:10px;background:#e9e8e3;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:18px;color:#5b5c58">arrow_back</span></button>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+post.title+'</div>'
    +'<div style="font-size:11px;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;">'+p.name+' · v'+post.version+'</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:6px;">'
    +badge(post.status)
    +'<button onclick="sharePortal(\''+pid+'\')" style="width:36px;height:36px;background:#f1f1ec;border-radius:10px;border:none;display:flex;align-items:center;justify-content:center;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:17px;color:#5b5c58">share</span></button>'
    +'</div></div>'

    +'<div style="position:relative;">'
    +'<img src="'+post.image+'" style="width:100%;display:block;max-height:260px;object-fit:cover;" loading="lazy"/>'
    +(post.status==='approved'
      ? '<div style="position:absolute;inset:0;background:rgba(58,74,0,0.3);display:flex;align-items:center;justify-content:center;">'
        +'<div style="background:#cafd00;border-radius:14px;padding:10px 22px;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.2);">'
        +'<span class="material-symbols-outlined fill-icon" style="color:#3a4a00">verified</span>'
        +'<span style="font-family:Space Grotesk,sans-serif;font-weight:900;color:#3a4a00">APPROVED</span></div></div>' : '')
    +'</div>'

    +'<div style="padding:14px 16px;background:#fff;border-bottom:1px solid #e9e8e3;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#5b5c58;margin-bottom:6px">Caption</div>'
    +'<p style="font-size:14px;line-height:1.6;margin:0;color:#2e2f2c">'+post.caption+'</p>'
    +'</div>'

    +'<div style="flex:1;background:#f7f6f1;padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#5b5c58;margin-bottom:12px">Activity</div>'
    +commentsHTML
    +'</div>'

    +'<div style="padding:12px 16px;background:#fff;border-top:1px solid #e9e8e3;display:flex;gap:8px;align-items:flex-end;">'
    +'<textarea id="comment-input" placeholder="Add a note..." rows="1" style="flex:1;background:#f1f1ec;border:none;border-radius:12px;padding:10px 14px;font-family:Manrope,sans-serif;font-size:14px;resize:none;outline:none;min-height:40px;max-height:100px;" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,100)+\'px\';"></textarea>'
    +'<button onclick="submitComment(\''+pid+'\',\''+postid+'\')" style="width:40px;height:40px;background:#2e2f2c;border:none;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:16px;color:#f7f6f1">send</span></button>'
    +'</div>'

    + actionButtons
    +'</div>';
}

// -- CERTIFICATE --
function certificatePage(pid, postid) {
  var p = proj(pid);
  var post = p && p.posts.find(function(x){ return x.id===postid; });
  if (!p || !post) return dashboardPage();

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  var docId = 'RCT-'+Math.random().toString(36).slice(2,8).toUpperCase();
  var hash = Math.random().toString(36).slice(2,10);

  return '<div class="anim-fade">'
    +'<div class="top-bar" style="display:flex;align-items:center;gap:12px;">'
    +'<button onclick="openPost(\''+pid+'\',\''+postid+'\')" style="width:36px;height:36px;border-radius:10px;background:#e9e8e3;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:18px;color:#5b5c58">arrow_back</span></button>'
    +'<div style="flex:1;">'
    +'<div style="display:flex;align-items:center;gap:6px;">'
    +'<span class="material-symbols-outlined fill-icon" style="color:#4e6300;font-size:14px">verified</span>'
    +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#4e6300">Certificate</span>'
    +'</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:17px;font-weight:900;letter-spacing:-0.02em">'+post.title+'</div>'
    +'</div>'
    +'<button onclick="toast(\'PDF download coming soon\')" style="width:36px;height:36px;background:#f1f1ec;border-radius:10px;border:none;display:flex;align-items:center;justify-content:center;" class="hs">'
    +'<span class="material-symbols-outlined" style="font-size:17px;color:#5b5c58">download</span></button>'
    +'</div>'

    +'<div style="padding:16px;display:flex;flex-direction:column;gap:14px;">'
    +'<div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(46,47,44,0.1);">'
    +'<div style="background:#0d0f0c;padding:20px;position:relative;overflow:hidden;">'
    +'<div class="cert-texture" style="position:absolute;inset:0;opacity:0.4;"></div>'
    +'<div style="position:relative;display:flex;align-items:center;justify-content:space-between;">'
    +'<div><div style="font-family:Space Grotesk,sans-serif;font-size:16px;font-weight:900;color:#f7f6f1;letter-spacing:-0.02em;margin-bottom:10px">Receipts.</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(247,246,241,0.4);margin-bottom:2px">Document ID</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;color:#cafd00;font-size:15px">'+docId+'</div>'
    +'</div>'
    +'<div style="text-align:right;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(247,246,241,0.4);margin-bottom:2px">Finalized</div>'
    +'<div style="font-size:12px;font-weight:600;color:#f7f6f1;margin-bottom:8px">'+dateStr+'</div>'
    +'<span class="badge badge-approved">Approved</span>'
    +'</div></div></div>'

    +'<div style="padding:16px;">'
    +'<img src="'+post.image+'" style="width:100%;border-radius:12px;display:block;max-height:220px;object-fit:cover;margin-bottom:14px;border:3px solid #e9e8e3;" loading="lazy"/>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#5b5c58;margin-bottom:6px">Approved Caption</div>'
    +'<p style="font-size:13px;line-height:1.6;color:#2e2f2c;background:#f7f6f1;border-radius:10px;padding:12px;margin:0;font-style:italic">"'+post.caption+'"</p>'
    +'</div>'

    +'<div style="background:#0d0f0c;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(247,246,241,0.4);margin-bottom:2px">Finalized</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;color:#f7f6f1;font-size:12px">'+dateStr+'</div></div>'
    +'<div style="background:rgba(202,253,0,0.12);border:1px solid rgba(202,253,0,0.2);border-radius:8px;padding:8px 14px;text-align:right;">'
    +'<div style="font-size:9px;font-family:Plus Jakarta Sans,sans-serif;color:rgba(247,246,241,0.3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Hash</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:12px;font-weight:700;color:#cafd00">'+hash+'...</div>'
    +'</div></div>'
    +'</div>'

    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +[['Project',p.name],['Client',p.client],['Platform',post.platform],['Versions',post.version]].map(function(r){
      return '<div style="background:#fff;border-radius:14px;padding:14px;">'
        +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#adada9;margin-bottom:4px">'+r[0]+'</div>'
        +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:14px;color:#2e2f2c">'+r[1]+'</div>'
        +'</div>';
    }).join('')
    +'</div>'

    +'</div></div>';
}




// ─── POST ACTIONS ────────────────────────────────────────────────────────────

function approvePost(pid, postid) {
  var p = window.getProject(pid);
  var post = p && p.posts.find(function(x) { return x.id === postid; });
  if (!post) return;
  post.status = 'approved';
  post.timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  window.saveState();
  window.render();
  window.toast('Post approved!');
}

function reqChanges(pid, postid) {
  var p = window.getProject(pid);
  var post = p && p.posts.find(function(x) { return x.id === postid; });
  if (!post) return;
  var feedback = prompt('What needs to change?');
  if (!feedback) return;
  post.status = 'changes';
  post.feedback = feedback;
  window.saveState();
  window.render();
}

function submitComment(pid, postid) {
  var p = window.getProject(pid);
  var post = p && p.posts.find(function(x) { return x.id === postid; });
  var el = document.getElementById('comment-input');
  if (!post || !el || !el.value.trim()) return;
  post.comments.push({
    from: 'creator', name: 'You', av: 'Y',
    text: el.value.trim(),
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  });
  window.saveState();
  window.render();
}

function showAddPostModal() {
  var M = window._MS;
  var p = window.activeProject();
  if (!p) return;
  window.sheet(
    '<div style="' + M.wrap + '">'
    + '<div style="' + M.title + '">Add content</div>'
    + '<div style="' + M.sub + '">Add a piece for client review.</div>'
    + '<div style="' + M.row + '"><div style="' + M.label + '">Title</div>'
    + '<input id="ap-title" type="text" placeholder="Campaign Hero Shot" autocomplete="new-password" style="' + M.input + '"></div>'
    + '<div style="' + M.row + '"><div style="' + M.label + '">Caption</div>'
    + '<textarea id="ap-caption" placeholder="Write your caption..." rows="3" style="' + M.input + ';resize:none;line-height:1.4"></textarea></div>'
    + '<div style="' + M.row + '"><div style="' + M.label + '">Image URL</div>'
    + '<input id="ap-image" type="url" placeholder="https://..." autocomplete="new-password" style="' + M.input + '"></div>'
    + '<div style="margin-bottom:4px"><div style="' + M.label + '">Platform</div>'
    + '<input id="ap-platform" type="text" placeholder="Instagram, Twitter/X..." autocomplete="new-password" style="' + M.input + '"></div>'
    + '<button onclick="addPost()" class="hs" style="' + M.btnPri + '">Add to project</button>'
    + '</div>'
  );
}

function addPost() {
  var p = window.activeProject();
  if (!p) return;
  var title    = (document.getElementById('ap-title')    || {}).value || '';
  var caption  = (document.getElementById('ap-caption')  || {}).value || '';
  var image    = (document.getElementById('ap-image')    || {}).value || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80';
  var platform = (document.getElementById('ap-platform') || {}).value || 'Instagram';
  if (!title.trim()) { window.toast('Add a title'); return; }
  p.posts.push({
    id: window.makeId('post'),
    title: title.trim(), caption: caption.trim(),
    image: image.trim() || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
    platform: platform.trim(), status: 'pending',
    version: 1, feedback: '',
    timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    versions: ['v1 - Original'],
    comments: []
  });
  window.saveState();
  window.closeModal();
  window.render();
  window.toast('Content added');
}

function previewPortal(pid) {
  var p = window.getProject(pid);
  if (!p) return;
  window.open(window.portalURL(p.token), '_blank');
}

// ─── EXPOSE ──────────────────────────────────────────────────────────────────

window.projectDetailPage        = projectDetailPage;
window.desktopProjectDetailPage = desktopProjectDetailPage;
window.postDetailPage           = postDetailPage;
window.certificatePage          = certificatePage;
window.desktopPostCard          = desktopPostCard;
window.mobilePostCard           = mobilePostCard;
window.approvePost              = approvePost;
window.reqChanges               = reqChanges;
window.submitComment            = submitComment;
window.showAddPostModal         = showAddPostModal;
window.addPost                  = addPost;
window.previewPortal            = previewPortal;
