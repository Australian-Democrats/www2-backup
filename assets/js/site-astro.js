(function(){
  var tog=document.getElementById('adwToggle'), nav=document.getElementById('adwNav');
  function closeNav(){ if(nav)nav.classList.remove('open'); if(tog)tog.setAttribute('aria-expanded','false'); }
  if(tog)tog.addEventListener('click',function(){var o=nav.classList.toggle('open');tog.setAttribute('aria-expanded',o?'true':'false');});
  function bindNav(){ if(nav)Array.prototype.forEach.call(nav.querySelectorAll('a'),function(a){a.addEventListener('click',closeNav);}); }
  bindNav();
  var fab=document.getElementById('adwSfab');
  if(fab){var fb=fab.querySelector('.adw-sfab-btn');fb.addEventListener('click',function(){var o=fab.classList.toggle('open');fb.setAttribute('aria-expanded',o?'true':'false');});document.addEventListener('click',function(e){if(!fab.contains(e.target))fab.classList.remove('open');});}
  function scan(root){Array.prototype.forEach.call((root||document).querySelectorAll('.adw-imgph[data-img]'),function(el){if(el.dataset.done)return;el.dataset.done='1';var name=el.getAttribute('data-img');var url='/assets/img/'+name;var t=new Image();t.onload=function(){el.style.backgroundImage='url('+url+')';el.classList.add('is-loaded');el.setAttribute('role','img');};t.src=url;});}
  scan(document); window.__adScan=scan;
  // optional site-wide menu override
  fetch('/menu/menu.txt',{cache:'no-store'}).then(function(r){return r.ok?r.text():null;}).then(function(t){
    if(!t||!nav)return;
    var items=t.split(/\r?\n/).filter(function(l){return l.trim()&&!/^\s*#/.test(l);}).map(function(l){return l.split('|').map(function(x){return x.trim();});}).filter(function(p){return p.length>=2&&p[0]&&p[1];});
    if(!items.length)return;
    function href(h){return (/^https?:|^\//).test(h)?h:'/'+h.replace(/\.html$/,'').replace(/^\//,'');}
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
    // mirror Base.astro's structure: plain links centre, ribbon CTAs at the edge
    var plain='',ctasGold='',ctasGreen='';
    items.forEach(function(p){var k=(p[2]||'').toLowerCase(),h=href(p[1]),l=esc(p[0]);
      if(k.indexOf('gold')>=0)ctasGold+='<a class="adw-nav-donate" href="'+h+'"><span>'+l+'</span></a>';
      else if(k.indexOf('button')>=0)ctasGreen+='<a class="adw-nav-join" href="'+h+'"><span>'+l+'</span></a>';
      else plain+='<a href="'+h+'">'+l+'</a>';});
    nav.innerHTML='<span class="adw-nav-plain">'+plain+'</span><span class="adw-nav-ctas">'+ctasGold+ctasGreen+'</span>';
    bindNav();
  }).catch(function(){});
})();

(function(){var g=document.getElementById('adwGfab');if(!g)return;var b=g.querySelector('.adw-gfab-btn');b.addEventListener('click',function(e){e.stopPropagation();var o=g.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');});document.addEventListener('click',function(e){if(!g.contains(e.target))g.classList.remove('open');});})();

/* scroll progress bar — the thin brand strip atop the sticky header fills to
   match how far down the page you are (VIC-site behaviour). Progressive. */
(function(){
  var fill=document.getElementById('adProgressFill'); if(!fill)return;
  var ticking=false;
  function update(){
    var doc=document.documentElement;
    var max=(doc.scrollHeight-window.innerHeight)||1;
    var pct=Math.min(100,Math.max(0,(window.scrollY||0)/max*100));
    fill.style.width=pct+'%';
    ticking=false;
  }
  window.addEventListener('scroll',function(){ if(!ticking){ticking=true;requestAnimationFrame(update);} },{passive:true});
  window.addEventListener('resize',function(){ if(!ticking){ticking=true;requestAnimationFrame(update);} },{passive:true});
  update();
})();

/* scroll-reveal — the site-wide "Apple style" transition system. Elements
   carrying [data-rv] (or matched by the auto-tag list, which covers the raw
   HTML fragments we never edit) ease up/in the first time they enter the
   viewport. Stagger with --rv-d. Progressive: no JS / reduced motion = fully
   visible; a failsafe reveals everything after 4s no matter what. */
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // auto-tag: sections whose markup lives in frozen raw fragments
  var AUTO=['.adw-takeaction .adw-ta-head','.adw-takeaction .adw-qcard','.adw-stats','.adw-recent-h','.adw-recent'];
  AUTO.forEach(function(sel){Array.prototype.forEach.call(document.querySelectorAll(sel),function(el,i){
    if(!el.hasAttribute('data-rv')){el.setAttribute('data-rv','');el.style.setProperty('--rv-d',(i%3)*0.09+'s');}
  });});
  var els=Array.prototype.slice.call(document.querySelectorAll('[data-rv]'));
  if(!els.length)return;
  document.documentElement.classList.add('adw-rv');
  // failsafe queries the DOM fresh, so anything inserted after init (a widget,
  // an accordion) can never be left stranded at opacity 0.
  function showAll(){Array.prototype.forEach.call(document.querySelectorAll('[data-rv]'),function(e){e.classList.add('rv-in');});}
  if(reduce||!('IntersectionObserver' in window)){showAll();return;}
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('rv-in');io.unobserve(en.target);}});
  },{threshold:.12,rootMargin:'0px 0px -7% 0px'});
  els.forEach(function(e){io.observe(e);});
  setTimeout(showAll,4000);
})();

/* count-up numbers — [data-count="15,000"] ticks from 0 when it scrolls into
   view (Interactive Policy Experiences). Keeps separators; reduced-motion or
   no-JS shows the final number (it's the markup's text already). */
(function(){
  var els=Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if(!els.length)return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window))return;
  function animate(el){
    var raw=el.getAttribute('data-count')||'';
    var num=parseFloat(raw.replace(/[^0-9.]/g,''));
    if(!isFinite(num)||num<=0)return;
    var sep=raw.indexOf(',')>=0;
    var t0=null,dur=1400;
    function fmt(n){n=Math.round(n);return sep?n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','):String(n);}
    function tick(t){
      if(!t0)t0=t;
      var p=Math.min(1,(t-t0)/dur);p=1-Math.pow(1-p,3);
      el.textContent=fmt(num*p);
      if(p<1)requestAnimationFrame(tick);else el.textContent=raw;
    }
    requestAnimationFrame(tick);
  }
  var io=new IntersectionObserver(function(es){es.forEach(function(en){
    if(en.isIntersecting){io.unobserve(en.target);animate(en.target);}
  });},{threshold:.5});
  els.forEach(function(e){io.observe(e);});
})();
