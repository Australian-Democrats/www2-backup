(function(){
  var $=AD.$,$$=AD.$$;
  var state={tier:'',autoRenew:true,onRoll:'',silent:'no_unsure',otherParty:'',sources:[],consent:false,noEmail:false};

  window.adTurnstileOk=function(t){window.__turnstileToken=t;updateProgress();};
  window.adTurnstileReset=function(){window.__turnstileToken='';updateProgress();};
  function turnstileConfigured(){var w=document.querySelector('.cf-turnstile');return !!(w&&w.getAttribute('data-sitekey'));}
  function verifyDone(){return turnstileConfigured()?!!window.__turnstileToken:true;}

  var POP={
    popSupporter:['Supporter Member — Free','Supporter membership is free. It helps us meet AEC registration requirements, and you can still volunteer with us and receive party updates — though you cannot vote in internal party ballots. You can upgrade to a paid membership at any time.'],
    popOrdinary:['Ordinary — $60 / year','Full membership: vote in all internal party ballots, nominate for internal positions, and apply for preselection as a candidate for public office.'],
    popConcession:['Concession — $25 / year','For Concession holders, pensioners, low-income earners and students. Full voting rights are included.']
  };

  function digitsOnly(el,max){el.value=AD.digits(el.value).slice(0,max||64);}
  function dobValid(){
    var d=+$('#dobD').value,m=+$('#dobM').value,y=+$('#dobY').value,yr=(new Date()).getFullYear();
    if(!d||!m||!y)return false;
    if(m<1||m>12||d<1||d>31)return false;
    if(($('#dobY').value+'').length!==4||y<1900||y>yr)return false;
    return true;
  }
  function mobileNat(){return ($('#mobile').value||'').replace(/\s+/g,'').replace(/^\+?61/,'').replace(/\D/g,'').slice(0,10);}
  function mobileValid(){var d=mobileNat();return (d.length===9&&d.charAt(0)==='4')||(d.length===10&&d.slice(0,2)==='04');}
  function groupNat(d){if(d.charAt(0)==='0'){return [d.slice(0,4),d.slice(4,7),d.slice(7,10)].filter(Boolean).join(' ');}return [d.slice(0,3),d.slice(3,6),d.slice(6,9)].filter(Boolean).join(' ');}
  function postcode(){return $$('.pc').map(function(i){return i.value;}).join('');}

  var REQF=[
    {f:'#firstName',ok:function(){return $('#firstName').value.trim().length>0;}},
    {f:'#lastName',ok:function(){return $('#lastName').value.trim().length>0;}},
    {f:'#email',ok:function(){return state.noEmail||AD.emailOk($('#email').value.trim());}},
    {f:'#dobD',ok:dobValid},
    {f:'#mobile',ok:mobileValid},
    {f:'#street',ok:function(){return $('#street').value.trim().length>0;}},
    {f:'#city',ok:function(){return $('#city').value.trim().length>0;}},
    {f:'#pc0',ok:function(){return postcode().length===4;}},
    {f:'#state',ok:function(){return !!$('#state').value;}}
  ];
  function fieldEl(sel){var e=$(sel);return e?e.closest('.adw-field'):null;}
  function refreshStates(){REQF.forEach(function(c){var f=fieldEl(c.f);if(!f)return;if(c.ok()){f.classList.add('ok');f.classList.remove('err');}});}
  function hasVal(c){var el=$(c.f);if(c.f==='#dobD')return!!(el.value||$('#dobM').value||$('#dobY').value);if(c.f==='#pc0')return postcode().length>0;return!!(el.value&&el.value.trim());}
  function blurCheck(c){var f=fieldEl(c.f);if(!f)return;if(c.ok()){f.classList.add('ok');f.classList.remove('err');}else if(hasVal(c)){f.classList.add('err');f.classList.remove('ok');}else{f.classList.remove('ok','err');}}

  var TOT={tier:1,details:5,address:4,electoral:3,declaration:1,verify:1};
  function counts(){
    var details=0;
    if($('#firstName').value.trim())details++;
    if($('#lastName').value.trim())details++;
    if(state.noEmail||AD.emailOk($('#email').value.trim()))details++;
    if(dobValid())details++;
    if(mobileValid())details++;
    var addr=0;
    if($('#street').value.trim())addr++;
    if($('#city').value.trim())addr++;
    if(postcode().length===4)addr++;
    if($('#state').value)addr++;
    var el=0; if(state.onRoll)el++; if(state.silent)el++; if(state.otherParty)el++;
    return{tier:state.tier?1:0,details:details,address:addr,electoral:el,declaration:state.consent?1:0,verify:verifyDone()?1:0};
  }
  function allValid(){return!!(state.tier&&state.consent&&state.onRoll&&state.silent&&state.otherParty&&(state.otherParty!=='yes'||$('#otherPartyName').value.trim())&&verifyDone()&&REQF.every(function(c){return c.ok();}));}
  function updateProgress(){
    var c=counts(),done=0,total=0;
    $$('.adw-form-progress .ln').forEach(function(ln){var g=ln.getAttribute('data-grp');if(!(g in TOT))return;var ok=c[g]>=TOT[g];ln.classList.toggle('done',ok);ln.querySelector('b').textContent=ok?'✓':(c[g]+'/'+TOT[g]);});
    Object.keys(TOT).forEach(function(g){done+=c[g];total+=TOT[g];});
    var pct=Math.round(done/total*100);
    $('#pbar').style.width=pct+'%';$('#ptrack').style.width=pct+'%';$('#pnum').textContent=pct+'%';$('#pchip').textContent=pct+'% complete';
    $('#submitBtn').classList.toggle('ready',allValid());
  }

  function setBubble(host,msg,bad){
    if(!host)return bad;
    var b=host.nextElementSibling;
    if(!(b&&b.classList&&b.classList.contains('adw-jsbubble'))){b=document.createElement('p');b.className='adw-errmsg adw-jsbubble';host.parentNode.insertBefore(b,host.nextSibling);}
    b.textContent=msg;b.style.display=bad?'block':'none';b.classList.toggle('show',bad);
    return bad;
  }

  function selectTier(v){
    state.tier=v;
    $$('.adw-tier').forEach(function(t){var on=t.getAttribute('data-tier')===v;t.classList.toggle('sel',on);t.querySelector('.selbar').textContent=on?'Selected ✓':'Select →';});
    var sup=(v==='supporter');
    $$('#renewBlock [data-renew]').forEach(function(b){b.disabled=sup;});
    $('#renewBlock').classList.toggle('adw-noemail-on',sup);
    if(sup)state.autoRenew=false;
    $('.adw-tiers').classList.remove('tier-err');setBubble($('.adw-tiers'),'',false);var sb=document.getElementById('submitBtn');if(sb&&sb.firstChild)sb.firstChild.nodeValue=(v==='supporter')?'Continue to confirmation ':'Continue to payment ';
    updateProgress();
  }

  $$('input[name=tier]').forEach(function(r){r.addEventListener('change',function(){selectTier(r.value);});});
  $$('.adw-qmark').forEach(function(q){q.addEventListener('click',function(){var p=POP[q.getAttribute('data-pop')];if(!p)return;$('#popTitle').textContent=p[0];$('#popBody').textContent=p[1];var m=$('#popModal');if(m.showModal)m.showModal();});});
  $$('#popModal [data-close]').forEach(function(b){b.addEventListener('click',function(){$('#popModal').close();});});

  $$('#renewBlock [data-renew]').forEach(function(b){b.addEventListener('click',function(){if(b.disabled)return;state.autoRenew=(b.getAttribute('data-renew')==='true');$$('#renewBlock [data-renew]').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});});});

  $('#noEmail').addEventListener('click',function(){
    state.noEmail=!state.noEmail;this.setAttribute('aria-pressed',state.noEmail?'true':'false');
    var e=$('#email');e.disabled=state.noEmail;if(state.noEmail)e.value='';
    e.closest('.adw-field').classList.toggle('adw-noemail-on',state.noEmail);
    e.closest('.adw-field').classList.remove('err');refreshStates();updateProgress();
  });

  var dD=$('#dobD'),dM=$('#dobM'),dY=$('#dobY');
  [dD,dM,dY].forEach(function(i){i.addEventListener('input',function(){digitsOnly(i,i===dY?4:2);if(i===dD&&i.value.length>=2)dM.focus();if(i===dM&&i.value.length>=2)dY.focus();refreshStates();updateProgress();});});
  var dobGroup=document.querySelector('.adw-seg.dob');

  (function(){
    var btn=$('#dobCal'),pop=$('#dobPop');if(!btn||!pop)return;
    var today=new Date(),view=new Date(1995,0,1);
    var MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
    function pad(n){return (n<10?'0':'')+n;}
    function close(){pop.hidden=true;btn.setAttribute('aria-expanded','false');}
    function render(){
      var y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
      var s='<div class="adw-calhd"><button type="button" data-nav="-12" aria-label="Previous year">«</button><button type="button" data-nav="-1" aria-label="Previous month">‹</button><span>'+MON[m]+' '+y+'</span><button type="button" data-nav="1" aria-label="Next month">›</button><button type="button" data-nav="12" aria-label="Next year">»</button></div><div class="adw-calgrid">';
      ['S','M','T','W','T','F','S'].forEach(function(d){s+='<span class="adw-caldow">'+d+'</span>';});
      for(var i=0;i<first;i++)s+='<span></span>';
      for(var d=1;d<=days;d++){var dis=(new Date(y,m,d)>today)?' disabled':'';s+='<button type="button" class="adw-calday" data-d="'+d+'"'+dis+'>'+d+'</button>';}
      pop.innerHTML=s+'</div>';
    }
    function open(){var y=+$('#dobY').value,m=+$('#dobM').value;if(y>=1900&&y<=today.getFullYear())view=new Date(y,(m>=1&&m<=12?m-1:0),1);render();pop.hidden=false;btn.setAttribute('aria-expanded','true');}
    btn.addEventListener('click',function(e){e.stopPropagation();if(pop.hidden)open();else close();});
    pop.addEventListener('click',function(e){var t=e.target;if(!t||!t.getAttribute)return;var nav=t.getAttribute('data-nav');if(nav){view=new Date(view.getFullYear(),view.getMonth()+parseInt(nav,10),1);render();return;}var d=t.getAttribute('data-d');if(d){$('#dobD').value=pad(+d);$('#dobM').value=pad(view.getMonth()+1);$('#dobY').value=String(view.getFullYear());refreshStates();updateProgress();var f=fieldEl('#dobD');if(f){f.classList.add('ok');f.classList.remove('err');}close();}});
    document.addEventListener('click',function(e){if(!pop.hidden&&!pop.contains(e.target)&&e.target!==btn)close();});
    document.addEventListener('focusin',function(e){if(!pop.hidden&&!pop.contains(e.target)&&e.target!==btn)close();});
  })();

  $('#mobile').addEventListener('input',function(){
    var compact=$('#mobile').value.replace(/\s+/g,'');
    var intl=/^\+?61/.test(compact);
    var nat=compact.replace(/^\+?61/,'').replace(/\D/g,'').slice(0,10);
    $('#mobile').value=(intl?'+61 ':'')+groupNat(nat);
    refreshStates();updateProgress();
  });
  $('#mobile').addEventListener('blur',function(){$('#mobile').value=groupNat(mobileNat());blurCheck({f:'#mobile',ok:mobileValid});});
  $('#landline').addEventListener('input',function(){digitsOnly($('#landline'),9);});

  var pcs=$$('.pc');
  pcs.forEach(function(i,idx){
    i.addEventListener('input',function(){digitsOnly(i,1);if(i.value&&pcs[idx+1])pcs[idx+1].focus();refreshStates();updateProgress();});
    i.addEventListener('keydown',function(e){if(e.key==='Backspace'&&!i.value&&pcs[idx-1])pcs[idx-1].focus();});
  });
  var pcGroup=document.querySelector('.adw-seg.pcode');
  document.addEventListener('focusin',function(e){
    if(pcGroup&&!pcGroup.contains(e.target)){var pv=postcode();if(pv.length>0&&pv.length<4){var pf=fieldEl('#pc0');pf.classList.add('err');pf.classList.remove('ok');}}
    if(dobGroup&&!dobGroup.contains(e.target)){if((dD.value||dM.value||dY.value)&&!dobValid()){var df2=fieldEl('#dobD');df2.classList.add('err');df2.classList.remove('ok');}}
  });

  $('#countryChange').addEventListener('click',function(){var c=$('#country');c.removeAttribute('readonly');if(c.value.indexOf('Australia')>=0)c.value='';c.focus();});

  $$('.adw-yn').forEach(function(grp){
    var q=grp.getAttribute('data-q');
    grp.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
      grp.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
      state[q]=b.getAttribute('data-val');grp.classList.remove('yn-err');setBubble(grp,'',false);
      if(q==='silent')$('#postalWrap').classList.toggle('show',state.silent==='yes');
      if(q==='otherParty')$('#otherPartyWrap').classList.toggle('show',state.otherParty==='yes');
      updateProgress();
    });});
  });

  $$('.adw-srcchip').forEach(function(c){c.addEventListener('click',function(){
    var k=c.getAttribute('data-src'),on=c.getAttribute('aria-pressed')==='true';
    c.setAttribute('aria-pressed',on?'false':'true');c.querySelector('.pm').textContent=on?'+':'✓';
    if(on){state.sources=state.sources.filter(function(s){return s!==k;});}else{state.sources.push(k);}
    if(k==='referred')$('#referWrap').classList.toggle('show',!on);
    if(k==='other')$('#otherSrcWrap').classList.toggle('show',!on);
  });});

  (function(){var el=$('#consent');function set(){state.consent=!state.consent;el.setAttribute('aria-checked',state.consent?'true':'false');if(state.consent){el.classList.remove('con-err');setBubble(el,'',false);}updateProgress();}el.addEventListener('click',set);el.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();set();}});})();

  $('#constitutionLink').addEventListener('click',function(){$('#popTitle').textContent='Our constitution';$('#popBody').textContent='The Australian Democrats constitution opens in a new tab as a PDF.';var m=$('#popModal');if(m.showModal)m.showModal();});

  REQF.forEach(function(c){if(c.f==='#dobD'||c.f==='#pc0')return;var el=$(c.f);if(el)el.addEventListener('blur',function(){blurCheck(c);});});

  function validateAll(){
    var first=null;function bad(el){if(!first)first=el;}
    var tiers=$('.adw-tiers');
    if(!state.tier){tiers.classList.add('tier-err');setBubble(tiers,'Please choose a membership tier.',true);bad(tiers);}
    var MSGS={'#email':'Please enter a valid email, or choose “No Email”.','#dobD':'Please enter a valid date of birth.','#mobile':'Enter a valid Australian mobile, e.g. 412 345 678 or 0412 345 678.','#pc0':'Please enter your 4-digit postcode.','#state':'Please select your state.'};
    REQF.forEach(function(c){var f=fieldEl(c.f),g=c.ok();f.classList.toggle('err',!g);f.classList.toggle('ok',g);if(!g){bad(f);if(MSGS[c.f]){var bub=f.querySelector('.adw-errmsg');if(bub)bub.textContent=MSGS[c.f];}}});
    [['onRoll','Please tell us if you’re on the electoral roll.'],['silent','Please answer the silent elector question.'],['otherParty','Please tell us if you’re a member of another party.']].forEach(function(q){
      var grp=$('.adw-yn[data-q="'+q[0]+'"]'),good=!!state[q[0]];grp.classList.toggle('yn-err',!good);setBubble(grp,q[1],!good);if(!good)bad(grp);
    });
    if(state.otherParty==='yes'){var pn=$('#otherPartyName'),pnf=pn.closest('.adw-field');var png=pn.value.trim().length>0;pnf.classList.toggle('err',!png);if(!png)bad(pnf);}
    var con=$('#consent');con.classList.toggle('con-err',!state.consent);setBubble(con,'Please consent to the membership declaration.',!state.consent);if(!state.consent)bad(con);
    return first;
  }

  function payload(){
    var ld=AD.digits($('#landline').value);
    return{
      formType:'join',tier:state.tier,autoRenew:state.tier==='supporter'?false:state.autoRenew,
      firstName:$('#firstName').value.trim(),middleName:$('#middleName').value.trim(),lastName:$('#lastName').value.trim(),preferredName:$('#preferredName').value.trim(),
      email:state.noEmail?'':$('#email').value.trim(),noEmail:!!state.noEmail,
      dob:[$('#dobD').value,$('#dobM').value,$('#dobY').value].join('/'),
      mobile:mobileNat().replace(/^0/,''),landline:ld?($('#landlineArea').value+ld):'',
      residential:{line1:$('#street').value.trim(),line2:$('#street2').value.trim(),city:$('#city').value.trim(),postcode:postcode(),state:$('#state').value,country:'AU'},
      postal:state.silent==='yes'?{line1:$('#postStreet').value.trim(),line2:$('#postStreet2').value.trim(),city:$('#postCity').value.trim(),postcode:AD.digits($('#postPc').value),state:$('#postState').value,country:'AU'}:null,
      onElectoralRoll:state.onRoll,silentElector:state.silent,
      otherParty:{member:state.otherParty==='yes',name:$('#otherPartyName').value.trim()},
      consent:state.consent,referralSources:state.sources,referredByMember:$('#referName').value.trim(),sourceOther:$('#otherSrc').value.trim(),
      campaign:AD.qp('campaign'),
      turnstileToken:(window.__turnstileToken||'')
    };
  }

  // Prefer the `checkout` Astro Action (window.adCheckout, wired in join.astro);
  // fall back to the legacy /register endpoint if the bridge has not loaded.
  async function submitCheckout(p){
    if(window.adCheckout){try{return await window.adCheckout(p);}catch(e){return{ok:false,error:'Something went wrong submitting your application — please try again.'};}}
    var r=await AD.post('/register',p);
    return{ok:!!(r.ok&&r.data&&r.data.redirect),redirect:r.data&&r.data.redirect,error:r.data&&r.data.error};
  }

  $('#joinForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var first=validateAll();
    if(first){AD.toast('Please fix the highlighted fields — we’ve jumped you to the first one.',true);first.scrollIntoView({behavior:'smooth',block:'center'});return;}
    var isSupporter=(state.tier==='supporter');
    var btn=$('#submitBtn');btn.disabled=true;btn.innerHTML='Submitting…';AD.showLoader('Just a moment…','Setting things up');
    // Supporter is free: the server registers it locally (Stripe customer + $0
    // subscription, no card) and returns a local /thank-you URL. Paid tiers get a
    // Stripe Checkout URL. Both come back as {ok, redirect}; only the messaging
    // differs — never promise "secure checkout" to a Supporter who won't see one.
    var res=await submitCheckout(payload());
    if(res.ok&&res.redirect){
      if(isSupporter)AD.showLoader('Almost there…','Completing your free Supporter registration');
      else AD.showLoader('Almost there…','You’re being taken to secure checkout');
      window.location.href=res.redirect;return;
    }
    AD.hideLoader();btn.disabled=false;btn.innerHTML='SUBMIT <span class="arw">→</span>';
    AD.toast(res.error||'Something went wrong submitting your application — please try again.',true);
  });

  (function prefill(){
    var f=AD.qp('first'),l=AD.qp('last'),em=AD.qp('email');
    if(f)AD.setVal($('#firstName'),f);if(l)AD.setVal($('#lastName'),l);if(em)AD.setVal($('#email'),em);
    var t=AD.qp('tier');if(t&&$$('input[name=tier]').some(function(r){return r.value===t;})){var r=$('input[name=tier][value="'+t+'"]');r.checked=true;selectTier(t);}
  })();

  $$('#joinForm input, #joinForm select').forEach(function(el){el.addEventListener('input',function(){refreshStates();updateProgress();});el.addEventListener('change',function(){refreshStates();updateProgress();});});
  refreshStates();updateProgress();
})();
