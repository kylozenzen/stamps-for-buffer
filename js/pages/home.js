'use strict';

// ─── STAT HELPERS ────────────────────────────────────────────────────────────

function _homeStats() {
  var S = window.S;
  var totalPosts    = S.projects.reduce(function(a, p) { return a + p.posts.length; }, 0);
  var pending       = S.projects.reduce(function(a, p) { return a + p.posts.filter(function(x) { return x.status === 'pending'; }).length; }, 0);
  var approved      = S.projects.reduce(function(a, p) { return a + p.posts.filter(function(x) { return x.status === 'approved'; }).length; }, 0);
  var needsChanges  = S.projects.reduce(function(a, p) { return a + p.posts.filter(function(x) { return x.status === 'changes'; }).length; }, 0);
  var activeClients = S.clients.length;
  var activeProjects= S.projects.filter(function(p) { return p.status === 'active' || p.status === 'review'; }).length;
  return { totalPosts: totalPosts, pending: pending, approved: approved, needsChanges: needsChanges, activeClients: activeClients, activeProjects: activeProjects };
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function _statCard(label, value, sub, accent) {
  var bg   = accent ? '#cafd00' : '#fff';
  var col  = accent ? '#3a4a00' : '#2e2f2c';
  var scol = accent ? 'rgba(58,74,0,0.6)' : '#5b5c58';
  return '<div style="background:' + bg + ';border-radius:16px;padding:18px 20px;flex:1;min-width:0;">'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:' + scol + ';margin-bottom:6px">' + label + '</div>'
    + '<div style="font-family:Space Grotesk,sans-serif;font-size:36px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:' + col + '">' + value + '</div>'
    + (sub ? '<div style="font-size:12px;color:' + scol + ';margin-top:4px">' + sub + '</div>' : '')
    + '</div>';
}

// ─── CLIENT ROW ──────────────────────────────────────────────────────────────

function _clientRow(client) {
  var projects  = window.projectsForClient(client.id);
  var pending   = projects.reduce(function(a, p) { return a + p.posts.filter(function(x) { return x.status === 'pending'; }).length; }, 0);
  var approved  = projects.reduce(function(a, p) { return a + p.posts.filter(function(x) { return x.status === 'approved'; }).length; }, 0);
  var changes   = projects.reduce(function(a, p) { return a + p.posts.filter(function(x) { return x.status === 'changes'; }).length; }, 0);
  var projCount = projects.length;

  var urgencyDot = '';
  if (changes > 0) {
    urgencyDot = '<div style="width:8px;height:8px;border-radius:50%;background:#f95630;flex-shrink:0;margin-top:2px"></div>';
  } else if (pending > 0) {
    urgencyDot = '<div style="width:8px;height:8px;border-radius:50%;background:#cafd00;flex-shrink:0;margin-top:2px"></div>';
  }

  var pills = '';
  if (changes > 0)  pills += '<span style="background:#fde8e3;color:#b02500;font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.06em">' + changes + ' needs work</span> ';
  if (pending > 0)  pills += '<span style="background:#e9e8e3;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.06em">' + pending + ' awaiting</span> ';
  if (approved > 0) pills += '<span style="background:rgba(202,253,0,0.2);color:#3a4a00;font-family:Plus Jakarta Sans,sans-serif;font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.06em">' + approved + ' approved</span>';

  return '<div class="proj-card hs" onclick="openClientView(\'' + client.id + '\')" style="padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px;">'
    + window.clientAvatar(client, 44)
    + '<div style="flex:1;min-width:0;">'
    +   '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">'
    +     urgencyDot
    +     '<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + client.company + '</div>'
    +   '</div>'
    +   '<div style="font-size:12px;color:#5b5c58;margin-bottom:6px">' + client.name + ' · ' + projCount + ' project' + (projCount !== 1 ? 's' : '') + '</div>'
    +   '<div style="display:flex;flex-wrap:wrap;gap:4px">' + (pills || '<span style="font-size:11px;color:#adada9">No posts yet</span>') + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">'
    +   '<span class="material-symbols-outlined" style="font-size:18px;color:#adada9">chevron_right</span>'
    +   '<button onclick="event.stopPropagation();showNewProjectModal(\'' + client.id + '\')" style="background:#cafd00;color:#3a4a00;border:none;border-radius:8px;padding:5px 10px;font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap" class="hs">+ Project</button>'
    + '</div>'
    + '</div>';
}

// ─── MAIN PAGE RENDER ────────────────────────────────────────────────────────

function homePage() {
  var S     = window.S;
  var stats = _homeStats();
  var clientRows = S.clients.map(_clientRow).join('');

  // Greeting based on time
  var hr  = new Date().getHours();
  var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  var statRow = '<div style="display:flex;gap:10px;margin-bottom:10px;">'
    + _statCard('Pending review', stats.pending, 'awaiting client', true)
    + _statCard('Needs work', stats.needsChanges, 'changes requested', false)
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-bottom:20px;">'
    + _statCard('Approved', stats.approved, 'ready to schedule', false)
    + _statCard('Active projects', stats.activeProjects, stats.activeClients + ' clients', false)
    + '</div>';

  var emptyState = S.clients.length === 0
    ? '<div style="text-align:center;padding:48px 24px;">'
    +   '<div style="width:56px;height:56px;background:#f1f1ec;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">'
    +   '<span class="material-symbols-outlined" style="font-size:26px;color:#adada9">group</span></div>'
    +   '<div style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:17px;margin-bottom:6px;color:#2e2f2c">No clients yet</div>'
    +   '<div style="font-size:13px;color:#5b5c58;margin-bottom:20px;line-height:1.5">Add your first client to start<br>sending review links.</div>'
    +   '<button onclick="showNewClientModal()" class="hs" style="background:#cafd00;color:#3a4a00;border:none;border-radius:12px;padding:11px 22px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;cursor:pointer">Add first client</button>'
    + '</div>'
    : '';

  return '<div class="anim-fade">'

    // Top bar
    + '<div class="top-bar" style="display:flex;align-items:center;justify-content:space-between;">'
    +   '<div>'
    +     '<div style="font-size:11px;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">' + greet + '</div>'
    +     '<h1 style="font-family:Space Grotesk,sans-serif;font-size:22px;font-weight:900;letter-spacing:-0.03em;margin:0">Command Center</h1>'
    +   '</div>'
    +   '<button onclick="showNewClientModal()" class="hs" style="background:#cafd00;color:#3a4a00;border:none;border-radius:12px;padding:10px 16px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap">'
    +     '<span class="material-symbols-outlined" style="font-size:16px">person_add</span>New client'
    +   '</button>'
    + '</div>'

    // Stats
    + '<div style="padding:16px 16px 0">' + statRow + '</div>'

    // Clients section
    + '<div style="padding:0 16px">'
    +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    +     '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#5b5c58">Clients</div>'
    +     '<div style="font-size:12px;color:#adada9">' + S.clients.length + ' total</div>'
    +   '</div>'
    +   (emptyState || clientRows)
    + '</div>'

    + '</div>';
}

// ─── NEW CLIENT MODAL ────────────────────────────────────────────────────────

var CLIENT_COLORS = [
  { bg: '#cafd00', text: '#3a4a00' },
  { bg: '#bba2ff', text: '#3a0093' },
  { bg: '#f95630', text: '#fff'    },
  { bg: '#0d0f0c', text: '#cafd00' },
  { bg: '#b3e5fc', text: '#014361' },
  { bg: '#ffd180', text: '#5f3c00' }
];

function showNewClientModal() {
  var M = window._MS;
  var swatches = CLIENT_COLORS.map(function(c, i) {
    return '<div onclick="selectClientColor(' + i + ')" data-ci="' + i + '" style="width:26px;height:26px;border-radius:7px;background:' + c.bg + ';cursor:pointer;border:2.5px solid ' + (i === 0 ? '#2e2f2c' : 'transparent') + ';flex-shrink:0" class="hs"></div>';
  }).join('');
  window._selectedClientColor = 0;
  window.sheet(
    '<div style="' + M.wrap + '">'
    + '<div style="' + M.title + '">New client</div>'
    + '<div style="' + M.sub + '">Projects come after.</div>'
    + '<div style="' + M.row + '"><div style="' + M.label + '">Company or brand</div>'
    + '<input id="nc-company" type="text" placeholder="Nike, Adobe, Acme Co..." autocomplete="new-password" style="' + M.input + '"></div>'
    + '<div style="' + M.row + '"><div style="' + M.label + '">Contact name</div>'
    + '<input id="nc-name" type="text" placeholder="Sarah Chen" autocomplete="new-password" style="' + M.input + '"></div>'
    + '<div style="margin-bottom:10px"><div style="' + M.label + '">Contact email</div>'
    + '<input id="nc-email" type="email" placeholder="sarah@brand.com" autocomplete="new-password" style="' + M.input + '"></div>'
    + '<div style="' + M.label + '">Brand color</div>'
    + '<div style="display:flex;gap:5px;margin-bottom:4px">' + swatches + '</div>'
    + '<button onclick="createClient()" class="hs" style="' + M.btnPri + '">Add client</button>'
    + '</div>'
  );
  setTimeout(function() { var el = document.getElementById('nc-company'); if (el) el.focus(); }, 60);
}

function selectClientColor(i) {
  window._selectedClientColor = i;
  document.querySelectorAll('[data-ci]').forEach(function(el) {
    el.style.border = '3px solid ' + (parseInt(el.dataset.ci) === i ? '#2e2f2c' : 'transparent');
  });
}

function createClient() {
  var company = (document.getElementById('nc-company') || {}).value || '';
  var name    = (document.getElementById('nc-name')    || {}).value || '';
  var email   = (document.getElementById('nc-email')   || {}).value || '';

  company = company.trim();
  name    = name.trim();
  email   = email.trim();

  if (!company) { window.toast('Add a company or brand name'); return; }
  if (!name)    { window.toast('Add a contact name'); return; }

  var ci      = window._selectedClientColor || 0;
  var palette = CLIENT_COLORS[ci] || CLIENT_COLORS[0];
  var initials = name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();

  var client = {
    id:        window.makeId('client'),
    name:      name,
    company:   company,
    email:     email || '',
    color:     palette.bg,
    colorText: palette.text,
    initials:  initials
  };

  window.S.clients.push(client);
  window.saveState();
  window.closeModal();
  window.toast(company + ' added');

  // Offer to add first project immediately
  setTimeout(function() { showNewProjectModal(client.id); }, 320);
}

// ─── NEW PROJECT MODAL ───────────────────────────────────────────────────────

function showNewProjectModal(clientId) {
  var M = window._MS;
  var client = window.getClient(clientId);
  if (!client) return;
  window.sheet(
    '<div style="' + M.wrap + '">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
    + window.clientAvatar(client, 32)
    + '<div><div style="' + M.title + '"">New project</div>'
    + '<div style="font-size:11px;color:#adada9">' + client.company + ' · ' + client.name + '</div></div>'
    + '</div>'
    + '<div style="' + M.row + '"><div style="' + M.label + '">Project name</div>'
    + '<input id="np-name" type="text" placeholder="Fall Campaign, Brand Refresh..." autocomplete="new-password" style="' + M.input + '"></div>'
    + '<div style="' + M.label + ';margin-bottom:6px">Status</div>'
    + '<div style="display:flex;gap:6px;margin-bottom:4px">'
    + _statusPill('active', 'Active', 'np-status')
    + _statusPill('review', 'In review', 'np-status')
    + _statusPill('paused', 'Paused', 'np-status')
    + '</div>'
    + '<button onclick="createProject(\'' + clientId + '\')" class="hs" style="' + M.btnPri + '">Create project</button>'
    + '</div>'
  );
  window._selectedStatus = 'active';
  setTimeout(function() { var el = document.getElementById('np-name'); if (el) el.focus(); }, 60);
}

function _statusPill(value, label, group) {
  var active = value === 'active';
  return '<button data-status="' + value + '" onclick="selectProjectStatus(\'' + value + '\')" class="hs" style="flex:1;padding:9px 8px;border-radius:10px;border:2px solid ' + (active ? '#cafd00' : '#e9e8e3') + ';background:' + (active ? 'rgba(202,253,0,0.12)' : '#fff') + ';font-family:Plus Jakarta Sans,sans-serif;font-size:12px;font-weight:800;color:' + (active ? '#3a4a00' : '#5b5c58') + ';cursor:pointer">' + label + '</button>';
}

function selectProjectStatus(value) {
  window._selectedStatus = value;
  document.querySelectorAll('[data-status]').forEach(function(el) {
    var isActive = el.dataset.status === value;
    el.style.border      = '2px solid ' + (isActive ? '#cafd00' : '#e9e8e3');
    el.style.background  = isActive ? 'rgba(202,253,0,0.12)' : '#fff';
    el.style.color       = isActive ? '#3a4a00' : '#5b5c58';
  });
}

function createProject(clientId) {
  var nameEl = document.getElementById('np-name');
  var name   = nameEl ? nameEl.value.trim() : '';
  if (!name) { window.toast('Give the project a name'); return; }

  var token = 'RCT-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  var project = {
    id:        window.makeId('proj'),
    clientId:  clientId,
    name:      name,
    status:    window._selectedStatus || 'active',
    token:     token,
    createdAt: new Date().toISOString().slice(0, 10),
    posts:     [],
    approverName:  window.getClient(clientId) ? window.getClient(clientId).name : '',
    approverEmail: window.getClient(clientId) ? window.getClient(clientId).email : '',
    officialStatus: 'Awaiting verified sign-off'
  };

  window.S.projects.push(project);
  window.S.activeProject = project.id;
  window.saveState();
  window.closeModal();
  window.toast(name + ' created');

  // Navigate to project detail
  setTimeout(function() { window.setView('project-detail'); }, 200);
}

// ─── CLIENT VIEW (opens project list for a client) ───────────────────────────

function openClientView(clientId) {
  window.S.activeClient = clientId;
  // For now just open first project of this client if exists
  var projects = window.projectsForClient(clientId);
  if (projects.length > 0) {
    window.S.activeProject = projects[0].id;
    window.setView('project-detail');
  } else {
    showNewProjectModal(clientId);
  }
}

// ─── EXPOSE ──────────────────────────────────────────────────────────────────

window.homePage            = homePage;
window.showNewClientModal  = showNewClientModal;
window.selectClientColor   = selectClientColor;
window.createClient        = createClient;
window.showNewProjectModal = showNewProjectModal;
window.selectProjectStatus = selectProjectStatus;
window.createProject       = createProject;
window.openClientView      = openClientView;
