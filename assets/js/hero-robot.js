/* Interactive hero robot (home page).
   Same art and coordinates as assets/img/robot-hero.svg (viewBox 520×440, y down).
   Drag the elbow/wrist knobs (joint angles), the gripper (inverse kinematics) or the
   TurtleBot body (drive). Lower the gripper onto the cube to pick it up; set it on the
   floor to let go. On the first visit per tab, a ~2.6 s intro plays in sync with the
   headline: drive in → "See it." → "Grab it." → "Bring it back."

   window.HeroModel holds the pure geometry/rules (unit-testable in Node);
   the DOM controller below only runs in a browser. */
(function (root) {
  const Kin = root.Kin;
  if (!Kin) return;

  const D2R = Math.PI / 180;
  const FLOOR = 400;
  const S0 = { x: 204, y: 290 }; // shoulder, base frame
  const E0 = { x: 128, y: 206 }; // elbow in the static art
  const W0 = { x: 72, y: 300 }; // wrist in the static art
  const L1 = Math.hypot(E0.x - S0.x, E0.y - S0.y);
  const L2 = Math.hypot(W0.x - E0.x, W0.y - E0.y);
  const L3 = 68; // wrist → fingertips
  const PALM = 46; // wrist → finger base
  const HOME_T1 = Math.atan2(E0.y - S0.y, E0.x - S0.x);
  const HOME = { t1: HOME_T1, t2: Kin.wrap(Math.atan2(W0.y - E0.y, W0.x - E0.x) - HOME_T1), baseX: 0 };
  const STOW = { t1: -95 * D2R, t2: -150 * D2R };
  const SIGN = Math.sign(HOME.t2) || -1;
  const CUBE = { w: 32, h: 28, x0: 72 };
  const BODY = { x0: 232, x1: 404, y0: 150 }; // robot body, base frame (everything below y0)
  const MOUNT = { x0: 184, x1: 246, y0: 286 }; // arm base + bracket
  const BASE_MIN = -150, BASE_MAX = 80;
  const GRIP = { open: 20, closed: 17.5, held: 16 }; // held: cube top sits 16 above the fingertips
  const ALIGN = 10; // fingertips this close to the cube's center can descend around it
  const INTRO = { drive: 1.1, see: 1.1, seeEnd: 1.5, det: 1.3, grab: 1.5, grabEnd: 2.4, bring: 2.3, end: 2.6 };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  function points(pose) {
    const S = { x: S0.x + pose.baseX, y: S0.y };
    const { E, W } = Kin.fk2(S, L1, L2, pose.t1, pose.t2);
    return { S, E, W, T: { x: W.x, y: W.y + L3 } };
  }

  const inRect = (p, r, bx) => p.x > r.x0 + bx && p.x < r.x1 + bx && p.y > r.y0;

  function valid(pose, cube) {
    if (pose.baseX < BASE_MIN - 1e-6 || pose.baseX > BASE_MAX + 1e-6) return false;
    const { E, W, T } = points(pose);
    if (E.y > FLOOR - 6 || W.y > FLOOR - 6 || T.y > FLOOR + 1e-6) return false;
    for (const p of [E, W, T]) if (inRect(p, BODY, pose.baseX) || inRect(p, MOUNT, pose.baseX)) return false;
    if (cube.state === "held") return T.y + CUBE.h - GRIP.held <= FLOOR + 1e-6;
    // fingers would hit the cube (skipped right after a release, so the robot can back away)
    const dx = Math.abs(T.x - cube.x);
    if (cube.armed !== false && T.y > FLOOR - CUBE.h && dx >= ALIGN && dx < CUBE.w / 2 + GRIP.open + 2) return false;
    return true;
  }

  function graspable(pose, cube) {
    if (cube.state !== "floor" || cube.armed === false) return false;
    const T = points(pose).T;
    return Math.abs(T.x - cube.x) < ALIGN && T.y > FLOOR - CUBE.h + 2;
  }

  // IK for a wrist target, staying on the arm's current elbow branch; never below the floor
  function solveGripper(pose, wrist, cube) {
    const maxY = FLOOR - L3 - (cube.state === "held" ? CUBE.h - GRIP.held : 0);
    const S = points(pose).S;
    const s = Kin.ik2(L1, L2, wrist.x - S.x, Math.min(wrist.y, maxY) - S.y, Math.sign(pose.t2) || SIGN);
    return { ...pose, t1: s.t1, t2: s.t2 };
  }

  function introPose(t, startX) {
    const k1 = easeOut(clamp(t / INTRO.drive, 0, 1));
    const k2 = easeInOut(clamp((t - INTRO.grab) / (INTRO.grabEnd - INTRO.grab), 0, 1));
    return {
      baseX: startX * (1 - k1),
      t1: Kin.wrap(STOW.t1 + Kin.wrap(HOME.t1 - STOW.t1) * k2),
      t2: Kin.wrap(STOW.t2 + Kin.wrap(HOME.t2 - STOW.t2) * k2),
      fov: clamp((t - INTRO.see) / (INTRO.seeEnd - INTRO.see), 0, 1),
      det: t >= INTRO.det,
      lines: t >= INTRO.bring ? 3 : t >= INTRO.grab ? 2 : t >= INTRO.see ? 1 : 0,
      done: t >= INTRO.end,
    };
  }

  root.HeroModel = { FLOOR, S0, L1, L2, L3, HOME, STOW, SIGN, CUBE, GRIP, INTRO, points, valid, graspable, solveGripper, introPose };
  if (typeof document === "undefined") return;

  /* ===================== DOM ===================== */
  const host = document.getElementById("hero-robot");
  if (!host) return;
  const html = document.documentElement;
  const hero = host.closest(".hero") || document.body;
  const lines = [...document.querySelectorAll(".hero .hl-line")];
  const wantIntro = html.classList.contains("intro-pending");
  if (root.__introFallback) clearTimeout(root.__introFallback);
  if (wantIntro) {
    try { sessionStorage.setItem("fetchbot-intro", "1"); } catch (e) { /* storage blocked: intro just replays next time */ }
  }

  let hatch = "";
  for (let x = 20; x <= 500; x += 40) hatch += `<line x1="${x}" y1="400" x2="${x - 12}" y2="414"/>`;
  const knob = 'fill="#0a0b0e" stroke="#3ad6ff" stroke-width="3"';

  host.innerHTML = `
  <svg class="hero-svg" viewBox="0 0 520 440" fill="none" font-family="JetBrains Mono, ui-monospace, monospace" role="group"
       aria-label="Interactive robot: a TurtleBot3 with an SO-101 arm next to a cube. Drag the joints, the gripper or the base.">
    <defs>
      <linearGradient id="hr-gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ff2e"/><stop offset="1" stop-color="#3ad6ff"/></linearGradient>
      <linearGradient id="hr-up" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3ad6ff"/><stop offset="1" stop-color="#c8ff2e"/></linearGradient>
      <linearGradient id="hr-down" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8ff2e"/><stop offset="1" stop-color="#3ad6ff"/></linearGradient>
    </defs>
    <line x1="10" y1="400" x2="510" y2="400" stroke="#353c4a" stroke-width="2"/>
    <g stroke="#262b36" stroke-width="1.5">${hatch}</g>

    <g data-ref="base">
      <g data-ref="fov" pointer-events="none">
        <path d="M232 170 L40 400 L210 400 Z" fill="#3ad6ff" fill-opacity="0.05"/>
        <path d="M232 170 L40 400 M232 170 L210 400" stroke="#3ad6ff" stroke-opacity="0.45" stroke-dasharray="4 6"/>
      </g>
      <g class="handle" data-handle="base" tabindex="0" role="button" aria-label="TurtleBot base. Drag it, or use the left and right arrow keys, to drive.">
        <rect class="hit" x="236" y="196" width="172" height="206" rx="8" fill="transparent"/>
        <g stroke="#8790a0" stroke-width="2">
          <rect x="240" y="352" width="160" height="9" rx="2" fill="#14171e"/>
          <rect x="240" y="292" width="160" height="9" rx="2" fill="#14171e"/>
          <rect x="240" y="232" width="160" height="9" rx="2" fill="#14171e"/>
          <line x1="252" y1="241" x2="252" y2="292"/><line x1="388" y1="241" x2="388" y2="292"/>
          <line x1="252" y1="301" x2="252" y2="352"/><line x1="388" y1="301" x2="388" y2="352"/>
          <rect x="285" y="200" width="78" height="32" rx="6" fill="#1b1f28"/>
          <line x1="295" y1="216" x2="353" y2="216" stroke="#3ad6ff" stroke-opacity="0.6"/>
          <rect x="270" y="310" width="100" height="30" rx="3" fill="#1b1f28"/>
          <g data-ref="wheel">
            <circle cx="300" cy="368" r="32" fill="#0f1116"/>
            <path d="M300 356 V342 M300 380 V394 M288 368 H274 M312 368 H326" stroke-opacity="0.6"/>
            <circle cx="300" cy="368" r="12"/>
          </g>
          <circle cx="384" cy="392" r="8"/>
        </g>
      </g>
      <line x1="246" y1="232" x2="246" y2="176" stroke="#8790a0" stroke-width="2"/>
      <rect x="226" y="160" width="34" height="20" rx="4" fill="#1b1f28" stroke="#3ad6ff" stroke-width="2"/>
      <circle cx="234" cy="170" r="5" fill="#3ad6ff"/>
      <rect x="200" y="296" width="44" height="10" fill="#262b36"/>
      <rect x="186" y="290" width="36" height="58" rx="5" fill="#14171e" stroke="url(#hr-gv)" stroke-width="2.5"/>
      <g font-size="11" fill="#8790a0" pointer-events="none">
        <text x="300" y="150">LiDAR</text><line x1="318" y1="156" x2="322" y2="198" stroke="#353c4a"/>
        <text x="190" y="128">camera</text><line x1="214" y1="134" x2="236" y2="158" stroke="#353c4a"/>
        <text x="410" y="300">TurtleBot3</text><line x1="408" y1="296" x2="392" y2="296" stroke="#353c4a"/>
      </g>
    </g>

    <rect data-ref="link1" x="-6.5" y="-6.5" height="13" rx="6.5" fill="url(#hr-up)" pointer-events="none"/>
    <rect data-ref="link2" x="-6.5" y="-6.5" height="13" rx="6.5" fill="url(#hr-down)" pointer-events="none"/>
    <line data-ref="palm" stroke="#c8ff2e" stroke-width="7" stroke-linecap="round" pointer-events="none"/>
    <path data-ref="fingers" stroke="#c8ff2e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>
    <g class="handle" data-handle="gripper" tabindex="0" role="button" aria-label="Gripper. Drag it, or use the arrow keys, to move the arm. Lower it onto the cube to grab it; press Enter to let go on the floor.">
      <rect class="hit" data-ref="gripHit" width="52" height="${L3 - 6}" rx="10" fill="transparent"/>
    </g>
    <circle data-ref="kS" r="9" ${knob} pointer-events="none"/>
    <g class="handle" data-handle="elbow" tabindex="0" role="button" aria-label="Elbow joint. Drag it, or use the arrow keys, to rotate the shoulder.">
      <circle data-ref="hitE" r="22" fill="transparent"/><circle class="knob" data-ref="kE" r="9" ${knob}/>
    </g>
    <g class="handle" data-handle="wrist" tabindex="0" role="button" aria-label="Wrist joint. Drag it, or use the arrow keys, to bend the elbow.">
      <circle data-ref="hitW" r="20" fill="transparent"/><circle class="knob" data-ref="kW" r="8" ${knob}/>
    </g>

    <rect data-ref="cube" width="${CUBE.w}" height="${CUBE.h}" rx="3" fill="#ff5c5c" fill-opacity="0.85" pointer-events="none"/>
    <g data-ref="det" class="hero-det" pointer-events="none">
      <rect data-ref="detBox" width="56" height="48" stroke="#c8ff2e" stroke-width="1.5" stroke-dasharray="5 4"/>
      <rect data-ref="detTag" width="70" height="16" fill="#c8ff2e"/>
      <text data-ref="detText" font-size="10" fill="#0a0b0e" font-weight="700">object 0.94</text>
    </g>
    <circle data-ref="reach" class="hero-reach" stroke="#c8ff2e" stroke-dasharray="3 6" stroke-opacity="0.5" pointer-events="none"/>
    <g data-ref="armTag" class="hero-armtag" font-size="11" fill="#8790a0" pointer-events="none">
      <text data-ref="armLabel">SO-101 arm</text><line data-ref="armLead" stroke="#353c4a"/>
    </g>
  </svg>
  <div class="hero-robot-ui">
    <span>Drag the joints, gripper or base. Lower the gripper onto the cube to pick it up.</span>
    <button type="button" class="hero-replay">↻ Replay</button>
  </div>`;

  const svg = host.querySelector("svg");
  const ref = {};
  host.querySelectorAll("[data-ref]").forEach((el) => (ref[el.dataset.ref] = el));
  const set = (el, attrs) => { for (const k in attrs) el.setAttribute(k, typeof attrs[k] === "number" ? +attrs[k].toFixed(2) : attrs[k]); };

  let tgt = { ...HOME }, cur = { ...HOME };
  let cube = { state: "floor", x: CUBE.x0, armed: true };
  let gap = GRIP.open, gapT = GRIP.open;
  let wheel = 0, lastBaseX = 0;
  let fov = 1, detAllowed = true;
  let drag = null, intro = null, raf = 0;
  let armTag = true; // the "SO-101 arm" callout fades once the arm is moved (it would collide with the others)
  const EASE = 0.3;

  function cubeAt(P) {
    return cube.state === "held" ? { x: P.T.x, bottom: P.T.y + CUBE.h - GRIP.held } : { x: cube.x, bottom: FLOOR };
  }

  function inFov(p, bx) {
    const a = { x: 232 + bx, y: 170 }, b = { x: 40 + bx, y: 400 }, c = { x: 210 + bx, y: 400 };
    const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }

  function link(el, P, ang, L) {
    set(el, { width: L + 13, transform: `translate(${P.x.toFixed(2)} ${P.y.toFixed(2)}) rotate(${(ang / D2R).toFixed(3)})` });
  }

  function render() {
    const P = points(cur);
    set(ref.base, { transform: `translate(${cur.baseX.toFixed(2)} 0)` });
    set(ref.wheel, { transform: `rotate(${(wheel / D2R).toFixed(2)} 300 368)` });
    ref.fov.style.opacity = fov;
    link(ref.link1, P.S, cur.t1, L1);
    link(ref.link2, P.E, cur.t1 + cur.t2, L2);
    const fy = P.W.y + PALM;
    set(ref.palm, { x1: P.W.x, y1: P.W.y, x2: P.W.x, y2: fy });
    set(ref.fingers, { d: `M${(P.W.x - gap).toFixed(2)} ${fy.toFixed(2)} H${(P.W.x + gap).toFixed(2)} M${(P.W.x - gap).toFixed(2)} ${fy.toFixed(2)} V${P.T.y.toFixed(2)} M${(P.W.x + gap).toFixed(2)} ${fy.toFixed(2)} V${P.T.y.toFixed(2)}` });
    set(ref.gripHit, { x: P.W.x - 26, y: P.W.y + 12 });
    set(ref.kS, { cx: P.S.x, cy: P.S.y });
    for (const [k, p] of [["kE", P.E], ["hitE", P.E], ["kW", P.W], ["hitW", P.W]]) set(ref[k], { cx: p.x, cy: p.y });

    const cb = cubeAt(P);
    set(ref.cube, { x: cb.x - CUBE.w / 2, y: cb.bottom - CUBE.h });
    set(ref.detBox, { x: cb.x - 28, y: cb.bottom - 40 });
    set(ref.detTag, { x: cb.x - 28, y: cb.bottom - 57 });
    set(ref.detText, { x: cb.x - 24, y: cb.bottom - 45 });
    ref.det.style.opacity = detAllowed && fov > 0.5 && inFov({ x: cb.x, y: cb.bottom - CUBE.h / 2 }, cur.baseX) ? 1 : 0;

    set(ref.reach, { cx: P.S.x, cy: P.S.y, r: L1 + L2 });
    ref.reach.style.opacity = drag && drag.type === "gripper" ? 1 : 0;
    ref.armTag.style.opacity = armTag ? 1 : 0;
    set(ref.armLabel, { x: P.E.x + 22, y: P.E.y - 46 });
    set(ref.armLead, { x1: P.E.x + 22, y1: P.E.y - 40, x2: P.E.x + 12, y2: P.E.y - 14 });
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function frame(now) {
    raf = 0;
    let moving = !!drag;
    if (intro) {
      const ip = introPose((now - intro.t0) / 1000, intro.startX);
      cur = { t1: ip.t1, t2: ip.t2, baseX: ip.baseX };
      tgt = { ...cur };
      fov = ip.fov;
      detAllowed = ip.det;
      lines.forEach((l, i) => l.classList.toggle("on", i < ip.lines));
      if (ip.lines === 3 && !intro.pulsed && lines[2]) { intro.pulsed = true; lines[2].classList.add("pulse"); }
      if (ip.done) finishIntro();
      else moving = true;
    } else {
      for (const k of ["t1", "t2"]) {
        const d = Kin.wrap(tgt[k] - cur[k]);
        if (Math.abs(d) > 1e-4) { cur[k] = Kin.wrap(cur[k] + d * EASE); moving = true; } else cur[k] = tgt[k];
      }
      const db = tgt.baseX - cur.baseX;
      if (Math.abs(db) > 0.05) { cur.baseX += db * EASE; moving = true; } else cur.baseX = tgt.baseX;
      const dg = gapT - gap;
      if (Math.abs(dg) > 0.02) { gap += dg * EASE; moving = true; } else gap = gapT;
    }
    wheel += (cur.baseX - lastBaseX) / 32; // rolls without slipping (wheel radius 32)
    lastBaseX = cur.baseX;
    render();
    if (moving) kick();
  }

  function offscreenX() {
    const r = svg.getBoundingClientRect();
    const scale = r.width / 520 || 1;
    // leftmost part of the stowed robot is at x ≈ 128; start it just past the viewport's right edge
    return Math.max(400, (window.innerWidth - r.left) / scale - 120);
  }

  function playIntro() {
    drag = null;
    armTag = true;
    cube = { state: "floor", x: CUBE.x0, armed: true };
    gap = gapT = GRIP.open;
    lines.forEach((l) => l.classList.remove("on", "pulse"));
    hero.classList.add("intro");
    intro = { t0: performance.now(), startX: offscreenX(), pulsed: false };
    const ip = introPose(0, intro.startX);
    cur = { t1: ip.t1, t2: ip.t2, baseX: ip.baseX };
    tgt = { ...cur };
    lastBaseX = cur.baseX;
    fov = 0;
    detAllowed = false;
    render();
    kick();
  }

  function finishIntro() {
    intro = null;
    tgt = { ...HOME };
    cur = { ...HOME };
    fov = 1;
    detAllowed = true;
    lines.forEach((l) => l.classList.add("on"));
    hero.classList.remove("intro");
    render();
  }

  /* ---------- interaction ---------- */
  function toSvg(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function tryPose(cand) {
    if (graspable(cand, cube)) {
      const held = { ...cube, state: "held", lifted: false };
      if (valid(cand, held)) {
        tgt = cand;
        cube = held;
        gapT = GRIP.closed;
        return;
      }
    }
    if (!valid(cand, cube)) return;
    tgt = cand;
    const T = points(tgt).T;
    // a grabbed cube only counts as "set down" after it has been lifted off the floor once
    if (cube.state === "held" && !cube.lifted && T.y + CUBE.h - GRIP.held < FLOOR - 10) cube = { ...cube, lifted: true };
    // after a release the fingers must clear the cube's top before they can grab it again
    if (cube.state === "floor" && !cube.armed && T.y < FLOOR - CUBE.h - 4) cube = { ...cube, armed: true };
  }

  function maybeRelease() {
    if (cube.state !== "held" || !cube.lifted) return;
    const T = points(tgt).T;
    if (T.y + CUBE.h - GRIP.held >= FLOOR - 6) {
      cube = { state: "floor", x: T.x, armed: false };
      gapT = GRIP.open;
    }
  }

  function candidate(type, p) {
    const P = points(tgt);
    switch (type) {
      case "elbow": return { ...tgt, t1: Math.atan2(p.y - P.S.y, p.x - P.S.x) };
      case "wrist": return { ...tgt, t2: Kin.wrap(Math.atan2(p.y - P.E.y, p.x - P.E.x) - tgt.t1) };
      case "gripper": return solveGripper(tgt, { x: p.x + drag.off.x, y: p.y + drag.off.y }, cube);
      case "base": return { ...tgt, baseX: clamp(drag.base0 + p.x - drag.p0.x, BASE_MIN, BASE_MAX) };
    }
    return null;
  }

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (intro) finishIntro();
    const h = e.currentTarget;
    const p = toSvg(e);
    const W = points(tgt).W;
    drag = { type: h.dataset.handle, id: e.pointerId, p0: p, base0: tgt.baseX, off: { x: W.x - p.x, y: W.y - p.y } };
    if (drag.type !== "base") armTag = false;
    h.setPointerCapture(e.pointerId);
    svg.classList.add("dragging");
    e.preventDefault();
    kick();
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const cand = candidate(drag.type, toSvg(e));
    if (cand) tryPose(cand);
    kick();
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    svg.classList.remove("dragging");
    maybeRelease();
    kick();
  }

  function onKey(e) {
    const type = e.currentTarget.dataset.handle;
    const dir = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    const isEnter = e.key === "Enter" || e.key === " ";
    if (!dir && !isEnter) return;
    e.preventDefault();
    if (intro) finishIntro();
    if (type !== "base") armTag = false;
    let cand = null;
    if (type === "elbow" && dir) cand = { ...tgt, t1: Kin.wrap(tgt.t1 + dir * 3 * D2R) };
    if (type === "wrist" && dir) cand = { ...tgt, t2: Kin.wrap(tgt.t2 + dir * 3 * D2R) };
    if (type === "base" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) cand = { ...tgt, baseX: clamp(tgt.baseX + dir * 6, BASE_MIN, BASE_MAX) };
    if (type === "gripper") {
      if (isEnter) maybeRelease();
      else {
        const W = points(tgt).W;
        const d = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
        cand = solveGripper(tgt, { x: W.x + d[0], y: W.y + d[1] }, cube);
      }
    }
    if (cand) tryPose(cand);
    kick();
  }

  svg.querySelectorAll(".handle").forEach((h) => {
    h.addEventListener("pointerdown", onDown);
    h.addEventListener("pointermove", onMove);
    h.addEventListener("pointerup", onUp);
    h.addEventListener("pointercancel", onUp);
    h.addEventListener("keydown", onKey);
  });
  host.querySelector(".hero-replay").addEventListener("click", playIntro);

  // read-only hooks for tests / debugging
  root.HeroRobot = {
    get state() {
      return { cube: cube.state, cubeX: cube.x, baseX: cur.baseX, wheel, t1: cur.t1, t2: cur.t2, intro: !!intro, dragging: !!drag };
    },
    points: () => points(cur),
    replay: playIntro,
  };

  if (wantIntro) playIntro();
  else finishIntro();
  html.classList.remove("intro-pending");
})(typeof window !== "undefined" ? window : globalThis);
