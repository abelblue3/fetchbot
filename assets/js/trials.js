/* =========================================================================
   TRIAL DATA — one row per test run. Drives the results map, the results
   table, the per-stage bars, and the stats on the home page.

   ⚠ The rows below are SAMPLE DATA so the page has something to draw.
     Delete them and log real trials. Remove `sample: true` from real rows.

   Coordinates are meters in the test-area frame (origin = bottom-left corner,
   x right, y up). start.theta is the robot heading in degrees (0 = +x).
   A stage is true only if it succeeded; later stages after a failure are false.
   time = seconds from start to delivery (or to the failure).
   ========================================================================= */
window.ARENA = {
  width: 4.0,
  height: 3.0,
  delivery: { x: 0.45, y: 0.45, r: 0.3, label: "Person / drop-off" },
};

window.TRIALS = [
  { id: 1,  sample: true, start: { x: 1.0, y: 2.4, theta: -30 }, object: { x: 2.6, y: 1.8 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 58, note: "" },
  { id: 2,  sample: true, start: { x: 3.4, y: 0.6, theta: 150 }, object: { x: 2.2, y: 1.2 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 52, note: "" },
  { id: 3,  sample: true, start: { x: 0.8, y: 1.5, theta: 0 },   object: { x: 3.3, y: 2.5 }, objectType: "red cube", detect: true, nav: true, grasp: false, deliver: false, time: 41, note: "Gripper closed ~2 cm short of object" },
  { id: 4,  sample: true, start: { x: 2.0, y: 0.5, theta: 90 },  object: { x: 1.6, y: 2.3 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 61, note: "" },
  { id: 5,  sample: true, start: { x: 3.5, y: 2.6, theta: 200 }, object: { x: 3.0, y: 0.7 }, objectType: "red cube", detect: false, nav: false, grasp: false, deliver: false, time: 30, note: "Object outside camera FOV, no search behavior yet" },
  { id: 6,  sample: true, start: { x: 1.4, y: 0.9, theta: 45 },  object: { x: 2.9, y: 1.4 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 49, note: "" },
  { id: 7,  sample: true, start: { x: 2.8, y: 2.2, theta: 180 }, object: { x: 1.2, y: 2.0 }, objectType: "red cube", detect: true, nav: false, grasp: false, deliver: false, time: 35, note: "Stopped 0.3 m short; goal tolerance too loose" },
  { id: 8,  sample: true, start: { x: 0.6, y: 2.6, theta: -60 }, object: { x: 1.9, y: 1.0 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 55, note: "" },
  { id: 9,  sample: true, start: { x: 3.6, y: 1.5, theta: 170 }, object: { x: 2.4, y: 2.6 }, objectType: "red cube", detect: true, nav: true, grasp: false, deliver: false, time: 44, note: "Object pushed away during approach" },
  { id: 10, sample: true, start: { x: 2.2, y: 2.7, theta: -90 }, object: { x: 2.7, y: 0.9 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 63, note: "" },
  { id: 11, sample: true, start: { x: 1.1, y: 0.4, theta: 30 },  object: { x: 3.4, y: 1.9 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: true, time: 66, note: "" },
  { id: 12, sample: true, start: { x: 3.0, y: 1.0, theta: 120 }, object: { x: 1.5, y: 1.6 }, objectType: "red cube", detect: true, nav: true, grasp: true, deliver: false, time: 70, note: "Dropped object while turning" },
];
