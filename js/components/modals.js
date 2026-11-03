'use strict';

// Shared inline styles — everything modal-related uses these
// so spacing is identical across every sheet, no CSS class needed
var _MS = {
  wrap:    'padding:14px 16px 8px',
  title:   'font-family:Space Grotesk,sans-serif;font-size:17px;font-weight:900;color:#2e2f2c;margin:0 0 2px',
  sub:     'font-size:12px;color:#adada9;margin:0 0 12px;line-height:1.4',
  label:   'font-size:11px;font-weight:700;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;display:block;margin-bottom:3px',
  input:   'width:100%;background:#f1f1ec;border:1.5px solid transparent;border-radius:8px;padding:7px 10px;font-size:13px;font-family:Manrope,sans-serif;color:#2e2f2c;outline:none;box-sizing:border-box;-webkit-appearance:none',
  row:     'margin-bottom:8px',
  btnPri:  'width:100%;background:#cafd00;color:#3a4a00;border:none;border-radius:10px;padding:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;cursor:pointer;margin-top:12px',
  btnSec:  'width:100%;background:#f1f1ec;color:#2e2f2c;border:none;border-radius:10px;padding:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;cursor:pointer;margin-top:6px',
};
window._MS = _MS;

function sheet(inner, center) {
  var d = document.createElement('div');
  d.className = 'modal-bg' + (center ? ' center' : '');
  d.innerHTML = '<div class="modal-sheet' + (center ? ' center-modal' : '') + '">'
    + '<div class="sheet-handle"></div>'
    + inner + '</div>';
  d.addEventListener('click', function(e) { if (e.target === d) closeModal(); });
  document.body.appendChild(d);
}

function closeModal() {
  document.querySelectorAll('.modal-bg').forEach(function(el) { el.remove(); });
}

// ─── COMING SOON ─────────────────────────────────────────────────────────────

function showComingSoon(feature) {
  var titles = { vault: window.getCopy('common.vaultSoonTitle', 'The Vault') };
  var bodies  = { vault: window.getCopy('common.vaultSoonBody', 'Coming soon.') };
  sheet(
    '<div style="' + _MS.wrap + ';text-align:center;padding-top:18px">'
    + '<span class="material-symbols-outlined" style="font-size:32px;color:#adada9;margin-bottom:10px;display:block">lock</span>'
    + '<div style="' + _MS.title + ';margin-bottom:6px">' + (titles[feature] || 'Coming Soon') + '</div>'
    + '<div style="font-size:13px;color:#5b5c58;line-height:1.5;margin-bottom:16px">' + (bodies[feature] || 'This feature is on the way.') + '</div>'
    + '<button onclick="closeModal()" class="hs" style="' + _MS.btnSec + ';margin-top:0">Got it</button>'
    + '</div>', true
  );
}

// ─── SHARE SHEET ─────────────────────────────────────────────────────────────

function showShareSheet(url, name) {
  sheet(
    '<div style="' + _MS.wrap + '">'
    + '<div style="' + _MS.title + '">Share review link</div>'
    + '<div style="' + _MS.sub + '">' + (name || 'Project') + '</div>'
    + '<div style="background:#f1f1ec;border-radius:8px;padding:10px 12px;font-family:Manrope,sans-serif;font-size:12px;word-break:break-all;color:#2e2f2c;margin-bottom:10px">' + url + '</div>'
    + '<button onclick="window.copyText(\'' + url + '\');window.toast(\'Link copied\');closeModal();" class="hs" style="' + _MS.btnPri + ';margin-top:0">Copy link</button>'
    + '<button onclick="closeModal()" class="hs" style="' + _MS.btnSec + '">Done</button>'
    + '</div>'
  );
}

// ─── MORE SHEET ───────────────────────────────────────────────────────────────

function openMoreSheet() {
  sheet(
    '<div style="' + _MS.wrap + '">'
    + '<div style="' + _MS.title + ';margin-bottom:12px">More</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">'
    + _moreRow('verified', 'The Vault', 'Certificates & approval history', "showComingSoon('vault')")
    + _moreRow('help_outline', 'How it works', 'Quick walkthrough of Receipts', 'openHowItWorks()')
    + _moreRow('refresh', 'Reset', 'Clear all data and start fresh', 'resetDemo()')
    + '</div>'
    + '<div style="background:#f1f1ec;border-radius:10px;padding:12px 14px">'
    + '<div style="font-size:11px;color:#adada9;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px">Receipts is in beta</div>'
    + '<div style="font-family:Space Grotesk,sans-serif;font-size:13px;font-weight:700;color:#2e2f2c">Built by Nobody Creative</div>'
    + '</div>'
    + '</div>'
  );
}

function _moreRow(icon, label, sub, action) {
  return '<button onclick="' + action + '" class="hs" style="display:flex;align-items:center;gap:10px;background:#f1f1ec;border:none;border-radius:10px;padding:11px 14px;text-align:left;cursor:pointer;width:100%">'
    + '<span class="material-symbols-outlined" style="font-size:20px;color:#5b5c58">' + icon + '</span>'
    + '<div><div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:13px">' + label + '</div>'
    + '<div style="font-size:11px;color:#adada9;margin-top:1px">' + sub + '</div></div>'
    + '</button>';
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

function openHowItWorks() {
  closeModal();
  sheet(
    '<div style="' + _MS.wrap + '">'
    + '<div style="' + _MS.title + ';margin-bottom:14px">How Receipts works</div>'
    + _howStep('1', 'Create a client', 'Add their name, company, and email.')
    + _howStep('2', 'Start a project', 'Name the campaign and add content.')
    + _howStep('3', 'Share the link', 'Send the portal link — no login needed.')
    + _howStep('4', 'Client reviews', 'They approve or request changes.')
    + _howStep('5', 'You get the receipt', 'Approved posts get a Certificate of Approval.')
    + '<button onclick="closeModal()" class="hs" style="' + _MS.btnPri + '">Got it</button>'
    + '</div>'
  );
}

function _howStep(num, title, body) {
  return '<div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start">'
    + '<div style="width:24px;height:24px;border-radius:50%;background:#cafd00;color:#3a4a00;font-family:Space Grotesk,sans-serif;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">' + num + '</div>'
    + '<div><div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:13px;margin-bottom:1px">' + title + '</div>'
    + '<div style="font-size:12px;color:#5b5c58;line-height:1.4">' + body + '</div></div>'
    + '</div>';
}

// ─── EXPOSE ──────────────────────────────────────────────────────────────────

window.sheet          = sheet;
window.closeModal     = closeModal;
window.showComingSoon = showComingSoon;
window.showShareSheet = showShareSheet;
window.openMoreSheet  = openMoreSheet;
window.openHowItWorks = openHowItWorks;
