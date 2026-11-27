/* ==========================================================================
   BRICK BY BRICK — THE WIDESCREEN EDITION
   The Lost Page Arcade · Australian Democrats 404 page · round 32
   --------------------------------------------------------------------------
   A PLUGIN for notfound-arcade.js, not a second engine. The classic file
   owns the loop, the physics, the input, full screen, the MENU flow, sound
   and the state machine; this file registers through window.__NF_ARCADE.use()
   and is called at the engine's hook points. It is fetched only on a desktop
   that qualifies for the edition (>=1100 CSS px wide, >=640 tall, landscape —
   WIDE_MQ in the engine), so a phone never downloads it.

   WHAT THE WIDTH BUYS — the twists the portrait cabinet does not have:

   1. CROSSING THE FLOOR   a rank of bricks marches sideways across the full
                           width of the field and turns at the walls — the
                           wall comes to the ball. Count and speed rise with
                           the level. They must be cleared like any brick.
   2. PREFERENCE FLOW      gold BALLOT bricks sit in the wings either side of
                           the word; hit one and the ball splits into three
                           on the spot — no capsule to catch. Worth 200.
   3. THE PRESS GALLERY    a bonus row scrolling under the HUD, wrapping round
                           the whole width. Each is +100 and none of them has
                           to be cleared to finish the board (`free` bricks).
   4. SPIN                 a grey capsule you are meant to DODGE: swallow it
                           and the paddle shrinks to 62% for seven seconds.
                           The only negative pick-up in the game, and only
                           here — the width is what makes it dodgeable.

   And the field itself: the logical width follows the canvas box (the engine's
   setField), the paddle is proportionally wider (12% of the field, 96–270
   units), the keyboard paddle speed scales with the width, and the word is set
   on a capped measure so its bricks keep their proportions. The bonus rounds
   (the all-gold AD / DEMOCRATS interludes) get NONE of the twists — they are
   the breather — but they are set on the same measure and re-proportioned
   like every other board: AD's oversized glyphs cap at 45 units, not the
   words' 26, which had made the logo flatter than the classic cabinet draws
   it (58.7×26 against 36.9×30; now 58.7×45).

   FIELD CHANGES (resize, zoom, full screen) keep the game going: the word
   keeps its measure and is re-centred; the rank is re-fitted; each ballot is
   re-derived from its SIDE and its fraction of whatever wing the new field
   leaves beside the word — a wing too narrow to hold one retires the ballot
   as if cleared, bricksLeft following it down (1708 → 996 in full screen once
   left six ballots sitting on the word).

   NOTHING HERE STATES A FACT. "Crossing the floor", "preference flow", "the
   press gallery", "spin" are the names of parliamentary furniture and
   press-gallery jargon used as game labels; no person, party, vote or event
   is described.
   ========================================================================== */
(() => {
  'use strict';
  const NF = window.__NF_ARCADE;
  if (!NF || !NF.S) return;
  const { S, C, sfx } = NF;
  const HUD_H = NF.HUD_H, PADDLE_Y = NF.PADDLE_Y;

  /* ---------- the edition's own state ------------------------------------ */
  const W = {
    spin: 0,             // seconds of SPIN left (paddle shrunk)
    rank: null,          // the crossing-the-floor rank: { x, w, v, dir, n, cw, gap }
    measure: 480,        // the measure the current board's word was set on (ballots re-derive their wings from it)
    stats: { crossers: 0, splits: 0, gallery: 0, spins: 0, retired: 0 },   // for QA (window.__NF_WIDE); retired = ballots with no wing left after a field change
  };
  const CROSS_W = 40, CROSS_H = 14;
  const GAL_W = 26, GAL_H = 9, GAL_SPEED = 70;
  const SPIN_SECS = 7, SPIN_SCALE = 0.62;

  // the SPIN capsule — grey, ink text (the engine reads `ink`), the one bad pick-up
  const SPIN = { id: 'spin', label: 'SPIN', short: 'SPIN', color: '#c9d1cf', ink: true, weight: 14 };

  function paddleBase() { return Math.round(Math.max(96, Math.min(270, NF.LW * 0.12))); }   // 12% of the field: 1415 -> 170, 2240 (the 4:1 cap) -> 269
  function wingRoom(measure) { return (NF.LW - (measure - 44)) / 2; }   // clear width either side of the word

  /* ---------- the rank geometry (also re-fitted on a field change) -------- */
  function fitRank(r) {
    const LW = NF.LW;
    r.gap = Math.max(8, Math.round((LW * 0.72 - r.n * CROSS_W) / Math.max(1, r.n - 1)));
    r.w = r.n * CROSS_W + (r.n - 1) * r.gap;
    r.x = Math.max(4, Math.min(LW - 4 - r.w, r.x));
    for (const b of S.bricks) if (b.cross) b.off = b.i * (CROSS_W + r.gap);
  }

  const plugin = {
    id: 'wide',

    activate() { W.spin = 0; W.rank = null; S.paddle.baseW = paddleBase(); },
    deactivate() { W.spin = 0; W.rank = null; S.paddle.baseW = 84; },
    onReset() { W.spin = 0; },

    // the word's measure: half the field, never narrower than the classic 480
    // or wider than 720 — so a 1434-wide field sets '404' on 717 units
    measure() { return Math.min(720, Math.max(480, NF.LW * 0.5)); },
    kbSpeed() { return 460 * Math.max(1, NF.LW / 640); },
    paddleScale() { return W.spin > 0 ? SPIN_SCALE : 1; },
    powerups: [SPIN],
    pills() { return W.spin > 0 ? [['SPIN — PADDLE SHRUNK', W.spin, SPIN_SECS]] : []; },

    /* ---- the board: the word (re-proportioned) plus the wings ------------ */
    buildLevel(idx, lvl, geo) {
      const LW = NF.LW;
      W.measure = geo.measure;
      // 1. the word grows with its measure: taller bricks, not flatter ones —
      //    the interludes included (the AD logo's big glyphs get a bigger cap)
      const k = geo.measure / 480;
      const bh = Math.min(lvl.big ? 45 : 26, Math.round(geo.bh * k));
      const rowStep = bh + geo.gapY, lineStep = geo.GR * rowStep + geo.lineGap;
      for (const b of S.bricks) {
        if (bh !== geo.bh) { b.h = bh; b.y = geo.startY + b.line * lineStep + b.row * rowStep; }
        b.dx = b.x + b.w / 2 - LW / 2;          // offset from centre — re-seated by onField()
      }
      const wordBottom = geo.startY + geo.lines * lineStep - geo.lineGap;
      W.rank = null;
      if (lvl.bonus) return;                     // the interludes stay the interludes

      // 2. PREFERENCE FLOW — ballot bricks in the wings
      const wing = wingRoom(geo.measure);
      const perWing = wing > 300 ? 2 : wing > 120 ? 1 : 0;
      for (let side = -1; side <= 1; side += 2) {
        for (let j = 0; j < perWing; j++) {
          const u = perWing === 1 ? 0.5 : (j === 0 ? 0.36 : 0.68);   // fraction of the wing
          const cx = side < 0 ? wing * u : LW - wing * u;
          const y = geo.startY + 18 + j * 58;
          S.bricks.push({ x: cx - 18, y, w: 36, h: 20, hp: 1, maxHp: 1, gold: true, ballot: true, base: 200,
            side, u, row: 0, line: 0, flash: 0 });
          S.bricksLeft += 1;
        }
      }

      // 3. CROSSING THE FLOOR — the rank
      const n = Math.max(6, Math.min(18, Math.round(LW / 120)));
      const r = { n, x: 0, w: 0, gap: 0, v: 34 + idx * 5 + (S.loop - 1) * 10, dir: (idx % 2) ? -1 : 1 };
      const y = Math.min(wordBottom + 44, PADDLE_Y - 150);
      for (let i = 0; i < n; i++) {
        S.bricks.push({ x: 0, y, w: CROSS_W, h: CROSS_H, hp: 1, maxHp: 1, gold: false, cross: true, i, off: 0,
          row: 2, line: 0, flash: 0 });
        S.bricksLeft += 1;
      }
      fitRank(r);
      r.x = (LW - r.w) / 2;
      for (const b of S.bricks) if (b.cross) b.x = r.x + b.off;
      W.rank = r;

      // 4. THE PRESS GALLERY — the free bonus row under the HUD
      const gn = Math.max(5, Math.min(14, Math.round(LW / 150)));
      const step = (LW + 80) / gn;
      for (let i = 0; i < gn; i++) {
        S.bricks.push({ x: i * step, y: HUD_H + 8, w: GAL_W, h: GAL_H, hp: 1, maxHp: 1, gold: false, gallery: true,
          free: true, base: 100, row: 0, line: 0, flash: 0 });
      }
    },

    /* ---- the field changed width mid-game (resize, zoom, full screen) ---- */
    onField(oldLW, newLW) {
      S.paddle.baseW = paddleBase();
      // the word keeps its measure, so the wings are whatever the NEW field
      // leaves either side of it — not a fraction of the old field
      const wing = wingRoom(W.measure);
      for (const b of S.bricks) {
        if (b.cross || b.gallery) continue;
        if (b.ballot) {
          if (b.hp <= 0) continue;
          if (wing <= 120) { b.hp = 0; S.bricksLeft -= 1; W.stats.retired += 1; continue; }   // no wing to live in: retired, and the count stays honest
          const cx = b.side < 0 ? wing * b.u : newLW - wing * b.u;
          b.x = Math.max(4, Math.min(newLW - 4 - b.w, cx - b.w / 2));
          continue;
        }
        if (typeof b.dx === 'number') b.x = newLW / 2 + b.dx - b.w / 2;   // the word stays centred
      }
      if (W.rank) { fitRank(W.rank); for (const b of S.bricks) if (b.cross) b.x = W.rank.x + b.off; }
      for (const b of S.bricks) if (b.gallery && b.x > newLW + 40) b.x = (b.x % (newLW + 80)) - 40;
    },

    /* ---- per frame, before the balls are tested ------------------------- */
    update(dt, ts) {
      const LW = NF.LW, m = dt * ts;
      if (W.spin > 0) W.spin -= dt;
      const r = W.rank;
      if (r) {
        r.x += r.dir * r.v * m;
        if (r.x < 4) { r.x = 4; r.dir = 1; }
        else if (r.x + r.w > LW - 4) { r.x = LW - 4 - r.w; r.dir = -1; }
      }
      for (const b of S.bricks) {
        if (b.hp <= 0) continue;
        if (b.cross && r) b.x = r.x + b.off;
        else if (b.gallery) { b.x -= GAL_SPEED * m; if (b.x + b.w < -40) b.x += LW + 80; }
      }
    },

    /* ---- marks on the edition's bricks (drawn after the engine's fills) -- */
    drawBricks() {
      const ctx = NF.ctx;
      const d = W.rank ? W.rank.dir : 1;
      for (const b of S.bricks) {
        if (b.hp <= 0) continue;
        if (b.cross) {
          // a chevron pointing the way the rank is walking
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          ctx.strokeStyle = 'rgba(234,255,249,.85)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(cx - 3 * d, cy - 4); ctx.lineTo(cx + 2 * d, cy); ctx.lineTo(cx - 3 * d, cy + 4); ctx.stroke();
        } else if (b.ballot) {
          // an ink ballot box on the gold: the slot, and a tick going in
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
          ctx.strokeRect(b.x + 0.75, b.y + 0.75, b.w - 1.5, b.h - 1.5);
          ctx.fillStyle = C.ink; ctx.fillRect(b.x + 8, b.y + 5, b.w - 16, 2);
          ctx.beginPath(); ctx.moveTo(b.x + b.w / 2 - 6, b.y + 12); ctx.lineTo(b.x + b.w / 2 - 2, b.y + 16); ctx.lineTo(b.x + b.w / 2 + 6, b.y + 9); ctx.stroke();
        } else if (b.gallery) {
          ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
          ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        }
      }
    },

    /* ---- a brick of ours went down ---------------------------------------- */
    onBreak(br, ball) {
      if (br.ballot) {
        const src = ball || S.balls.find((b) => !b.stuck) || S.balls[0];
        if (!src) return;
        for (let i = 0; i < 2; i++) {
          if (S.balls.length >= 9) break;
          const a = Math.atan2(src.vy || -1, src.vx || 0.3) + (i === 0 ? 0.55 : -0.55);
          const sp = Math.max(Math.hypot(src.vx, src.vy), NF.ballSpeed() * 0.9);
          S.balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6, stuck: false, trail: [] });
        }
        NF.popup(br.x + br.w / 2, br.y - 14, 'PREFERENCE FLOW!', C.gold, true);
        NF.burst(br.x + br.w / 2, br.y + br.h / 2, C.gold, 14, 200);
        sfx.power();
        W.stats.splits += 1;
      } else if (br.gallery) {
        NF.popup(br.x + br.w / 2, br.y + 20, 'PRESS GALLERY', 'rgba(234,255,249,.85)');
        W.stats.gallery += 1;
      } else if (br.cross) {
        W.stats.crossers += 1;
      }
    },

    /* ---- the one capsule we own ------------------------------------------- */
    powerup(p) {
      if (p.id !== 'spin') return false;
      W.spin = SPIN_SECS;
      NF.popup(S.paddle.x, PADDLE_Y - 34, 'SPIN! PADDLE SHRINKS', C.red, true);
      NF.shake(4);
      sfx.tough();
      W.stats.spins += 1;
      return true;
    },

    /* ---- the attract screen names the edition ----------------------------- */
    attract() {
      const y = S.hiScore > 0 ? 412 : 396;
      NF.drawCentered('WIDESCREEN EDITION', y, 12, C.gold);
      // the twists by the names the game uses everywhere else (the popups,
      // the pills, the brief): one name each, in one case
      NF.drawCentered('CROSSING THE FLOOR · PREFERENCE FLOW · THE PRESS GALLERY · DODGE THE SPIN', y + 18, 11, 'rgba(234,255,249,.75)', 600);
    },
  };

  if (window.location.hash.includes('nfdebug')) window.__NF_WIDE = W;
  NF.use(plugin);
})();
