(function(){
  var $=AD.$;
  var type=AD.qp('type'),tier=AD.qp('tier'),join=AD.qp('join')==='1';

  var DATA={
    join:{
      eyebrow:tier==='supporter'?"Welcome aboard":"Application received",
      title:tier==='supporter'?"Welcome to the Australian Democrats!":"Thanks for joining the Australian Democrats!",
      body:"Thank you for joining the Australian Democrats. We’re thrilled to have you on the team — we’ve got your details and we’ll be in touch shortly. It’s the support of members like you that helps us bring accountability, integrity and trust back to Australian politics.",
      infoTitle:"A note about your membership",
      info:[
        {ic:"🏛️",h:"Your membership application",p:"Your application will be formally considered by the National Executive. In the meantime you’ll receive party communications and member material as though you’re a member. If unsuccessful, you’ll be informed in writing and refunded the fee paid with your application."},
        {ic:"✨",h:"Free Supporter member",p:"As a free Supporter you never need to renew — you’re part of the team until you tell us otherwise."},
        {ic:"💚",h:"Paid member",p:"Your membership renews automatically each year if you chose that option; otherwise we’ll email renewal instructions near your anniversary. If you don’t renew, you’ll roll over to a free Supporter membership."}
      ],
      nextTitle:"We need your help",
      actions:[
        {ic:"👥",h:"Sign up a friend or family member",p:"Members are core to everything we do — every person you bring helps us reach state registration goals.",label:"Sign up",href:"/join",cls:"adw-form-btn-green"},
        {ic:"💛",h:"Donate",p:"We’re backed by people like you, not corporate donors. Every dollar fuels our campaigns.",label:"Donate",href:"/donate",cls:"adw-form-btn-gold"}
      ],
      contact:"Keep an eye on your inbox for a welcome email. Need help or eager to get involved? Email "
    },
    donate:{
      eyebrow:"Donation received",
      title:"Thank you for your donation!",
      body:"Thank you for donating to the Australian Democrats — we’ve received your details and a receipt is on its way. Contributions from people like you really help us restore integrity, accountability and trust to government.",
      infoTitle:"Important information",
      info:[
        {ic:"🧾",h:"Tax deductible",p:"Donations up to $1,500 (cumulative) are tax deductible. A receipt has been issued to the email you provided — please check spam or junk if you can’t see it."},
        {ic:"📬",h:"Your receipt",p:"Your tax receipt is on its way to your inbox. If it doesn’t arrive, contact us and we’ll sort it out."},
        {ic:"📖",h:"How we use it",p:"Your contribution helps fund campaigns, candidates and the common-sense voice Australia needs."}
      ],
      nextTitle:"Next steps",
      actions:[
        {ic:"🤝",h:"Become a member",p:"If you haven’t joined as a member yet, come on board and make it official.",label:"Join the party",href:"/join",cls:"adw-form-btn-green"},
        {ic:"💛",h:"Spread the word",p:"Tell a mate — a personal nudge from you is worth more than any ad we could buy.",label:"Share",href:"#",cls:"adw-form-btn-gold",share:true}
      ],
      contact:"Need help with your receipt or donation? Email "
    }
  };

  DATA.contact={eyebrow:'Message received',title:'Thanks — we’ll be in touch',body:'Thanks for reaching out to the Australian Democrats. We’ve got your message and someone will get back to you soon.',infoTitle:'What happens next',info:[{ic:'📨',h:'We’ve got it',p:'Your message and details are with our team.'},{ic:'⏱️',h:'We’ll reply',p:'We aim to respond within a few business days.'},{ic:'💛',h:'Get involved',p:'In the meantime, you’re always welcome to join or volunteer.'}],nextTitle:'While you’re here',actions:[{ic:'🤝',h:'Join the party',p:'Add your voice — membership starts from free.',label:'Join',href:'/join',cls:'adw-form-btn-green'},{ic:'💛',h:'Chip in',p:'We’re member-funded, not donor-driven.',label:'Donate',href:'/donate',cls:'adw-form-btn-gold'}],contact:'Prefer email? Reach us any time at '};
  var d=DATA[type];
  if(!d){ $('#tyTitle').textContent="Thank you"; $('#tyBody').textContent="Your submission has been received."; return; }

  $('#tyEyebrow').textContent=d.eyebrow;
  $('#tyTitle').textContent=d.title;
  $('#tyBody').textContent=d.body;

  if(type==='donate'&&join){
    d.actions.unshift({ic:"📝",h:"Finish joining",p:"We’ve opened the membership form in a new tab with your details pre-filled — just a few clicks to finish.",label:"Open join form",href:"/join?prefill=1",cls:"adw-form-btn-green"});
  }

  var infoWrap=$('#tyInfo');
  d.info.forEach(function(o){
    var c=document.createElement('div');c.className='adw-infocard';
    var ic=document.createElement('div');ic.className='ic';ic.textContent=o.ic;
    var box=document.createElement('div');
    var h=document.createElement('h4');h.textContent=o.h;
    var p=document.createElement('p');p.textContent=o.p;
    box.appendChild(h);box.appendChild(p);c.appendChild(ic);c.appendChild(box);infoWrap.appendChild(c);
  });
  $('#tyInfoTitle').textContent=d.infoTitle;$('#tyInfoSection').hidden=false;

  var actWrap=$('#tyActions');
  d.actions.forEach(function(o){
    var c=document.createElement('div');c.className='adw-actcard';
    var ic=document.createElement('div');ic.className='ic';ic.textContent=o.ic;
    var h=document.createElement('h4');h.textContent=o.h;
    var p=document.createElement('p');p.textContent=o.p;
    var a=document.createElement('a');a.className='adw-form-btn '+(o.cls||'adw-form-btn-green');a.textContent=o.label;a.href=o.href;
    if(o.share){a.addEventListener('click',function(e){e.preventDefault();var u=location.origin+'/donate';if(navigator.share){navigator.share({title:'Australian Democrats',url:u}).catch(function(){});}else{AD.toast('Link copied: '+u);}});}
    c.appendChild(ic);c.appendChild(h);c.appendChild(p);c.appendChild(a);actWrap.appendChild(c);
  });
  $('#tyNextTitle').textContent=d.nextTitle;$('#tyNextSection').hidden=false;

  var contact=$('#tyContact');contact.textContent=d.contact;
  var mail=document.createElement('a');mail.href='mailto:membership@democrats.org.au';mail.textContent='membership@democrats.org.au';
  contact.appendChild(mail);contact.appendChild(document.createTextNode('.'));
})();
