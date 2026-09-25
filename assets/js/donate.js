(function(){
  var $=AD.$,$$=AD.$$;
  var state={amount:0,frequency:'once',elig:false};

  window.adTurnstileOk=function(t){window.__turnstileToken=t;updateProgress();};
  window.adTurnstileReset=function(){window.__turnstileToken='';updateProgress();};
  function turnstileConfigured(){var w=document.querySelector('.cf-turnstile');return !!(w&&w.getAttribute('data-sitekey'));}
  function verifyDone(){return turnstileConfigured()?!!window.__turnstileToken:true;}

  function lineFor(a){
    if(a>=10000)return 'Anchors a state-level campaign effort.';
    if(a>=5000)return 'Underwrites a major campaign asset.';
    if(a>=1500)return 'Helps power a regional campaign push.';
    if(a>=500)return 'Backs a candidate’s local campaign day.';
    if(a>=250)return 'Funds signage for a pre-poll site.';
    if(a>=100)return 'Prints 400 how-to-vote cards for a booth.';
    if(a>=50)return 'Stocks a community stall for a weekend.';
    if(a>=25)return 'Boosts a local digital ad to thousands of voters.';
    if(a>=10)return 'Helps print how-to-vote cards for a polling booth.';
    if(a>0)return 'Every dollar helps keep the bastards honest.';
    return 'Pick an amount below to see what it could do.';
  }
  function impact(){$('#impAmt').textContent=state.amount>0?('$'+AD.money(state.amount)):'$—';$('#impLine').textContent=lineFor(state.amount);}
  function dpostcode(){return $$('.dpc').map(function(i){return i.value;}).join('');}

  var REQF=[
    {f:'#dFirst'},{f:'#dLast'},
    {f:'#dEmail',ok:function(){return AD.emailOk($('#dEmail').value.trim());},msg:'Please enter a valid email address.'},
    {f:'#dAddr1'},{f:'#dCity'},
    {f:'#dState',ok:function(){return !!$('#dState').value;},msg:'Please select your state.'},
    {f:'#dpc0',ok:function(){return dpostcode().length===4;},msg:'Please enter your 4-digit postcode.'}
  ];
  REQF.forEach(function(c){if(!c.ok)c.ok=(function(sel){return function(){return $(sel).value.trim().length>0;};})(c.f);});
  function fieldEl(sel){var e=$(sel);return e?e.closest('.adw-field'):null;}
  function refreshStates(){REQF.forEach(function(c){var f=fieldEl(c.f);if(!f)return;if(c.ok()){f.classList.add('ok');f.classList.remove('err');}});}
  function hasVal(c){if(c.f==='#dpc0')return dpostcode().length>0;var el=$(c.f);return!!(el.value&&el.value.trim());}
  function blurCheck(c){var f=fieldEl(c.f);if(!f)return;if(c.ok()){f.classList.add('ok');f.classList.remove('err');}else if(hasVal(c)){f.classList.add('err');f.classList.remove('ok');}else{f.classList.remove('ok','err');}}
  function setBubble(host,msg,bad){if(!host)return bad;var b=host.nextElementSibling;if(!(b&&b.classList&&b.classList.contains('adw-jsbubble'))){b=document.createElement('p');b.className='adw-errmsg adw-jsbubble';host.parentNode.insertBefore(b,host.nextSibling);}b.textContent=msg;b.style.display=bad?'block':'none';b.classList.toggle('show',bad);return bad;}

  var TOT={amount:1,details:7,declaration:1,verify:1};
  function counts(){
    var d=0;
    if($('#dFirst').value.trim())d++;
    if($('#dLast').value.trim())d++;
    if(AD.emailOk($('#dEmail').value.trim()))d++;
    if($('#dAddr1').value.trim())d++;
    if($('#dCity').value.trim())d++;
    if($('#dState').value)d++;
    if(dpostcode().length===4)d++;
    return{amount:state.amount>=1?1:0,details:d,declaration:state.elig?1:0,verify:verifyDone()?1:0};
  }
  function allValid(){return!!(state.amount>=1&&state.elig&&verifyDone()&&REQF.every(function(c){return c.ok();}));}
  function updateProgress(){
    var c=counts(),done=0,total=0;
    $$('.adw-form-progress .ln').forEach(function(ln){var g=ln.getAttribute('data-grp');if(!(g in TOT))return;var ok=c[g]>=TOT[g];ln.classList.toggle('done',ok);ln.querySelector('b').textContent=ok?'✓':(c[g]+'/'+TOT[g]);});
    Object.keys(TOT).forEach(function(g){done+=c[g];total+=TOT[g];});
    var pct=Math.round(done/total*100);
    if($('#pbar'))$('#pbar').style.width=pct+'%';if($('#ptrack'))$('#ptrack').style.width=pct+'%';
    if($('#pnum'))$('#pnum').textContent=pct+'%';if($('#pchip'))$('#pchip').textContent=pct+'% complete';
    $('#submitBtn').classList.toggle('ready',allValid());
  }
  function refresh(){impact();refreshStates();updateProgress();}

  $$('.adw-amt').forEach(function(b){b.addEventListener('click',function(){
    $$('.adw-amt').forEach(function(x){x.setAttribute('aria-pressed','false');});
    b.setAttribute('aria-pressed','true');$('#customAmt').value='';
    state.amount=+b.getAttribute('data-amt');
    $('.adw-amounts').classList.remove('adw-outerr');setBubble($('.adw-amounts'),'',false);refresh();
  });});
  $('#customAmt').addEventListener('input',function(){
    this.value=AD.digits(this.value);
    if(this.value){$$('.adw-amt').forEach(function(x){x.setAttribute('aria-pressed','false');});}
    state.amount=+this.value||0;
    if(state.amount>0){$('.adw-amounts').classList.remove('adw-outerr');setBubble($('.adw-amounts'),'',false);}
    refresh();
  });

  $$('.adw-segctl [data-freq]').forEach(function(b){b.addEventListener('click',function(){state.frequency=b.getAttribute('data-freq');$$('.adw-segctl [data-freq]').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});});});

  $('#dCountryChange').addEventListener('click',function(){var c=$('#dCountry');c.removeAttribute('readonly');if(c.value.indexOf('Australia')>=0)c.value='';c.focus();});

  var dpcs=$$('.dpc');
  dpcs.forEach(function(i,idx){
    i.addEventListener('input',function(){i.value=AD.digits(i.value).slice(0,1);if(i.value&&dpcs[idx+1])dpcs[idx+1].focus();refresh();});
    i.addEventListener('keydown',function(e){if(e.key==='Backspace'&&!i.value&&dpcs[idx-1])dpcs[idx-1].focus();});
  });
  var dpcGroup=document.querySelector('.adw-seg.pcode');
  document.addEventListener('focusin',function(e){if(dpcGroup&&!dpcGroup.contains(e.target)){var v=dpostcode();if(v.length>0&&v.length<4){var f=fieldEl('#dpc0');f.classList.add('err');f.classList.remove('ok');}}});

  (function(){var el=$('#elig');function set(){state.elig=!state.elig;el.setAttribute('aria-checked',state.elig?'true':'false');if(state.elig){el.classList.remove('con-err');setBubble(el,'',false);}updateProgress();}el.addEventListener('click',function(e){if(e.target.tagName==='INPUT')return;set();});el.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();set();}});})();

  REQF.forEach(function(c){if(c.f==='#dpc0')return;var el=$(c.f);if(el){el.addEventListener('blur',function(){blurCheck(c);});el.addEventListener('input',refresh);el.addEventListener('change',refresh);}});

  function validateAll(){
    var first=null;function bad(el){if(!first)first=el;}
    if(state.amount<1){var a=$('.adw-amounts');a.classList.add('adw-outerr');setBubble(a,'Please choose or enter a donation amount.',true);bad(a);}
    REQF.forEach(function(c){var f=fieldEl(c.f),g=c.ok();f.classList.toggle('err',!g);f.classList.toggle('ok',g);if(!g){bad(f);if(c.msg){var bub=f.querySelector('.adw-errmsg');if(bub)bub.textContent=c.msg;}}});
    var el=$('#elig');el.classList.toggle('con-err',!state.elig);setBubble(el,'Please confirm your eligibility to donate.',!state.elig);if(!state.elig)bad(el);
    return first;
  }

  function payload(){
    return{
      formType:'donate',amount:state.amount,frequency:state.frequency,
      firstName:$('#dFirst').value.trim(),lastName:$('#dLast').value.trim(),email:$('#dEmail').value.trim(),
      address:{line1:$('#dAddr1').value.trim(),line2:$('#dAddr2').value.trim(),city:$('#dCity').value.trim(),state:$('#dState').value,postcode:dpostcode(),country:'AU'},
      eligibilityConfirmed:state.elig,emailConsent:true,alsoJoin:$('#alsoJoin').checked,
      campaign:AD.qp('campaign'),
      turnstileToken:(window.__turnstileToken||'')
    };
  }

  // Prefer the `checkout` Astro Action (window.adCheckout, wired in donate.astro);
  // fall back to the legacy /register endpoint if the bridge has not loaded.
  async function submitCheckout(p){
    if(window.adCheckout){try{return await window.adCheckout(p);}catch(e){return{ok:false,error:'Something went wrong starting your donation — please try again.'};}}
    var r=await AD.post('/register',p);
    return{ok:!!(r.ok&&r.data&&r.data.redirect),redirect:r.data&&r.data.redirect,error:r.data&&r.data.error};
  }

  $('#donateForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var first=validateAll();
    if(first){AD.toast('Please fix the highlighted fields — we’ve jumped you to the first one.',true);first.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if($('#alsoJoin').checked){
      var q='/join?prefill=1&first='+encodeURIComponent($('#dFirst').value.trim())+'&last='+encodeURIComponent($('#dLast').value.trim())+'&email='+encodeURIComponent($('#dEmail').value.trim());
      if(AD.qp('campaign'))q+='&campaign='+encodeURIComponent(AD.qp('campaign'));
      window.open(q,'_blank','noopener');
    }
    var btn=$('#submitBtn');btn.disabled=true;btn.innerHTML='Redirecting…';AD.showLoader('Taking you to secure checkout…','Your donation is processed securely by Stripe');
    var res=await submitCheckout(payload());
    if(res.ok&&res.redirect){window.location.href=res.redirect;return;}
    AD.hideLoader();btn.disabled=false;btn.innerHTML='SUBMIT <span class="arw">→</span>';
    AD.toast(res.error||'Something went wrong starting your donation — please try again.',true);
  });

  (function(){var a=parseInt(AD.qp('amount'),10)||0;var fq=AD.qp('freq');if(fq==='monthly'){var mb=document.querySelector('.adw-segctl [data-freq="monthly"]');if(mb)mb.click();}if(a>0){var pre=document.querySelector('.adw-amt[data-amt="'+a+'"]');if(pre){pre.click();}else{$('#customAmt').value=a;state.amount=a;}}})();
  refresh();
})();
