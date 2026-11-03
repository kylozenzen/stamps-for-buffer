function dealsPage() {
  if (!isMobile()) return desktopDealsPage();
  return mobileDealsPage();
}

function mobileDealsPage() {
  var deals = getDealsData();
  return '<div class="anim-fade">'
    +'<div class="top-bar">'
    +'<h1 style="font-family:Space Grotesk,sans-serif;font-size:24px;font-weight:900;letter-spacing:-0.03em;margin:0 0 2px">Deal Tracking</h1>'
    +'<div style="font-size:12px;color:#5b5c58">Manage agency relationships and pipeline.</div>'
    +'</div>'

    // Stats - mobile safe single column first then 2col
    +'<div style="padding:16px;">'
    +'<div style="background:#cafd00;border-radius:16px;padding:18px;margin-bottom:10px;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#3a4a00;font-weight:800;opacity:0.7;margin-bottom:4px">Pipeline Value</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:40px;font-weight:900;color:#3a4a00;letter-spacing:-0.04em;line-height:1">$144,800</div>'
    +'<div style="display:flex;align-items:center;gap:4px;color:rgba(58,74,0,0.7);font-size:12px;margin-top:4px;"><span class="material-symbols-outlined" style="font-size:14px">trending_up</span>+12.4% from last month</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0;">'
    +'<div style="background:#f1f1ec;border-radius:16px;padding:16px;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#5b5c58;font-weight:800;margin-bottom:4px">Active</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:32px;font-weight:900;color:#2e2f2c;letter-spacing:-0.03em;line-height:1">4</div>'
    +'<div style="font-size:12px;color:#5b5c58">Open deals</div>'
    +'</div>'
    +'<div style="background:#0d0f0c;border-radius:16px;padding:16px;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(247,246,241,0.4);font-weight:800;margin-bottom:4px">Paid</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:32px;font-weight:900;color:#cafd00;letter-spacing:-0.03em;line-height:1">$67k</div>'
    +'<div style="font-size:12px;color:rgba(247,246,241,0.4)">This quarter</div>'
    +'</div>'
    +'</div>'
    +'</div>'

    +'<div style="margin:0 16px 16px;background:rgba(202,253,0,0.1);border:1px solid rgba(202,253,0,0.2);border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:10px;">'
    +'<span class="material-symbols-outlined fill-icon" style="color:#4e6300;font-size:18px;flex-shrink:0">info</span>'
    +'<div style="font-size:12px;color:#4e6300;line-height:1.4;"><strong>Preview Mode</strong> — Full deal pipeline with invoicing coming soon.</div>'
    +'</div>'

    +'<div style="padding:0 16px;display:flex;flex-direction:column;gap:8px;">'
    +deals.map(function(d){ return mobileDealCard(d); }).join('')
    +'</div>'
    +'</div>';
}

function desktopDealsPage() {
  var deals = getDealsData();
  return '<main style="padding:32px;min-height:100%;" class="anim-fade">'
    +'<header style="margin-bottom:28px;">'
    +'<h2 style="font-family:Space Grotesk,sans-serif;font-size:36px;font-weight:900;letter-spacing:-0.03em;margin:0 0 4px">Deal Tracking</h2>'
    +'<p style="color:#5b5c58;margin:0">Manage agency relationships and pipeline.</p>'
    +'</header>'

    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:28px;">'
    +'<div style="background:#cafd00;border-radius:20px;padding:24px;grid-column:span 1;position:relative;overflow:hidden;">'
    +'<div style="position:absolute;right:-12px;bottom:-12px;opacity:0.08"><span class="material-symbols-outlined fill-icon" style="font-size:100px">trending_up</span></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#3a4a00;font-weight:800;opacity:0.7;margin-bottom:4px">Pipeline</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:40px;font-weight:900;color:#3a4a00;letter-spacing:-0.04em;line-height:1">$144,800</div>'
    +'</div>'
    +'<div style="background:#f1f1ec;border-radius:20px;padding:24px;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#5b5c58;font-weight:800;margin-bottom:4px">Active Deals</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:40px;font-weight:900;color:#2e2f2c;letter-spacing:-0.03em;line-height:1">4</div>'
    +'</div>'
    +'<div style="background:#0d0f0c;border-radius:20px;padding:24px;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(247,246,241,0.4);font-weight:800;margin-bottom:4px">Paid (Q)</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:40px;font-weight:900;color:#cafd00;letter-spacing:-0.03em;line-height:1">$67k</div>'
    +'</div>'
    +'</div>'

    +'<div style="display:flex;flex-direction:column;gap:10px;">'
    +deals.map(function(d){ return desktopDealRow(d); }).join('')
    +'</div>'
    +'</main>';
}

function getDealsData() {
  return [
    {brand:'Nike',campaign:'Fall Campaign 2024',value:'$45,000',milestone:'Posted',payment:'paid',init:'N',bg:'#cafd00',fg:'#3a4a00'},
    {brand:'Liquid Death',campaign:'Hydration Ritual',value:'$12,800',milestone:'Approval',payment:'invoiced',init:'L',bg:'#0d0f0c',fg:'#cafd00'},
    {brand:'Adobe',campaign:'Max 2024 Showcase',value:'$65,000',milestone:'Concept',payment:'pending',init:'A',bg:'#bba2ff',fg:'#3a0093'},
    {brand:'Notion',campaign:'Workflow Masterclass',value:'$22,000',milestone:'Posted',payment:'paid',init:'No',bg:'#e9e8e3',fg:'#2e2f2c'}
  ];
}

function mobileDealCard(d) {
  var pColor = d.payment==='paid'?'#4e6300':d.payment==='pending'?'#b02500':'#5b5c58';
  var pIcon = d.payment==='paid'?'check_circle':d.payment==='pending'?'schedule':'receipt';
  return '<div class="proj-card" style="padding:14px 16px;display:flex;align-items:center;gap:12px;">'
    +'<div style="width:44px;height:44px;border-radius:12px;background:'+d.bg+';color:'+d.fg+';display:flex;align-items:center;justify-content:center;font-family:Space Grotesk,sans-serif;font-weight:900;font-size:14px;font-style:italic;flex-shrink:0;">'+d.init+'</div>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:14px">'+d.brand+'</div>'
    +'<div style="font-size:11px;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+d.campaign+'</div>'
    +'</div>'
    +'<div style="text-align:right;flex-shrink:0;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:15px;letter-spacing:-0.02em">'+d.value+'</div>'
    +'<div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px;color:'+pColor+';font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:600;">'
    +'<span class="material-symbols-outlined'+(d.payment==='paid'?' fill-icon':'')+'" style="font-size:12px">'+pIcon+'</span>'
    +d.payment.charAt(0).toUpperCase()+d.payment.slice(1)
    +'</div></div>'
    +'</div>';
}

function desktopDealRow(d) {
  var pColor = d.payment==='paid'?'#4e6300':d.payment==='pending'?'#b02500':'#5b5c58';
  var pIcon = d.payment==='paid'?'check_circle':d.payment==='pending'?'schedule':'receipt';
  return '<div style="background:#fff;border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:16px;box-shadow:0 2px 12px rgba(46,47,44,0.05);">'
    +'<div style="width:48px;height:48px;border-radius:14px;background:'+d.bg+';color:'+d.fg+';display:flex;align-items:center;justify-content:center;font-family:Space Grotesk,sans-serif;font-weight:900;font-size:15px;font-style:italic;flex-shrink:0;">'+d.init+'</div>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:16px">'+d.brand+'</div>'
    +'<div style="font-size:13px;color:#5b5c58;font-family:Plus Jakarta Sans,sans-serif;">'+d.campaign+' · '+d.milestone+'</div>'
    +'</div>'
    +'<div style="text-align:right;flex-shrink:0;">'
    +'<div style="font-family:Space Grotesk,sans-serif;font-weight:900;font-size:18px;letter-spacing:-0.02em">'+d.value+'</div>'
    +'<div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px;color:'+pColor+';font-size:12px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;">'
    +'<span class="material-symbols-outlined'+(d.payment==='paid'?' fill-icon':'')+'" style="font-size:13px">'+pIcon+'</span>'
    +d.payment.charAt(0).toUpperCase()+d.payment.slice(1)
    +'</div></div>'
    +'</div>';
}

window.dealsPage = dealsPage;
