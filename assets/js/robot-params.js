/* =========================================================================
   ROBOT PARAMETERS — shared by every interactive widget.
   ⚠ All values are rough estimates. Replace them with measured values from
     our robot (calipers, scale, URDF, camera_calibration output).

   Robot frame (top-down): origin at the center of the wheel axle,
   x forward, y left, z up. Units: meters, kilograms, degrees.
   ========================================================================= */
window.ROBOT = {
  // TurtleBot3 Burger body (rough box), in the robot frame
  body: { xMin: -0.101, xMax: 0.037, yHalf: 0.069, height: 0.19 },
  wheelRadius: 0.033,
  wheelTrack: 0.16, // distance between wheel contact points
  caster: { x: -0.081, y: 0 }, // stock rear ball caster
  addedCaster: { x: 0.12, y: 0 }, // TODO: where our extra caster/stabilizer actually goes
  baseMass: 1.0, // TurtleBot3 Burger incl. battery
  baseCom: { x: -0.035, y: 0, z: 0.08 },

  // SO-101 arm (planar chain, side view)
  arm: {
    mountX: 0.06, // shoulder pan axis, forward of the axle
    shoulderZ: 0.12, // shoulder-lift axis height above the floor
    L1: 0.116, // shoulder → elbow
    L2: 0.135, // elbow → wrist
    L3: 0.10, // wrist → fingertip (gripper pointing straight down for floor grasps)
    panLimit: 110, // ± shoulder pan range
    minReach: 0.08, // closest the gripper can get to its own base (self-collision)
    holdHeight: 0.02, // fingertip height above the floor while carrying (tip-over widget)
    // masses for the stability widget
    baseMass: 0.15, // base servo + mount bracket, sits at the mount point
    linkMass: 0.2, // upper arm + forearm, split evenly at each link midpoint
    gripperMass: 0.08, // wrist + gripper, midway between wrist and fingertip
  },

  // Logitech C922 (or the TurtleBot camera). Replace fx, fy, cx, cy with calibrated K.
  camera: {
    x: 0.0, // forward of the axle
    z: 0.2, // height above the floor
    tilt: 30, // pitch down from horizontal
    width: 640,
    height: 480,
    hfov: 70.4,
    vfov: 43.3,
  },

  // Nav2 controller's xy_goal_tolerance (Nav2 default is 0.25 m)
  navTolerance: 0.05,
};
