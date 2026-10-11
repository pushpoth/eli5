# The rules

Condensed from the two reference houses (hairline's ten, anatomy's craft), held
to by the gates. A figure that breaks one is not finished.

## 01 · hit: hit areas don't move
Test the pointer against a plane that never moves — the ground, or the rest pose
of a part — never the pose on screen. Otherwise the geometry lifts from under the
pointer and the hover flickers. *Keep:* `unproj` onto a fixed plane. *Rejected:*
the figure measures the DOM or adds its own pointer listener.

## 02 · order: stagger by distance
Motion spreads out from the pointer, not down a list: `delay = |i − a| × step`,
30–60 ms. *Rejected:* items move in index order, or all at once.

## 03 · reach: clamp
The answer has a far end and the figure is composed there. Clamp every lift, gap
and lean; fit the camera to the most extreme pose so nothing leaves the frame.

## 04 · accent: one highlight
At rest one bright mark says where to look; when the pointer chooses, the bright
goes to what it chose and the rest mark gives it up. It is a stroke or a dot,
never a fill. *Rejected:* two places bright at once; the figure sets any colour,
width, filter or shadow of its own.

## 05 · rest: rest is designed
The still frame is the thumbnail, so it has to hold up alone: a composition, not
a flat grid. Give every part a rest value that is not zero and not uniform.

## 06 · honesty: paint order is the truth
Faces are opaque and painted back to front, so a nearer solid covers a farther
one. **Create a solid and draw it in the order it should paint** — the audit reads
paint order from the order `draw` was called. *Rejected:* paint order is the order
the code happened to run; a far edge shows through a near solid.

## 07 · cost: loops sleep offscreen
All motion is inside `register`; the loop stops when every figure has settled and
sleeps offscreen. Return `true` from `tick` only while something moves. *Rejected:*
the figure has its own timer, frame or media query.

## 08 · clock: two clocks
A discrete change gets a tween (700 ms); a continuous input gets a spring, because
its target moves every frame. *Rejected:* a tween follows the pointer; a spring
animates a choice; anything is linear.

## 09 · radius: round, then draw less
A solid is the hull of two rounded rings, so vertical corners are never drawn; its
one inner line is a crease. Taper by two rings of different size (`lathe`). Fill
solids with the face tone and their lids lighter, so parts have volume. At most a
silhouette, a crease, and a few marks the object would really have.

## 10 · quiet: no words inside the figure
Geometry carries identity. Names go to the read-out, outside the drawing.
*Rejected:* the svg holds text, letters, digits, arrows or icons.

## Detail
A machine is built from many small, precise parts, and every part belongs to the
mechanism and shows the features that make it what it is (`concepts.md`). Use the
parts library (a knurl, a seam, a bolt ring) rather than bare blocks. A bare face
or an empty corner is unfinished work, not calm — but detail is *earned*: the read
gate, not the part count, decides when it is enough.

## The frame
The viewBox is 400 × 320; centre the figure near (200, 166) with `fit`. The
camera is `cam(45, 0.5, S)`. The silhouette must read at 240px. `mount` keeps no
state outside itself; `destroy` leaves the svg empty and nothing running.
