'use strict';

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────

function render() {
  var content = document.getElementById('page-content');
  if (!content) return;

  // Portal check runs inside render — after all scripts loaded.
  // We never save portal view to localStorage so it can never get stuck.
  var params = new URLSearchParams(window.location.search);
  var token  = params.get('portal');
  if (token) {
    var match = (window.S.projects || []).find(function(x) { return x.token === token; });
    var bnav  = document.getElementById('bottom-nav');
    var side  = document.getElementById('desktop-sidebar');
    if (bnav) bnav.style.display = 'none';
    if (side) side.style.display = 'none';
    content.style.margin = '0';
    content.style.borderRadius = '0';
    content.innerHTML = match ? window.clientPortal(match) : window.errorPage();
    return;
  }

  var v = window.S.view;

  // Never let a stale portal view boot the app into a broken state
  if (v === 'portal' || v === 'portal-error') {
    window.S.view = 'dashboard';
    v = 'dashboard';
  }

  renderDesktopNav();
  updateNavTabs();

  if (v === 'dashboard') {
    content.innerHTML = window.homePage();
  } else if (v === 'project-detail') {
    content.innerHTML = window.isMobile()
      ? window.projectDetailPage()
      : window.desktopProjectDetailPage();
  } else if (v === 'post-detail') {
    var op = window.S.openPost;
    content.innerHTML = op ? window.postDetailPage(op.pid, op.postid) : window.homePage();
  } else if (v === 'certificate') {
    var cp = window.S.certPost;
    content.innerHTML = cp ? window.certificatePage(cp.pid, cp.postid) : window.homePage();
  } else if (v === 'deals') {
    content.innerHTML = window.dealsPage();
  } else if (v === 'publisher') {
    content.innerHTML = window.publisherPage();
  } else {
    content.innerHTML = window.homePage();
  }

  content.scrollTop = 0;
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

function updateNavTabs() {
  var v = window.S.view;
  var active = v === 'deals' ? 'deals' : v === 'publisher' ? 'publisher' : 'dashboard';
  document.querySelectorAll('.nav-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.nav === active);
  });
}

function renderDesktopNav() {
  var nav = document.getElementById('desktop-nav');
  if (!nav) return;
  var items = [
    { view: 'dashboard', icon: 'home',     label: 'Home'      },
    { view: 'deals',     icon: 'payments', label: 'Deals'     },
    { view: 'publisher', icon: 'send',     label: 'Publisher' },
    { view: 'vault',     icon: 'verified', label: 'Vault', soon: true }
  ];
  var active = window.S.view;
  nav.innerHTML = items.map(function(item) {
    var isActive = item.view === active;
    var action   = item.soon ? "showComingSoon('vault')" : "setView('" + item.view + "')";
    return '<button onclick="' + action + '" class="hs" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;border:none;background:'
      + (isActive ? '#cafd00' : 'transparent') + ';color:'
      + (isActive ? '#3a4a00' : 'rgba(247,246,241,0.6)') + ';font-family:Plus Jakarta Sans,sans-serif;font-size:13px;font-weight:700;cursor:pointer;text-align:left;width:100%">'
      + '<span class="material-symbols-outlined' + (isActive ? ' fill-icon' : '') + '" style="font-size:17px">' + item.icon + '</span>'
      + item.label + '</button>';
  }).join('');
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

function setView(v) {
  window.S.view = v;
  window.S.openPost = null;
  window.saveState();
  render();
}

function openProject(id) {
  window.S.activeProject = id;
  window.S.view = 'project-detail';
  window.S.openPost = null;
  window.saveState();
  render();
}

function openPost(pid, postid) {
  window.S.activeProject = pid;
  window.S.view = 'post-detail';
  window.S.openPost = { pid: pid, postid: postid };
  window.saveState();
  render();
}

function openCertificate(pid, postid) {
  window.S.view = 'certificate';
  window.S.certPost = { pid: pid, postid: postid };
  window.saveState();
  render();
}

function sharePortal(pid) {
  var p = window.getProject(pid);
  if (!p) return;
  window.showShareSheet(window.portalURL(p.token), p.name);
}

function resetDemo() {
  window.resetState();
  render();
  window.toast('Reset done');
}

function submitWaitlistFromFields(nameId, emailId) {
  var name  = (document.getElementById(nameId)  || {}).value || '';
  var email = (document.getElementById(emailId) || {}).value || '';
  if (!email) { window.toast('Enter your email'); return; }
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'form-name': 'beta-waitlist', name: name, email: email }).toString()
  }).then(function() {
    window.toast("You're on the list!");
    window.closeModal && window.closeModal();
  }).catch(function() {
    window.toast("You're on the list!");
  });
}

function submitWaitlistDesktop() { submitWaitlistFromFields('desktop-name', 'desktop-email'); }
function submitWaitlistMore()    { submitWaitlistFromFields('more-name', 'more-email'); }

// ─── EXPOSE ──────────────────────────────────────────────────────────────────

window.render          = render;
window.setView         = setView;
window.openProject     = openProject;
window.openPost        = openPost;
window.openCertificate = openCertificate;
window.sharePortal     = sharePortal;
window.resetDemo       = resetDemo;
window.submitWaitlistDesktop = submitWaitlistDesktop;
window.submitWaitlistMore    = submitWaitlistMore;

// ─── BOOT ────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', function() {
  render();
});
