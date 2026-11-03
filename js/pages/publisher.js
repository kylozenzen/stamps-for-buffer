function publisherPage() {
  var mobile = isMobile();
  var mainPad = mobile ? '20px 16px 96px' : '32px';
  var wfCols = mobile ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))';
  var useCols = mobile ? '1fr' : 'repeat(2,minmax(0,1fr))';
  var titleSize = mobile ? '44px' : '60px';
  var subSize = mobile ? '15px' : '17px';
  return '<main style="padding:'+mainPad+';min-height:100%;" class="anim-fade">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px;">'
      +'<div style="display:inline-flex;align-items:center;gap:8px;background:#0d0f0c;color:#cafd00;padding:10px 14px;border-radius:999px;font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">'
        +'<span class="material-symbols-outlined fill-icon" style="font-size:16px;color:#cafd00">power</span>Powered by Buffer\'s API'
      +'</div>'
      +'<a href="https://buffer.com" target="_blank" rel="noopener" style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;font-weight:800;color:#2e2f2c;text-decoration:none;display:inline-flex;align-items:center;gap:8px;">Learn more about Buffer <span class="material-symbols-outlined" style="font-size:18px">open_in_new</span></a>'
    +'</div>'
    +'<div style="margin-bottom:28px;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#5b5c58;margin-bottom:10px;">Publishing workflow</div>'
      +'<h1 style="font-family:Space Grotesk,sans-serif;font-size:'+titleSize+';font-weight:900;letter-spacing:-0.05em;line-height:0.95;margin:0 0 14px;color:#2e2f2c;">Publisher</h1>'
      +'<p style="font-size:'+subSize+';line-height:1.55;color:#5b5c58;max-width:860px;margin:0;">Turn approved content into ready-to-schedule posts thanks to the power of Buffer.</p>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:'+wfCols+';gap:18px;margin-bottom:26px;">'
      +workflowCard('Approve','Lock final content.','verified')
      +workflowCard('Prep','Pull approved work into Publisher.','edit_note')
      +workflowCard('Schedule','Use Buffer to schedule and publish.','event_available')
      +workflowCard('Track','Keep deals and payments tied to the work.','payments')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:'+useCols+';gap:20px;">'
      +useCaseCard('FOR BRAND DEALS','Move from approval to scheduled post and keep the payment side close to the work.','handshake','Publish brand work with context.')
      +useCaseCard('FOR CLIENT-AUTHORIZED POSTING','Keep approvals tied to the actual post when you are publishing on a client account.','manage_accounts','Post for clients with approval clarity.')
    +'</div>'
  +'</main>';
}

function workflowCard(label, body, icon) {
  return '<div style="background:#fff;border:1px solid rgba(173,173,169,0.22);border-radius:22px;padding:22px 20px;box-shadow:0 10px 30px rgba(46,47,44,0.05);min-height:164px;display:flex;flex-direction:column;gap:14px;">'
    +'<div style="width:42px;height:42px;border-radius:14px;background:#f1f1ec;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:20px;color:#2e2f2c">'+icon+'</span></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#5b5c58;">'+label+'</div>'
    +'<div style="font-size:16px;line-height:1.5;color:#2e2f2c;">'+body+'</div>'
  +'</div>';
}

function useCaseCard(label, body, icon, title) {
  return '<div style="position:relative;overflow:hidden;background:linear-gradient(180deg,#ffffff 0%,#fbfbf8 100%);border:1px solid rgba(173,173,169,0.24);border-radius:24px;padding:26px 24px;box-shadow:0 12px 36px rgba(46,47,44,0.06);min-height:220px;display:flex;flex-direction:column;">'
    +'<div style="position:absolute;right:-8px;bottom:-10px;opacity:0.06;"><span class="material-symbols-outlined fill-icon" style="font-size:108px;color:#2e2f2c">'+icon+'</span></div>'
    +'<div style="width:46px;height:46px;border-radius:16px;background:#0d0f0c;display:flex;align-items:center;justify-content:center;margin-bottom:18px;"><span class="material-symbols-outlined" style="font-size:22px;color:#cafd00">'+icon+'</span></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#5b5c58;margin-bottom:12px;">'+label+'</div>'
    +'<div style="font-family:Space Grotesk,sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.03em;line-height:1.05;color:#2e2f2c;margin-bottom:14px;max-width:420px;">'+title+'</div>'
    +'<div style="font-size:17px;line-height:1.55;color:#5b5c58;max-width:520px;">'+body+'</div>'
  +'</div>';
}


window.publisherPage = publisherPage;
