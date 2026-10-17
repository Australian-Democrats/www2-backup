(function(){
  var AD={};
  AD.qp=function(n){try{return new URLSearchParams(location.search).get(n)||'';}catch(e){return'';}};
  AD.$=function(s,r){return (r||document).querySelector(s);};
  AD.$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  AD.digits=function(v){return (v||'').replace(/\D+/g,'');};
  AD.setVal=function(el,v){if(el){el.value=(v==null?'':String(v));}};
  AD.emailOk=function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||'');};
  AD.money=function(n){return (Math.round(Number(n)||0)).toLocaleString('en-AU');};
  AD.toast=function(msg,isErr){
    var t=AD.$('#adw-toast');
    if(!t){t=document.createElement('div');t.id='adw-toast';t.className='adw-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t);}
    t.textContent=msg;t.classList.toggle('err',!!isErr);t.classList.add('show');
    clearTimeout(AD._tt);AD._tt=setTimeout(function(){t.classList.remove('show');},4500);
  };
  AD.post=async function(url,data){
    try{
      var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      var j=null;try{j=await r.json();}catch(e){}
      return{ok:r.ok&&(!j||j.ok!==false),status:r.status,data:j};
    }catch(e){return{ok:false,status:0,data:null};}
  };
  window.AD=AD;
})();
document.addEventListener('DOMContentLoaded',function(){var c=document.querySelector('.adw-confetti');if(c&&!c.children.length){for(var i=0;i<12;i++){c.appendChild(document.createElement('span'));}}});
window.AD.showLoader=function(msg,sub){
  var l=document.getElementById('adw-loader');
  if(!l){l=document.createElement('div');l.id='adw-loader';l.className='adw-loader';l.setAttribute('role','status');l.setAttribute('aria-live','polite');
    l.innerHTML='<div class="adw-confetti" aria-hidden="true"></div><div class="box"><div class="stage"><span class="ring"></span><span class="ring r2"></span><img class="mark" src="/assets/brand/logo-icon-colour.png" alt=""></div><div class="msg"></div><div class="sub"></div></div>';
    document.body.appendChild(l);
    var c=l.querySelector('.adw-confetti');if(c){for(var i=0;i<12;i++)c.appendChild(document.createElement('span'));}
  }
  l.querySelector('.msg').textContent=msg||'One moment…';
  l.querySelector('.sub').textContent=sub||'';
  l.classList.add('show');
};
window.AD.hideLoader=function(){var l=document.getElementById('adw-loader');if(l)l.classList.remove('show');};
