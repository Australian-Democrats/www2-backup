(function(){
  function $(s,r){return (r||document).querySelector(s);}
  window.AD=window.AD||{}; window.AD.$=$;
  function imgURL(name){ return (window.__IMG&&window.__IMG[name])||('/assets/img/'+name); }
  function loadImgs(root){
    Array.prototype.forEach.call(root.querySelectorAll('.adw-imgph[data-img]'),function(el){
      if(el.classList.contains('is-loaded'))return;
      var name=el.getAttribute('data-img'); var url=imgURL(name); var im=new Image();
      im.onload=function(){el.style.backgroundImage='url('+url+')';el.classList.add('is-loaded');el.setAttribute('role','img');};
      im.src=url;
    });
  }
  // expose so the shared engine and home both work on injected nodes
  window.AD.loadImgs=loadImgs;


  /* quick join -> carries details to the full form */
  var qj=$('#quickJoin');
  if(qj){var tier='supporter';
    Array.prototype.forEach.call(qj.querySelectorAll('[data-tier]'),function(b){b.addEventListener('click',function(){tier=b.getAttribute('data-tier');Array.prototype.forEach.call(qj.querySelectorAll('[data-tier]'),function(x){x.setAttribute('aria-pressed',String(x===b));});});});
    qj.addEventListener('submit',function(e){e.preventDefault();
      var p=new URLSearchParams({prefill:'1',tier:tier,first:($('#qjFirst').value||'').trim(),last:($('#qjLast').value||'').trim(),email:($('#qjEmail').value||'').trim()});
      location.href='/join?'+p.toString();});}

  /* quick donate -> carries amount to the full form */
  var qd=$('#quickDonate');
  if(qd){var amt='50';var freq='once';var cust=$('#qdCustom');
    Array.prototype.forEach.call(qd.querySelectorAll('[data-amt]'),function(b){b.addEventListener('click',function(){amt=b.getAttribute('data-amt');if(cust)cust.value='';Array.prototype.forEach.call(qd.querySelectorAll('[data-amt]'),function(x){x.setAttribute('aria-pressed',String(x===b));});});});
    Array.prototype.forEach.call(qd.querySelectorAll('[data-freq]'),function(b){b.addEventListener('click',function(){freq=b.getAttribute('data-freq');Array.prototype.forEach.call(qd.querySelectorAll('[data-freq]'),function(x){x.setAttribute('aria-pressed',String(x===b));});});});
    if(cust)cust.addEventListener('input',function(){Array.prototype.forEach.call(qd.querySelectorAll('[data-amt]'),function(x){x.setAttribute('aria-pressed','false');});});
    qd.addEventListener('submit',function(e){e.preventDefault();
      var v=(cust&&cust.value.trim())?cust.value.trim():amt;
      var p=new URLSearchParams({amount:v,freq:freq});
      location.href='/donate?'+p.toString();});}

  /* policy teaser — real platform text, transparency always + 2 random, expand to 9 */
  var POL=[
    {s:'transparency',t:'Transparency &amp; Accountability',k:'Get dirty money out of politics and hold our leaders to account. Defend the right to know.',b:'Openness, accountability, truth and the public’s right to know are essential principles of a functioning democracy. We will push for stronger transparency in political donations, lobbying, and government decision-making, alongside protections for whistleblowers and a free press.',img:'/policy-transparency.webp'},
    {s:'economy',t:'Economy',k:'No tax on personal income up to $45,000 a year, make multinationals pay their fair share, and target spending where it counts.',b:'Australia’s economic and fiscal policies are not fit-for-purpose for the 21st Century. We will push for a tax system that rewards work, captures multinational profits made in Australia, and funds the services Australians rely on.',img:'/policy-economy.webp'},
    {s:'climate',t:'Environment &amp; Climate',k:'Bold action on climate, protect our biodiversity, and a clean transition that works for working Australians.',b:'As Australia’s original environmental party, we believe action on climate and biodiversity is non-negotiable. The transition must be fast, fair, and ambitious — cutting emissions while protecting the workers and communities most exposed to change.',img:'/policy-climate.webp'},
    {s:'health',t:'Health &amp; Wellbeing',k:'Universal mental healthcare, dental in Medicare, and end the postcode lottery on quality care.',b:'Healthcare is a right, not a privilege. We will push to expand Medicare to dental, fully fund community mental health, and lift the standard of aged and disability care so every Australian receives the dignity they deserve.',img:'/policy-health.webp'},
    {s:'rural',t:'Rural &amp; Remote Australia',k:'Reliable connectivity, decent services and real investment in the towns and farms that feed and fuel the nation.',b:'Rural and remote Australia is a powerhouse of food, energy, and resources — but too many communities feel left behind. We will push for reliable mobile and broadband, better health and education access, and a fair share of national infrastructure spend.',img:'/policy-rural.webp'},
    {s:'global',t:'Global Affairs &amp; Defence',k:'An independent foreign policy with Pacific neighbours first, principled trade, and a defence force built to defend Australia.',b:'Our foreign policy must be honest, sovereign, and grounded in the region we live in. We will push for stronger ties across the Pacific, transparent defence procurement, and a credible voice for human rights on the world stage.',img:'/policy-global.webp'},
    {s:'equity',t:'Justice &amp; Equity',k:'A just legal system, full equality and respect under the law.',b:'Equality before the law is the foundation of a fair society. We will push for justice reform, Aboriginal and Torres Strait Islander voice in lawmaking, and stronger protections against discrimination in every form.',img:'/policy-equity.webp'},
    {s:'science',t:'Science &amp; Technology',k:'Back Australian science, treat AI and data with care, and invest in the industries of the future.',b:'Science, research and emerging technology will shape every Australian’s future. We will push for predictable research funding, ethical AI and data laws, and an industrial strategy that turns Australian ideas into Australian jobs.',img:'/policy-science.jpg'},
    {s:'education',t:'Education',k:'Free TAFE, properly funded public schools and lifelong learning for the jobs of tomorrow.',b:'Every Australian deserves a great public education and the chance to retrain through life. We will push to fully fund public schools, expand free TAFE, and back universities to do what they do best — research, teaching and ideas.',img:'/policy-education.webp'}
  ];
  var wrap=$('#polTeaser');
  if(wrap){
    function card(p){
      var media=p.img?'<div class="adw-imgph cardimg" data-img="'+p.img+'" data-size="800×500"></div>':'<div class="cardimg" style="background:'+p.g+'"></div>';
      return '<a class="adw-card adw-polcard" href="/policy-areas/'+p.s+'">'+media+'<div class="body"><h3>'+p.t+'</h3><p class="impact">'+p.k+'</p><p class="desc">'+p.b+'</p><span class="adw-readmore">Read the full platform →</span></div></a>';
    }
    function shuffle(a){a=a.slice();for(var k=a.length-1;k>0;k--){var j=Math.floor(Math.random()*(k+1));var t=a[k];a[k]=a[j];a[j]=t;}return a;}
    function render(list){wrap.innerHTML=list.map(card).join('');loadImgs(wrap);}
    var rest=shuffle(POL.slice(1));
    var three=[POL[0],rest[0],rest[1]];
    render(three);
    var bx=$('#polExpand');
    if(bx)bx.addEventListener('click',function(){
      if(bx.getAttribute('data-open')==='1'){render(three);bx.innerHTML='Show all 9 policy areas →';bx.setAttribute('data-open','0');}
      else{render(POL);bx.innerHTML='Show fewer ↑';bx.setAttribute('data-open','1');}
    });
  }
})();
/* homepage pop-up notifications (driven by /notifications/notifications.txt) */
(function(){
  var wrap=document.getElementById('adNotify'); if(!wrap)return;
  function notifyImg(name){ if(!name)return ''; if(/^\//.test(name)||/^https?:/i.test(name))return name; return (window.__IMG&&window.__IMG[name])||('notifications/images/'+name); }
  function esc(s){return (s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function parse(text){
    return text.split(/^\s*-{3,}\s*$/m).map(function(blk){
      var o={}; blk.split(/\r?\n/).forEach(function(line){
        if(/^\s*#/.test(line)||!line.trim())return;
        var m=line.match(/^\s*([A-Za-z]+)\s*:\s*(.*)$/); if(m)o[m[1].toUpperCase()]=m[2].trim();
      });
      return o;
    }).filter(function(o){return o.TITLE||o.MESSAGE;});
  }
  function render(list){
    var active=list.filter(function(o){return (o.STATUS||'').toLowerCase()==='active';});
    if(!active.length)return;
    active.slice(0,3).forEach(function(o,i){
      var card=document.createElement('div'); card.className='adw-notify';
      var img=notifyImg(o.IMAGE); var ext=/^https?:/i.test(o.LINK||'');
      card.innerHTML='<button class="adw-notify-x" aria-label="Close notification">×</button>'+
        '<div class="adw-notify-top">'+(img?'<div class="adw-notify-img"><img src="'+esc(img)+'" alt=""></div>':'')+'<h3 class="adw-notify-title">'+esc(o.TITLE||'')+'</h3></div>'+
        (o.MESSAGE?'<p class="adw-notify-msg">'+esc(o.MESSAGE)+'</p>':'')+
        (o.BUTTON?'<a class="adw-notify-btn" href="'+esc(o.LINK||'#')+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(o.BUTTON)+'</a>':'');
      card.querySelector('.adw-notify-x').addEventListener('click',function(){card.classList.add('is-closed');});
      wrap.appendChild(card);
      setTimeout(function(){card.classList.add('is-in');},350+i*180);
    });
    var hero=document.querySelector('.adw-hero');
    function onScroll(){ if(!hero)return; var y=window.scrollY||window.pageYOffset||0; wrap.classList.toggle('is-hidden', y>(hero.offsetTop+hero.offsetHeight-90)); }
    window.addEventListener('scroll',onScroll,{passive:true}); onScroll();
  }
  if(typeof window.__NOTIFY==='string'){ render(parse(window.__NOTIFY)); }
  else { fetch('notifications/notifications.txt',{cache:'no-store'}).then(function(r){return r.ok?r.text():'';}).then(function(t){render(parse(t));}).catch(function(){}); }
})();

/* homepage inline join + donate forms: continue->expand(full fields)+validate -> checkout Action */
(function(){
  var $=function(s,r){return (r||document).querySelector(s);};
  var quick=document.getElementById('adwQuick');
  var join=document.getElementById('hpJoin'), don=document.getElementById('hpDonate');
  if(!join&&!don)return;
  var emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function token(f){var i=f.querySelector('[name="cf-turnstile-response"]');return i?i.value:'';}
  function inval(el){if(el){el.classList.add('adw-invalid');el.addEventListener('input',function h(){el.classList.remove('adw-invalid');el.removeEventListener('input',h);});}}
  function clearInval(f){Array.prototype.forEach.call(f.querySelectorAll('.adw-invalid'),function(e){e.classList.remove('adw-invalid');});}
  // Prefer the `checkout` Astro Action (window.adCheckout, wired in index.astro);
  // fall back to the legacy /register endpoint if the bridge has not loaded.
  function submit(payload){
    if(window.adCheckout){return window.adCheckout(payload).catch(function(){return{ok:false,error:'Something went wrong — please try again.'};});}
    return fetch('/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json();}).then(function(d){
        if(d&&d.redirect)return{ok:true,redirect:d.redirect};
        if(d&&d.ok)return{ok:true};
        return{ok:false,error:(d&&d.error)||'Something went wrong — please try again.'};
      }).catch(function(){return{ok:false,error:'Couldn’t reach the server (it works once deployed to Cloudflare).'};});
  }
  function go(f,payload,msg,btn){btn.disabled=true;
    // Free Supporter tier registers locally (Stripe customer + $0 subscription, no
    // card) and lands on a local /thank-you URL — it never hits Stripe Checkout, so
    // don't show the "secure checkout" loader for it. Paid tiers / donations do.
    var _sup=!!(payload&&payload.formType==='join'&&payload.tier==='supporter');
    var _pay=!_sup&&/payment/i.test(btn.textContent||'');
    if(_pay&&window.AD&&AD.showLoader)AD.showLoader('Taking you to secure checkout…','Your payment is processed securely by Stripe');
    else if(_sup&&window.AD&&AD.showLoader)AD.showLoader('Almost there…','Completing your free Supporter registration');
    msg.style.color='#5b6b66';msg.textContent='Processing…';
    submit(payload).then(function(res){
      if(res&&res.ok&&res.redirect){location.href=res.redirect;return;}
      if(res&&res.ok){location.href='/thank-you?type='+payload.formType;return;}
      if((_pay||_sup)&&window.AD&&AD.hideLoader)AD.hideLoader();msg.style.color='#b0333a';msg.textContent=(res&&res.error)||'Something went wrong — please try again.';btn.disabled=false;
    });
  }
  function expand(which){
    if(which==='/join'){if(don)don.hidden=true;quick.classList.add('single');$('#hjMore').hidden=false;$('#hjContinue').hidden=true;var fn=$('#hjFirst');if(fn)fn.focus();}
    else{if(join)join.hidden=true;quick.classList.add('single');$('#hdMore').hidden=false;$('#hdContinue').hidden=true;var fn2=$('#hdFirst');if(fn2)fn2.focus();}
  }
  function collapse(){quick.classList.remove('single');if(join){join.hidden=false;$('#hjMore').hidden=true;$('#hjContinue').hidden=false;}if(don){don.hidden=false;$('#hdMore').hidden=true;$('#hdContinue').hidden=false;}}
  Array.prototype.forEach.call(document.querySelectorAll('.adw-formswitch'),function(a){a.addEventListener('click',function(e){e.preventDefault();collapse();expand(a.getAttribute('data-switch'));window.scrollTo({top:quick.getBoundingClientRect().top+window.scrollY-110,behavior:'smooth'});});});
  if(join){var tier='supporter',roll='',party='',silent='no_unsure',noEmail=false;
    join.querySelectorAll('[data-tier]').forEach(function(b){b.addEventListener('click',function(){tier=b.getAttribute('data-tier');join.querySelectorAll('[data-tier]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});var rw=$('#hjRecurWrap');if(rw)rw.style.display=(tier==='supporter')?'none':'';var sb=$('#hjSubmit');if(sb)sb.textContent=(tier==='supporter')?'Continue to confirmation →':'Continue to payment →';});});
    join.querySelectorAll('[data-roll]').forEach(function(b){b.addEventListener('click',function(){roll=b.getAttribute('data-roll');join.querySelectorAll('[data-roll]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});b.closest('.adw-qtiers').classList.remove('adw-invalid');});});
    join.querySelectorAll('[data-silent]').forEach(function(b){b.addEventListener('click',function(){silent=b.getAttribute('data-silent');join.querySelectorAll('[data-silent]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});b.closest('.adw-qtiers').classList.remove('adw-invalid');});});
    join.querySelectorAll('[data-party]').forEach(function(b){b.addEventListener('click',function(){party=b.getAttribute('data-party');join.querySelectorAll('[data-party]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});$('#hjOtherParty').style.display=(party==='yes')?'':'none';});});
    $('#hjContinue').addEventListener('click',function(){expand('/join');});
    $('#hjConsent').addEventListener('change',function(){$('#hjConsent').closest('.adw-qdeclare').classList.remove('adw-invalid');});
    $('#hjNoEmail').addEventListener('click',function(){noEmail=!noEmail;this.setAttribute('aria-pressed',noEmail?'true':'false');var e=$('#hjEmail');e.disabled=noEmail;if(noEmail){e.value='';e.classList.remove('adw-invalid');}else{e.focus();}});
    join.addEventListener('submit',function(e){e.preventDefault();var msg=$('#hjMsg');clearInval(join);var bad=null;
      function req(id){var el=$('#'+id);if(!el.value.trim()){inval(el);if(!bad)bad=el;}}
      req('hjFirst');req('hjLast');
      var em=$('#hjEmail');if(!noEmail&&!emailRe.test(em.value.trim())){inval(em);if(!bad)bad=em;}
      req('hjMobile');
      var dD=$('#hjDobD'),dM=$('#hjDobM'),dY=$('#hjDobY');var dok=(+dD.value>=1&&+dD.value<=31&&+dM.value>=1&&+dM.value<=12&&dY.value.length===4&&+dY.value>=1900);if(!dok){[dD,dM,dY].forEach(inval);if(!bad)bad=dD;}
      req('hjStreet');req('hjCity');var pc=$('#hjPc');if(!/^\d{4}$/.test(pc.value.trim())){inval(pc);if(!bad)bad=pc;}var st=$('#hjState');if(!st.value){inval(st);if(!bad)bad=st;}
      if(!roll){var rg=$('#hjMore').querySelector('[data-roll]').closest('.adw-qtiers');rg.classList.add('adw-invalid');if(!bad)bad=rg;}
      if(!silent){var sg=$('#hjMore').querySelector('[data-silent]').closest('.adw-qtiers');sg.classList.add('adw-invalid');if(!bad)bad=sg;}if(!party){var pg=$('#hjMore').querySelector('[data-party]').closest('.adw-qtiers');pg.classList.add('adw-invalid');if(!bad)bad=pg;}
      if(party==='yes')req('hjOtherParty');
      var con=$('#hjConsent');if(!con.checked){con.closest('.adw-qdeclare').classList.add('adw-invalid');if(!bad)bad=con;}
      if(bad){msg.style.color='#b0333a';msg.textContent='Please complete the highlighted fields.';(bad.scrollIntoView?bad:con).scrollIntoView({behavior:'smooth',block:'center'});if(bad.focus)try{bad.focus();}catch(e){}return;}
      go(join,{formType:'join',tier:tier,autoRenew:tier==='supporter'?false:$('#hjRecur').checked,firstName:$('#hjFirst').value.trim(),middleName:$('#hjMiddle').value.trim(),lastName:$('#hjLast').value.trim(),preferredName:$('#hjPreferred').value.trim(),email:noEmail?'':em.value.trim(),noEmail:noEmail,mobile:$('#hjMobile').value.replace(/\D/g,'').replace(/^0/,''),landline:(function(){var l=$('#hjLandline');var a=$('#hjLandlineArea');return (l&&l.value.trim())?((a&&a.value||'')+' '+l.value.trim()).trim():'';})(),dob:[dD.value,dM.value,dY.value].join('/'),residential:{line1:$('#hjStreet').value.trim(),line2:$('#hjStreet2').value.trim(),city:$('#hjCity').value.trim(),postcode:pc.value.trim(),state:st.value,country:'AU'},onElectoralRoll:roll,silentElector:silent,otherParty:{member:party==='yes',name:$('#hjOtherParty').value.trim()},consent:true,campaign:AD.qp('campaign'),turnstileToken:token(join)},msg,$('#hjSubmit'));
    });
  }
  if(don){var amt=50,freq='once',cust=$('#hdCustom');
    don.querySelectorAll('[data-amt]').forEach(function(b){b.addEventListener('click',function(){amt=+b.getAttribute('data-amt');if(cust)cust.value='';don.querySelectorAll('[data-amt]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});
    don.querySelectorAll('[data-freq]').forEach(function(b){b.addEventListener('click',function(){freq=b.getAttribute('data-freq');don.querySelectorAll('[data-freq]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});
    if(cust)cust.addEventListener('input',function(){don.querySelectorAll('[data-amt]').forEach(function(x){x.setAttribute('aria-pressed','false');});});
    $('#hdContinue').addEventListener('click',function(){expand('/donate');});
    $('#hdElig').addEventListener('change',function(){$('#hdElig').closest('.adw-qdeclare').classList.remove('adw-invalid');});
    don.addEventListener('submit',function(e){e.preventDefault();var msg=$('#hdMsg');clearInval(don);var bad=null;
      function req(id){var el=$('#'+id);if(!el.value.trim()){inval(el);if(!bad)bad=el;}}
      var v=(cust&&cust.value.trim())?+cust.value.trim():amt;if(!(v>=1)){if(cust)inval(cust);if(!bad)bad=cust;}
      req('hdFirst');req('hdLast');var em=$('#hdEmail');if(!emailRe.test(em.value.trim())){inval(em);if(!bad)bad=em;}
      req('hdAddr1');req('hdCity');var pc=$('#hdPc');if(!/^\d{4}$/.test(pc.value.trim())){inval(pc);if(!bad)bad=pc;}var st=$('#hdState');if(!st.value){inval(st);if(!bad)bad=st;}
      var el2=$('#hdElig');if(!el2.checked){el2.closest('.adw-qdeclare').classList.add('adw-invalid');if(!bad)bad=el2;}
      if(bad){msg.style.color='#b0333a';msg.textContent='Please complete the highlighted fields.';bad.scrollIntoView({behavior:'smooth',block:'center'});if(bad.focus)try{bad.focus();}catch(e){}return;}
      go(don,{formType:'donate',amount:v,frequency:freq,firstName:$('#hdFirst').value.trim(),lastName:$('#hdLast').value.trim(),email:em.value.trim(),address:{line1:$('#hdAddr1').value.trim(),line2:$('#hdAddr2').value.trim(),city:$('#hdCity').value.trim(),state:st.value,postcode:pc.value.trim(),country:'AU'},eligibilityConfirmed:true,emailConsent:true,alsoJoin:$('#hdAlsoJoin').checked,campaign:AD.qp('campaign'),turnstileToken:token(don)},msg,$('#hdSubmit'));
    });
  }
})();

;/*landlineSwap*/(function(){var sel=document.getElementById('hjLandlineArea');if(!sel)return;function full(){Array.prototype.forEach.call(sel.options,function(o){o.textContent=o.getAttribute('data-full')||o.value;});}function shrt(){var o=sel.options[sel.selectedIndex];if(o)o.textContent=o.value;}sel.addEventListener('focus',full);sel.addEventListener('mousedown',full);sel.addEventListener('blur',shrt);sel.addEventListener('change',shrt);shrt();})();
