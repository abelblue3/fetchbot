/* Pixel → floor point. Click a pixel in the (simulated) camera image; the pixel's
   ray is rotated into the robot frame and intersected with the floor plane z = 0. */
(function () {
  const side = document.getElementById("cam-side");
  const img = document.getElementById("cam-image");
  if (!side || !img) return;
  const R = window.ROBOT;
  const cam = { ...R.camera };
  const C = {
    accent: Site.css("--accent"), cyan: Site.css("--cyan"), strong: Site.css("--line-strong"),
    muted: Site.css("--muted"), text: Site.css("--text"), bad: Site.css("--fail-detect"), surface: Site.css("--surface-2"),
  };
  const rad = (d) => (d * Math.PI) / 180;
  const W = cam.width, H = cam.height;
  const fx = W / 2 / Math.tan(rad(cam.hfov) / 2);
  const fy = H / 2 / Math.tan(rad(cam.vfov) / 2);
  const cx = W / 2, cy = H / 2;
  let pix = { u: cx + 40, v: cy + 90 };

  function axes() {
    const p = rad(cam.tilt);
    return {
      xc: [0, -1, 0],
      yc: [-Math.sin(p), 0, -Math.cos(p)],
      zc: [Math.cos(p), 0, -Math.sin(p)],
      O: [cam.x, 0, cam.z],
    };
  }

  // pixel → floor point in robot frame (or null if the ray never hits the floor)
  function pixelToFloor(u, v) {
    const { xc, yc, zc, O } = axes();
    const xn = (u - cx) / fx, yn = (v - cy) / fy;
    const d = [0, 1, 2].map((i) => xn * xc[i] + yn * yc[i] + zc[i]);
    if (d[2] >= -1e-6) return null;
    const t = -O[2] / d[2];
    return { x: O[0] + t * d[0], y: O[1] + t * d[1], dir: d };
  }

  // floor point → pixel (or null if behind the camera)
  function floorToPixel(X, Y) {
    const { xc, yc, zc, O } = axes();
    const v = [X - O[0], Y - O[1], -O[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const zz = dot(v, zc);
    if (zz <= 0.02) return null;
    return { u: cx + (fx * dot(v, xc)) / zz, v: cy + (fy * dot(v, yc)) / zz };
  }

  /* ---- side view ---- */
  const sv = { xMin: -0.15, xMax: 1.95, zMin: -0.05, zMax: 0.65 };
  function drawSide(ctx, w, h) {
    const s = Math.min(w / (sv.xMax - sv.xMin), h / (sv.zMax - sv.zMin));
    const X = (x) => (x - sv.xMin) * s, Y = (z) => (sv.zMax - z) * s;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    ctx.fillStyle = C.muted; ctx.font = "10px JetBrains Mono, monospace";
    for (let x = 0; x <= sv.xMax; x += 0.25) {
      ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(sv.zMax)); ctx.stroke();
      if (x > 0 && Math.abs(x % 0.5) < 1e-6) ctx.fillText(`${x.toFixed(1)} m`, X(x) + 3, Y(0) + 13);
    }
    ctx.strokeStyle = C.strong; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();

    // robot + mast
    ctx.fillStyle = C.surface;
    ctx.fillRect(X(R.body.xMin), Y(R.body.height), (R.body.xMax - R.body.xMin) * s, R.body.height * s);
    ctx.strokeStyle = C.strong; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(cam.x), Y(R.body.height)); ctx.lineTo(X(cam.x), Y(cam.z)); ctx.stroke();

    const O = { x: cam.x, z: cam.z };
    const p = rad(cam.tilt), hv = rad(cam.vfov) / 2;
    // FOV wedge
    const edge = (ang) => {
      const dx = Math.cos(ang), dz = -Math.sin(ang);
      const t = dz < -1e-6 ? Math.min(-O.z / dz, 4) : 4;
      return { x: O.x + t * dx, z: O.z + t * dz };
    };
    const top = edge(p - hv), bot = edge(p + hv);
    ctx.fillStyle = "rgba(58,214,255,0.08)";
    ctx.beginPath(); ctx.moveTo(X(O.x), Y(O.z)); ctx.lineTo(X(top.x), Y(top.z)); ctx.lineTo(X(bot.x), Y(bot.z)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(58,214,255,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(O.x), Y(O.z)); ctx.lineTo(X(top.x), Y(top.z)); ctx.moveTo(X(O.x), Y(O.z)); ctx.lineTo(X(bot.x), Y(bot.z)); ctx.stroke();
    // visible floor footprint
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(X(bot.x), Y(0)); ctx.lineTo(X(Math.min(top.z <= 1e-3 ? top.x : sv.xMax, sv.xMax)), Y(0)); ctx.stroke();

    // selected ray
    const hit = pixelToFloor(pix.u, pix.v);
    ctx.strokeStyle = hit ? C.accent : C.bad; ctx.lineWidth = 2;
    if (hit) {
      ctx.beginPath(); ctx.moveTo(X(O.x), Y(O.z)); ctx.lineTo(X(hit.x), Y(0)); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(hit.x), Y(0), 6, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(X(O.x), Y(O.z), 6, 0, Math.PI * 2); ctx.fillStyle = C.cyan; ctx.fill();
    ctx.fillStyle = C.muted; ctx.fillText("side view", 8, 14);
  }

  /* ---- image plane ---- */
  let imgTf = null;
  function drawImage(ctx, w, h) {
    const s = Math.min(w / W, h / H);
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2;
    const U = (u) => ox + u * s, V = (v) => oy + v * s;
    imgTf = { s, ox, oy };
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, oy, W * s, H * s); ctx.clip();
    ctx.fillStyle = "#11141a"; ctx.fillRect(ox, oy, W * s, H * s);

    const horizonV = cy - fy * Math.tan(rad(cam.tilt));
    if (horizonV > 0) {
      ctx.fillStyle = "#171b23"; ctx.fillRect(ox, oy, W * s, Math.min(H, horizonV) * s);
    }
    // projected floor grid
    const poly = (pts) => {
      ctx.beginPath();
      let pen = false;
      pts.forEach(([X, Y]) => {
        const p = floorToPixel(X, Y);
        if (!p) { pen = false; return; }
        pen ? ctx.lineTo(U(p.u), V(p.v)) : ctx.moveTo(U(p.u), V(p.v));
        pen = true;
      });
      ctx.stroke();
    };
    ctx.strokeStyle = "rgba(58,214,255,0.25)"; ctx.lineWidth = 1;
    ctx.fillStyle = C.muted; ctx.font = "10px JetBrains Mono, monospace";
    for (let X = 0.25; X <= 4; X += 0.25) {
      const pts = [];
      for (let Y = -3; Y <= 3; Y += 0.1) pts.push([X, Y]);
      poly(pts);
      const lab = floorToPixel(X, 0);
      if (lab && Math.abs(X % 0.5) < 1e-6 && lab.v > 0 && lab.v < H) ctx.fillText(`${X.toFixed(1)} m`, U(4), V(lab.v) - 3);
    }
    for (let Y = -2; Y <= 2.001; Y += 0.25) {
      const pts = [];
      for (let X = 0.05; X <= 8; X += 0.05) pts.push([X, Y]);
      poly(pts);
    }
    if (horizonV > 0 && horizonV < H) {
      ctx.setLineDash([5, 5]); ctx.strokeStyle = C.muted;
      ctx.beginPath(); ctx.moveTo(U(0), V(horizonV)); ctx.lineTo(U(W), V(horizonV)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText("horizon", U(W) - 56, V(horizonV) - 4);
    }
    // the "object"
    const hit = pixelToFloor(pix.u, pix.v);
    ctx.strokeStyle = hit ? C.accent : C.bad; ctx.lineWidth = 2;
    const bw = 26, bh = 20;
    ctx.strokeRect(U(pix.u) - bw, V(pix.v) - bh, bw * 2, bh * 2);
    ctx.beginPath(); ctx.moveTo(U(pix.u) - 6, V(pix.v)); ctx.lineTo(U(pix.u) + 6, V(pix.v)); ctx.moveTo(U(pix.u), V(pix.v) - 6); ctx.lineTo(U(pix.u), V(pix.v) + 6); ctx.stroke();
    ctx.fillStyle = hit ? C.accent : C.bad;
    ctx.fillText(`(${Math.round(pix.u)}, ${Math.round(pix.v)})`, U(pix.u) - bw, V(pix.v) - bh - 5);
    ctx.restore();
    ctx.strokeStyle = C.strong; ctx.lineWidth = 1; ctx.strokeRect(ox + 0.5, oy + 0.5, W * s - 1, H * s - 1);
    ctx.fillStyle = C.muted; ctx.fillText(`camera image ${W}×${H} (click)`, ox + 8, oy + 14);
    readout(hit);
  }

  const out = document.getElementById("cam-readout");
  const status = document.getElementById("cam-status");
  function readout(hit) {
    if (!hit) {
      status.innerHTML = '<span class="status-pill bad">Above horizon: no floor hit</span>';
      out.innerHTML = `<dt>pixel</dt><dd>${Math.round(pix.u)}, ${Math.round(pix.v)}</dd>`;
      return;
    }
    const next = pixelToFloor(pix.u, pix.v - 1);
    const sens = next ? Math.hypot(next.x - hit.x, next.y - hit.y) * 100 : NaN;
    status.innerHTML = '<span class="status-pill good">Floor point found</span>';
    const rows = [
      ["pixel (u, v)", `${Math.round(pix.u)}, ${Math.round(pix.v)}`],
      ["X forward", `${hit.x.toFixed(3)} m`],
      ["Y left", `${hit.y.toFixed(3)} m`],
      ["range", `${Math.hypot(hit.x, hit.y).toFixed(2)} m`],
      ["1 px error ≈", `${sens.toFixed(1)} cm`],
    ];
    out.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const sideView = Site.canvas(side, drawSide);
  const imgView = Site.canvas(img, drawImage);
  const redraw = () => { sideView.redraw(); imgView.redraw(); };

  Site.slider("cam-h", (v) => { cam.z = v; redraw(); }, (v) => `${v.toFixed(2)} m`);
  Site.slider("cam-tilt", (v) => { cam.tilt = v; redraw(); }, (v) => `${v}°`);

  let dragging = false;
  const pick = (e) => {
    const p = Site.pointer(img, e);
    pix = {
      u: Math.min(W, Math.max(0, (p.x - imgTf.ox) / imgTf.s)),
      v: Math.min(H, Math.max(0, (p.y - imgTf.oy) / imgTf.s)),
    };
    redraw();
  };
  img.addEventListener("pointerdown", (e) => { dragging = true; img.setPointerCapture(e.pointerId); pick(e); });
  img.addEventListener("pointermove", (e) => dragging && pick(e));
  img.addEventListener("pointerup", () => (dragging = false));
  img.addEventListener("keydown", (e) => {
    const d = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (!d) return;
    e.preventDefault();
    pix = { u: Math.min(W, Math.max(0, pix.u + d[0])), v: Math.min(H, Math.max(0, pix.v + d[1])) };
    redraw();
  });
})();
