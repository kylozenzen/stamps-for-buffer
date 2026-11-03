// -- CLIENT PORTAL --
function clientPortal(p) {
  ensureProjectMeta(p);
  var approved = p.posts.filter(function(x){ return x.status==='approved'; }).length;
  var allDone = p.posts.length > 0 && p.posts.every(function(x){ return x.status==='approved'; });
  var postsHTML = p.posts.length === 0
    ? '<div style="text-align:center;padding:60px 20px;color:#5b5c58;">No content to review yet.</div>'
    : '<div style="display:flex;flex-direction:column;gap:10px;padding:0 16px;">'
      + p.posts.map(function(post){
          return '<div onclick="openClientPost(\''+p.id+'\',\''+post.id+'\')" class="proj-card hs" data-status="'+post.status+'" id="portal-card-'+post.id+'">'
            + '<div style="display:flex;gap:12px;padding:12px 14px;align-items:center;">'
            + '<div style="width:68px;height:68px;border-radius:10px;overflow:hidden;flex-shrink:0;position:relative;">'
            + '<img src="'+post.image+'" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>'
            + (post.status==='approved' ? '<div style="position:absolute;inset:0;background:rgba(58,74,0,0.4);display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined fill-icon" style="font-size:22px;color:#cafd00">check_circle</span></div>' : '')
            + '</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">'
            + '<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:14px">'+post.title+'</div>' + badge(post.status) + '</div>'
            + '<div style="font-size:12px;color:#5b5c58;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4">'+post.caption+'</div>'
            + '<div style="font-size:11px;color:#adada9;font-family:Plus Jakarta Sans,sans-serif;margin-top:6px;">'+post.comments.length+' comments</div>'
            + '</div>'
            + '<span class="material-symbols-outlined" style="font-size:18px;color:#adada9;flex-shrink:0">chevron_right</span>'
            + '</div></div>';
        }).join('')
      + '</div>';

  return `
  <div class="anim-fade" style="min-height:100vh;background:#f7f6f1;">
    <header style="background:#fff;border-bottom:1px solid #e9e8e3;padding:calc(env(safe-area-inset-top) + 14px) 16px 14px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:30px;height:30px;background:#cafd00;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-outlined fill-icon" style="font-size:16px;color:#3a4a00">receipt_long</span>
        </div>
        <span style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:16px">Receipts</span>
      </div>
      <span class="badge badge-scheduled">${getCopy('portal.headerBadge','Shared Review')}</span>
    </header>
    <div style="padding:20px 16px 10px;">
      <h1 style="font-family:Space Grotesk,sans-serif;font-size:26px;font-weight:900;letter-spacing:-0.03em;margin:0 0 6px">${p.name}</h1>
      <p style="color:#5b5c58;margin:0 0 12px;font-size:13px">${getCopy('portal.subhead','Anyone with this link can comment. Only the designated approver can send the official decision back to the creator.')}</p>
      <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:16px;">
        <div style="background:#fff;border:1px solid #e9e8e3;border-radius:14px;padding:14px 16px;">
          <div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#5b5c58;margin-bottom:6px">${getCopy('portal.approverTitle','Designated Approver')}</div>
          <div style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:16px;margin-bottom:2px">${p.approverName}</div>
          <div style="font-size:12px;color:#5b5c58;margin-bottom:8px">${p.approverEmail}</div>
          <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(202,253,0,0.12);color:#4e6300;padding:6px 10px;border-radius:99px;font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:700;">
            <span class="material-symbols-outlined fill-icon" style="font-size:14px">verified_user</span>${p.officialStatus}
          </div>
        </div>
        <div style="background:#0d0f0c;border-radius:14px;padding:14px 16px;color:#f7f6f1;">
          <div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(202,253,0,0.7);margin-bottom:6px">${getCopy('portal.officialTitle','Official send-back')}</div>
          <div style="font-size:12px;color:rgba(247,246,241,0.7);line-height:1.5;">${getCopy('portal.officialHelp','Restricted to the designated approver. Final approval or change requests require email verification.')}</div>
        </div>
      </div>
      <div style="background:#e9e8e3;border-radius:99px;height:6px;overflow:hidden;margin-bottom:8px;">
        <div style="background:#cafd00;height:100%;border-radius:99px;transition:width 0.5s;width:${Math.round(approved/Math.max(p.posts.length,1)*100)}%;box-shadow:0 0 8px rgba(202,253,0,0.5);"></div>
      </div>
      <div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:#5b5c58;margin-bottom:16px">${approved} of ${p.posts.length} approved</div>
      ${allDone ? '<div style="background:#cafd00;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px;"><span class="material-symbols-outlined fill-icon" style="font-size:22px;color:#3a4a00">task_alt</span><div><div style="font-family:Space Grotesk,sans-serif;font-weight:900;color:#3a4a00;font-size:15px">All Approved!</div><div style="font-size:12px;color:rgba(58,74,0,0.7)">The creator has been notified.</div></div></div>' : ''}
    </div>
    <div style="display:flex;gap:6px;padding:0 16px 14px;overflow-x:auto;scrollbar-width:none;">${['all','pending','approved','changes'].map(function(f,i){ return '<button onclick="filterPortal(\''+f+'\')" data-filter="'+f+'" style="flex-shrink:0;padding:7px 14px;border-radius:99px;border:none;font-family:Plus Jakarta Sans,sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:'+(i===0?'#0d0f0c':'#e9e8e3')+';color:'+(i===0?'#f7f6f1':'#5b5c58')+';transition:all 0.18s;" class="hs">'+f.charAt(0).toUpperCase()+f.slice(1)+'</button>'; }).join('')}</div>
    ${postsHTML}
    <div style="height:calc(32px + env(safe-area-inset-bottom));"></div>
  </div>`;
}

function errorPage() {
  return '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:32px;text-align:center;">'
    +'<div>'
    +'<div style="font-size:48px;margin-bottom:16px;">🔗</div>'
    +'<h2 style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:22px;margin:0 0 8px">Portal not found</h2>'
    +'<p style="color:#5b5c58;font-size:14px">This link may have expired or been removed.</p>'
    +'</div></div>';
}

function errorPage() {
  return '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:32px;text-align:center;">'
    + '<div>'
    + '<div style="font-size:48px;margin-bottom:16px;">🔗</div>'
    + '<h2 style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:22px;margin:0 0 8px">Portal not found</h2>'
    + '<p style="color:#5b5c58;font-size:14px">This link may have expired or been removed.</p>'
    + '</div></div>';
}

function filterPortal(status) {
  document.querySelectorAll('[data-filter]').forEach(function(btn) {
    var isActive = btn.dataset.filter === status;
    btn.style.background = isActive ? '#0d0f0c' : '#e9e8e3';
    btn.style.color = isActive ? '#f7f6f1' : '#5b5c58';
  });
  document.querySelectorAll('[data-status]').forEach(function(card) {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
}

function openClientPost(pid, postid) {
  var p = window.getProject(pid);
  var post = p && p.posts.find(function(x) { return x.id === postid; });
  if (!post) return;
  window.sheet(
    '<div style="padding:0 20px 8px">'
    + '<img src="' + post.image + '" style="width:100%;border-radius:12px;margin-bottom:14px;display:block;max-height:220px;object-fit:cover;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<div style="font-family:Space Grotesk,sans-serif;font-size:18px;font-weight:900">' + post.title + '</div>'
    + window.badge(post.status)
    + '</div>'
    + '<p style="font-size:13px;color:#5b5c58;margin:0 0 16px;line-height:1.6">' + post.caption + '</p>'
    + '<textarea id="client-comment" placeholder="Leave a comment for the creator..." rows="3" class="field-input" style="resize:none;margin-bottom:10px"></textarea>'
    + '<button onclick="addTeamComment(\'' + pid + '\',\'' + postid + '\')" class="hs" style="width:100%;background:#e9e8e3;color:#2e2f2c;border:none;border-radius:12px;padding:12px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:8px">Add comment</button>'
    + (post.status !== 'approved' ? '<button onclick="showVerificationModal(\'' + pid + '\',\'' + postid + '\',\'approve\')" class="hs" style="width:100%;background:#cafd00;color:#3a4a00;border:none;border-radius:12px;padding:12px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;cursor:pointer">Send official approval</button>' : '')
    + '</div>'
  );
}

function addTeamComment(pid, postid) {
  var p = window.getProject(pid);
  var post = p && p.posts.find(function(x) { return x.id === postid; });
  var el = document.getElementById('client-comment');
  if (!post || !el || !el.value.trim()) { window.toast('Write a comment first'); return; }
  post.comments.push({ from: 'client', name: 'Client', av: 'C', text: el.value.trim(), time: 'Just now' });
  window.saveState();
  window.closeModal();
  window.toast(window.getCopy('portal.commentToast', 'Comment added.'));
}

function showVerificationModal(pid, postid, action) {
  window.closeModal();
  window.sheet(
    '<div style="padding:0 20px 8px;text-align:center">'
    + '<span class="material-symbols-outlined" style="font-size:36px;color:#cafd00;margin-bottom:8px;display:block">verified_user</span>'
    + '<div style="font-family:Space Grotesk,sans-serif;font-size:18px;font-weight:900;margin-bottom:6px">' + window.getCopy('portal.verifyTitle', 'Verify sign-off') + '</div>'
    + '<div style="font-size:13px;color:#5b5c58;margin-bottom:16px">' + window.getCopy('portal.verifyText', 'Enter the 6-digit code.') + '</div>'
    + '<div style="background:#f1f1ec;border-radius:10px;padding:8px 14px;margin-bottom:14px;font-size:12px;color:#5b5c58">Demo code: <strong style="color:#3a4a00">' + window.getCopy('portal.demoCode', '424242') + '</strong></div>'
    + '<input id="verify-code" class="field-input" type="text" maxlength="6" placeholder="······" style="text-align:center;font-size:24px;font-family:Space Grotesk,sans-serif;font-weight:900;letter-spacing:0.2em;margin-bottom:14px">'
    + '<button onclick="confirmOfficialAction(\'' + pid + '\',\'' + postid + '\',\'' + action + '\')" class="hs" style="width:100%;background:#cafd00;color:#3a4a00;border:none;border-radius:12px;padding:13px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;cursor:pointer">' + window.getCopy('portal.submitCode', 'Verify & continue') + '</button>'
    + '</div>', true
  );
}

function confirmOfficialAction(pid, postid, action) {
  var code = (document.getElementById('verify-code') || {}).value || '';
  if (code !== window.getCopy('portal.demoCode', '424242')) { window.toast('Incorrect code'); return; }
  var p = window.getProject(pid);
  var post = p && p.posts.find(function(x) { return x.id === postid; });
  if (!post) return;
  if (action === 'approve') {
    post.status = 'approved';
    p.officialStatus = 'Officially Approved';
    window.saveState();
    window.closeModal();
    window.toast(window.getCopy('portal.approvedToast', 'Official approval sent.'));
    setTimeout(function() { window.render(); }, 300);
  }
}

window.clientPortal          = clientPortal;
window.errorPage             = errorPage;
window.filterPortal          = filterPortal;
window.openClientPost        = openClientPost;
window.addTeamComment        = addTeamComment;
window.showVerificationModal = showVerificationModal;
window.confirmOfficialAction = confirmOfficialAction;
