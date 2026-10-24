/* ==========================================================================
   BRICK BY BRICK — Escape from Page 404
   The Lost Page Arcade · Australian Democrats 404 page
   --------------------------------------------------------------------------
   A self-contained, dependency-free canvas brick-smasher. The bricks spell
   the story: 404 → LOST → OOPS → HOME. Clear HOME and you've literally
   found your way home. Full design brief: docs/404-ARCADE-BRIEF.md
   Runs only on the 404 page (elements are only in src/pages/404.astro).

   EDITIONS (round 32). This file IS the classic cabinet, unchanged in what it
   draws and how it plays. A second cabinet, the WIDESCREEN EDITION, lives in
   notfound-arcade-wide.js as a PLUGIN: it is fetched only on a desktop that
   qualifies for it (see WIDE_MQ below), registers itself through the small
   surface exported on window.__NF_ARCADE, and the engine calls it at a fixed
   set of hook points — all FIFTEEN of them: activate, measure, buildLevel,
   onReset, update, onBreak, powerups, powerup, paddleScale, kbSpeed,
   drawBricks, pills, attract, onField, deactivate. (Roughly the order they
   first fire in: activate runs when the plugin registers, onBreak before
   powerup. An earlier draft called this list "in call order" and had those
   two the wrong way round.) Every hook is guarded, so with
   no plugin loaded — every phone — this file behaves exactly as it did before
   the edition existed. Search "plugin &&" for them: 19 matches, of which two are
   in comments and two (the no-op guard in setEdition, the !plugin test in
   applyEdition) are not hook calls.
   docs/404-ARCADE-BRIEF.md "Widescreen edition" is the write-up.
   ========================================================================== */
(() => {
  'use strict';

  const canvas = document.getElementById('nfCanvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const shell = document.getElementById('nfShell');
  const screenEl = document.getElementById('nfScreen');
  const overlay = document.getElementById('nfOverlay');
  const soundBtn = document.getElementById('nfSound');
  const pauseBtn = document.getElementById('nfPause');
  const restartBtn = document.getElementById('nfRestart');
  const fullBtn = document.getElementById('nfFull');
  const exitFsBtn = document.getElementById('nfExitFs');
  const menuFsBtn = document.getElementById('nfMenuFs');
  const fsbar = screenEl ? screenEl.querySelector('.nf-fsbar') : null;   // the full-screen MENU + ✕ pair; the HUD keeps clear of it (hudInset)

  /* ---------- logical playfield (all game maths lives in these units) ---- */
  let LW = 480;                      // logical width — a VARIABLE: the widescreen edition derives it
                                     // from the canvas box (setField); the classic cabinet is always 480
  const LH = 560;                    // logical height — fixed in both editions (physics is per-560)
  const LW_CLASSIC = 480;
  const HUD_H = 34;                  // in-canvas HUD bar height
  const PADDLE_Y = LH - 44;

  /* ---------- brand palette -------------------------------------------- */
  const C = {
    bg0: '#0c2320', bg1: '#123832',
    green: '#29a895', greenDeep: '#1f877a', gold: '#fcd666', goldDeep: '#e8b83a',
    ink: '#1d2a28', white: '#eafff9', red: '#ff6b6b',
    brick1: ['#2fbfa9', '#29a895', '#1f877a', '#17685e'],
    brick2: '#0f5a50', brick3: '#0a3f38',
  };

  /* ---------- persistence ---------------------------------------------- */
  const LS_HI = 'ausdems-404-arcade-hiscore';
  const LS_MUTE = 'ausdems-404-arcade-muted';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the active EDITION plugin (null = the classic cabinet). Declared up here
  // because resize() and buildLevel() consult it; see EDITIONS near the foot.
  let plugin = null;
  let applyPending = false;   // a plugin registered mid-board: applied when the board ends (NF.use)

  /* ======================================================================
     AUDIO — a tiny WebAudio synth. Created lazily on first gesture, never
     autoplays, master volume kept polite. M key / button toggles mute.
     ====================================================================== */
  let actx = null, master = null;
  let muted = store.get(LS_MUTE) === '1';
  function audioInit() {
    if (actx || muted) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.16;
      master.connect(actx.destination);
    } catch { actx = null; }
  }
  function blip(freq, dur = 0.07, type = 'square', vol = 1, slide = 0) {
    if (muted || !actx || actx.state === 'suspended') return;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function chord(notes, step = 0.09, dur = 0.12, type = 'square', vol = 0.9) {
    notes.forEach((n, i) => setTimeout(() => blip(n, dur, type, vol), i * step * 1000));
  }
  const sfx = {
    paddle: () => blip(196, 0.06, 'square', 0.8),
    wall: () => blip(150, 0.05, 'triangle', 0.6),
    brick: (combo) => blip(300 + Math.min(combo, 20) * 26, 0.07, 'square', 0.9),
    tough: () => blip(120, 0.09, 'sawtooth', 0.8, -40),
    laser: () => blip(880, 0.09, 'sawtooth', 0.5, -520),
    power: () => chord([392, 523, 659], 0.07, 0.1),
    life: () => chord([523, 659, 784, 1046], 0.08, 0.12),
    lost: () => chord([330, 262, 196, 147], 0.11, 0.16, 'triangle'),
    levelClear: () => chord([523, 659, 784, 1046, 1318], 0.09, 0.14),
    gameOver: () => chord([392, 330, 262, 196, 131], 0.14, 0.2, 'triangle'),
    victory: () => chord([523, 659, 784, 659, 784, 1046, 1318, 1568], 0.11, 0.16),
    fire: () => blip(90, 0.2, 'sawtooth', 0.9, 220),
  };
  function updateSoundBtn() {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', String(!muted));
    soundBtn.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
  }
  function toggleMute() {
    muted = !muted;
    store.set(LS_MUTE, muted ? '1' : '0');
    if (!muted) { audioInit(); sfx.power(); }
    updateSoundBtn();
  }

  /* ======================================================================
     LEVELS — 5×5 pixel font; the bricks spell the escape arc,
     ten words from the error all the way home.
     ====================================================================== */
  const GLYPHS = {
    '4': ['00010', '00110', '01010', '11111', '00010'],
    '0': ['01110', '10001', '10001', '10001', '01110'],
    'A': ['01110', '10001', '11111', '10001', '10001'],
    'C': ['01110', '10001', '10000', '10001', '01110'],
    'D': ['11110', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '11110', '10000', '11111'],
    'H': ['10001', '10001', '11111', '10001', '10001'],
    'I': ['11111', '00100', '00100', '00100', '11111'],
    'K': ['10001', '10010', '11100', '10010', '10001'],
    'L': ['10000', '10000', '10000', '10000', '11111'],
    'M': ['10001', '11011', '10101', '10001', '10001'],
    'N': ['10001', '11001', '10101', '10011', '10001'],
    'O': ['01110', '10001', '10001', '10001', '01110'],
    'P': ['11110', '10001', '11110', '10000', '10000'],
    'R': ['11110', '10001', '11110', '10010', '10001'],
    'S': ['01111', '10000', '01110', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100'],
    'V': ['10001', '10001', '10001', '01010', '00100'],
    'X': ['10001', '01010', '00100', '01010', '10001'],
    'Z': ['11111', '00010', '00100', '01000', '11111'],
  };
  // word, ball speed, share of 2-hit bricks, share of 3-hit bricks, tagline.
  // `bonus:true` = an Australian Democrats interlude (all-gold, single-hit, not
  // counted in the X/10 escape arc). `big` = oversized glyphs; `lines` = stack
  // the word across multiple brick rows.
  const LEVELS = [
    // the escape arc first: 404 all the way HOME…
    { word: '404',  speed: 285, hp2: 0.00, hp3: 0.00, tag: 'SMASH THE ERROR' },
    { word: 'LOST', speed: 300, hp2: 0.15, hp3: 0.00, tag: 'FIND THE WAY' },
    { word: 'OOPS', speed: 315, hp2: 0.22, hp3: 0.00, tag: 'NO TURNING BACK' },
    { word: 'LINK', speed: 325, hp2: 0.25, hp3: 0.05, tag: 'THE LINK WAS CROOK' },
    { word: 'VOID', speed: 335, hp2: 0.28, hp3: 0.08, tag: 'INTO THE DEEP' },
    { word: 'MAZE', speed: 345, hp2: 0.30, hp3: 0.10, tag: 'EVERY WALL FALLS' },
    { word: 'PATH', speed: 352, hp2: 0.32, hp3: 0.12, tag: 'CARVE IT OUT' },
    { word: 'DOOR', speed: 360, hp2: 0.34, hp3: 0.14, tag: 'KNOCK IT DOWN' },
    { word: 'EXIT', speed: 366, hp2: 0.36, hp3: 0.16, tag: 'ALMOST OUT…' },
    { word: 'HOME', speed: 372, hp2: 0.38, hp3: 0.18, tag: 'HOME AT LAST' },
    // …then two Australian Democrats bonus rounds close it out
    { word: 'AD', bonus: true, big: true, speed: 300, hp2: 0, hp3: 0, tag: '★ AUSTRALIAN DEMOCRATS ★' },
    { word: 'DEMOCRATS', lines: ['DEMO', 'CRATS'], bonus: true, speed: 300, hp2: 0, hp3: 0, tag: '★ KEEP THE BASTARDS HONEST ★' },
  ];
  // main levels are the escape arc (bonus rounds don't count toward "X/10")
  const MAIN_TOTAL = LEVELS.filter((l) => !l.bonus).length;
  function mainNo(idx) { let n = 0; for (let k = 0; k <= idx; k++) if (!LEVELS[k].bonus) n++; return n; }

  /* ======================================================================
     POWER-UPS — falling capsules; catch them with the paddle.
     Weighted table; LIFE is deliberately rare.
     ====================================================================== */
  const POWERUPS = [
    { id: 'split', label: 'SENATE SPLIT',       short: '×3', color: C.green,    weight: 22 },
    { id: 'wide',  label: 'SUPERMAJORITY',      short: '⇔',  color: C.greenDeep, weight: 22 },
    { id: 'laser', label: 'QUESTION TIME',      short: '‼',  color: C.gold,     weight: 18 },
    { id: 'slow',  label: 'FILIBUSTER',         short: '◔',  color: '#7fd4c7',  weight: 16 },
    { id: 'fire',  label: 'DOUBLE DISSOLUTION', short: '✹',  color: C.goldDeep, weight: 14 },
    { id: 'life',  label: 'CASTING VOTE',       short: '+1', color: C.red,      weight: 8 },
  ];
  const PU_TOTAL_WEIGHT = POWERUPS.reduce((s, p) => s + p.weight, 0);
  function rollPowerup() {
    // the edition may add capsules of its own (the widescreen SPIN) — same
    // weighted roll over the combined table; with no plugin this is the
    // classic table and the classic odds
    const table = (plugin && plugin.powerups && plugin.powerups.length) ? POWERUPS.concat(plugin.powerups) : POWERUPS;
    const total = table === POWERUPS ? PU_TOTAL_WEIGHT : table.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of table) { r -= p.weight; if (r <= 0) return p; }
    return POWERUPS[0];
  }

  /* ======================================================================
     GAME STATE
     ====================================================================== */
  const S = {
    mode: 'attract',      // attract | ready | playing | levelbanner | gameover | victory | paused
    prevMode: null,       // mode to return to after pause
    level: 0,             // index into LEVELS
    loop: 1,              // difficulty loop (increments after HOME is cleared)
    score: 0,
    hiScore: parseInt(store.get(LS_HI) || '0', 10) || 0,
    lives: 3,
    combo: 0,
    bricks: [],
    bricksLeft: 0,
    balls: [],
    lasers: [],
    capsules: [],
    particles: [],
    popups: [],
    paddle: { x: LW / 2, w: 84, baseW: 84, targetW: 84, h: 13 },
    fx: { shake: 0, flash: 0, slowmo: 0, bannerT: 0 },
    timers: { wide: 0, laser: 0, slow: 0, fire: 0, laserCd: 0 },
    time: 0,
    started: false,       // has the player ever interacted with the cabinet
    konami: 0,
  };
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  /* ---------- starfield backdrop (the Void of Lost Pages) ---------------
     Built for the CURRENT field width — 70 stars on the classic 480 (the
     numbers the phone has always had), proportionally more across a wide
     field. Rebuilt by setField() whenever the width changes. */
  function makeStars() {
    return Array.from({ length: Math.round(70 * LW / LW_CLASSIC) }, (_, i) => ({
      x: (i * 137.5) % LW,
      y: (i * 89.7) % LH,
      r: 0.6 + (i % 3) * 0.5,
      s: 6 + (i % 5) * 5,
    }));
  }
  let stars = makeStars();

  /* ======================================================================
     LEVEL BUILD
     ====================================================================== */
  function buildLevel(idx) {
    const lvl = LEVELS[idx];
    const lines = lvl.lines || [lvl.word];  // one or more rows of text
    const GR = 5;                            // glyph rows per line
    const margin = 22, gapX = 3, gapY = 4;
    const maxLen = Math.max.apply(null, lines.map((w) => w.length));
    const cols = maxLen * 6 - 1;             // column slots for the widest line
    // the MEASURE the word is set on: the whole field in the classic cabinet;
    // the widescreen plugin caps it so the bricks keep their proportions
    // instead of stretching to fill a field three times as wide
    const M = (plugin && plugin.measure) ? plugin.measure() : LW;
    const bw = (M - margin * 2 - (cols - 1) * gapX) / cols;
    const bh = lvl.big ? Math.min(30, bw) : (lines.length > 1 ? 12 : 15);
    const lineGap = lvl.big ? 12 : 14;
    const startY = lvl.big ? (HUD_H + 46) : (lines.length > 1 ? (HUD_H + 22) : (HUD_H + 30));
    S.bricks = [];
    for (let li = 0; li < lines.length; li++) {
      const word = lines[li];
      const span = word.length * 6 - 1;                       // column slots this line spans
      const lineW = span * bw + (span - 1) * gapX;
      const lineX = (LW - lineW) / 2;                         // centre each line
      const lineY = startY + li * (GR * (bh + gapY) + lineGap);
      for (let r = 0; r < GR; r++) {
        for (let ci = 0; ci < word.length; ci++) {
          const glyph = GLYPHS[word[ci]];
          if (!glyph) continue;
          for (let cc = 0; cc < 5; cc++) {
            if (glyph[r][cc] !== '1') continue;
            const col = ci * 6 + cc;
            let hp = 1;
            if (!lvl.bonus) {
              const roll = Math.random();
              if (roll < lvl.hp3 + (S.loop - 1) * 0.05) hp = 3;
              else if (roll < lvl.hp3 + lvl.hp2 + (S.loop - 1) * 0.08) hp = 2;
            }
            const gold = lvl.bonus ? true : (Math.random() < 0.07); // bonus = all-gold logo bricks
            S.bricks.push({
              x: lineX + col * (bw + gapX), y: lineY + r * (bh + gapY),
              w: bw, h: bh, hp, maxHp: hp, gold, row: r, line: li, flash: 0,
            });
          }
        }
      }
    }
    // One Australian Democrats block each NORMAL round — a gold "AD" brick worth
    // bonus points that always drops a power-up. (Bonus rounds are already all-AD.)
    if (!lvl.bonus && S.bricks.length) {
      const midX = LW / 2;
      let adBrick = S.bricks[0], best = Infinity;
      for (const b of S.bricks) {
        const d = Math.abs((b.x + b.w / 2) - midX) + b.row * 60; // prefer top rows, centre columns
        if (d < best) { best = d; adBrick = b; }
      }
      adBrick.ad = true;
      adBrick.gold = true;
      adBrick.hp = 1;
      adBrick.maxHp = 1;
    }

    S.bricksLeft = S.bricks.length;
    // the edition adds its own bricks (and keeps bricksLeft honest for them)
    if (plugin && plugin.buildLevel) plugin.buildLevel(idx, lvl, { bw, bh, gapX, gapY, startY, lineGap, measure: M, lines: lines.length, GR });
  }

  function ballSpeed() {
    return Math.min(LEVELS[S.level].speed + (S.loop - 1) * 45, 520);
  }

  function newBallOnPaddle() {
    return { x: S.paddle.x, y: PADDLE_Y - 9, vx: 0, vy: 0, r: 6, stuck: true, trail: [] };
  }

  function resetBallAndPaddle() {
    S.balls = [newBallOnPaddle()];
    S.timers.wide = 0; S.timers.laser = 0; S.timers.slow = 0; S.timers.fire = 0;
    S.paddle.targetW = S.paddle.baseW;
    if (plugin && plugin.onReset) plugin.onReset();
  }

  function launchBall(b) {
    const a = (-90 + (Math.random() * 50 - 25)) * Math.PI / 180;
    const sp = ballSpeed();
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.stuck = false;
  }

  function startLevel(idx) {
    S.level = idx;
    buildLevel(idx);
    resetBallAndPaddle();
    S.lasers = []; S.capsules = [];
    S.combo = 0;
    S.fx.bannerT = 2.1;
    setMode('levelbanner');
  }

  function newGame() {
    S.score = 0; S.lives = 3; S.loop = 1;
    S.particles = []; S.popups = [];
    startLevel(0);
  }

  function setMode(m) {
    S.mode = m;
    if (pauseBtn) pauseBtn.textContent = (m === 'paused') ? '▶ RESUME' : '⏸ PAUSE';
    if (overlay) {
      const show = (m === 'victory');
      overlay.classList.toggle('is-visible', show);
      overlay.setAttribute('aria-hidden', String(!show));
    }
    // an edition that arrived mid-board waits for the board to end (NF.use)
    if (applyPending && (m === 'attract' || m === 'gameover')) { applyPending = false; applyEdition(); }
  }

  /* ======================================================================
     JUICE — particles, popups, shake
     ====================================================================== */
  function burst(x, y, color, n, spread = 160) {
    if (reducedMotion) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      if (S.particles.length > 260) break;
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * spread;
      S.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
        life: 0.5 + Math.random() * 0.45, t: 0, color,
        s: 2 + Math.random() * 3,
      });
    }
  }
  function popup(x, y, text, color = C.white, big = false) {
    S.popups.push({ x, y, text, color, t: 0, life: big ? 1.4 : 0.8, big });
  }
  function shake(power) { if (!reducedMotion) S.fx.shake = Math.min(S.fx.shake + power, 14); }

  /* ======================================================================
     SCORING
     ====================================================================== */
  function award(points, x, y) {
    const comboBonus = Math.min(S.combo, 20) * 5;
    const total = (points + comboBonus) * S.loop;
    S.score += total;
    popup(x, y, `+${total}`, S.combo >= 5 ? C.gold : C.white);
    if (S.score > S.hiScore) { S.hiScore = S.score; store.set(LS_HI, String(S.hiScore)); }
  }

  /* ======================================================================
     BRICK DAMAGE
     ====================================================================== */
  function damageBrick(brick, ball, pierce) {
    brick.hp -= 1;
    brick.flash = 0.12;
    S.combo += 1;
    if (brick.hp > 0) {
      sfx.tough();
      burst(ball ? ball.x : brick.x + brick.w / 2, ball ? ball.y : brick.y + brick.h / 2, C.white, 4, 90);
      return;
    }
    // brick destroyed (a `free` brick — the widescreen press gallery — is a
    // bonus that never has to be cleared, so it does not count down the board)
    if (!brick.free) S.bricksLeft -= 1;
    const cx = brick.x + brick.w / 2, cy = brick.y + brick.h / 2;
    const base = brick.base || (brick.ad ? 300 : brick.gold ? 150 : 40 + brick.maxHp * 20);
    award(base, cx, cy);
    sfx.brick(S.combo);
    burst(cx, cy, brick.gold ? C.gold : C.brick1[(brick.row + S.level) % 4], brick.gold ? 16 : 9);
    if (plugin && plugin.onBreak) plugin.onBreak(brick, ball);
    if (brick.ad) { burst(cx, cy, C.green, 12); popup(cx, cy - 16, 'AUSTRALIAN DEMOCRATS', C.gold, true); shake(3); }
    if (brick.maxHp >= 2 || pierce) shake(brick.maxHp * 1.5);
    if (S.combo === 5 || S.combo === 10 || S.combo === 15) popup(cx, cy - 16, `COMBO ×${S.combo}!`, C.gold, true);
    // drop a capsule?
    if (brick.gold || Math.random() < 0.11) {
      const p = rollPowerup();
      S.capsules.push({ x: cx, y: cy, vy: 95, type: p, t: 0 });
    }
    // last brick down: a beat of cinematic slow-mo before the level turns over
    if (S.bricksLeft === 0) {
      S.fx.slowmo = reducedMotion ? 0 : 0.7;
      shake(6);
    }
  }

  /* ======================================================================
     POWER-UP EFFECTS
     ====================================================================== */
  function applyPowerup(p) {
    if (plugin && plugin.powerup && plugin.powerup(p)) return;   // an edition capsule: the plugin owns the feedback too
    sfx.power();
    popup(S.paddle.x, PADDLE_Y - 34, p.label + '!', p.color, true);
    switch (p.id) {
      case 'split': {
        const live = S.balls.filter((b) => !b.stuck);
        const src = live[0] || S.balls[0];
        if (!src) break;
        for (let i = 0; i < 2; i++) {
          if (S.balls.length >= 9) break;
          const a = Math.atan2(src.vy || -1, src.vx || 0.3) + (i === 0 ? 0.5 : -0.5);
          const sp = Math.max(Math.hypot(src.vx, src.vy), ballSpeed() * 0.9);
          S.balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6, stuck: false, trail: [] });
        }
        break;
      }
      case 'wide':
        S.timers.wide = 12; S.paddle.targetW = S.paddle.baseW * 1.55; break;
      case 'laser':
        S.timers.laser = 8; S.timers.laserCd = 0; break;
      case 'slow':
        S.timers.slow = 8; break;
      case 'fire':
        S.timers.fire = 6; sfx.fire(); break;
      case 'life':
        if (S.lives < 5) { S.lives += 1; sfx.life(); } else { S.score += 500; popup(S.paddle.x, PADDLE_Y - 50, 'MAX LIVES +500', C.gold); }
        break;
    }
  }

  /* ======================================================================
     UPDATE
     ====================================================================== */
  function update(dt) {
    S.time += dt;

    // decay fx + timers
    S.fx.shake = Math.max(0, S.fx.shake - dt * 26);
    S.fx.flash = Math.max(0, S.fx.flash - dt * 3);
    if (S.fx.bannerT > 0) S.fx.bannerT -= dt;
    if (S.mode === 'levelbanner' && S.fx.bannerT <= 0) setMode('ready');
    for (const k of ['wide', 'laser', 'slow', 'fire']) {
      if (S.timers[k] > 0) {
        S.timers[k] -= dt;
        if (S.timers[k] <= 0 && k === 'wide') S.paddle.targetW = S.paddle.baseW;
      }
    }

    // paddle width easing + keyboard motion. The target width is DERIVED every
    // frame — SUPERMAJORITY's ×1.55 times whatever the edition contributes (the
    // widescreen SPIN shrink) — so two effects compose instead of overwriting;
    // for the classic cabinet this evaluates to exactly the values the
    // event-time assignments used to leave behind.
    S.paddle.targetW = S.paddle.baseW * (S.timers.wide > 0 ? 1.55 : 1) * ((plugin && plugin.paddleScale) ? plugin.paddleScale() : 1);
    S.paddle.w += (S.paddle.targetW - S.paddle.w) * Math.min(1, dt * 10);
    const kb = (plugin && plugin.kbSpeed) ? plugin.kbSpeed() : 460;   // a wider field needs a faster paddle
    if (keys.left) S.paddle.x -= kb * dt;
    if (keys.right) S.paddle.x += kb * dt;
    S.paddle.x = Math.max(S.paddle.w / 2 + 6, Math.min(LW - S.paddle.w / 2 - 6, S.paddle.x));

    // particles & popups always animate (they're pure decoration)
    S.particles = S.particles.filter((p) => {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt;
      return p.t < p.life;
    });
    S.popups = S.popups.filter((p) => { p.t += dt; return p.t < p.life; });

    if (S.mode !== 'playing' && S.mode !== 'ready') return;

    // stuck balls ride the paddle
    for (const b of S.balls) if (b.stuck) { b.x = S.paddle.x; b.y = PADDLE_Y - b.r - 3; }
    if (S.mode !== 'playing') return;

    // time scale: FILIBUSTER slows the world; last-brick slow-mo is cinematic
    let ts = S.timers.slow > 0 ? 0.62 : 1;
    if (S.fx.slowmo > 0) { S.fx.slowmo -= dt; ts *= 0.3; }
    // the edition moves its bricks BEFORE the balls test them, so a drifting
    // rank collides at the position the player sees
    if (plugin && plugin.update) plugin.update(dt, ts);

    /* ---- balls ---- */
    const sp = ballSpeed();
    for (const b of S.balls) {
      if (b.stuck) continue;
      // gently renormalise speed so slow/fast drift never accumulates
      const cur = Math.hypot(b.vx, b.vy) || 1;
      const want = sp;
      const f = 1 + (want / cur - 1) * Math.min(1, dt * 2);
      b.vx *= f; b.vy *= f;

      b.x += b.vx * dt * ts; b.y += b.vy * dt * ts;
      if (!reducedMotion) { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift(); }

      // walls
      if (b.x < b.r + 4) { b.x = b.r + 4; b.vx = Math.abs(b.vx); sfx.wall(); }
      if (b.x > LW - b.r - 4) { b.x = LW - b.r - 4; b.vx = -Math.abs(b.vx); sfx.wall(); }
      if (b.y < HUD_H + b.r + 2) { b.y = HUD_H + b.r + 2; b.vy = Math.abs(b.vy); sfx.wall(); }

      // never let the ball go glacially horizontal
      if (Math.abs(b.vy) < sp * 0.22) b.vy = (b.vy < 0 ? -1 : 1) * sp * 0.22;

      // paddle
      const P = S.paddle;
      if (b.vy > 0 && b.y + b.r >= PADDLE_Y && b.y + b.r <= PADDLE_Y + P.h + 10 &&
          b.x >= P.x - P.w / 2 - b.r && b.x <= P.x + P.w / 2 + b.r) {
        const rel = Math.max(-1, Math.min(1, (b.x - P.x) / (P.w / 2)));
        const ang = (-90 + rel * 62) * Math.PI / 180;
        b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
        b.y = PADDLE_Y - b.r;
        S.combo = 0;
        sfx.paddle();
        burst(b.x, PADDLE_Y, C.green, 3, 60);
      }

      // bricks (first hit per ball per frame)
      for (const br of S.bricks) {
        if (br.hp <= 0) continue;
        if (b.x + b.r < br.x || b.x - b.r > br.x + br.w || b.y + b.r < br.y || b.y - b.r > br.y + br.h) continue;
        const fire = S.timers.fire > 0;
        if (!fire) {
          // resolve bounce axis by smallest overlap
          const overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
          const overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
          if (overlapX < overlapY) { b.vx = (b.x < br.x + br.w / 2) ? -Math.abs(b.vx) : Math.abs(b.vx); }
          else { b.vy = (b.y < br.y + br.h / 2) ? -Math.abs(b.vy) : Math.abs(b.vy); }
        } else {
          burst(b.x, b.y, C.goldDeep, 5, 120);
        }
        damageBrick(br, b, fire);
        if (!fire) break;
      }
    }

    // remove fallen balls (a cleared board never costs a life)
    S.balls = S.balls.filter((b) => b.y - b.r <= LH + 8);
    if (S.balls.length === 0 && S.bricksLeft > 0) {
      S.lives -= 1;
      S.combo = 0;
      shake(8);
      if (S.lives <= 0) {
        sfx.gameOver();
        setMode('gameover');
        return;
      }
      sfx.lost();
      popup(LW / 2, LH / 2, S.lives === 1 ? 'LAST CHANCE!' : 'BALL LOST', C.red, true);
      resetBallAndPaddle();
      setMode('ready');
      return;
    }

    /* ---- lasers (QUESTION TIME) ---- */
    if (S.timers.laser > 0) {
      S.timers.laserCd -= dt;
      if (S.timers.laserCd <= 0) {
        S.timers.laserCd = 0.34;
        const P = S.paddle;
        S.lasers.push({ x: P.x - P.w / 2 + 7, y: PADDLE_Y - 4 }, { x: P.x + P.w / 2 - 7, y: PADDLE_Y - 4 });
        sfx.laser();
      }
    }
    S.lasers = S.lasers.filter((l) => {
      l.y -= 560 * dt;
      if (l.y < HUD_H) return false;
      for (const br of S.bricks) {
        if (br.hp <= 0) continue;
        if (l.x >= br.x && l.x <= br.x + br.w && l.y >= br.y && l.y <= br.y + br.h) {
          damageBrick(br, null, false);
          return false;
        }
      }
      return true;
    });

    /* ---- capsules ---- */
    S.capsules = S.capsules.filter((c) => {
      c.t += dt; c.y += c.vy * dt; c.vy += 40 * dt;
      const P = S.paddle;
      if (c.y > PADDLE_Y - 8 && c.y < PADDLE_Y + P.h + 14 && Math.abs(c.x - P.x) < P.w / 2 + 12) {
        applyPowerup(c.type);
        return false;
      }
      return c.y < LH + 20;
    });

    /* ---- brick flash decay ---- */
    for (const br of S.bricks) if (br.flash > 0) br.flash -= dt;

    /* ---- level cleared (after the slow-mo beat finishes) ---- */
    if (S.bricksLeft <= 0 && S.fx.slowmo <= 0) {
      if (S.level === LEVELS.length - 1) {
        // HOME cleared — you found your way home!
        S.score += 1000 * S.loop;
        if (S.score > S.hiScore) { S.hiScore = S.score; store.set(LS_HI, String(S.hiScore)); }
        sfx.victory();
        for (let i = 0; i < 8; i++) {
          setTimeout(() => burst(60 + Math.random() * (LW - 120), 80 + Math.random() * 220, [C.gold, C.green, C.white][i % 3], 14, 220), i * 130);
        }
        setMode('victory');
      } else {
        sfx.levelClear();
        S.score += 250 * S.loop;
        startLevel(S.level + 1);
      }
    }
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  let viewScale = 1;
  let vignette = null;

  /* THE HUD INSET. In full screen the MENU + ✕ pair sits in the top-right
     corner OVER the canvas whenever the canvas fills the display — always in
     the widescreen edition (100vw × 100vh), in the classic one only on a
     screen shaped exactly like the field. The lives used to be drawn under
     it: measured 1366×768 / 1920×1080 / 2560×1440, elementFromPoint at every
     heart returned nfExitFs or nfMenuFs. So resize() measures how far the
     pair reaches into the HUD band, in logical units, and drawHUD() draws the
     hearts (and, only if they would collide, the level label) to the LEFT of
     it. Zero outside full screen and whenever the pair sits in a gutter
     beside the picture, so the classic cabinet draws exactly what it did. */
  let hudInset = 0;
  function measureHudInset() {
    let n = 0;
    if (fsbar && screenEl && screenEl.classList.contains('is-fs')) {
      const fr = fsbar.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      const hudPx = HUD_H * (cr.height / LH);
      if (fr.width > 0 && cr.width > 0 && fr.left < cr.right && fr.bottom > cr.top && fr.top < cr.top + hudPx) {
        n = (cr.right - fr.left) / (cr.width / LW) + 8;
      }
    }
    hudInset = n;
  }

  function resize() {
    // devicePixelRatio is read HERE on every call, never cached at module
    // scope — it changes with page zoom (docs/RESPONSIVE.md §3a)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || LW;
    if (plugin || wantWide()) {
      // WIDESCREEN: the stylesheet decides the box (edge to edge, height solved
      // from the viewport) and the logical width follows its SHAPE — so a
      // window resize or a zoom re-derives LW instead of stretching the field.
      // wantWide() covers the moment before the plugin script has arrived, so
      // the attract screen is never drawn squashed into a portrait store.
      const h = canvas.clientHeight || Math.round(w * LH / LW_CLASSIC);
      const nw = Math.round(w * dpr), nh = Math.round(h * dpr);
      if (canvas.width !== nw || canvas.height !== nh) { canvas.width = nw; canvas.height = nh; }
      viewScale = canvas.height / LH;
      setField(canvas.width / viewScale);
      measureHudInset();
      return;
    }
    // CLASSIC: the 480×560 store the phone has always had. Skipping a no-op
    // (same numbers) matters because assigning canvas.width clears the frame,
    // and the ResizeObserver reports once on attach.
    const nw = Math.round(w * dpr), nh = Math.round(w * (LH / LW) * dpr);
    measureHudInset();   // before the no-op return: full screen can toggle without the store changing
    if (canvas.width === nw && canvas.height === nh) return;
    canvas.width = nw;
    canvas.height = nh;
    viewScale = canvas.width / LW;
  }

  function px(n) { return Math.round(n) + 0.5; } // crisp 1px lines

  function draw() {
    const sk = S.fx.shake;
    const ox = sk ? (Math.random() * 2 - 1) * sk : 0;
    const oy = sk ? (Math.random() * 2 - 1) * sk : 0;
    ctx.setTransform(viewScale, 0, 0, viewScale, ox * viewScale, oy * viewScale);

    // backdrop
    const g = ctx.createLinearGradient(0, 0, 0, LH);
    g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, LW + 40, LH + 40);

    // starfield
    ctx.fillStyle = 'rgba(234,255,249,.34)';
    for (const st of stars) {
      const y = (st.y + S.time * st.s) % LH;
      ctx.fillRect(st.x, y, st.r, st.r);
    }

    // playfield side walls
    ctx.fillStyle = 'rgba(41,168,149,.28)';
    ctx.fillRect(0, HUD_H, 4, LH - HUD_H);
    ctx.fillRect(LW - 4, HUD_H, 4, LH - HUD_H);

    drawHUD();

    // bricks
    for (const br of S.bricks) {
      if (br.hp <= 0) continue;
      let fill = br.gold ? C.gold : (br.maxHp === 1 ? C.brick1[(br.row + S.level) % 4] : br.maxHp === 2 ? C.brick2 : C.brick3);
      ctx.fillStyle = fill;
      ctx.fillRect(br.x, br.y, br.w, br.h);
      // bevel highlight
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(br.x, br.y, br.w, 2.5);
      // damage cracks
      if (br.maxHp > 1 && br.hp < br.maxHp) {
        ctx.strokeStyle = 'rgba(234,255,249,.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px(br.x + br.w * 0.3), px(br.y + 2));
        ctx.lineTo(px(br.x + br.w * 0.45), px(br.y + br.h * 0.6));
        ctx.lineTo(px(br.x + br.w * 0.28), px(br.y + br.h - 2));
        if (br.hp === 1 && br.maxHp === 3) {
          ctx.moveTo(px(br.x + br.w * 0.7), px(br.y + 2));
          ctx.lineTo(px(br.x + br.w * 0.6), px(br.y + br.h * 0.55));
          ctx.lineTo(px(br.x + br.w * 0.75), px(br.y + br.h - 2));
        }
        ctx.stroke();
      }
      if (br.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${br.flash * 6})`;
        ctx.fillRect(br.x, br.y, br.w, br.h);
      }
      // the Australian Democrats block — gold brick stamped "AD"
      if (br.ad) {
        ctx.save();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.strokeRect(br.x + 0.75, br.y + 0.75, br.w - 1.5, br.h - 1.5);
        ctx.fillStyle = C.ink;
        ctx.font = `900 ${Math.max(7, Math.min(br.h - 4, br.w * 0.55)) | 0}px Archivo, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('AD', br.x + br.w / 2, br.y + br.h / 2 + 0.5);
        ctx.restore();
      }
    }
    if (plugin && plugin.drawBricks) plugin.drawBricks();   // the edition's marks on its own bricks

    // capsules
    for (const c of S.capsules) {
      const wob = Math.sin(c.t * 6) * 3;
      ctx.save();
      ctx.translate(c.x + wob, c.y);
      ctx.fillStyle = c.type.color;
      rounded(-15, -9, 30, 18, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      rounded(-15, -9, 30, 7, 6); ctx.fill();
      ctx.fillStyle = (c.type.ink || c.type.id === 'laser' || c.type.id === 'fire') ? C.ink : C.white;
      ctx.font = '800 11px Archivo, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.type.short, 0, 1);
      ctx.restore();
    }

    // lasers
    ctx.fillStyle = C.gold;
    for (const l of S.lasers) ctx.fillRect(l.x - 1.5, l.y - 10, 3, 12);

    // paddle
    const P = S.paddle;
    const padGrad = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + P.h);
    padGrad.addColorStop(0, S.timers.laser > 0 ? C.gold : '#3ecfb8');
    padGrad.addColorStop(1, S.timers.laser > 0 ? C.goldDeep : C.greenDeep);
    ctx.fillStyle = padGrad;
    rounded(P.x - P.w / 2, PADDLE_Y, P.w, P.h, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    rounded(P.x - P.w / 2 + 3, PADDLE_Y + 2, P.w - 6, 3, 2); ctx.fill();
    if (S.timers.laser > 0) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(P.x - P.w / 2 + 4, PADDLE_Y - 3, 6, 4);
      ctx.fillRect(P.x + P.w / 2 - 10, PADDLE_Y - 3, 6, 4);
    }

    // balls
    for (const b of S.balls) {
      const fire = S.timers.fire > 0;
      if (!reducedMotion) {
        for (let i = 0; i < b.trail.length; i++) {
          const t = b.trail[i], a = (i + 1) / b.trail.length * 0.3;
          ctx.fillStyle = fire ? `rgba(252,214,102,${a})` : `rgba(234,255,249,${a})`;
          ctx.beginPath(); ctx.arc(t.x, t.y, b.r * (i / b.trail.length) * 0.9, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.fillStyle = fire ? C.gold : C.white;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fire ? 'rgba(255,255,255,.8)' : 'rgba(41,168,149,.55)';
      ctx.beginPath(); ctx.arc(b.x - 1.6, b.y - 1.8, b.r * 0.38, 0, Math.PI * 2); ctx.fill();
    }

    // particles
    for (const p of S.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;

    // popups
    for (const p of S.popups) {
      const k = p.t / p.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      ctx.font = p.big ? '900 20px Archivo, sans-serif' : '800 13px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y - k * 26);
    }
    ctx.globalAlpha = 1;

    // active power-up pills (bottom-left)
    drawEffectPills();

    // Soft vignette to seat the playfield in the cabinet. It is BUILT in the
    // classic 480x560 space and STRETCHED to the field's width when it is
    // painted, so its rim falls at the same RELATIVE place in every field.
    // Sized to LH alone it was sized to the classic cabinet: a widescreen
    // wing sits far outside an LH-based rim, so it took the full 0.4 rim
    // alpha and the wings played dark. Measured on an empty attract frame
    // (median luminance of a 20x36-unit band, same relative x in both
    // cabinets): wing/centre was 78.0% at 1366x768 (LW 1708), 76.4% at
    // 1920x1080 (1415), 77.8% in full screen (996) against the classic
    // field's 91-93% — and the ballots and the rank's turn points live in
    // that band. The classic cabinet is untouched by construction: LW is
    // LW_CLASSIC there, so the scaled branch never runs.
    if (!vignette) {
      vignette = ctx.createRadialGradient(LW_CLASSIC / 2, LH / 2, LH * 0.42, LW_CLASSIC / 2, LH / 2, LH * 0.8);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(4,14,12,.4)');
    }
    ctx.fillStyle = vignette;
    if (LW === LW_CLASSIC) {
      ctx.fillRect(0, 0, LW, LH);
    } else {
      // a canvas gradient is resolved in the user space of the fill, so one
      // horizontal scale turns the circle into the field's own ellipse
      ctx.save();
      ctx.scale(LW / LW_CLASSIC, 1);
      ctx.fillRect(0, 0, LW_CLASSIC, LH);
      ctx.restore();
    }

    // state overlays
    if (S.mode === 'attract') drawAttract();
    else if (S.mode === 'levelbanner') drawBanner();
    else if (S.mode === 'ready') drawCentered('CLICK / TAP / SPACE TO LAUNCH', LH * 0.62, 15, blinkOn() ? C.white : 'rgba(234,255,249,.45)');
    else if (S.mode === 'paused') { dim(); drawCentered('PAUSED', LH / 2 - 10, 34, C.gold); drawCentered('P TO RESUME', LH / 2 + 22, 13, C.white); }
    else if (S.mode === 'gameover') drawGameOver();
    else if (S.mode === 'victory') dim(0.15); // DOM overlay supplies its own contrast — keep the fireworks visible

    // subtle scanlines for the CRT feel
    if (!reducedMotion) {
      ctx.fillStyle = 'rgba(0,0,0,.05)';
      for (let y = HUD_H; y < LH; y += 4) ctx.fillRect(0, y, LW, 1.4);
    }
  }

  function rounded(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function blinkOn() { return Math.floor(S.time * 2) % 2 === 0; }
  function dim(a = 0.62) { ctx.fillStyle = `rgba(10,28,25,${a})`; ctx.fillRect(0, 0, LW, LH); }
  function drawCentered(text, y, size, color, weight = 900) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Archivo, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, LW / 2, y);
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(9,26,23,.92)';
    ctx.fillRect(0, 0, LW, HUD_H);
    ctx.fillStyle = 'rgba(41,168,149,.5)';
    ctx.fillRect(0, HUD_H - 1.5, LW, 1.5);
    ctx.textBaseline = 'middle';
    ctx.font = '800 12px Archivo, sans-serif';
    ctx.fillStyle = C.white; ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${S.score}`, 12, HUD_H / 2);
    ctx.fillStyle = C.gold;
    ctx.fillText(`HI ${S.hiScore}`, 128, HUD_H / 2);
    ctx.fillStyle = C.white; ctx.textAlign = 'center';
    const lvl = LEVELS[S.level];
    const lvlLabel = lvl.bonus ? '★ BONUS' : `${lvl.word} ${mainNo(S.level)}/${MAIN_TOTAL}`;
    if (lvl.bonus) ctx.fillStyle = C.gold;
    const label = S.loop > 1 ? `${lvlLabel} · L${S.loop}` : lvlLabel;
    // lives as pixel hearts — to the LEFT of the full-screen chrome when it
    // overlaps the HUD (hudInset is 0 everywhere else, so nothing here moves)
    const heartsX = LW - hudInset - 18;
    let labelX = LW / 2 + 30;
    if (hudInset > 0) {
      const lastHeart = heartsX - (S.lives - 1) * 17 - 8;
      labelX = Math.min(labelX, lastHeart - 10 - ctx.measureText(label).width / 2);
    }
    ctx.fillText(label, labelX, HUD_H / 2);
    for (let i = 0; i < S.lives; i++) drawHeart(heartsX - i * 17, HUD_H / 2, 5.5);
    // combo meter
    if (S.combo >= 3) {
      ctx.fillStyle = C.gold; ctx.textAlign = 'center';
      ctx.font = '900 12px Archivo, sans-serif';
      ctx.fillText(`×${S.combo}`, LW / 2 - 60, HUD_H / 2);
    }
  }
  function drawHeart(cx, cy, s) {
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s);
    ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.3, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.4, cy - s * 0.3, cx, cy + s);
    ctx.fill();
  }

  function drawEffectPills() {
    const pills = [];
    if (S.timers.wide > 0) pills.push(['SUPERMAJORITY', S.timers.wide, 12]);
    if (S.timers.laser > 0) pills.push(['QUESTION TIME', S.timers.laser, 8]);
    if (S.timers.slow > 0) pills.push(['FILIBUSTER', S.timers.slow, 8]);
    if (S.timers.fire > 0) pills.push(['DOUBLE DISSOLUTION', S.timers.fire, 6]);
    if (plugin && plugin.pills) pills.push.apply(pills, plugin.pills());
    let y = LH - 14;
    ctx.font = '800 9.5px Archivo, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const [label, left, total] of pills) {
      const w = ctx.measureText(label).width + 34;
      ctx.fillStyle = 'rgba(9,26,23,.8)';
      rounded(10, y - 8, w, 16, 8); ctx.fill();
      ctx.fillStyle = C.gold;
      ctx.fillRect(14, y + 4, (w - 8) * Math.max(0, left / total), 2);
      ctx.fillStyle = C.white;
      ctx.fillText(label, 22, y - 1);
      y -= 21;
    }
  }

  function drawBigTitle() {
    // pixel-brick wordmark: draw "BRICK BY BRICK" as text with block shadow
    ctx.textAlign = 'center';
    ctx.fillStyle = C.gold;
    ctx.font = '900 34px Archivo, sans-serif';
    ctx.fillText('BRICK BY BRICK', LW / 2 + 2, 152);
    ctx.fillStyle = C.white;
    ctx.fillText('BRICK BY BRICK', LW / 2, 149);
  }

  function drawAttract() {
    dim(0.4);
    drawCentered('THE LOST PAGE ARCADE PRESENTS', 112, 12, C.green);
    drawBigTitle();
    drawCentered('ESCAPE FROM PAGE 404', 182, 14, C.gold);
    drawCentered('Smash through 10 levels of lost pages —', 246, 14, C.white, 700);
    drawCentered('from 404 all the way HOME.', 268, 14, C.white, 700);
    drawCentered('MOVE: mouse · finger · ← →', 322, 12, 'rgba(234,255,249,.75)', 600);
    drawCentered('LAUNCH: click · tap · space  |  P pause · F full screen', 342, 12, 'rgba(234,255,249,.75)', 600);
    if (S.hiScore > 0) drawCentered(`HI SCORE ${S.hiScore}`, 388, 15, C.gold);
    if (plugin && plugin.attract) plugin.attract();
    if (editionLoading()) drawCentered('LOADING THE WIDESCREEN EDITION…', 448, 15, C.gold);   // a start now would build the wrong board (primaryAction)
    else drawCentered(blinkOn() ? '▶ CLICK / TAP TO START' : '', 448, 18, C.white);
  }

  function drawBanner() {
    const lvl = LEVELS[S.level];
    dim(0.35);
    const k = Math.max(0, Math.min(1, (2.1 - S.fx.bannerT) / 0.35));
    ctx.save();
    ctx.globalAlpha = k;
    drawCentered(
      lvl.bonus ? '★ BONUS ROUND ★' : `LEVEL ${mainNo(S.level)} OF ${MAIN_TOTAL}${S.loop > 1 ? ' · LOOP ' + S.loop : ''}`,
      LH / 2 - 42, 15, lvl.bonus ? C.gold : C.green);
    drawCentered(lvl.word, LH / 2 + 4, lvl.word.length > 6 ? 34 : 58, lvl.bonus ? C.gold : C.white);
    drawCentered(lvl.tag, LH / 2 + 46, 13, lvl.bonus ? C.white : C.gold);
    ctx.restore();
  }

  function drawGameOver() {
    dim();
    drawCentered('GAME OVER', LH / 2 - 60, 40, C.red);
    drawCentered(`SCORE ${S.score}`, LH / 2 - 8, 20, C.white);
    if (S.score >= S.hiScore && S.score > 0) drawCentered('★ NEW HI SCORE ★', LH / 2 + 24, 15, C.gold);
    else drawCentered(`HI SCORE ${S.hiScore}`, LH / 2 + 24, 15, C.gold);
    drawCentered('The page is still lost…', LH / 2 + 64, 13, 'rgba(234,255,249,.8)', 600);
    drawCentered(blinkOn() ? '▶ CLICK / TAP TO TRY AGAIN' : '', LH / 2 + 100, 16, C.white);
  }

  /* ======================================================================
     INPUT
     ====================================================================== */
  const keys = { left: false, right: false };

  function engage() {
    S.started = true;
    audioInit();
    if (actx && actx.state === 'suspended') actx.resume();
  }

  function primaryAction() {
    engage();
    // the widescreen plugin is still in flight: a game started now would be
    // the classic board stretched across the wide field, and the plugin's
    // arrival would wipe it to the attract screen (measured, 2026-09-02).
    // The attract screen says LOADING… instead; the plugin — or the fallback
    // to classic — is what re-enables the start.
    if ((S.mode === 'attract' || S.mode === 'gameover') && editionLoading()) return;
    if (S.mode === 'attract') { newGame(); return; }
    if (S.mode === 'gameover') { newGame(); return; }
    if (S.mode === 'levelbanner') { S.fx.bannerT = 0; setMode('ready'); return; }
    if (S.mode === 'ready') {
      for (const b of S.balls) if (b.stuck) launchBall(b);
      setMode('playing');
      return;
    }
    if (S.mode === 'paused') togglePause();
  }

  function togglePause() {
    if (S.mode === 'paused') {
      setMode(S.prevMode || 'ready');
      S.prevMode = null;
    } else if (S.mode === 'playing' || S.mode === 'ready' || S.mode === 'levelbanner') {
      S.prevMode = S.mode;
      setMode('paused');
    }
  }

  function pointerX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * LW;
  }

  canvas.addEventListener('pointermove', (e) => {
    if (S.mode === 'paused' || S.mode === 'attract' || S.mode === 'gameover' || S.mode === 'victory') return;
    S.paddle.x = pointerX(e);
  });
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    // capture the pointer so a touch-drag keeps steering even off the canvas
    try { canvas.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
    if (S.mode === 'playing' || S.mode === 'ready') S.paddle.x = pointerX(e);
    primaryAction();
  });

  /* ---- full-screen ambient FX: the AD icon drifts around the dead space in
         the gutters beside the (portrait) playfield and periodically explodes
         into a burst of shards — desktop full screen only, respects reduced
         motion. Pure DOM/CSS overlay, never touches the game canvas. ---- */
  let fsfx = null;
  const FSFX_SRC = '/assets/brand/logo-icon-colour.png';
  function fsGutter() {
    const cr = canvas.getBoundingClientRect();
    const sr = screenEl.getBoundingClientRect();
    return {
      W: sr.width, H: sr.height,
      lMax: cr.left - sr.left,            // left gutter width
      rMin: cr.right - sr.left,           // x where right gutter starts
      rMax: sr.width,                     // right edge
    };
  }
  function fsfxSpawn(st, side) {
    const g = fsGutter();
    const leftRoom = g.lMax, rightRoom = g.W - g.rMin;
    if (side == null) side = leftRoom >= rightRoom ? 'l' : 'r';
    const room = side === 'l' ? leftRoom : rightRoom;
    if (room < 96) { side = side === 'l' ? 'r' : 'l'; }
    const room2 = side === 'l' ? leftRoom : rightRoom;
    if (room2 < 96) return null;          // no usable gutter (portrait / mobile)
    const size = 44 + Math.random() * 46;
    const xMin = side === 'l' ? 6 : g.rMin + 6;
    const xMax = (side === 'l' ? g.lMax : g.W) - size - 6;
    if (xMax <= xMin) return null;
    const img = document.createElement('img');
    img.src = FSFX_SRC; img.alt = ''; img.className = 'nf-fsfx-logo';
    img.style.width = size + 'px';
    st.layer.appendChild(img);
    return {
      el: img, side, size,
      x: xMin + Math.random() * (xMax - xMin),
      y: 40 + Math.random() * Math.max(20, g.H - 140),
      vx: (Math.random() * 2 - 1) * 26, vy: (Math.random() * 2 - 1) * 26,
      rot: Math.random() * 360, vr: (Math.random() * 2 - 1) * 46,
      life: 2.6 + Math.random() * 3.2,
    };
  }
  function fsfxExplode(st, ic) {
    const cx = ic.x + ic.size / 2, cy = ic.y + ic.size / 2;
    for (let i = 0; i < 11; i++) {
      const s = document.createElement('img');
      s.src = FSFX_SRC; s.alt = ''; s.className = 'nf-fsfx-shard';
      const sz = ic.size * (0.22 + Math.random() * 0.3);
      s.style.width = sz + 'px';
      s.style.transform = `translate(${cx}px, ${cy}px) rotate(0deg)`;
      st.layer.appendChild(s);
      const ang = (i / 11) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 70 + Math.random() * 140;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      requestAnimationFrame(() => {
        s.style.transition = 'transform .72s cubic-bezier(.15,.7,.2,1), opacity .72s ease';
        s.style.transform = `translate(${cx + dx}px, ${cy + dy}px) rotate(${(Math.random() * 2 - 1) * 280}deg) scale(.4)`;
        s.style.opacity = '0';
      });
      setTimeout(() => { if (s.parentNode) s.remove(); }, 820);
    }
    if (ic.el.parentNode) ic.el.remove();
    st.icons = st.icons.filter((o) => o !== ic);
    setTimeout(() => { if (fsfx === st) { const n = fsfxSpawn(st, ic.side); if (n) st.icons.push(n); } }, 400 + Math.random() * 900);
  }
  function startFsFx() {
    if (fsfx || !screenEl || reducedMotion) return;
    const layer = document.createElement('div');
    layer.className = 'nf-fsfx'; layer.setAttribute('aria-hidden', 'true');
    screenEl.appendChild(layer);
    const st = { layer, icons: [], raf: 0, last: performance.now() };
    fsfx = st;
    for (let i = 0; i < 3; i++) { const n = fsfxSpawn(st, i % 2 ? 'r' : 'l'); if (n) st.icons.push(n); }
    if (!st.icons.length) { stopFsFx(); return; }   // no gutters — nothing to show
    function tick(now) {
      if (fsfx !== st) return;
      const dt = Math.min((now - st.last) / 1000, 1 / 20); st.last = now;
      const g = fsGutter();
      for (const ic of st.icons.slice()) {
        ic.x += ic.vx * dt; ic.y += ic.vy * dt; ic.rot += ic.vr * dt; ic.life -= dt;
        const xMin = ic.side === 'l' ? 6 : g.rMin + 6;
        const xMax = (ic.side === 'l' ? g.lMax : g.W) - ic.size - 6;
        const yMin = 34, yMax = g.H - ic.size - 34;
        if (ic.x < xMin || ic.x > xMax) { ic.vx *= -1; ic.x = Math.max(xMin, Math.min(xMax, ic.x)); }
        if (ic.y < yMin || ic.y > yMax) { ic.vy *= -1; ic.y = Math.max(yMin, Math.min(yMax, ic.y)); }
        ic.el.style.transform = `translate(${ic.x}px, ${ic.y}px) rotate(${ic.rot}deg)`;
        if (ic.life <= 0) fsfxExplode(st, ic);
      }
      st.raf = requestAnimationFrame(tick);
    }
    st.raf = requestAnimationFrame(tick);
  }
  function stopFsFx() {
    if (!fsfx) return;
    cancelAnimationFrame(fsfx.raf);
    if (fsfx.layer && fsfx.layer.parentNode) fsfx.layer.remove();
    fsfx = null;
  }

  /* ---- full screen: native Fullscreen API with a CSS takeover fallback
         (iOS Safari has no element fullscreen) — one .is-fs class drives both ---- */
  function fsNativeActive() { return document.fullscreenElement === screenEl; }
  function setFsUI(on) {
    if (!screenEl) return;
    screenEl.classList.toggle('is-fs', on);
    document.documentElement.classList.toggle('nf-noscroll', on);
    if (fullBtn) {
      fullBtn.textContent = on ? '⛶ EXIT FULL SCREEN' : '⛶ FULL SCREEN';
      fullBtn.setAttribute('aria-pressed', String(on));
    }
    resize();
    requestAnimationFrame(resize); // again after the layout settles
    if (on) requestAnimationFrame(startFsFx); else stopFsFx();
  }
  function toggleFullscreen() {
    engage();
    if (!screenEl) return;
    if (fsNativeActive()) { document.exitFullscreen().catch(() => setFsUI(false)); return; }
    if (screenEl.classList.contains('is-fs')) { setFsUI(false); return; }
    if (screenEl.requestFullscreen) {
      screenEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => setFsUI(true));
    } else {
      setFsUI(true);
    }
  }
  document.addEventListener('fullscreenchange', () => setFsUI(fsNativeActive()));
  if (fullBtn) fullBtn.addEventListener('click', toggleFullscreen);
  if (exitFsBtn) exitFsBtn.addEventListener('click', toggleFullscreen);

  /* ---- MENU from full screen (round 31). In full screen there is no site
         menu at all: natively the header is outside the fullscreen element,
         and the iOS CSS takeover sits at z-index 2147483000 over it. This
         control leaves full screen, waits for the layout to settle, then
         presses the SAME control the visitor would press — the burger below
         921px, the page-index Menu button above — so the sheet or the panel
         opens over the game. Nothing here re-implements the menu. ---- */
  function leaveFullscreen() {
    return new Promise((resolve) => {
      if (fsNativeActive()) {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          document.removeEventListener('fullscreenchange', finish);
          resolve();
        };
        // the existing fullscreenchange listener (registered above) runs
        // first and drops .is-fs; this one only reports that it happened
        document.addEventListener('fullscreenchange', finish);
        setTimeout(finish, 800);          // never leave the visitor stranded
        document.exitFullscreen().catch(() => { setFsUI(false); finish(); });
      } else {
        if (screenEl && screenEl.classList.contains('is-fs')) setFsUI(false);
        resolve();
      }
    });
  }
  function openSiteMenu() {
    const narrow = !!(window.matchMedia && window.matchMedia('(max-width:920px)').matches);
    const burger = document.querySelector('#site-header .adw-nav-toggle');
    const menuBtn = document.getElementById('adwMenuBtn');
    // whichever control is actually rendered wins — a display:none button
    // cannot open anything, whatever the media query says
    const shown = (el) => !!(el && el.getClientRects().length);
    const target = narrow ? (shown(burger) ? burger : menuBtn) : (shown(menuBtn) ? menuBtn : burger);
    if (!shown(target)) return false;
    if (target.getAttribute('aria-expanded') !== 'true') target.click();
    try { target.focus({ preventScroll: true }); } catch { /* older browsers */ }
    return true;
  }
  function menuFromFullscreen() {
    if (S.mode === 'playing') togglePause();   // the visitor is leaving the game
    leaveFullscreen().then(() => {
      // two frames: one for the class change to lay out, one for sticky
      // header geometry to settle before the panel pins itself to the bar
      requestAnimationFrame(() => requestAnimationFrame(openSiteMenu));
    });
  }
  if (menuFsBtn) menuFsBtn.addEventListener('click', menuFromFullscreen);
  // Escape leaves full screen whichever element has focus. The canvas
  // handler below only sees keys while the canvas is focused; browsers leave
  // NATIVE full screen on Escape themselves (and usually keep the key from
  // the page), so the exitFullscreen() here is belt and braces for the ones
  // that pass it through — the CSS-takeover branch is the one that needs it.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !screenEl || !screenEl.classList.contains('is-fs')) return;
    if (fsNativeActive()) { if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
    else setFsUI(false);
  });

  canvas.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': keys.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': keys.right = true; e.preventDefault(); break;
      case ' ': case 'Enter': primaryAction(); e.preventDefault(); break;
      case 'p': case 'P': if (S.started) togglePause(); break;
      case 'Escape':
        // in fallback full screen, Escape exits it (native FS handles itself)
        if (screenEl && screenEl.classList.contains('is-fs') && !fsNativeActive()) setFsUI(false);
        else if (S.started) togglePause();
        break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'm': case 'M': toggleMute(); break;
    }
    // Konami: ↑↑↓↓←→←→BA — the secret preference deal
    const want = KONAMI[S.konami];
    S.konami = (e.key === want || e.key.toLowerCase() === want) ? S.konami + 1 : 0;
    if (S.konami === KONAMI.length) {
      S.konami = 0;
      if (S.lives > 0 && S.mode !== 'attract') {
        S.lives = Math.min(S.lives + 2, 5);
        S.timers.fire = 10;
        popup(LW / 2, LH / 2, 'PREFERENCE DEAL!', C.gold, true);
        sfx.victory();
      }
    }
  });
  canvas.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  // pause politely when the tab is hidden or the window loses focus
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.mode === 'playing') togglePause();
  });
  window.addEventListener('blur', () => { if (S.mode === 'playing') togglePause(); });

  if (soundBtn) soundBtn.addEventListener('click', () => { engage(); if (!actx) { muted = false; store.set(LS_MUTE, '0'); audioInit(); updateSoundBtn(); sfx.power(); } else toggleMute(); });
  if (pauseBtn) pauseBtn.addEventListener('click', () => { engage(); togglePause(); });
  // RESTART builds a fresh board, so it obeys the same rule as primaryAction:
  // never while the widescreen edition is in flight (measured 2026-09-02: a
  // RESTART in that gap built the classic board across the 1708-unit field,
  // the one thing the LOADING… guard exists to prevent). The plugin's
  // arrival — or the fallback to classic — is what re-enables it.
  if (restartBtn) restartBtn.addEventListener('click', () => { engage(); if (editionLoading()) return; newGame(); });
  const againBtn = document.getElementById('nfAgain');
  if (againBtn) againBtn.addEventListener('click', () => {
    S.loop += 1;
    S.particles = []; S.popups = [];
    startLevel(0);
  });

  /* ======================================================================
     EDITIONS — the classic cabinet and the widescreen one
     ----------------------------------------------------------------------
     The engine above is the classic game. An EDITION is a plugin object
     registered through window.__NF_ARCADE.use(); the engine consults it at
     the "plugin &&" hook points and otherwise runs as it always has. Today
     there is one: the WIDESCREEN EDITION in notfound-arcade-wide.js.

     WHO GETS IT. WIDE_MQ — at least 1100 CSS px wide, at least 640 tall,
     landscape. That is every laptop and monitor at 100% zoom and most at
     125%; a 1366×768 screen at 150% (911×432) or a landscape phone
     (844×390) is below it and keeps the classic cabinet. The visitor can
     swap either way with the WIDESCREEN chip (#nfEdition); the choice is
     remembered in localStorage (LS_EDITION: 'wide' | 'classic'), and the
     default on a qualifying screen is widescreen. The stylesheet in
     404.astro reads the same choice through html.nf-classic (set by an
     inline script before the cabinet is laid out), so the box is right
     before this file runs — no layout shift either way.

     HOW IT LOADS. The plugin is fetched only when wanted (loadWide), so a
     phone never downloads it (the page's inline script preloads it on a
     qualifying desktop, so it is usually cached by the time this file
     asks). While it is in flight the attract screen is drawn in the wide
     box (resize() honours wantWide()) and says LOADING… — a click does not
     start a game until the edition has arrived, because a board built now
     would be the classic one stretched across the wide field and the
     plugin's arrival would wipe it. If it fails to load (404, network, a
     script error, or WIDE_TIMEOUT with no answer) the page falls back to
     the classic cabinet — field, store and box together, see setEdition —
     says so through html.nf-classic, and disables the chip for the visit
     without storing anything (a transient failure must not follow the
     visitor to next time).

     SWITCHING RESTARTS. A board is built for one field width; switching
     editions (or a live resize across WIDE_MQ, or a zoom that crosses it)
     returns the cabinet to the attract screen in the new shape rather than
     pretending the old board fits. Within the wide edition a resize keeps
     the game going: setField() re-centres through plugin.onField().
     ====================================================================== */
  const LS_EDITION = 'ausdems-404-arcade-edition';
  const WIDE_SRC = '/assets/js/notfound-arcade-wide.js';
  const WIDE_TIMEOUT = 10000;        // ms without the plugin answering before the classic cabinet takes over
  const WIDE_MQ = window.matchMedia ? window.matchMedia('(min-width:560px) and (orientation:landscape)') : null;
  const editions = {};
  let wideLoading = false, wideFailed = false;
  const editionBtn = document.getElementById('nfEdition');

  function wantWide() {
    return !!(WIDE_MQ && WIDE_MQ.matches) && !wideFailed && store.get(LS_EDITION) !== 'classic';
  }
  // widescreen wanted but not yet the edition playing — the plugin is in
  // flight (or registered mid-board and is waiting for it to end, NF.use)
  function editionLoading() { return wantWide() && !plugin; }
  // change the logical width; everything laid out for the old one is re-seated
  function setField(n) {
    n = Math.max(LW_CLASSIC, Math.round(n) || LW_CLASSIC);
    if (n === LW) return;
    const old = LW;
    LW = n;
    vignette = null;                 // cached for the old centre
    stars = makeStars();
    if (plugin && plugin.onField) plugin.onField(old, LW);
    for (const b of S.balls) b.x = Math.max(b.r + 4, Math.min(LW - b.r - 4, b.x));
    S.paddle.x = Math.max(S.paddle.w / 2 + 6, Math.min(LW - S.paddle.w / 2 - 6, S.paddle.x));
  }
  function clearBoard() {
    S.bricks = []; S.bricksLeft = 0; S.balls = []; S.lasers = []; S.capsules = [];
    S.particles = []; S.popups = []; S.prevMode = null;
    S.timers.wide = 0; S.timers.laser = 0; S.timers.slow = 0; S.timers.fire = 0;
    S.fx.shake = 0; S.fx.slowmo = 0; S.fx.bannerT = 0;
  }
  function updateEditionBtn() {
    if (editionBtn) editionBtn.setAttribute('aria-pressed', String(!!plugin));
  }
  // the cabinet returns to the attract screen in the CURRENT field
  function toAttract() {
    clearBoard();
    resize();
    S.paddle.w = S.paddle.targetW = S.paddle.baseW;
    S.paddle.x = LW / 2;
    setMode('attract');
  }
  function setEdition(id) {
    const next = (id === 'wide' && editions.wide) ? editions.wide : null;
    // asking for the edition already playing is a no-op — EXCEPT for the
    // classic cabinet while the field is still the wide one. That is the
    // fallback path: the plugin never registered, so `plugin` was null all
    // along while resize() derived LW from the wide box (wantWide()), and an
    // early return here used to leave a 1708-unit field in a 382×446 box
    // (measured: a 382×125 store, the classic board stretched across the
    // wide field, and a chip that could never reach classic).
    if (next === plugin && (plugin || LW === LW_CLASSIC)) { updateEditionBtn(); return; }
    if (plugin && plugin.deactivate) plugin.deactivate();
    plugin = next;
    if (!plugin) setField(LW_CLASSIC);
    if (plugin && plugin.activate) plugin.activate(NF);
    toAttract();
    updateEditionBtn();
  }
  // the plugin failed (404, network, a script error, WIDE_TIMEOUT): the
  // classic cabinet takes over for the rest of the visit — html.nf-classic
  // swaps the stylesheet, setEdition resets field + store + box, and the chip
  // is disabled and says why. Nothing is stored: next visit tries again.
  function fallBackToClassic() {
    document.documentElement.classList.add('nf-classic');
    if (editionBtn) {
      editionBtn.disabled = true;
      editionBtn.title = 'The widescreen edition could not be loaded — the classic cabinet is playing';
    }
    setEdition('classic');
  }
  let wideTimer = 0;
  function loadWide() {
    if (wideLoading || editions.wide) return;
    wideLoading = true;
    const el = document.createElement('script');
    el.src = WIDE_SRC; el.async = true;
    const fail = () => { clearTimeout(wideTimer); if (!wideLoading) return; wideLoading = false; wideFailed = true; fallBackToClassic(); };
    el.onload = () => { clearTimeout(wideTimer); wideLoading = false; if (!editions.wide) { wideFailed = true; fallBackToClassic(); } };
    el.onerror = fail;
    wideTimer = setTimeout(fail, WIDE_TIMEOUT);   // a stalled request must not leave LOADING… on the screen for ever
    document.head.appendChild(el);
  }
  function applyEdition() {
    if (wantWide()) {
      if (editions.wide) setEdition('wide');
      // in flight: a board built for the classic field cannot carry on in
      // the wide one (the chip's title promises a restart), so the cabinet
      // waits on the attract screen — LOADING… — until the plugin lands
      else { loadWide(); if (!plugin && S.mode !== 'attract') toAttract(); }
    }
    else setEdition('classic');
  }
  // the surface an edition builds on — state, palette, the juice helpers and
  // the state machine. Everything else stays private to this closure.
  const NF = {
    S, C, LEVELS, GLYPHS, POWERUPS, sfx, store, reducedMotion, ctx, canvas,
    LH, HUD_H, PADDLE_Y, get LW() { return LW; },
    burst, popup, shake, award, rounded, drawCentered, setMode, startLevel, newGame, ballSpeed, launchBall, resize,
    use(p) {
      if (!p || !p.id) return;
      editions[p.id] = p;
      // never wipe a board in play: apply between games (setMode picks it up)
      if (S.mode === 'attract' || S.mode === 'gameover') applyEdition(); else applyPending = true;
    },
    edition() { return plugin ? plugin.id : 'classic'; },
    setEdition,
    get hudInset() { return hudInset; },
  };
  window.__NF_ARCADE = NF;
  if (editionBtn) editionBtn.addEventListener('click', () => {
    engage();
    if (wideFailed) return;                     // no widescreen to swap to this visit (the chip is disabled; belt and braces)
    const toClassic = !!plugin || wantWide();   // wide (or about to be) → classic; otherwise → wide
    store.set(LS_EDITION, toClassic ? 'classic' : 'wide');
    document.documentElement.classList.toggle('nf-classic', toClassic);
    applyEdition();
  });
  if (WIDE_MQ) {
    // a live resize or a zoom across the threshold changes the cabinet
    const onMq = () => applyEdition();
    if (WIDE_MQ.addEventListener) WIDE_MQ.addEventListener('change', onMq); else WIDE_MQ.addListener(onMq);
  }

  /* ======================================================================
     MAIN LOOP
     ====================================================================== */
  let last = performance.now();
  let running = true;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);
    draw();
    if (running) requestAnimationFrame(frame);
  }

  // don't burn cycles if the cabinet is scrolled away (IntersectionObserver optional)
  if ('IntersectionObserver' in window && shell) {
    new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (!vis && S.mode === 'playing') togglePause();
    }, { threshold: 0.05 }).observe(shell);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => { resize(); requestAnimationFrame(resize); });
  // the canvas box can change without a window resize (the edition swap, a
  // zoom, full screen on the takeover path) — watch the element itself
  if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(canvas);
  resize();
  updateSoundBtn();
  requestAnimationFrame(frame);
  applyEdition();

  // QA hook — only with #nfdebug in the URL; lets the regression suite jump
  // between levels and inspect state without playing 10 boards by hand.
  if (window.location.hash.includes('nfdebug')) {
    window.__NF = { S, LEVELS, startLevel, setMode, setEdition, get LW() { return LW; }, get viewScale() { return viewScale; }, get hudInset() { return hudInset; }, edition: () => (plugin ? plugin.id : 'classic'), loading: editionLoading, failed: () => wideFailed };
  }
})();
