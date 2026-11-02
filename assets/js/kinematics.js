/* Planar 2-link kinematics shared by the hero robot and the widgets.
   Frame-agnostic: works in world (z-up) or SVG/canvas (y-down) coordinates.
   `sign` picks the IK branch: t2 = sign · acos(…). */
(function (root) {
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // Joint angles that put the end of link 2 at (x, y) relative to the base joint.
  // Out-of-reach targets are clamped onto the reachable annulus (reachable: false).
  function ik2(L1, L2, x, y, sign = -1) {
    const d = Math.hypot(x, y);
    const ux = d > 1e-12 ? x / d : 1, uy = d > 1e-12 ? y / d : 0;
    const max = L1 + L2 - 1e-9, min = Math.abs(L1 - L2) + 1e-9;
    const reachable = d <= max && d >= min;
    const c = Math.min(max, Math.max(min, d));
    const D = (c * c - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const t2 = (sign >= 0 ? 1 : -1) * Math.acos(Math.min(1, Math.max(-1, D)));
    const t1 = Math.atan2(uy * c, ux * c) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
    return { t1: wrap(t1), t2, reachable };
  }

  // Elbow E and wrist W for joint angles (t2 is relative to link 1).
  function fk2(S, L1, L2, t1, t2) {
    const E = { x: S.x + L1 * Math.cos(t1), y: S.y + L1 * Math.sin(t1) };
    const W = { x: E.x + L2 * Math.cos(t1 + t2), y: E.y + L2 * Math.sin(t1 + t2) };
    return { E, W };
  }

  root.Kin = { ik2, fk2, wrap };
})(typeof window !== "undefined" ? window : globalThis);
