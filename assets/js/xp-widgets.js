/* Interactive Policy Experience widgets — one purpose-built interactive per
   policy, keyed by [data-widget]. All figures come from the policy's own text
   (or are labelled illustrative). Vanilla JS, no dependencies; a page without
   a matching container does nothing. */
(function () {
  'use strict';
  var money = function (n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

  var W = {};

  /* ---- financing: the disclosure dial ---------------------------------- */
  W.financing = function (root) {
    root.innerHTML =
      '<div class="xpw-dial">' +
      '<label class="xpw-sliderlab">Drag the donation<b id="xpwAmt">$5,000</b></label>' +
      '<input type="range" min="100" max="50000" step="100" value="5000" id="xpwRange" aria-label="Donation amount">' +
      '<div class="xpw-duo">' +
      '<div class="xpw-panel bad"><h4>Today</h4><p class="eye" id="xpwEyeA">🙈</p><p id="xpwTxtA"></p></div>' +
      '<div class="xpw-panel good"><h4>Our plan</h4><p class="eye" id="xpwEyeB">👁</p><p id="xpwTxtB"></p></div>' +
      '</div></div>';
    var r = root.querySelector('#xpwRange');
    function upd() {
      var v = +r.value;
      root.querySelector('#xpwAmt').textContent = money(v);
      var a = root.querySelector('#xpwTxtA'), b = root.querySelector('#xpwTxtB');
      if (v < 15200) {
        root.querySelector('#xpwEyeA').textContent = '🙈';
        a.innerHTML = '<b>Invisible.</b> Below the $15,200 threshold — voters never find out this donation happened.';
      } else {
        root.querySelector('#xpwEyeA').textContent = '🗓';
        a.innerHTML = '<b>Eventually.</b> Disclosed in the AEC’s annual return — often more than a year after the election it helped fund.';
      }
      if (v < 1000) {
        root.querySelector('#xpwEyeB').textContent = '👁';
        b.innerHTML = '<b>Counted.</b> Small gifts stay simple — but they accumulate: once this donor’s total passes $1,000, every dollar is disclosed.';
      } else {
        root.querySelector('#xpwEyeB').textContent = '📣';
        b.innerHTML = '<b>Public within a week.</b> Over the $1,000 accumulative threshold — disclosed weekly during election periods, aggregated per donor.';
      }
    }
    r.addEventListener('input', upd); upd();
  };

  /* ---- truthads: legal or illegal? quiz --------------------------------- */
  W.truthads = function (root) {
    var Q = [
      { q: 'A toothpaste ad claims whiter teeth in a week — and it’s not true.', legal: false, why: 'Illegal. Australian Consumer Law bans misleading claims about products.' },
      { q: 'A federal election ad flatly lies about an opponent’s costed policy.', legal: true, why: 'Legal. There is no federal truth-in-political-advertising law — lying in a federal election ad is allowed.' },
      { q: 'The same lying election ad runs in South Australia.', legal: false, why: 'Illegal. SA has had truth-in-political-advertising laws since 1985 — s113 makes false statements of fact an offence. The ACT followed.' },
      { q: 'A used-car yard rolls back an odometer in its ads.', legal: false, why: 'Illegal. Ordinary businesses can’t lie to you — but a federal political ad still can.' },
    ];
    var i = 0, score = 0;
    root.innerHTML = '<div class="xpw-quiz"><p class="prog" id="xpwProg"></p><p class="q" id="xpwQ"></p>' +
      '<div class="btns"><button type="button" id="xpwYes">Legal</button><button type="button" id="xpwNo">Illegal</button></div>' +
      '<p class="why" id="xpwWhy" hidden></p><button type="button" class="next" id="xpwNext" hidden>Next →</button></div>';
    var qEl = root.querySelector('#xpwQ'), why = root.querySelector('#xpwWhy'), next = root.querySelector('#xpwNext'),
        yes = root.querySelector('#xpwYes'), no = root.querySelector('#xpwNo'), prog = root.querySelector('#xpwProg');
    function show() {
      if (i >= Q.length) {
        prog.textContent = 'Result';
        qEl.innerHTML = 'You got <b>' + score + ' of ' + Q.length + '</b>. The takeaway: your toothpaste has stronger truth protections than your vote. Our plan fixes that — SA-style laws, federally, all year round.';
        yes.hidden = no.hidden = next.hidden = true; why.hidden = true; return;
      }
      prog.textContent = 'Scenario ' + (i + 1) + ' of ' + Q.length;
      qEl.textContent = Q[i].q; why.hidden = true; next.hidden = true; yes.hidden = no.hidden = false;
      yes.disabled = no.disabled = false; yes.classList.remove('hit', 'miss'); no.classList.remove('hit', 'miss');
    }
    function answer(saidLegal) {
      var right = saidLegal === Q[i].legal;
      if (right) score++;
      (saidLegal ? yes : no).classList.add(right ? 'hit' : 'miss');
      why.textContent = (right ? '✓ Right. ' : '✗ Not quite. ') + Q[i].why;
      why.hidden = false; next.hidden = false; yes.disabled = no.disabled = true;
    }
    yes.addEventListener('click', function () { answer(true); });
    no.addEventListener('click', function () { answer(false); });
    next.addEventListener('click', function () { i++; show(); });
    show();
  };

  /* ---- lobbying: the revolving door -------------------------------------- */
  W.lobbying = function (root) {
    var spins = [
      ['A minister leaves cabinet…', '…and walks into a lobbying job in the industry they regulated.'],
      ['An in-house mining lobbyist walks in…', '…no register entry, no code of conduct — 80% of lobbyists work in-house and are unregulated.'],
      ['One of 1,700 orange security passes…', '…gives a lobbyist the run of Parliament House, unescorted.'],
      ['A lobbyist breaks the code of conduct…', '…and the only penalty is removal from the register.'],
    ];
    var i = -1, locked = false;
    root.innerHTML = '<div class="xpw-door"><div class="door" id="xpwDoor" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
      '<div class="txt"><p class="a" id="xpwDa">Press spin to see who’s coming through.</p><p class="b" id="xpwDb"></p></div>' +
      '<div class="btns"><button type="button" id="xpwSpin">Spin the door</button><button type="button" class="lock" id="xpwLock">Apply our plan 🔒</button></div></div>';
    var door = root.querySelector('#xpwDoor'), a = root.querySelector('#xpwDa'), b = root.querySelector('#xpwDb');
    root.querySelector('#xpwSpin').addEventListener('click', function () {
      if (locked) return;
      i = (i + 1) % spins.length;
      door.classList.remove('spin'); void door.offsetWidth; door.classList.add('spin');
      a.textContent = spins[i][0]; b.textContent = spins[i][1];
    });
    root.querySelector('#xpwLock').addEventListener('click', function () {
      locked = !locked;
      door.classList.toggle('locked', locked);
      if (locked) {
        a.textContent = 'The door is locked.';
        b.textContent = 'Every lobbyist — in-house included — on the register and under the code. Passes revoked: registered, escorted visits during non-sitting times, published quarterly. Real penalties.';
      } else { a.textContent = 'Press spin to see who’s coming through.'; b.textContent = ''; }
    });
  };

  /* ---- protest: could you afford to protest? ------------------------------ */
  W.protest = function (root) {
    var S = [
      { n: 'March on a public road', fine: 22000, jail: 'up to 2 years', law: 'NSW roads & major facilities laws (2022–25)' },
      { n: 'Picket near a rail line', fine: 22000, jail: 'up to 2 years', law: 'NSW roads & major facilities laws (2022–25)' },
      { n: 'Rally in a city centre under a PARD', fine: 22000, jail: 'protections stripped', law: 'Police-issued blanket bans on authorised protests' },
    ];
    root.innerHTML = '<div class="xpw-protest"><div class="pick" id="xpwPick"></div>' +
      '<div class="meter"><span class="lab">Maximum penalty today</span><b id="xpwFine">$0</b><span class="jail" id="xpwJail"></span><span class="law" id="xpwLaw"></span></div>' +
      '<div class="plan"><b>Under our plan:</b> peaceful assembly is protected — no criminalisation for inconvenience, no blanket bans, no surveillance of peaceful protestors.</div></div>';
    var pick = root.querySelector('#xpwPick');
    S.forEach(function (s, idx) {
      var btn = el('button', null, s.n); btn.type = 'button';
      btn.addEventListener('click', function () {
        pick.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        btn.classList.add('on');
        var f = root.querySelector('#xpwFine'), t0 = null, dur = 900;
        function tick(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur); p = 1 - Math.pow(1 - p, 3); f.textContent = money(s.fine * p); if (p < 1) requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
        root.querySelector('#xpwJail').textContent = '+ jail ' + s.jail;
        root.querySelector('#xpwLaw').textContent = s.law;
      });
      pick.appendChild(btn);
      if (idx === 0) btn.click();
    });
  };

  /* ---- whistle: declassified slider --------------------------------------- */
  W.whistle = function (root) {
    var lines = [
      'A public servant sees taxpayer money being rorted.',
      'They report it internally. Nothing happens.',
      'They tell a journalist. The story is true, and it matters.',
      'Today: the whistleblower risks prosecution, and the journalist risks a raid.',
      'Our plan: an independent Whistleblower Protection Commission, stand-alone protections across public and private sectors, shielded sources — and the burden of proof reversed for public-interest reporting.',
    ];
    root.innerHTML = '<div class="xpw-redact"><label class="xpw-sliderlab">Drag from today’s protections to ours<b id="xpwRl">Today</b></label>' +
      '<input type="range" min="0" max="100" value="8" id="xpwRr" aria-label="Protection level">' +
      '<div class="doc" id="xpwDoc"></div></div>';
    var doc = root.querySelector('#xpwDoc');
    lines.forEach(function (t) { var p = el('p'); p.appendChild(el('span', 'ink', t)); p.appendChild(el('span', 'bar')); doc.appendChild(p); });
    var ps = doc.querySelectorAll('p');
    var r = root.querySelector('#xpwRr'), lab = root.querySelector('#xpwRl');
    function upd() {
      var v = +r.value;
      lab.textContent = v < 25 ? 'Today' : v < 75 ? 'Getting there…' : 'Our plan';
      ps.forEach(function (p, i) {
        var open = v >= ((i + 1) / lines.length) * 100 - 12;
        p.classList.toggle('open', open);
      });
    }
    r.addEventListener('input', upd); upd();
  };

  /* ---- foi: the obstacle course -------------------------------------------- */
  W.foi = function (root) {
    var A = ['Request lodged', 'Processing “delayed”', 'Charges apply', 'Exemption claimed', '“Cabinet-in-confidence” — refused'];
    var B = ['You search the register…', 'It’s already published.'];
    root.innerHTML = '<div class="xpw-foi"><button type="button" id="xpwGo">Lodge an FOI request</button>' +
      '<div class="lanes"><div class="lane bad"><h4>Today</h4><ol id="xpwLa"></ol></div>' +
      '<div class="lane good"><h4>Our plan — proactive release</h4><ol id="xpwLb"></ol></div></div></div>';
    var la = root.querySelector('#xpwLa'), lb = root.querySelector('#xpwLb');
    A.forEach(function (t) { la.appendChild(el('li', null, '<span>' + t + '</span>')); });
    B.forEach(function (t) { lb.appendChild(el('li', null, '<span>' + t + '</span>')); });
    var running = false;
    root.querySelector('#xpwGo').addEventListener('click', function () {
      if (running) return; running = true;
      var all = [].concat(Array.prototype.slice.call(la.children), []);
      la.parentElement.classList.remove('done'); lb.parentElement.classList.remove('done');
      Array.prototype.forEach.call(la.children, function (li) { li.classList.remove('on'); });
      Array.prototype.forEach.call(lb.children, function (li) { li.classList.remove('on'); });
      Array.prototype.forEach.call(lb.children, function (li, i) { setTimeout(function () { li.classList.add('on'); if (i === lb.children.length - 1) lb.parentElement.classList.add('done'); }, 350 + i * 500); });
      Array.prototype.forEach.call(la.children, function (li, i) { setTimeout(function () { li.classList.add('on'); if (i === la.children.length - 1) { la.parentElement.classList.add('done'); running = false; } }, 600 + i * 1050); });
    });
  };

  /* ---- col: your tax cut ---------------------------------------------------- */
  W.col = function (root) {
    root.innerHTML = '<div class="xpw-dial"><label class="xpw-sliderlab">Your income<b id="xpwInc">$55,000</b></label>' +
      '<input type="range" min="10000" max="150000" step="1000" value="55000" id="xpwIr" aria-label="Annual income">' +
      '<div class="xpw-big"><span>Tax saved under our plan</span><b id="xpwSave">$0</b><i>by abolishing the lowest bracket — no tax on earnings between $18,201 and $45,000, currently taxed at 15¢ in the dollar</i></div></div>';
    var r = root.querySelector('#xpwIr');
    function upd() {
      var v = +r.value;
      root.querySelector('#xpwInc').textContent = money(v);
      var taxable = Math.max(0, Math.min(v, 45000) - 18200);
      root.querySelector('#xpwSave').textContent = money(taxable * 0.15) + ' / yr';
    }
    r.addEventListener('input', upd); upd();
  };

  /* ---- housing: three renters ------------------------------------------------ */
  W.housing = function (root) {
    var S = [
      { n: 'A young worker', now: 'Priced out of buying, outbid on rentals, saving for a deposit that grows faster than her savings.', plan: 'A National Housing Strategy targets supply where the jobs are — more homes, more density and diversity in inner and middle suburbs.' },
      { n: 'A family leaving violence', now: 'Tonight, crisis accommodation is full. 116,000 Australians are homeless on any given night.', plan: 'Funded transition housing for people in crisis, and investment in safe, permanent, supported housing.' },
      { n: 'A renting pensioner', now: 'One rent rise from the edge — up to 2 million Australians over 15 are at risk of homelessness.', plan: 'Tenants’ rights reform: no unfair evictions, rent increases tied to the median wage.' },
    ];
    root.innerHTML = '<div class="xpw-renters"><div class="pick" id="xpwHp"></div><div class="xpw-duo">' +
      '<div class="xpw-panel bad"><h4>Tonight</h4><p id="xpwHa"></p></div>' +
      '<div class="xpw-panel good"><h4>With a plan</h4><p id="xpwHb"></p></div></div></div>';
    var pick = root.querySelector('#xpwHp');
    S.forEach(function (s, i) {
      var btn = el('button', null, s.n); btn.type = 'button';
      btn.addEventListener('click', function () {
        pick.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        btn.classList.add('on');
        root.querySelector('#xpwHa').textContent = s.now;
        root.querySelector('#xpwHb').textContent = s.plan;
      });
      pick.appendChild(btn); if (i === 0) btn.click();
    });
  };

  /* ---- income: live on $56 a day --------------------------------------------- */
  W.income = function (root) {
    var items = [
      { n: 'Housing share', c: 30 }, { n: 'Food', c: 15 }, { n: 'Transport', c: 8 },
      { n: 'Power & phone', c: 7 }, { n: 'Medicine', c: 6 }, { n: 'Everything else', c: 10 },
    ];
    var rate = 56;
    root.innerHTML = '<div class="xpw-budget"><div class="rate"><button type="button" class="on" id="xpwR56">Today ≈ $56/day</button><button type="button" id="xpwR82">Raise it: $82/day</button></div>' +
      '<p class="hint">Tap what today’s payment should cover (illustrative daily costs):</p><div class="items" id="xpwIt"></div>' +
      '<div class="tally"><span id="xpwTt">$0 of $56</span><span class="bar"><i id="xpwTb"></i></span><b id="xpwVerdict"></b></div></div>';
    var wrap = root.querySelector('#xpwIt'), picked = {};
    items.forEach(function (it, i) {
      var b = el('button', null, it.n + '<b>$' + it.c + '</b>'); b.type = 'button';
      b.addEventListener('click', function () { picked[i] = !picked[i]; b.classList.toggle('on', picked[i]); upd(); });
      wrap.appendChild(b);
    });
    function upd() {
      var sum = items.reduce(function (s, it, i) { return s + (picked[i] ? it.c : 0); }, 0);
      root.querySelector('#xpwTt').textContent = '$' + sum + ' of $' + rate;
      var pct = Math.min(100, sum / rate * 100);
      var bar = root.querySelector('#xpwTb');
      bar.style.width = pct + '%';
      bar.classList.toggle('over', sum > rate);
      var v = root.querySelector('#xpwVerdict');
      var total = items.reduce(function (s, it) { return s + it.c; }, 0);
      if (sum > rate) v.textContent = 'Over. Something has to go — that’s the daily maths on today’s rate.';
      else if (sum === 0) v.textContent = '';
      else if (Object.keys(picked).filter(function (k) { return picked[k]; }).length === items.length && total <= rate) v.textContent = 'Covered — with room to look for work, not just survive.';
      else v.textContent = 'So far it fits — keep going.';
    }
    root.querySelector('#xpwR56').addEventListener('click', function () { rate = 56; this.classList.add('on'); root.querySelector('#xpwR82').classList.remove('on'); upd(); });
    root.querySelector('#xpwR82').addEventListener('click', function () { rate = 82; this.classList.add('on'); root.querySelector('#xpwR56').classList.remove('on'); upd(); });
  };

  /* ---- pathway: pick the 2030 target ------------------------------------------ */
  W.pathway = function (root) {
    root.innerHTML = '<div class="xpw-dial"><label class="xpw-sliderlab">2030 emissions cut (on 2005 levels)<b id="xpwPt">55%</b></label>' +
      '<input type="range" min="26" max="65" step="1" value="55" id="xpwPr" aria-label="2030 target">' +
      '<div class="scale"><i style="--a:15%;--b:41%" class="seg now">Current projection 32–42%</i><i style="--a:49%;--b:100%" class="seg sci">Science range 45–65%</i></div>' +
      '<div class="xpw-big"><span>Verdict</span><b id="xpwPv"></b><i id="xpwPi"></i></div></div>';
    var r = root.querySelector('#xpwPr');
    function upd() {
      var v = +r.value;
      root.querySelector('#xpwPt').textContent = v + '%';
      var verdict = root.querySelector('#xpwPv'), info = root.querySelector('#xpwPi');
      if (v < 43) { verdict.textContent = 'Business as usual'; info.textContent = 'Inside the government’s own 32–42% projection — and Australia stays 55th on the Climate Change Performance Index.'; }
      else if (v < 55) { verdict.textContent = 'Entering the science range'; info.textContent = 'The Climate Change Authority’s 2015 advice was 45–65%. Getting warmer — pun intended.'; }
      else { verdict.textContent = 'Our commitment: at least 55%'; info.textContent = 'Decisive, science-aligned, and achievable if government drives the transition this decade — electrify everything.'; }
    }
    r.addEventListener('input', upd); upd();
  };

  /* ---- species: losing count ---------------------------------------------------- */
  W.species = function (root) {
    root.innerHTML = '<div class="xpw-dial"><label class="xpw-sliderlab">Scrub the years<b id="xpwYr">2025</b></label>' +
      '<input type="range" min="2005" max="2030" step="1" value="2025" id="xpwSr" aria-label="Year">' +
      '<div class="chart" id="xpwCh"><svg viewBox="0 0 100 46" preserveAspectRatio="none"><polyline id="xpwLine" fill="none" stroke-width="2.4" points=""/></svg><b id="xpwIdx"></b></div>' +
      '<div class="rate"><button type="button" class="on" id="xpwBau">Business as usual</button><button type="button" id="xpwNp">Fund recovery by 2030</button></div></div>';
    var mode = 'bau', yr = root.querySelector('#xpwSr');
    function series() {
      var pts = [], idx = 100;
      for (var y = 2005; y <= 2030; y++) {
        if (mode === 'bau' || y <= 2025) idx *= 0.975; // −2.5%/yr (policy: −2–3%/yr)
        else idx *= 1.02; // funded recovery bends the curve
        pts.push([ (y - 2005) / 25 * 100, 44 - (idx / 100) * 40 ]);
      }
      return pts;
    }
    function upd() {
      var pts = series();
      var y = +yr.value, i = y - 2005;
      root.querySelector('#xpwYr').textContent = y;
      root.querySelector('#xpwLine').setAttribute('points', pts.slice(0, i + 1).map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
      root.querySelector('#xpwLine').setAttribute('stroke', mode === 'bau' ? '#d06a55' : '#1f877a');
      var idx = 100; for (var k = 2005; k <= y; k++) { if (mode === 'bau' || k <= 2025) idx *= 0.975; else idx *= 1.02; }
      root.querySelector('#xpwIdx').textContent = 'Threatened-species population index: ' + Math.round(idx) + (mode === 'bau' ? ' (still falling 2–3% a year)' : (y >= 2030 ? ' — measurably recovering' : ' — turning around'));
    }
    root.querySelector('#xpwBau').addEventListener('click', function () { mode = 'bau'; this.classList.add('on'); root.querySelector('#xpwNp').classList.remove('on'); upd(); });
    root.querySelector('#xpwNp').addEventListener('click', function () { mode = 'np'; this.classList.add('on'); root.querySelector('#xpwBau').classList.remove('on'); yr.value = 2030; upd(); });
    yr.addEventListener('input', upd); upd();
  };

  /* ---- grid: build your grid ------------------------------------------------------ */
  W.grid = function (root) {
    root.innerHTML = '<div class="xpw-grid3">' +
      '<label>Rooftop solar + home batteries<input type="range" min="0" max="60" value="20" id="xpwG1"><b id="xpwV1">20%</b></label>' +
      '<label>Renewable Energy Zones + storage<input type="range" min="0" max="80" value="35" id="xpwG2"><b id="xpwV2">35%</b></label>' +
      '<label>Fossil gas & coal<input type="range" min="0" max="80" value="45" id="xpwG3"><b id="xpwV3">45%</b></label>' +
      '<div class="mix"><i id="xpwM1"></i><i id="xpwM2"></i><i id="xpwM3"></i></div>' +
      '<div class="xpw-big"><span>Grid status</span><b id="xpwGs"></b><i id="xpwGi"></i></div></div>';
    var g = [1, 2, 3].map(function (i) { return root.querySelector('#xpwG' + i); });
    function upd() {
      var v = g.map(function (x) { return +x.value; });
      var total = v[0] + v[1] + v[2];
      [0, 1, 2].forEach(function (i) {
        root.querySelector('#xpwV' + (i + 1)).textContent = v[i] + '%';
        root.querySelector('#xpwM' + (i + 1)).style.width = (total ? v[i] / total * 100 : 0) + '%';
      });
      var s = root.querySelector('#xpwGs'), inf = root.querySelector('#xpwGi');
      var clean = v[0] + v[1];
      if (total < 95) { s.textContent = 'Blackout risk'; inf.textContent = 'The mix doesn’t meet demand — add supply (total ≈ 100%).'; }
      else if (total > 115) { s.textContent = 'Over-built'; inf.textContent = 'Dial it back toward 100% — storage soaks up the rest.'; }
      else if (v[2] === 0 && v[1] >= 40) { s.textContent = '100% clean, lights on ✓'; inf.textContent = 'Enough zones + storage to retire fossil fuel entirely — this is the grid our plan builds, with public poles and wires opening the way.'; }
      else if (clean >= 70) { s.textContent = 'Nearly there'; inf.textContent = 'Strong and stable — now push gas and coal to zero with more zones and storage.'; }
      else { s.textContent = 'Locked to fossil prices'; inf.textContent = 'A fossil-heavy mix leaves bills hostage to global gas markets. Slide the clean sources up.'; }
    }
    g.forEach(function (x) { x.addEventListener('input', upd); }); upd();
  };

  /* ---- plastic: the garbage-truck minute -------------------------------------------- */
  W.plastic = function (root) {
    root.innerHTML = '<div class="xpw-truck"><div class="tick"><b id="xpwTr">0</b><span>garbage trucks of plastic have entered the ocean since you opened this page — one every minute, worldwide (CSIRO)</span></div>' +
      '<div class="meter2"><span class="lab">Australia recycles</span><div class="track"><i id="xpwPm" style="width:13%"></i><em id="xpwPl">13%</em></div><span class="lab2" id="xpwPs">of 2.6 million tonnes of plastic waste a year</span></div>' +
      '<button type="button" id="xpwFix">Apply our plan</button></div>';
    var t0 = Date.now(), tr = root.querySelector('#xpwTr');
    setInterval(function () { tr.textContent = String(Math.floor((Date.now() - t0) / 60000) + (((Date.now() - t0) % 60000) / 60000)).slice(0, 4); }, 1000);
    var on = false;
    root.querySelector('#xpwFix').addEventListener('click', function () {
      on = !on; this.textContent = on ? 'Back to today' : 'Apply our plan';
      root.querySelector('#xpwPm').style.width = on ? '80%' : '13%';
      root.querySelector('#xpwPm').classList.toggle('good', on);
      root.querySelector('#xpwPl').textContent = on ? '80%' : '13%';
      root.querySelector('#xpwPs').textContent = on
        ? 'target recovery — a virgin-plastic tax, a national container scheme, and phase-outs of the worst single-use plastics'
        : 'of 2.6 million tonnes of plastic waste a year';
    });
  };

  /* ---- enviro: protect 30% (real map fill) --------------------------------------------- */
  W.enviro = function (root) {
    root.innerHTML = '<div class="xpw-mapfill"><label class="xpw-sliderlab">Protected land & sea<b id="xpwEp">22.1%</b></label>' +
      '<input type="range" min="221" max="300" value="221" id="xpwEr" aria-label="Protection percentage (tenths)">' +
      '<div class="stage"><div class="fill" id="xpwEf" aria-hidden="true"></div>' +
      '<p id="xpwEt"></p></div></div>';
    var r = root.querySelector('#xpwEr');
    function upd() {
      var v = +r.value / 10;
      root.querySelector('#xpwEp').textContent = v.toFixed(1) + '%';
      var pct = v / 30 * 100;
      root.querySelector('#xpwEf').style.background =
        'linear-gradient(to top, #1f877a ' + pct + '%, rgba(31,135,122,.14) ' + pct + '%)';
      var t = root.querySelector('#xpwEt');
      if (v < 23) t.textContent = 'Today: 22.1% of Australia’s land and seas sit in the National Reserve System.';
      else if (v < 30) t.textContent = 'Growing the estate — every ecosystem represented, guided by all 38 Samuel Review recommendations.';
      else t.textContent = '30% protected — the target our plan writes into law, with deforestation ended by 2030.';
    }
    r.addEventListener('input', upd); upd();
  };

  /* ---- waste: sort it -------------------------------------------------------------------- */
  W.waste = function (root) {
    var ITEMS = [
      { n: '🍌 Banana peel', bin: 2 }, { n: '🛍 Soft plastic wrapper', bin: 3 },
      { n: '📱 Old phone', bin: 3 }, { n: '🍾 Glass bottle', bin: 1 },
      { n: '🥫 Tin of food, in date', bin: 2 }, { n: '🍟 Greasy chip box', bin: 0 },
    ];
    var BINS = ['Landfill', 'Recycling', 'Compost / food rescue', 'Repair & product schemes'];
    var WHY = [
      'Greasy cardboard contaminates recycling — landfill (for now: our plan funds better streams).',
      'Glass is endlessly recyclable — a national container deposit scheme makes sure it gets there.',
      'Edible food to food rescue, scraps to compost — food waste costs the economy $37 billion a year and 70% of it is edible.',
      'Product stewardship: soft plastics, e-waste and appliances go back through repair, reuse and maker-funded schemes.',
    ];
    var i = 0, score = 0;
    root.innerHTML = '<div class="xpw-sort"><p class="prog" id="xpwSp"></p><div class="item" id="xpwSi"></div>' +
      '<div class="bins" id="xpwSb"></div><p class="why" id="xpwSw"></p></div>';
    var binsEl = root.querySelector('#xpwSb');
    BINS.forEach(function (b, bi) {
      var btn = el('button', null, b); btn.type = 'button';
      btn.addEventListener('click', function () {
        if (i >= ITEMS.length) return;
        var right = bi === ITEMS[i].bin;
        if (right) score++;
        root.querySelector('#xpwSw').textContent = (right ? '✓ ' : '✗ ') + WHY[ITEMS[i].bin];
        i++;
        setTimeout(show, 1400);
      });
      binsEl.appendChild(btn);
    });
    function show() {
      if (i >= ITEMS.length) {
        root.querySelector('#xpwSp').textContent = 'Done';
        root.querySelector('#xpwSi').innerHTML = '<b>' + score + ' / ' + ITEMS.length + '</b> — sorting shouldn’t be this hard. National recycling has been stuck at ~16% for years; our plan targets 80% recovery from every waste stream by 2030.';
        return;
      }
      root.querySelector('#xpwSp').textContent = 'Item ' + (i + 1) + ' of ' + ITEMS.length + ' — where should it go?';
      root.querySelector('#xpwSi').textContent = ITEMS[i].n;
    }
    show();
  };

  /* ---- stars: score it yourself (right to repair) ------------------------------------------ */
  W.stars = function (root) {
    var C = ['Spare parts sold to anyone', 'Repair manuals published', 'No software part-pairing locks', 'Standard tools open it', 'Software supported 6+ years'];
    root.innerHTML = '<div class="xpw-stars"><p class="hint">Tick what a product offers — watch its repair label build:</p><div class="checks" id="xpwSc"></div>' +
      '<div class="label"><span>REPAIRABILITY</span><b id="xpwSs">☆☆☆☆☆</b><i id="xpwSt">0 of 5 — designed to be replaced</i></div></div>';
    var wrap = root.querySelector('#xpwSc'), state = C.map(function () { return false; });
    C.forEach(function (c, ci) {
      var b = el('button', null, c); b.type = 'button';
      b.addEventListener('click', function () { state[ci] = !state[ci]; b.classList.toggle('on', state[ci]); upd(); });
      wrap.appendChild(b);
    });
    function upd() {
      var n = state.filter(Boolean).length;
      root.querySelector('#xpwSs').textContent = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
      var t = ['0 of 5 — designed to be replaced', '1 of 5 — good luck', '2 of 5 — repair café territory', '3 of 5 — getting fixable', '4 of 5 — a keeper', '5 of 5 — built to last, and the label on the box says so'][n];
      root.querySelector('#xpwSt').textContent = t;
    }
  };

  /* ---- pokie v3: the honest pokie (gambling reform) ------------------------------------------
     A cabinet that tells you what every real one hides — now tuned like the real thing.
     $100 of pretend credit, $10 spins, ~85% BASE return with 60% losing spins, an AUTOPLAY
     switch (the feature that exists to speed up losses), and one rig on top: a hard 101c-in-
     the-dollar session cap so a lucky demo can never teach the wrong lesson. Every one of
     those numbers is printed in the paytable x-ray. No real money. */
  W.pokie = function (root) {
    var SYM = ['◆', '●', '▲', '■', '★'];   // ◆ ● ▲ ■ ★
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STAKE = 10, START = 100, CAP = 1.01;
    // base table: 85.5% long-run return, 60% of spins pay nothing (verified by simulation)
    var TABLE = [
      { p: 0.60, win: 0,   label: 'Nothing' },
      { p: 0.14, win: 5,   label: '"Win" of half your stake' },
      { p: 0.12, win: 10,  label: 'Your own $10 back' },
      { p: 0.09, win: 25,  label: 'Small win' },
      { p: 0.04, win: 60,  label: 'Big win' },
      { p: 0.01, win: 200, label: 'The lights-and-music win' },
    ];
    var credit = START, spent = 0, returned = 0, spins = 0, nearMisses = 0, capped = 0,
        hist = [], spinning = false, auto = false, autoTimer = null, t0 = null;
    root.innerHTML = '<div class="xpw-pokie2">' +
      '<div class="cab"><span class="lamps left" aria-hidden="true"></span><span class="lamps right" aria-hidden="true"></span>' +
        '<div class="lights" aria-hidden="true"></div>' +
        '<div class="cab-head"><span class="brand">THE HONEST POKIE</span><span class="sub">EVERY ODD PRINTED · $10 A SPIN · 60% PAY NOTHING</span></div>' +
        '<div class="win"><div class="reels" id="xpkReels" aria-hidden="true"><span class="reel">◆</span><span class="reel">●</span><span class="reel">▲</span></div>' +
        '<div class="winline" id="xpkLine" aria-hidden="true"></div></div>' +
        '<p class="msg" id="xpkMsg" aria-live="polite">Pretend money. Real maths — the harsh kind. $10 a spin.</p>' +
        '<div class="meters"><span>CREDIT <b id="xpkCr">$100</b></span><span>SPINS <b id="xpkSp">0</b></span><span class="take">HOUSE <b id="xpkHs">$0</b></span></div>' +
        '<div class="row"><button type="button" class="spin" id="xpkSpin">● SPIN — $10</button>' +
        '<button type="button" class="auto" id="xpkAuto" aria-pressed="false">AUTOPLAY</button>' +
        '<button type="button" class="how" id="xpkHow">Paytable x-ray</button>' +
        '<button type="button" class="reset" id="xpkReset" hidden>Start again</button></div>' +
        '<div class="strip" id="xpkStrip" aria-label="Session history"></div>' +
        '<div class="ledger" id="xpkLed"></div>' +
      '</div>' +
      '<div class="xray" id="xpkXray" hidden><h4>The paytable they never post</h4><table><thead><tr><th>Outcome</th><th>Pays</th><th>Real odds</th></tr></thead><tbody>' +
        TABLE.map(function (t) { return '<tr><td>' + t.label + '</td><td>$' + t.win + '</td><td>' + Math.round(t.p * 100) + '%</td></tr>'; }).join('') +
        '</tbody></table>' +
        '<p><b>Base return: about 85¢ of every dollar</b> — the harsher end of real Australian machines. Six spins in ten pay nothing at all.</p>' +
        '<p><b>Near-miss dressing:</b> 42% of losing spins are made to look one symbol short of a win. The ledger counts every one.</p>' +
        '<p><b>Plus one rig real pokies don’t print:</b> this demo hard-caps your session at 101¢ in the dollar, so you can never get more than 1% ahead — if the reels draw a prize that would tip you over, it pays a smaller one (sometimes nothing) and tells you. Real machines don’t need the cap; the long run does it for them. With the cap, this demo actually keeps MORE of your money than the base odds suggest.</p>' +
        '<p><b>And autoplay?</b> It exists on real machines for exactly one reason: more spins per hour. Here it will empty the $100 in well under a minute, on average.</p></div>' +
      '<div class="truth" id="xpkTruth" hidden><p id="xpkBust"><b>Nothing you just felt was an accident.</b></p>' +
      '<p>Australians bet $244.3 billion in 2022–23 and lost about $25 billion — the biggest per-person losses in the world, roughly $792 every second. ' +
      'A parliamentary inquiry made <b>31 unanimous recommendations</b>, mostly about gambling advertising. None has been implemented. ' +
      'Our plan: ban gambling ads across TV, radio, streaming, social media and billboards; a National Casino Regulator and Online Gaming Ombudsman; and real protections for children.</p></div></div>';
    var reels = root.querySelectorAll('#xpkReels .reel');
    var strip = root.querySelector('#xpkStrip');
    var cab = root.querySelector('.cab');
    function draw() {
      var r = Math.random(), acc = 0;
      for (var i = 0; i < TABLE.length; i++) { acc += TABLE[i].p; if (r < acc) return TABLE[i].win; }
      return 0;
    }
    // the 101c session cap: downgrade a prize that would put the session ahead
    function capWin(w) {
      if (returned + w <= CAP * spent) return w;
      var opts = TABLE.map(function (t) { return t.win; }).sort(function (a, b) { return b - a; });
      for (var i = 0; i < opts.length; i++) if (opts[i] < w && returned + opts[i] <= CAP * spent) return opts[i];
      return 0;
    }
    function face(win) {
      var s = SYM[Math.floor(Math.random() * SYM.length)];
      if (win > 0) return [s, s, s];
      if (Math.random() < 0.42) {
        nearMisses++;
        var other = SYM[(SYM.indexOf(s) + 1 + Math.floor(Math.random() * (SYM.length - 1))) % SYM.length];
        return [s, s, other];
      }
      var a = SYM[Math.floor(Math.random() * SYM.length)], b = SYM[(SYM.indexOf(a) + 1) % SYM.length], c = SYM[(SYM.indexOf(a) + 2) % SYM.length];
      return [a, b, c];
    }
    function upd(msg) {
      root.querySelector('#xpkCr').textContent = '$' + credit;
      root.querySelector('#xpkSp').textContent = spins;
      root.querySelector('#xpkHs').textContent = '$' + (spent - returned);
      var rtp = spent ? Math.round(returned / spent * 100) : null;
      root.querySelector('#xpkLed').innerHTML =
        '<span>Session return: ' + (rtp === null ? '—' : rtp + '¢ in the dollar (capped at 101¢)') + '</span>' +
        '<span>Near-misses engineered: ' + nearMisses + '</span>' +
        '<span>Prizes clipped by the cap: ' + capped + '</span>';
      if (msg) root.querySelector('#xpkMsg').textContent = msg;
    }
    // the history strip reconciles with the meters: NET result per spin (payout minus the
    // $10 stake — the number the machine never shows), 5 recent chips + a count of the rest
    function stamp(win) {
      hist.unshift(win - STAKE);
      var MAXC = 5;
      strip.innerHTML = '<span class="tag">LAST SPINS</span>' +
        hist.slice(0, MAXC).map(function (n) {
          return '<span class="chip' + (n > 0 ? ' up' : n === 0 ? ' even' : '') + '">' + (n > 0 ? '+$' + n : n === 0 ? '±$0' : '−$' + (-n)) + '</span>';
        }).join('') +
        (hist.length > MAXC ? '<span class="chip more">+' + (hist.length - MAXC) + ' earlier</span>' : '');
    }
    function stopAuto() {
      auto = false;
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      var b = root.querySelector('#xpkAuto');
      b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); b.textContent = 'AUTOPLAY';
    }
    function bust() {
      var secs = t0 ? Math.round((Date.now() - t0) / 1000) : 0;
      stopAuto();
      root.querySelector('#xpkSpin').disabled = true;
      root.querySelector('#xpkAuto').disabled = true;
      root.querySelector('#xpkReset').hidden = false;
      root.querySelector('#xpkTruth').hidden = false;
      root.querySelector('#xpkBust').innerHTML = '<b>$' + START + ' gone in ' + spins + ' spins' +
        (secs ? ' — ' + (secs < 90 ? secs + ' seconds' : Math.round(secs / 60) + ' minutes') : '') +
        '.</b> Nothing you just felt was an accident. In the real world: refill, repeat — $25 billion a year.';
      return 'Credit gone. That’s the product working as designed.';
    }
    function doSpin() {
      if (spinning || credit < STAKE) return;
      if (!t0) t0 = Date.now();
      spinning = true; spins++; credit -= STAKE; spent += STAKE;
      var raw = draw(), w = capWin(raw), f = face(w);
      if (w < raw) capped++;
      var line = root.querySelector('#xpkLine');
      line.classList.remove('hit'); cab.classList.remove('winflash'); upd('…');
      reels.forEach(function (r) { r.classList.add('rolling'); });
      var flick = reduce ? 0 : 10, k = 0;
      var iv = setInterval(function () {
        k++;
        for (var i = 0; i < 3; i++) {
          if (k <= flick + i * 3) reels[i].textContent = SYM[Math.floor(Math.random() * SYM.length)];
          else reels[i].classList.remove('rolling');
        }
        if (k > flick + 6) {
          clearInterval(iv);
          for (var j = 0; j < 3; j++) { reels[j].textContent = f[j]; reels[j].classList.remove('rolling'); }
          credit += w; returned += w; spinning = false;
          if (w > 0) { line.classList.add('hit'); if (w >= STAKE && !reduce) { cab.classList.add('winflash'); } }
          stamp(w);
          var m;
          if (w < raw) m = 'The reels drew $' + raw + '. The session cap paid $' + w + ' — that rig is printed in the x-ray.';
          else m = w >= 60 ? 'A "big win" — $' + w + '. Check the ledger before celebrating.'
            : w > STAKE ? 'Win: $' + w + '. The lights agree. The ledger doesn’t.'
            : w > 0 ? '"Win": $' + w + ' — on a $10 spin. Machines celebrate these too.'
            : f[0] === f[1] ? 'So close. Exactly as close as it was built to look.'
            : 'Nothing. Six spins in ten end like this.';
          if (credit < STAKE) m = bust();
          upd(m);
        }
      }, reduce ? 0 : 38);
    }
    root.querySelector('#xpkSpin').addEventListener('click', doSpin);
    root.querySelector('#xpkAuto').addEventListener('click', function () {
      if (auto) { stopAuto(); upd('Autoplay off.'); return; }
      if (credit < STAKE) return;
      auto = true; this.classList.add('on'); this.setAttribute('aria-pressed', 'true'); this.textContent = 'STOP';
      upd('Autoplay on — the feature that exists for one reason: more spins per hour.');
      autoTimer = setInterval(function () { if (!spinning && credit >= STAKE) doSpin(); }, reduce ? 400 : 1150);
    });
    root.querySelector('#xpkHow').addEventListener('click', function () {
      var t = root.querySelector('#xpkXray'); t.hidden = !t.hidden;
      this.classList.toggle('on', !t.hidden);
      this.textContent = t.hidden ? 'Paytable x-ray' : 'Close the x-ray';
    });
    root.querySelector('#xpkReset').addEventListener('click', function () {
      credit = START; spent = 0; returned = 0; spins = 0; nearMisses = 0; capped = 0; hist = []; t0 = null; this.hidden = true;
      stopAuto();
      root.querySelector('#xpkSpin').disabled = false;
      root.querySelector('#xpkAuto').disabled = false;
      root.querySelector('#xpkTruth').hidden = true; strip.innerHTML = '';
      root.querySelector('#xpkLine').classList.remove('hit'); cab.classList.remove('winflash');
      upd('Pretend money. Real maths — the harsh kind. $10 a spin.');
    });
    upd('Pretend money. Real maths — the harsh kind. $10 a spin.');
  };

  /* ---- firstvote: old enough (lowering the voting age) --------------------------------------
     Slide your age: everything a 16-year-old can already legally do lights up — except the
     ballot. Flip to our plan and watch what changes (and what deliberately doesn't). */
  W.firstvote = function (root) {
    var RIGHTS = [
      { n: 'Work full-time', at: 16 }, { n: 'Pay income tax', at: 16 }, { n: 'Serve in the armed forces', at: 16 },
      { n: 'Get married', at: 16 }, { n: 'Join a political party', at: 16 }, { n: 'Be charged with a crime', at: 16 },
    ];
    var plan = false, age = 16;
    root.innerHTML = '<div class="xpw-fv"><div class="mode"><button type="button" class="on" id="xfvToday">Today</button><button type="button" id="xfvPlan">Our plan</button></div>' +
      '<label class="xpw-sliderlab">Your age<b id="xfvAge">16</b></label>' +
      '<input type="range" min="14" max="25" step="1" value="16" id="xfvR">' +
      '<div class="grid" id="xfvGrid"></div>' +
      '<div class="ballot" id="xfvBallot"></div>' +
      '<p class="fact" id="xfvFact"></p></div>';
    var grid = root.querySelector('#xfvGrid');
    RIGHTS.forEach(function (r) { grid.appendChild(el('div', 'tile', '<i></i><span>' + r.n + '</span>')); });
    var tiles = grid.querySelectorAll('.tile');
    function upd() {
      root.querySelector('#xfvAge').textContent = age;
      RIGHTS.forEach(function (r, i) { tiles[i].classList.toggle('yes', age >= r.at); });
      var b = root.querySelector('#xfvBallot'), f = root.querySelector('#xfvFact');
      if (!plan) {
        if (age >= 18) { b.className = 'ballot yes'; b.innerHTML = '<b>VOTE — compulsory</b><span>Enrolled and required, as now.</span>'; f.textContent = ''; }
        else { b.className = 'ballot no'; b.innerHTML = '<b>VOTE — not allowed</b><span>' + (age >= 16 ? 'Old enough for everything above. Not for a say in who decides it.' : 'Not yet — and no way to pre-enrol until 16.') + '</span>'; f.textContent = age >= 16 ? 'You’ll live with today’s decisions longer than anyone voting on them.' : ''; }
      } else {
        if (age >= 18) { b.className = 'ballot yes'; b.innerHTML = '<b>VOTE — compulsory</b><span>Deliberately unchanged: compulsory voting and penalties stay exactly as they are from 18.</span>'; f.textContent = ''; }
        else if (age >= 16) { b.className = 'ballot gold'; b.innerHTML = '<b>VOTE — your choice</b><span>Voluntary at 16–17, no fines for sitting it out. A habit of democracy, started early.</span>'; f.textContent = 'Scotland enfranchised 16–17s in 2014: they voted in GREATER numbers than 18–24s — and the habit lasted.'; }
        else if (age >= 15) { b.className = 'ballot gold'; b.innerHTML = '<b>PRE-ENROL at 15</b><span>On the roll and ready for your first ballot at 16.</span>'; f.textContent = ''; }
        else { b.className = 'ballot no'; b.innerHTML = '<b>VOTE — not yet</b><span>Pre-enrolment opens at 15; the voluntary vote at 16.</span>'; f.textContent = ''; }
      }
    }
    root.querySelector('#xfvR').addEventListener('input', function () { age = +this.value; upd(); });
    root.querySelector('#xfvToday').addEventListener('click', function () { plan = false; this.classList.add('on'); root.querySelector('#xfvPlan').classList.remove('on'); upd(); });
    root.querySelector('#xfvPlan').addEventListener('click', function () { plan = true; this.classList.add('on'); root.querySelector('#xfvToday').classList.remove('on'); upd(); });
    upd();
  };

  /* ---- lab: run the lab (science) ------------------------------------------------------------
     One dial: government R&D as a share of GDP. Five research missions from the policy.
     At today's 0.52% you can't power them all — the OECD average (0.74%) lights the lot. */
  W.lab = function (root) {
    var MISSIONS = ['Food security', 'Clean energy', 'Climate adaptation', 'Health & wellbeing', 'Environment & wildlife'];
    root.innerHTML = '<div class="xpw-lab"><label class="xpw-sliderlab">Government R&amp;D, share of GDP<b id="xlbV">0.52%</b></label>' +
      '<div class="rail"><input type="range" min="30" max="100" step="1" value="52" id="xlbR">' +
      '<span class="mark today" style="left:31.4%">Australia today · 0.52%</span>' +
      '<span class="mark oecd" style="left:62.9%">OECD average · 0.74%</span></div>' +
      '<div class="benches" id="xlbB"></div>' +
      '<div class="xpw-big"><span>Status</span><b id="xlbT"></b><i id="xlbI"></i></div></div>';
    var wrap = root.querySelector('#xlbB');
    MISSIONS.forEach(function (m) { wrap.appendChild(el('div', 'bench', '<i class="lamp"></i><span>' + m + '</span><em>unfunded</em>')); });
    var benches = wrap.querySelectorAll('.bench');
    function upd() {
      var v = +root.querySelector('#xlbR').value / 100;
      root.querySelector('#xlbV').textContent = v.toFixed(2) + '%';
      // 0.30% powers 1 mission … 0.74% powers all 5
      var lit = Math.max(1, Math.min(5, Math.floor((v - 0.30) / (0.74 - 0.30) * 4) + 1));
      if (v >= 0.74) lit = 5;
      benches.forEach(function (b, i) {
        var on = i < lit;
        b.classList.toggle('lit', on);
        b.querySelector('em').textContent = on ? 'funded' : 'unfunded';
      });
      var t = root.querySelector('#xlbT'), n = root.querySelector('#xlbI');
      if (v < 0.45) { t.textContent = 'Lights going out'; n.textContent = 'Below even today’s spend — redundancy territory. CSIRO spent nearly $11 million on redundancies in 2023–24 alone.'; }
      else if (v < 0.6) { t.textContent = 'Australia today — 0.52%'; n.textContent = 'The lowest research funding among our major trading partners. Pick which national problems go unworked-on; the dial won’t let you fund them all.'; }
      else if (v < 0.74) { t.textContent = 'Climbing'; n.textContent = 'More missions come online — but still under the OECD average of 0.74%.'; }
      else if (v < 0.85) { t.textContent = 'OECD average — every mission funded'; n.textContent = 'Our plan: at least the OECD average within five years, aimed at food security, clean energy, climate adaptation, and health.'; }
      else { t.textContent = 'Leading, not lagging'; n.textContent = 'Beyond the average: research translation made easier, diversity backed, and the fossil-fuel research work ceased.'; }
    }
    root.querySelector('#xlbR').addEventListener('input', upd); upd();
  };

  /* ---- boot ------------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.xpw[data-widget]'), function (rootEl) {
      var kind = rootEl.getAttribute('data-widget');
      if (W[kind]) { try { W[kind](rootEl); rootEl.classList.add('is-live'); } catch (e) { /* widget stays empty, page unaffected */ } }
    });
  });
})();

/* ================== generation 2 — config-driven engines ==================
   Each engine reads a per-policy config keyed by the experience slug
   (data-slug on the container). Design stays locked in code. */
(function () {
  'use strict';
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  var W = (window.__XPW = window.__XPW || {});

  /* ---- CONFIGS, by slug ---------------------------------------------------- */
  var CFG = {
    /* gauges: {min,max,val,unit,fmt?,zones:[{to,label,cls}],verdict(v)->[title,text]} */
    'education-early-childhood': { engine: 'gauge', min: 60, max: 100, val: 78, unit: '%', label: 'Children starting school developmentally ready',
      verdict: function (v) {
        if (v < 80) return ['Where we are', '22% of Australian children start school developmentally vulnerable, and 126,000 miss early learning because of activity-test rules — while families pay some of the OECD’s highest childcare costs.'];
        if (v < 95) return ['Getting there', 'Scrapping the activity test and funding places for the children who benefit most closes the gap fastest.'];
        return ['The best start, for every child', 'Universal access, educators paid like the professionals they are, and no postcode lottery on a child’s first day of school.'];
      } },
    'education-the-arts': { engine: 'gauge', min: 0, max: 50, val: 10, unit: '%', label: 'Australian music on commercial radio & streaming',
      verdict: function (v) {
        if (v < 25) return ['Below the quota', 'Without quotas, Australian artists fight global algorithms for their own audience.'];
        if (v < 35) return ['Our plan: a 25% quota', 'Australian content quotas of around 25% on commercial radio AND streaming platforms like Spotify and Apple Music.'];
        return ['A creative, confident nation', 'Quotas plus restored arts training, festival support and safe creative workplaces — beyond the $949.5m Revive fund.'];
      } },
    'science-science': { engine: 'gauge', min: 0.3, max: 1.0, val: 0.52, unit: '% GDP', dec: 2, label: 'Government R&D spending',
      verdict: function (v) {
        if (v < 0.6) return ['Lowest among our trading partners', 'At 0.52% of GDP, Australia’s research funding trails every major trading partner.'];
        if (v < 0.74) return ['Climbing', 'Closing on the OECD average — our plan gets there within 5 years.'];
        return ['At least the OECD average', 'Core research capabilities funded for the national interest: food security, clean energy, climate adaptation, health.'];
      } },
    'health-youth-mental-health': { engine: 'gauge', min: 2007, max: 2021, val: 2007, unit: '', label: 'Scrub the years — 16–24-year-olds with a mental disorder', fmt: function (v) { return Math.round(v); },
      verdict: function (v) {
        var p = Math.round(26 + (v - 2007) / 14 * 13);
        if (v < 2010) return [p + '% in ' + Math.round(v), 'Roughly one in four young Australians — already too many.'];
        if (v < 2020) return [p + '% and rising', 'Cost of living, climate distress and social exclusion pushing prevalence up year on year.'];
        return ['39% by 2021 — 48% of young women', 'A 50% rise in 14 years. Our plan: intervene early, fund a community mental-health model, and reach the “missing middle” beyond 8 metro regions.'];
      } },
    /* duo2: slider + two panels {min,max,val,step,unit,pos?,label,left(v),right(v)} */
    'education-schooling': { engine: 'duo2', min: 80, max: 100, val: 88, step: 1, unit: '%', label: 'Public school funding, as % of the Schooling Resource Standard',
      leftH: 'Today', rightH: 'Our plan',
      left: function (v) { return v < 100 ? '<b>Underfunded by design.</b> Most public schools still sit below the standard, while private school funding grew nearly five times faster.' : '<b>Rarely reached.</b> Almost no public school actually receives the full standard today.'; },
      right: function (v) { return '<b>100% of the SRS — guaranteed.</b> Full Schooling Resource Standard funding for every public school, closing a widening gap between the top and bottom quartiles.'; } },
    'science-transport': { engine: 'duo2', min: 0, max: 60, val: 12, step: 1, unit: '%', label: 'EVs as a share of new car sales',
      leftH: 'Where that leaves us', rightH: 'What net zero needs',
      left: function (v) { return v < 20 ? '<b>12% today.</b> Half of new sales are SUVs, 30% diesel — subsidised by $10.2 billion a year — and transport becomes our biggest-emitting sector by 2030.' : v < 52 ? '<b>Better, not enough.</b> The curve has to keep bending.' : '<b>That’s the track.</b>'; },
      right: function (v) { return '<b>52% within five years.</b> That’s the EV share needed to stay on the net-zero path — driven by real vehicle emissions standards and ending the diesel subsidy.'; } },
    'transparency-lowering-the-voting-age': { engine: 'duo2', min: 14, max: 25, val: 16, step: 1, unit: ' yrs', label: 'Your age',
      leftH: 'Today', rightH: 'Our plan',
      left: function (v) { return v < 18 ? '<b>No say.</b> You can work, pay tax and drive — but not vote on the decisions you’ll inherit longest.' : '<b>Compulsory vote.</b> Enrolled and required to vote, as now.'; },
      right: function (v) { return v < 16 ? '<b>Not yet.</b> The voluntary vote starts at 16.' : v < 18 ? '<b>Your choice.</b> Voluntary enrolment and voting at 16–17 — no fines for sitting it out, a habit of democracy for life.' : '<b>Unchanged.</b> Compulsory voting from 18 stays exactly as it is.'; } },
    /* pick2: scenario buttons + one or two panels {items:[{n,a,b?}],leftH,rightH?} */
    'equity-standing-with-first-nations': { engine: 'pick2', leftH: 'What it means', items: [
      { n: 'Voice', a: 'Deep listening — supporting state-level voices and connecting them to genuine listening federally, so decisions about communities are made with them.' },
      { n: 'Treaty', a: 'Agreement-making that recognises self-determination at community level, in line with the UN Declaration on the Rights of Indigenous Peoples.' },
      { n: 'Truth', a: 'Truth-telling backed by civics education — telling the stories of who we are as a nation so we can move forward together.' },
      { n: 'Economic independence', a: 'Addressing inequities in wealth distribution with evidence-informed, culturally safe programs — as the Productivity Commission’s Closing the Gap review recommends.' }] },
    'global-respect-in-foreign-affairs': { engine: 'pick2', leftH: 'Our position', items: [
      { n: 'Peace first', a: 'An enduring ceasefire in Gaza, the West Bank and Lebanon; self-determination for the Palestinian people; economic restrictions lifted.' },
      { n: 'Women at the table', a: 'Women as equal partners in peace negotiations and security decision-making — because the data says hardly anything has changed.' },
      { n: 'An independent voice', a: 'Foreign policy set in Canberra, in Australia’s interest — engaged with our region, captive to no ally.' },
      { n: 'Aid that builds peace', a: 'De-escalation, conflict prevention and development doing the heavy lifting security spending can’t.' }] },
    'global-securing-the-nation': { engine: 'pick2', leftH: 'Today’s plan', rightH: 'Ours', items: [
      { n: 'The posture', a: 'Offence-projection: billions on long-range, long-lead-time war-fighting kit that offers Australia itself little protection.', b: 'Defence of Australia: the national interest at the core, an independent voice in foreign affairs.' },
      { n: 'The kit', a: 'Enormous platforms arriving decades from now, hostage to other nations’ shipyards and priorities.', b: 'Smaller, smarter, far less costly equipment that actually defends the continent.' },
      { n: 'The threat picture', a: 'Climate risk fuels instability across the Indo-Pacific while we prepare for someone else’s war.', b: 'A strategy that treats climate impacts as the security risk our own defence establishment says they are.' }] },
    'health-family-and-sexual-violence': { engine: 'pick2', leftH: 'What has to change', items: [
      { n: 'Measure what matters', a: 'Accountability for actually preventing violence — success measured in prevention, with real consequences for perpetrators.' },
      { n: 'Break the cycle', a: 'A stronger focus on preventing and recovering from intergenerational trauma and child abuse.' },
      { n: 'Stand up to the lobbies', a: 'Alcohol, gambling and pornography lobbyists have repeatedly watered down protections — that access ends.' },
      { n: 'Fund the escape routes', a: 'Survivor support, preventive and reactive — domestic violence is a leading cause of homelessness, and 60% of single mothers are survivors.' }] },
    'health-good-health': { engine: 'pick2', leftH: 'The odds today', rightH: 'Under our plan', items: [
      { n: 'Living rural or remote', a: 'Shorter lives, more disease and injury, and the fewest doctors per person in the country.', b: 'Healthcare planned as a right: workforce review, facility audits, and services that reach past the cities.' },
      { n: 'First Nations Australians', a: 'Persistent, documented gaps in outcomes across nearly every measure.', b: 'Culturally safe, evidence-informed care with community control at the centre.' },
      { n: 'Living with mental illness', a: 'A system that treats the crisis and misses the person.', b: 'Early intervention and integrated care rather than emergency-only medicine.' },
      { n: 'A heating country', a: 'Heatwaves, vector-borne disease and disaster trauma arriving faster than the system can adapt.', b: 'A health system audited and prepared for the climate era before it hits.' }] },
    'rural-agriculture': { engine: 'pick2', leftH: 'What we’d do', items: [
      { n: 'Biosecurity', a: 'Review and modernise biosecurity policy for current and emerging threats — the whole food supply depends on it.' },
      { n: 'Workforce', a: 'Grow the skilled agricultural workforce, with agriculture taught as a curriculum subject in every secondary school.' },
      { n: 'Research', a: 'Invest in research, technology and working models that lift sustainable farm production.' },
      { n: 'The long game', a: 'Long-term support for education and training providers so farming careers survive the drought years too.' }] },
    /* quiz2: {q:[{q,opts:[..2],ok,why}]} */
    'transparency-reforming-the-constitution': { engine: 'quiz2', qs: [
      { q: 'Does the Constitution mention the Prime Minister?', opts: ['Yes', 'No'], ok: 1, why: 'No. Nor cabinet, political parties, or the opposition — the actual machinery of government is nowhere in it.' },
      { q: 'Does it guarantee your right to vote?', opts: ['Yes', 'No'], ok: 1, why: 'No. Universal suffrage and compulsory voting are absent — our plan writes an express right to vote into it.' },
      { q: 'Does it recognise First Nations peoples?', opts: ['Yes', 'No'], ok: 1, why: 'No. Recognition of Aboriginal and Torres Strait Islander peoples as First Nations is part of our reform platform.' },
      { q: 'Does it name an Australian head of state?', opts: ['Yes', 'No'], ok: 1, why: 'No — there is no reference to a head of state at all. We support a republic with an Australian head of state.' }],
      final: 'The rulebook of our democracy doesn’t mention the PM, your vote, First Nations peoples or an Australian head of state. Our plan: a strategic, people-led program of modernisation — not ad hoc referendums.' },
    'science-media': { engine: 'quiz2', qs: [
      { q: 'Who decides what news you see on a platform feed?', opts: ['An editor', 'An engagement algorithm'], ok: 1, why: 'Real-time behavioural data tunes your feed for engagement — not accuracy, not importance.' },
      { q: 'Have Australian media ownership rules become stricter or weaker?', opts: ['Stricter', 'Weaker'], ok: 1, why: 'Weakened over time, concentrating ownership — while big tech fights regulation of its own power.' },
      { q: 'Who has more reach than any government regulator?', opts: ['Public broadcasters', 'Big tech platforms'], ok: 1, why: 'Billions of users give platforms the market power to challenge the authority of governments themselves.' }],
      final: 'A healthy democracy needs a healthy information ecosystem: independent media protected, big-tech whistleblowers shielded, and political communication kept free and scrutinised.' },
    /* scales: {leftH,rightH,items:[{n,side:0|1,w}],verdict} */
    'equity-juvenile-justice': { engine: 'scales', leftH: 'Locking up children', rightH: 'What the evidence backs',
      items: [
        { n: 'Criminal age of 10', side: 0 }, { n: 'Solitary confinement', side: 0 }, { n: 'Spit hoods & restraint', side: 0 },
        { n: 'Raise the age to 14+', side: 1 }, { n: 'Early intervention', side: 1 }, { n: 'Diversion & support services', side: 1 }],
      finalTilt: 7,
      verdict: 'Criminologists, the AMA, the Law Council and Amnesty agree: there is no credible evidence that jailing 10–14-year-olds reduces crime. The evidence side wins — every time it’s weighed.' },
    'rural-rural-and-remote-services': { engine: 'scales', leftH: 'What the bush gives', rightH: 'What it gets back',
      items: [
        { n: '80% of export revenue', side: 0 }, { n: '90% of the nation’s food', side: 0 }, { n: '50% of tourism income', side: 0 },
        { n: 'Shorter lives', side: 1 }, { n: 'Fewer doctors', side: 1 }, { n: 'Services hours away', side: 1 }],
      finalTilt: -7,
      verdict: 'Thirty percent of Australians carry the economy and are repaid with poorer health and thinner services. Our plan: a 10-year rural health strategy behind a $1 billion rural health fund.' },
    /* orbit: dot matrix {total,per,states:[{n,count,text}]} */
    'global-nuclear-weapons-and-power': { engine: 'orbit', total: 131, per: 100,
      states: [
        { n: 'All warheads', count: 131, text: '≈13,080 nuclear warheads are held by nine states — the US and Russia hold 90% of them.' },
        { n: 'On high alert', count: 20, text: '≈2,000 warheads sit on high operational alert — minutes from launch, every day.' },
        { n: 'What makes Australia safer', count: 0, text: 'Zero. We back the UN Treaty on the Prohibition of Nuclear Weapons — and renewables, not reactors, for our grid (45% renewable already, 82% targeted by 2030).' }] },
    /* tick2: {perSec,label,meter:{from,fromLabel,to,toLabel},flip} */
    'health-gambling-reform': { engine: 'tick2', perSec: 792,
      label: 'lost by Australians to gambling since you opened this page — about $25 billion a year, the biggest per-person losses in the world',
      flipLabel: 'Ban the ads', unflipLabel: 'Back to today',
      today: 'Gambling ads run free-to-air, on streaming, social media and billboards — stitched into the sport itself.',
      plan: 'Our plan: ban gambling advertising across TV, radio, streaming, social and billboards; a National Casino Regulator and Online Gaming Ombudsman; and real harm-reduction duties on operators.' },
    /* race: two lanes {goLabel,leftH,rightH,left:[..],right:[..]} */
    'rural-rural-communications': { engine: 'race', goLabel: 'Report a dropped service',
      leftH: 'The bush — today', rightH: 'Essential-service standard — our plan',
      left: ['Fault logged (one of 51,854 in 3 years)', 'Wait… the outage outlasts the harvest', 'Escalated… years pass in some towns', 'Still no reliable signal for the next flood'],
      right: ['Telcos held to an essential-service standard', 'Resilient coverage built for disaster zones', 'Fixed — because it finally has to be'] },
  };
  /* equity duplicates share the proven calculators */
  CFG['equity-cost-of-living'] = { engine: '_alias', kind: 'col' };
  CFG['equity-housing-security'] = { engine: '_alias', kind: 'housing' };

  /* ---- ENGINES --------------------------------------------------------------- */
  var E = {};

  E.gauge = function (root, c) {
    root.innerHTML = '<div class="xpw-gauge"><div class="dial"><svg viewBox="0 0 200 118">' +
      '<path class="track" d="M14 108 A86 86 0 0 1 186 108" fill="none" stroke-width="14" stroke-linecap="round"/>' +
      '<path class="arc" id="xpwArc" d="M14 108 A86 86 0 0 1 186 108" fill="none" stroke-width="14" stroke-linecap="round"/></svg>' +
      '<b id="xpwGv"></b></div>' +
      '<label class="xpw-sliderlab"><span>' + c.label + '</span></label>' +
      '<input type="range" min="' + c.min * 100 + '" max="' + c.max * 100 + '" value="' + c.val * 100 + '" id="xpwGr">' +
      '<div class="xpw-big"><span>What it means</span><b id="xpwGt"></b><i id="xpwGi"></i></div></div>';
    var arc = root.querySelector('#xpwArc'), r = root.querySelector('#xpwGr');
    var LEN = arc.getTotalLength();
    arc.style.strokeDasharray = LEN;
    function upd() {
      var v = +r.value / 100;
      var p = (v - c.min) / (c.max - c.min);
      arc.style.strokeDashoffset = LEN * (1 - p);
      arc.style.stroke = p < .45 ? '#d06a55' : p < .8 ? '#f5b94d' : '#1f877a';
      root.querySelector('#xpwGv').textContent = (c.fmt ? c.fmt(v) : (c.dec ? v.toFixed(c.dec) : Math.round(v))) + (c.unit || '');
      var vd = c.verdict(v);
      root.querySelector('#xpwGt').textContent = vd[0];
      root.querySelector('#xpwGi').textContent = vd[1];
    }
    r.addEventListener('input', upd); upd();
  };

  E.duo2 = function (root, c) {
    root.innerHTML = '<div class="xpw-dial"><label class="xpw-sliderlab">' + c.label + '<b id="xpwDv"></b></label>' +
      '<input type="range" min="' + c.min + '" max="' + c.max + '" step="' + (c.step || 1) + '" value="' + c.val + '" id="xpwDr">' +
      '<div class="xpw-duo"><div class="xpw-panel bad"><h4>' + c.leftH + '</h4><p id="xpwDl"></p></div>' +
      '<div class="xpw-panel good"><h4>' + c.rightH + '</h4><p id="xpwDrp"></p></div></div></div>';
    var r = root.querySelector('#xpwDr');
    function upd() {
      var v = +r.value;
      root.querySelector('#xpwDv').textContent = v + (c.unit || '');
      root.querySelector('#xpwDl').innerHTML = c.left(v);
      root.querySelector('#xpwDrp').innerHTML = c.right(v);
    }
    r.addEventListener('input', upd); upd();
  };

  E.pick2 = function (root, c) {
    var two = !!c.rightH;
    root.innerHTML = '<div class="xpw-renters"><div class="pick" id="xpwPp"></div><div class="xpw-duo' + (two ? '' : ' solo') + '">' +
      '<div class="xpw-panel ' + (two ? 'bad' : 'good') + '"><h4>' + c.leftH + '</h4><p id="xpwPa"></p></div>' +
      (two ? '<div class="xpw-panel good"><h4>' + c.rightH + '</h4><p id="xpwPb"></p></div>' : '') + '</div></div>';
    var pick = root.querySelector('#xpwPp');
    c.items.forEach(function (s, i) {
      var btn = el('button', null, s.n); btn.type = 'button';
      btn.addEventListener('click', function () {
        pick.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        btn.classList.add('on');
        root.querySelector('#xpwPa').textContent = s.a;
        if (two) root.querySelector('#xpwPb').textContent = s.b || '';
      });
      pick.appendChild(btn); if (i === 0) btn.click();
    });
  };

  E.quiz2 = function (root, c) {
    var i = 0, score = 0;
    root.innerHTML = '<div class="xpw-quiz"><p class="prog" id="xq2p"></p><p class="q" id="xq2q"></p>' +
      '<div class="btns"><button type="button" id="xq2a"></button><button type="button" id="xq2b"></button></div>' +
      '<p class="why" id="xq2w" hidden></p><button type="button" class="next" id="xq2n" hidden>Next →</button></div>';
    var qE = root.querySelector('#xq2q'), why = root.querySelector('#xq2w'), next = root.querySelector('#xq2n'),
        A = root.querySelector('#xq2a'), B = root.querySelector('#xq2b'), prog = root.querySelector('#xq2p');
    function show() {
      if (i >= c.qs.length) {
        prog.textContent = 'Result';
        qE.innerHTML = 'You got <b>' + score + ' of ' + c.qs.length + '</b>. ' + c.final;
        A.hidden = B.hidden = next.hidden = true; why.hidden = true; return;
      }
      prog.textContent = 'Question ' + (i + 1) + ' of ' + c.qs.length;
      qE.textContent = c.qs[i].q; A.textContent = c.qs[i].opts[0]; B.textContent = c.qs[i].opts[1];
      why.hidden = next.hidden = true; A.hidden = B.hidden = false;
      A.disabled = B.disabled = false; A.classList.remove('hit', 'miss'); B.classList.remove('hit', 'miss');
    }
    function answer(k) {
      var right = k === c.qs[i].ok;
      if (right) score++;
      (k === 0 ? A : B).classList.add(right ? 'hit' : 'miss');
      why.textContent = (right ? '✓ Right. ' : '✗ Not quite. ') + c.qs[i].why;
      why.hidden = false; next.hidden = false; A.disabled = B.disabled = true;
    }
    A.addEventListener('click', function () { answer(0); });
    B.addEventListener('click', function () { answer(1); });
    next.addEventListener('click', function () { i++; show(); });
    show();
  };

  E.scales = function (root, c) {
    root.innerHTML = '<div class="xpw-scales"><p class="hint">Tap each weight to place it on the scale:</p><div class="pool" id="xsPool"></div>' +
      '<div class="rig"><div class="beam" id="xsBeam"><div class="pan l"><h5>' + c.leftH + '</h5><div id="xsL"></div></div>' +
      '<div class="pan r"><h5>' + c.rightH + '</h5><div id="xsR"></div></div></div><div class="post"></div></div>' +
      '<p class="verdict" id="xsV" hidden></p></div>';
    var pool = root.querySelector('#xsPool'), L = root.querySelector('#xsL'), R = root.querySelector('#xsR'),
        beam = root.querySelector('#xsBeam'), placed = 0, lw = 0, rw = 0;
    c.items.forEach(function (it) {
      var b = el('button', null, it.n); b.type = 'button';
      b.addEventListener('click', function () {
        if (b.disabled) return;
        b.disabled = true; b.classList.add('gone');
        var chip = el('span', 'w', it.n);
        (it.side === 0 ? L : R).appendChild(chip);
        if (it.side === 0) lw++; else rw++;
        placed++;
        var tilt = (rw - lw) * 3.2;
        beam.style.transform = 'rotate(' + Math.max(-10, Math.min(10, tilt)) + 'deg)';
        if (placed === c.items.length) {
          var v = root.querySelector('#xsV'); v.textContent = c.verdict; v.hidden = false;
          beam.classList.add('done');
          setTimeout(function () { beam.style.transform = 'rotate(' + (c.finalTilt || 0) + 'deg)'; }, 350);
        }
      });
      pool.appendChild(b);
    });
  };

  E.orbit = function (root, c) {
    root.innerHTML = '<div class="xpw-orbit"><div class="dots" id="xoDots"></div><div class="ctl" id="xoCtl"></div><p class="txt" id="xoTxt"></p></div>';
    var dots = root.querySelector('#xoDots');
    for (var i = 0; i < c.total; i++) dots.appendChild(el('i'));
    var all = dots.children;
    var ctl = root.querySelector('#xoCtl');
    c.states.forEach(function (s, si) {
      var b = el('button', null, s.n); b.type = 'button';
      b.addEventListener('click', function () {
        ctl.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        Array.prototype.forEach.call(all, function (d, di) {
          setTimeout(function () { d.classList.toggle('lit', di < s.count); }, Math.min(di * 6, 700));
        });
        root.querySelector('#xoTxt').textContent = s.text + (s.count > 0 ? ' (each dot ≈ ' + c.per + ' warheads)' : '');
      });
      ctl.appendChild(b);
      if (si === 0) b.click();
    });
  };

  E.tick2 = function (root, c) {
    root.innerHTML = '<div class="xpw-truck"><div class="tick"><b id="xt2v">$0</b><span>' + c.label + '</span></div>' +
      '<p class="mode" id="xt2m"></p><button type="button" id="xt2b"></button></div>';
    var t0 = Date.now(), v = root.querySelector('#xt2v');
    setInterval(function () {
      var d = Math.floor((Date.now() - t0) / 1000 * c.perSec);
      v.textContent = '$' + d.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }, 250);
    var on = false, m = root.querySelector('#xt2m'), b = root.querySelector('#xt2b');
    function set() { m.textContent = on ? c.plan : c.today; b.textContent = on ? c.unflipLabel : c.flipLabel; }
    b.addEventListener('click', function () { on = !on; set(); }); set();
  };

  E.race = function (root, c) {
    root.innerHTML = '<div class="xpw-foi"><button type="button" id="xr2go">' + c.goLabel + '</button>' +
      '<div class="lanes"><div class="lane bad"><h4>' + c.leftH + '</h4><ol id="xr2a"></ol></div>' +
      '<div class="lane good"><h4>' + c.rightH + '</h4><ol id="xr2b"></ol></div></div></div>';
    var la = root.querySelector('#xr2a'), lb = root.querySelector('#xr2b');
    c.left.forEach(function (t) { la.appendChild(el('li', null, '<span>' + t + '</span>')); });
    c.right.forEach(function (t) { lb.appendChild(el('li', null, '<span>' + t + '</span>')); });
    var running = false;
    root.querySelector('#xr2go').addEventListener('click', function () {
      if (running) return; running = true;
      Array.prototype.forEach.call(la.children, function (li) { li.classList.remove('on'); });
      Array.prototype.forEach.call(lb.children, function (li) { li.classList.remove('on'); });
      Array.prototype.forEach.call(lb.children, function (li, i) { setTimeout(function () { li.classList.add('on'); }, 350 + i * 500); });
      Array.prototype.forEach.call(la.children, function (li, i) { setTimeout(function () { li.classList.add('on'); if (i === la.children.length - 1) running = false; }, 600 + i * 1000); });
    });
  };

  /* ---- boot gen-2 (runs after gen-1's boot; unclaimed containers only) ------- */
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.xpw[data-widget]:not(.is-live)'), function (rootEl) {
      var slug = rootEl.getAttribute('data-slug') || '';
      var c = CFG[slug];
      if (!c) return;
      try {
        if (c.engine === '_alias') return; /* alias kinds are claimed by gen-1 via data-widget */
        E[c.engine](rootEl, c);
        rootEl.classList.add('is-live');
      } catch (e) { /* widget stays empty, page unaffected */ }
    });
  });
})();
