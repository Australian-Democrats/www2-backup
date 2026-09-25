/* ==========================================================================
   BRICK BY BRICK — Escape from Page 404
   The Lost Page Arcade · Australian Democrats 404 page
   --------------------------------------------------------------------------
   A self-contained, dependency-free canvas brick-smasher. The bricks spell
   the story: 404 → LOST → OOPS → HOME. Clear HOME and you've literally
   found your way home. Full design brief: docs/404-ARCADE-BRIEF.md
   Runs only on the 404 page (elements are only in src/pages/404.astro).
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

  /* ---------- logical playfield (all game maths lives in these units) ---- */
  const LW = 480, LH = 560;          // logical width/height
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
    let r = Math.random() * PU_TOTAL_WEIGHT;
    for (const p of POWERUPS) { r -= p.weight; if (r <= 0) return p; }
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

  /* ---------- starfield backdrop (the Void of Lost Pages) --------------- */
  const stars = Array.from({ length: 70 }, (_, i) => ({
    x: (i * 137.5) % LW,
    y: (i * 89.7) % LH,
    r: 0.6 + (i % 3) * 0.5,
    s: 6 + (i % 5) * 5,
  }));

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
    const bw = (LW - margin * 2 - (cols - 1) * gapX) / cols;
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
              w: bw, h: bh, hp, maxHp: hp, gold, row: r, flash: 0,
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
    // brick destroyed
    S.bricksLeft -= 1;
    const cx = brick.x + brick.w / 2, cy = brick.y + brick.h / 2;
    const base = brick.ad ? 300 : brick.gold ? 150 : 40 + brick.maxHp * 20;
    award(base, cx, cy);
    sfx.brick(S.combo);
    burst(cx, cy, brick.gold ? C.gold : C.brick1[(brick.row + S.level) % 4], brick.gold ? 16 : 9);
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

    // paddle width easing + keyboard motion
    S.paddle.w += (S.paddle.targetW - S.paddle.w) * Math.min(1, dt * 10);
    if (keys.left) S.paddle.x -= 460 * dt;
    if (keys.right) S.paddle.x += 460 * dt;
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
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || LW;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * (LH / LW) * dpr);
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

    // capsules
    for (const c of S.capsules) {
      const wob = Math.sin(c.t * 6) * 3;
      ctx.save();
      ctx.translate(c.x + wob, c.y);
      ctx.fillStyle = c.type.color;
      rounded(-15, -9, 30, 18, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      rounded(-15, -9, 30, 7, 6); ctx.fill();
      ctx.fillStyle = c.type.id === 'laser' || c.type.id === 'fire' ? C.ink : C.white;
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

    // soft vignette to seat the playfield in the cabinet
    if (!vignette) {
      vignette = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.42, LW / 2, LH / 2, LH * 0.8);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(4,14,12,.4)');
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, LW, LH);

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
    ctx.fillText(S.loop > 1 ? `${lvlLabel} · L${S.loop}` : lvlLabel, LW / 2 + 30, HUD_H / 2);
    // lives as pixel hearts
    for (let i = 0; i < S.lives; i++) drawHeart(LW - 18 - i * 17, HUD_H / 2, 5.5);
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
    drawCentered(blinkOn() ? '▶ CLICK / TAP TO START' : '', 448, 18, C.white);
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
  if (restartBtn) restartBtn.addEventListener('click', () => { engage(); newGame(); });
  const againBtn = document.getElementById('nfAgain');
  if (againBtn) againBtn.addEventListener('click', () => {
    S.loop += 1;
    S.particles = []; S.popups = [];
    startLevel(0);
  });

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
  resize();
  updateSoundBtn();
  requestAnimationFrame(frame);

  // QA hook — only with #nfdebug in the URL; lets the regression suite jump
  // between levels and inspect state without playing 10 boards by hand.
  if (window.location.hash.includes('nfdebug')) {
    window.__NF = { S, LEVELS, startLevel, setMode };
  }
})();
