/*
 * EL: everything a figure may call. Read this index; the code under it is the
 * engine, and a figure never edits it. A change to the engine is a change to
 * the engine, not to the figure.
 *
 * Every figure is drawn in a 400 × 320 viewBox. World space is x/y on the ground
 * and z up. Faces are filled with the ground colour and painted back to front,
 * so a nearer solid covers a farther one: append in that order. At the default
 * camera, cam(45, 0.5, S), +x runs down to the right and +y down to the left, so
 * the corner with the largest x and y is nearest the viewer: append by ascending
 * x + y, from the far corner.
 *
 * Camera
 *   cam(azDeg, k, S)          a camera: azimuth in degrees, k = sin(elevation) (0.5 is the 2:1 view), S = scale
 *   frame(C, points, opts?)   centres the box of [x, y, z] points on (cx, cy) and scales it to fill `fill` of the viewBox
 *                             opts { cx = 200, cy = 166, fill = 0.8 }: a lone object should sit centred and fill most of the canvas
 *   fit(C, points, cx, cy)    centres only, and never scales; use `frame` unless the camera is the concept
 *   proj(C)                   returns P(x, y, z) -> [sx, sy]
 *   unproj(C, sx, sy, z)      the world [x, y] under a screen point, on the plane at height z
 *   facing(C)                 returns front(sample): whether a ring sample faces the camera
 *   viewOf(C)                 the unit world direction toward the viewer
 * Solids (return { paths: { sil, crease }, shape })
 *   slab(x0, y0, x1, y1, r, z0, z1, P, front, opts?)    a rounded box; opts { inset, steps }
 *   cylinder(cx, cy, r, z0, z1, P, front, steps?)       a round post, puck, foot or boss
 *   lathe(prof, P, front, opts?)                        a surface of revolution about z from a meridian [[z, r], …]; convex only
 *   latheY(prof, cx, cz, P, opts?)                      the same about the y axis: a lens barrel, a drum, a roller
 *   latheX(prof, cy, cz, P, opts?)                      the same about the x axis: a platen roller, a spool, an axle
 *   ringY(rIn, rOut, y, cx, cz, P, opts?)               a flat ring on the plane at y (evenodd): a lens mount with a bore
 *   prism(P, front, ring, inner, z0, z1)                the three path strings of any ring pair, on screen
 * Parts (each returns a path `d` for EL.line, and draws only what faces the camera)
 *   knurl(cx, cy, r, z0, z1, n, P, front)   vertical knurl lines on a knob or thumb screw
 *   sideArc(cx, cy, r, z, P, front)         the visible run of a horizontal circle on a cylinder: a seam or band
 *   sideSeam(x0, y0, x1, y1, r, z, P, front)  the visible run of a rounded plan on a box: a weld or trim line
 *   boltRing(cx, cy, r, n, z, P, front)     screen points of a bolt circle, for EL.dot
 *   rrect(u0, v0, u1, v1, r, n?)  circ(R, n?)  circAt(cx, cy, R, n?)   ringAt(P, ring, z)   run(ring, keep)   hull(points)
 * Paths and numbers
 *   poly(points)  open(points)  seg(a, b)  clamp(v, a, b)  lerp(a, b, t)  rad(deg)  r2(n)
 * The continuous clock: one spring per moving number
 *   spring(x, opts?)          at rest on x; write .t to retarget; opts { k, c, m, eps }
 *   stepS(sp, dt)             advances by dt seconds; returns whether it is still moving
 * The discrete clock: a 700 ms tween on EASE
 *   tween(v, dur?)  tset(tw, to, now, delay)  tval(tw, now)  tdone(tw, now)  EASE
 *   reducedMotion()           true when the reader asked for less motion; springs and tweens already land at once
 * Drawing
 *   mk(tag, attrs, parent)    one svg element: the only way a figure makes a node
 *   solid(parent)             { g, sil, cr }: a group holding a silhouette and a crease path
 *   draw(el, part, meta)      paints a slab/cylinder/lathe and records its shape; meta { name, at }
 *   line(parent, d, cls?)     a line; cls is el-lo, el-hi or el-dash
 *   dot(parent, C, r, cls?)   a flat dot; position it with place(el, [sx, sy])
 *   group(parent, attrs?)  place(el, point)
 * Life
 *   register(stage, tick)     joins the one frame loop; tick(dt in seconds, now in ms) returns true to ask for another frame; gives { wake, unregister }
 *   pointer(stage, handlers)  { move, down?, leave }, points in viewBox units; returns its disposer
 *   disposer()                { add, on, dispose }: collects tear-down, so destroy is bag.dispose
 * Classes, on path, polygon, ellipse and line. They are the whole palette; a figure sets no colour of its own.
 *   (none) filled with the plate colour, medium stroke
 *   el-sil  the silhouette's stroke     el-cr  the crease (dim)     el-hi  the bright stroke, the only highlight
 *   el-lo   a dim line                  el-dash a dashed guide
 *   el-dot  a bright dot                el-dot.m a medium dot
 *
 * The bench's business, not a figure's: setRecording(on) and audit() run the
 * measured gate; a figure only draws through EL.draw, which records its shape.
 */
