'use strict';

var SK = 'receipts_v5';

function _defaultState() {
  return {
    clients:  JSON.parse(JSON.stringify(window.DEMO_CLIENTS)),
    projects: JSON.parse(JSON.stringify(window.DEMO_PROJECTS)),
    view: 'dashboard',
    activeProject: 'proj_nike',
    activeClient: null,
    openPost: null,
    certPost: null,
    walkthroughSeen: false,
    walkthroughStep: 0,
    walkthroughActive: false
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(SK);
    if (raw) {
      var parsed = JSON.parse(raw);
      // migrate: if no clients array, reset to default
      if (!Array.isArray(parsed.clients)) return _defaultState();
      return parsed;
    }
  } catch(e) {}
  return _defaultState();
}

function saveState() {
  try { localStorage.setItem(SK, JSON.stringify(window.S)); } catch(e) {}
}

function resetState() {
  try { localStorage.removeItem(SK); } catch(e) {}
  window.S = _defaultState();
  saveState();
}

// -- Lookup helpers --
function getClient(id) {
  return (window.S.clients || []).find(function(c) { return c.id === id; });
}

function getProject(id) {
  return (window.S.projects || []).find(function(p) { return p.id === id; });
}

function activeProject() {
  return getProject(window.S.activeProject);
}

function projectsForClient(clientId) {
  return (window.S.projects || []).filter(function(p) { return p.clientId === clientId; });
}

function clientForProject(project) {
  return project ? getClient(project.clientId) : null;
}

// -- ID generator --
function makeId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 8);
}

// -- Validate on boot --
(function validateState() {
  try {
    window.S = loadState();
    if (!window.S || !Array.isArray(window.S.projects)) window.S = _defaultState();
    if (!Array.isArray(window.S.clients)) window.S.clients = JSON.parse(JSON.stringify(window.DEMO_CLIENTS));
    if (typeof window.S.view !== 'string') window.S.view = 'dashboard';
    if (!window.S.activeProject) window.S.activeProject = window.S.projects[0] && window.S.projects[0].id;
  } catch(e) {
    console.warn('[Receipts] State boot error, resetting:', e);
    window.S = _defaultState();
  }
})();

// Expose
window.saveState       = saveState;
window.resetState      = resetState;
window.getClient       = getClient;
window.getProject      = getProject;
window.activeProject   = activeProject;
window.projectsForClient = projectsForClient;
window.clientForProject  = clientForProject;
window.makeId          = makeId;
