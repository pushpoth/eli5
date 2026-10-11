# Typewriter, two houses

The same subject — a typewriter's key printing a letter — built with the two
reference skills: [eli5](eli5/typewriter.js) (ours) and [anatomy](anatomy/build.mjs)
(the reference craft kit). The point is the comparison, not either figure alone.

## What each produced

**eli5 — `Typebar`.** A cutaway: a keyboard of round keys, a fan of typebars
converging at the type guide, a platen roller on two posts, paper, and the pointer
pressing a key so its typebar strikes the ribbon against the platen and prints a
mark. Line-and-plate style, two tones, ~13 solids, one page, no dependencies.
Passes static + measured + look + read.

**anatomy — `Typewriter`.** A machine on a base plate on feet: side frames, a
turned platen roller (its own arbitrary-axis `lathe`) with knobs and an escapement
ratchet, carriage rails, paper, ribbon spools and band, a keyboard of keycaps on
stems, and a type basket of `tube` typebars up to the guide. Four-tone shading,
a framed card, ~90 parts. Framework-free build script over the kit.

## The comparison

| | eli5 | anatomy |
|---|---|---|
| Source size | ~120 lines, one file | ~200 lines + kit imports |
| Parts | ~13 solids | ~90 (keycaps, stems, tubes, fittings) |
| Rendering | one fill tone + a lid; a line drawing | four-tone shaded solids |
| Helpers used | slab/cylinder/lathe/latheX/ringY; lines | lathe/disc/sphere/prism/tube/arc/dots/sideSeam |
| Output | one self-contained page, dep-free | one self-contained page + the kit inlined |
| Motion | a strike spring on the typebar | springs/tweens; idle tour |
| Verification run | static + audit + look + read (all pass) | build + **audit** (pass) + **line check** (pass) |

## Honest assessment

- **anatomy makes detail cheap and volume real.** The helper library (lathe,
  disc, tube, arc, dotsOf, sideSeam) is the difference: a turned platen, tube
  typebars and a bolt ring are a few lines each, where eli5 draws a roller and a
  fan of lines. Four-tone shading gives the parts volume that eli5's two tones
  only hint at.
- **anatomy's bar is much higher, and meeting it took real work.** The first
  pass was blocky and its platen/paper collided. Pushing it to the house standard
  meant recording every solid and running `build.mjs --audit` to **zero**: fixing
  the keycaps sunk into their stems, the knobs and ratchet sunk into the platen,
  the rails sunk into the plates, and the typebars hanging off their mounts (each
  now ends on a key lever below and the type guide above). Two more gates then
  passed: the line check (`0 ends float`, console clean) and a first read.
  What is still short of the bar: a proper ≥40-part list written down, 4×
  close-ups of every joint, and live motion (the anatomy page only reads the
  pointer — no strike animation yet).
- **The interesting failure is shared, not ours.** Both houses need the *read*:
  anatomy's rules say "the reader names it at a glance", and neither skill
  mechanically forces it. eli5 now records the read (`read.mjs`); anatomy relies
  on the agent reading its PNGs. My anatomy pass did exactly what the shutter
  once did — produced the page without truly reading it.

## Takeaway for our technique

anatomy's two advantages are **the parts library** (detail is cheap) and **tone**
(volume is real); our two advantages are **the frozen kernel** (a ~120-line figure
with no dependencies and a stable API) and **the recorded read** (legibility is a
gate, not a hope). The synthesis is already the plan: keep the small frozen
kernel and the read gate, and keep growing the parts library and the shading
toward anatomy's — which is what the last few milestones have been doing.
