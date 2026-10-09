(function(){
  var shell=document.getElementById('rwShell'); if(!shell)return;
  var STATE={rorts:[],cat:'all',search:'',sort:'severity-desc'};var DOM={};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function tier(score){var s=Number(score)||0;if(s<=0)return null;if(s<=2)return{n:1,label:'Mild concern',icon:'🤔'};if(s<=4)return{n:2,label:'Notable',icon:'🧐'};if(s<=6)return{n:3,label:'Serious',icon:'😠'};if(s<=8)return{n:4,label:'Severe',icon:'🔥'};return{n:5,label:'Egregious',icon:'🚨'};}
  function parseAmount(t){if(!t)return null;var c=String(t).replace(/[\$,\s]/g,'').replace(/[^0-9.kKmMbB]/g,'');if(!c)return null;var m=c.match(/^([\d.]+)([kKmMbB]?)$/);if(!m){var n=parseFloat(c);return isFinite(n)?n:null;}var v=parseFloat(m[1]);var s=(m[2]||'').toLowerCase();if(s==='k')v*=1e3;else if(s==='m')v*=1e6;else if(s==='b')v*=1e9;return isFinite(v)?v:null;}
  function fmt(n){if(n==null||!isFinite(n))return '—';if(n>=1e9)return '$'+(n/1e9).toFixed(n>=1e10?0:1).replace(/\.0$/,'')+'B';if(n>=1e6)return '$'+(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,'')+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(n>=1e4?0:1).replace(/\.0$/,'')+'k';return '$'+Math.round(n).toLocaleString();}
  function parse(text){
    return text.split(/^\s*-{3,}\s*$/m).map(function(blk){
      var o={};blk.split(/\r?\n/).forEach(function(line){if(/^\s*#/.test(line)||!line.trim())return;var m=line.match(/^\s*([A-Za-z]+)\s*:\s*(.*)$/);if(m)o[m[1].toUpperCase()]=m[2].trim();});
      if(!o.NAME&&!o.DESCRIPTION)return null;
      return {name:o.NAME||'(untitled)',juris:o.JURISDICTION||'',category:o.CATEGORY||'',amountRaw:o.COST||'',amount:parseAmount(o.COST),score:o.SEVERITY?parseFloat(o.SEVERITY):null,description:o.DESCRIPTION||'',action:o.ACTION||''};
    }).filter(Boolean);
  }
  function buildShell(){
    shell.innerHTML=
      '<div class="rw-newsflash"><span class="rw-newsflash-icon">📣</span><div><strong>Newsflash:</strong> We\'re refreshing Rorts Watch — keep your eyes peeled. The rorts below are drawn from our archives as we test our rorts-fighting system. Want to join the fight against government rorts and corruption? <a href="/join">Join us</a> — or <a href="mailto:info@democrats.org.au">tip us off</a>.</div></div>'+
      '<section class="rw-hero"><div><span class="rw-eyebrow">Accountability tracker</span><h1 class="rw-title">Rorts <em>Watch</em></h1><p class="rw-tag">Tracking the schemes, scams and squandered millions that hard-working Australians keep paying for. Updated as the receipts come in.</p><div class="rw-stats"><div class="rw-stat"><span class="rw-stat-value" id="rwCount">0</span><span class="rw-stat-label">Rorts tracked</span></div><div class="rw-stat"><span class="rw-stat-value" id="rwTotal">$0</span><span class="rw-stat-label">Minimum estimated waste</span></div><div class="rw-stat"><span class="rw-stat-value" id="rwJuris">0</span><span class="rw-stat-label">Jurisdictions watched</span></div></div></div><div class="rw-hero-card"><img class="rw-hero-img" src="/assets/img/rorts-rorts-watch-01.webp" alt="Rorts Watch" loading="lazy"><div class="rw-hero-card-body"><h2>Keeping the bastards honest.</h2><p>Since 1977 — now with receipts.</p></div><span class="rw-hero-stamp">Receipts on file</span></div></section>'+
      '<div class="rw-toolbar"><div class="rw-toolbar-row"><input type="text" class="rw-search" id="rwSearch" placeholder="Search by name, scheme, jurisdiction…"><select class="rw-sort" id="rwSort"><option value="severity-desc">Sort: Severity (worst first)</option><option value="severity-asc">Sort: Severity (mildest first)</option><option value="amount-desc">Sort: Cost (highest first)</option><option value="amount-asc">Sort: Cost (lowest first)</option><option value="name-asc">Sort: Name (A–Z)</option></select></div><div class="rw-chips" id="rwChips"></div></div>'+
      '<div class="rw-grid" id="rwGrid"></div>'+'<section class="rw-define"><span class="rw-define-mark">rort</span><div class="rw-define-body"><p class="rw-define-lead"><strong>A rort is all about manipulating the system to gain a wrongful advantage.</strong> As a verb, <em>rort</em> means to swindle or dupe.</p><p class="rw-define-note">Part of Aussie slang since at least the 1910s, it is now used in reference to election rigging, embezzlement and other dodgy practices indulged in by the nation\'s movers and shakers \u2014 carrying serious implications for anyone who finds their face plastered on the front page above the word <em>rort</em>. <span class="rw-define-src">Macquarie Dictionary</span></p><p class="rw-define-note">This list is by no means comprehensive, but it\'s our attempt to keep track of rorts undertaken by our political leaders across all jurisdictions in Australia.</p></div></section>'+
      '<section class="rw-cta"><h2>Sick of footing the bill?</h2><p>The Australian Democrats are fighting to put accountability and integrity back at the centre of public life. Join us — or chip in to power the watch. Spotted a rort that should be on this list? Let us know.</p><div class="rw-cta-btns"><a href="/join" class="rw-btn">Join the Democrats →</a><a href="/donate" class="rw-btn rw-btn-ghost">Donate</a></div></section>'+
      '<p class="rw-mini">Spotted a rort that should be on this list? Email <a href="mailto:info@democrats.org.au">info@democrats.org.au</a>.</p>';
    DOM.chips=document.getElementById('rwChips');DOM.grid=document.getElementById('rwGrid');DOM.search=document.getElementById('rwSearch');DOM.sort=document.getElementById('rwSort');DOM.count=document.getElementById('rwCount');DOM.total=document.getElementById('rwTotal');DOM.juris=document.getElementById('rwJuris');
    DOM.search.addEventListener('input',function(){STATE.search=DOM.search.value;renderGrid();});
    DOM.sort.addEventListener('change',function(){STATE.sort=DOM.sort.value;renderGrid();});
  }
  function renderChips(){
    var counts={all:STATE.rorts.length};STATE.rorts.forEach(function(r){var c=(r.category||'').trim();if(c)counts[c]=(counts[c]||0)+1;});
    var cats=Object.keys(counts).filter(function(k){return k!=='all';}).sort();
    if(!cats.length){DOM.chips.style.display='none';return;}
    DOM.chips.style.display='';
    var html=['<button class="rw-chip '+(STATE.cat==='all'?'is-active':'')+'" data-cat="all">All <span class="rw-chip-count">'+counts.all+'</span></button>'];
    cats.forEach(function(c){html.push('<button class="rw-chip '+(STATE.cat===c?'is-active':'')+'" data-cat="'+esc(c)+'">'+esc(c)+' <span class="rw-chip-count">'+counts[c]+'</span></button>');});
    DOM.chips.innerHTML=html.join('');
    Array.prototype.forEach.call(DOM.chips.querySelectorAll('.rw-chip'),function(b){b.addEventListener('click',function(){STATE.cat=b.getAttribute('data-cat');renderChips();renderGrid();});});
  }
  function renderGrid(){
    var v=STATE.rorts.filter(function(r){if(STATE.cat!=='all'&&(r.category||'')!==STATE.cat)return false;if(STATE.search){var h=((r.name||'')+' '+(r.description||'')+' '+(r.juris||'')+' '+(r.category||'')+' '+(r.action||'')).toLowerCase();if(h.indexOf(STATE.search.toLowerCase())<0)return false;}return true;});
    v.sort(function(a,b){switch(STATE.sort){case 'severity-asc':return (a.score||0)-(b.score||0);case 'severity-desc':return (b.score||0)-(a.score||0);case 'amount-asc':return (a.amount||0)-(b.amount||0);case 'amount-desc':return (b.amount||0)-(a.amount||0);case 'name-asc':return (a.name||'').localeCompare(b.name||'');}return 0;});
    if(!v.length){DOM.grid.innerHTML='<div class="rw-empty">No rorts match your filters.</div>';return;}
    DOM.grid.innerHTML=v.map(function(r,i){
      var t=tier(r.score);var tc=t?('t'+t.n):'';var side=(i%2===0)?'cost-r':'cost-l';
      var cost=r.amount!=null?'<div class="rw-cost"><span class="rw-cost-amount">'+fmt(r.amount)+'</span><span class="rw-cost-label">Cost</span></div>':(r.amountRaw?'<div class="rw-cost"><span class="rw-cost-amount">'+esc(r.amountRaw)+'</span><span class="rw-cost-label">Reported</span></div>':'');
      var act=r.action?'<div class="rw-action"><span class="rw-action-label">Action taken</span><span class="rw-action-text">'+esc(r.action)+'</span></div>':'';
      return '<article class="rw-card '+tc+' '+side+'">'+cost+'<div class="rw-card-body">'+(r.category&&r.category!==r.juris?'<span class="rw-cat">'+esc(r.category)+'</span>':'')+'<h3 class="rw-name">'+esc(r.name)+'</h3>'+(r.juris?'<div class="rw-juris">'+esc(r.juris)+'</div>':'')+(r.description?'<p class="rw-desc">'+esc(r.description)+'</p>':'')+(t?'<span class="rw-badge '+tc+'">'+t.icon+' '+t.label+'</span>':'')+'</div>'+act+'</article>';
    }).join('');
  }
  function renderStats(){var total=STATE.rorts.reduce(function(s,r){return s+(r.amount||0);},0);var jset={};STATE.rorts.forEach(function(r){var j=(r.juris||'').trim();if(j)jset[j]=1;});var jn=Object.keys(jset).length;if(DOM.count)DOM.count.textContent=STATE.rorts.length;if(DOM.total)DOM.total.textContent=total>0?fmt(total):'—';if(DOM.juris)DOM.juris.textContent=jn||'—';}
  function go(text){STATE.rorts=parse(text);buildShell();renderChips();renderGrid();renderStats();}
  (function(){if(location.protocol==='file:'&&typeof window.__RORTS==='string'){go(window.__RORTS);return;}var paths=['rorts.txt','rortswatch/rorts.txt','/rortswatch/rorts.txt'],k=0;function fb(){if(typeof window.__RORTS==='string'){go(window.__RORTS);}else{buildShell();if(DOM.grid)DOM.grid.innerHTML='<div class="rw-empty">Could not load the rorts list.</div>';}}(function t(){if(k>=paths.length)return fb();fetch(paths[k++],{cache:'no-store'}).then(function(r){return r.ok?r.text():Promise.reject();}).then(function(x){if(x&&/NAME:/.test(x)){go(x);}else{t();}}).catch(t);})();})();
})();
