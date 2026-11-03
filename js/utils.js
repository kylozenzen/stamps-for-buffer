'use strict';
(function(){
  var timer;
  function esc(value){return String(value == null ? '' : value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];});}
  function toast(message){var el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(timer);timer=setTimeout(function(){el.classList.remove('show');},2600);}
  function copy(text,label){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast(label||'Copied');}).catch(function(){fallback(text,label);});}else fallback(text,label);}
  function fallback(text,label){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(label||'Copied');}catch(e){toast('Copy failed');}ta.remove();}
  function fmtDate(value){if(!value)return '—';var d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
  function fmtDateTime(value){if(!value)return '—';var d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}
  function relative(value){if(!value)return 'Never';var d=new Date(value),diff=Date.now()-d.getTime(),mins=Math.floor(diff/60000);if(mins<1)return 'Just now';if(mins<60)return mins+'m ago';var hrs=Math.floor(mins/60);if(hrs<24)return hrs+'h ago';var days=Math.floor(hrs/24);if(days<7)return days+'d ago';return fmtDate(value);}
  function initials(name){return String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x[0];}).join('').toUpperCase()||'?';}
  function id(prefix){return prefix+'_'+Math.random().toString(36).slice(2,9);}
  function roomUrl(token){return window.location.origin+'/review/'+encodeURIComponent(token);}
  function openModal(html){document.getElementById('modal-root').innerHTML='<div class="modal-bg" onclick="if(event.target===this) ReceiptsUtil.closeModal()"><div class="modal">'+html+'</div></div>';}
  function closeModal(){document.getElementById('modal-root').innerHTML='';}
  function titleFromCaption(caption){var clean=String(caption||'').replace(/\s+/g,' ').trim();return clean?(clean.length>46?clean.slice(0,46).trim()+'…':clean):'Untitled Buffer post';}
  window.ReceiptsUtil={esc:esc,toast:toast,copy:copy,fmtDate:fmtDate,fmtDateTime:fmtDateTime,relative:relative,initials:initials,id:id,roomUrl:roomUrl,openModal:openModal,closeModal:closeModal,titleFromCaption:titleFromCaption};
})();
