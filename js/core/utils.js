'use strict';

function toast(msg) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2800);
}

function isMobile() { return window.innerWidth < 768; }

function copyText(t) {
  try { navigator.clipboard.writeText(t); } catch(e) {}
}

function portalURL(token) {
  return window.location.href.split('?')[0] + '?portal=' + token;
}

function badge(status) {
  var map = {
    approved: 'badge-approved',
    pending:  'badge-pending',
    changes:  'badge-changes',
    scheduled:'badge-scheduled'
  };
  var label = status.charAt(0).toUpperCase() + status.slice(1);
  return '<span class="badge ' + (map[status] || 'badge-pending') + '">' + label + '</span>';
}

function avColors(ch) {
  var palettes = [
    { bg: '#cafd00', text: '#3a4a00' },
    { bg: '#bba2ff', text: '#3a0093' },
    { bg: '#f95630', text: '#fff' },
    { bg: '#0d0f0c', text: '#cafd00' },
    { bg: '#e9e8e3', text: '#2e2f2c' }
  ];
  var i = (ch || 'A').charCodeAt(0) % palettes.length;
  return palettes[i];
}

// Client avatar chip — used in multiple places
function clientAvatar(client, size) {
  size = size || 40;
  var bg   = (client && client.color)     || '#e9e8e3';
  var text = (client && client.colorText) || '#2e2f2c';
  var init = (client && client.initials)  || '?';
  var fs   = size < 32 ? '11px' : size < 48 ? '13px' : '15px';
  var br   = Math.round(size * 0.28) + 'px';
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:' + br
    + ';background:' + bg + ';color:' + text
    + ';display:flex;align-items:center;justify-content:center;font-family:Space Grotesk,sans-serif;'
    + 'font-weight:900;font-size:' + fs + ';flex-shrink:0;">'
    + init + '</div>';
}

// Relative time helper
function relativeTime(dateStr) {
  if (!dateStr) return '';
  var d   = new Date(dateStr);
  var now = new Date();
  var diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return diff + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Expose
window.toast        = toast;
window.isMobile     = isMobile;
window.copyText     = copyText;
window.portalURL    = portalURL;
window.badge        = badge;
window.avColors     = avColors;
window.clientAvatar = clientAvatar;
window.relativeTime = relativeTime;
