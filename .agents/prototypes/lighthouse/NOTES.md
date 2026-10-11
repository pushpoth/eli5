# Lighthouse — one idea, two houses

A prototype made to feel the difference between the two reference skills before
we build our own technique. Same subject ("how a lighthouse works"), drawn once
in each house's style, using that house's real toolchain.

- [`hairline/`](hairline) — `beacon.js` + built page, verified with the skill's
  own `validate.mjs` and a headless-Chromium look sheet.
- [`anatomy/`](anatomy) — `build.mjs` + both-theme pages, verified with the
  house's real geometry audit (`node build.mjs --audit` → `audit passed`).

Nothing here edits the clones in `../../ref/`; both prototypes build against them
read-only.

## What each is

**hairline — `Beacon`** (123-line figure against the skill's frozen kernel).
A lighthouse on a rock. The pointer's bearing turns a fan of dashed rays across
the water; the centre ray takes the bright stroke and the lamp gives up its own.
`intensity` is the beam's reach. Read-out: `bearing 135°` / `rest`.

**anatomy — `Lighthouse, lantern room`** (260-line build script over the kit).
A lamp at the focus of a Fresnel lens, turned on its pedestal three times a
minute, so the beam sweeps and is seen far off. Lathe-turned tapering tower with
daymark bands and a door, gallery with a handrail, a fourteen-bar lantern cage,
a lens barrel, the lamp, a dome and ventilator, on a rock base. Live read-out:
`bearing 160° · 3 rpm`. One `lit` accent: the lamp.

## Side by side

| | `hairline` | `anatomy` |
|---|---|---|
| Figure source | 123 lines | 260 lines build + kit imports |
| Idea count | one mechanism, one gesture | one machine, ~38 solids, many features |
| Rendering | **stroke only**, 4 weights, no fills | **four-tone filled solids**, painter's order |
| Palette | 6 CSS custom properties | token sets incl. per-cavity overrides |
| Rest pose | composed (tapered tower, bands, one lit lamp) | composed, plus a card + legend + caption |
| Constraint on the agent | a **hash-pinned kernel**; <200 lines; a textual linter | free use of a big library; proven by a **geometry audit** |
| Verification | `validate.mjs` (static text) + an 8-shot look sheet, read by eye | `--audit` (measured) + line check + captures, both themes |
| Output | one self-contained HTML; ships as npm + shadcn registry | one self-contained HTML; a skill folder, no package |
| Relative speed | minutes | the Figure-sized band (30–90 min) is honest |

## What each made easy, and where it fought back

**hairline** is *fast and small*. The frozen kernel plus a `<200-line` budget is
a strong forcing function: the whole figure is one file you can hold in your
head. But restraint is the cost. Expressing a beam without a fill or a glow
means dashed rays and one `hi` stroke — the highlight budget is one mark. The
toolkit has no tapered-solid helper; `rules.md` tells you to write the two rings
by hand, so the tower is `hull(ringAt(foot,0) ∪ ringAt(top,H))` and one crease.
The `look` is real discipline: the 240px picture is the test, and the fit kept
shrinking the lighthouse until the beam was capped (`MAXR`) so the figure stayed
large in the frame (rule 03 clamps the reach; the fit includes the widest pose).

**anatomy** is *rich and slow*. The kit's `lathe` is the right tool for a tapered
round tower and a Fresnel barrel, `cylinder`/`slabOf` for everything else, and
`plateHtml`/`pageHtml` give a framed card with a legend and a live read-out for
free. The bar is high — its craft rules read like a reviewer's notes (lines must
resolve, textures must end on an edge or fade, nothing sunk into anything) — but
crucially the bar is *measurable*. The audit turned a fuzzy "does the painter's
order look right?" into a yes/no with coordinates.

### Two bugs worth remembering

- **hairline:** `lineSvg("")`-style traps don't exist here, but the anatomy kit's
  `lineSvg` returns `""` for an empty `d` — so a placeholder beam path silently
  never rendered and the live code had nothing to target. Emit a placeholder `d`.
- **anatomy:** my `lensR()` returned an `s`-coordinate instead of a radius, so the
  seam arcs became two card-wide curves. A 30-second visual look caught what the
  build happily produced. This is exactly the fault the skill says to find by
  *reading every PNG*.

### The audit earned its place

The first audit run reported **everything clean except 2 depth-order pairs**: the
solid gallery-rail ring wrapping the lantern bars — a single key can't order a
ring that is both in front of and behind the bars. That is the textbook "split the
wrapping part" case in `craft.md`. Drawing the handrail as a **line** (it is a
thin rod, and the audit never sees lines) removed the interlock and took the run
to `audit passed`. No amount of staring at the 1× screenshot would have found a
0.25 px² misorder; the audit named the exact pair and the exact pixel.

### The audit's blind spot — the read gate's motivating case

Look at the base of the anatomy lighthouse: five low `lo`-tone cylinders meant to
be boulders. They read as **coins lying flat on the platform**, and their sort
keys put a couple in visibly wrong layers. And yet `node build.mjs --audit`
prints **`audit passed`** — `support: 0`, `depth order: 0`, `clearance: 0`.

That is not a bug in the audit; it is the edge of what the audit *does*. It proves
the geometry is **consistent** (nothing interpenetrates, every part is held,
painter's order is correct). It cannot prove a part **reads as the thing it is
named**. A flat cylinder satisfies every geometric constraint and still does not
look like a rock.

This is the defect neither house catches:

- `hairline` would pass its static linter (the cylinders obey every rule) and the
  fault is small at 240px, so a quick look can miss it.
- `anatomy` proves it geometrically sound and moves on.

So we leave it in, deliberately, as the first test case for our own technique's
**read gate** — the part of verification that asks "can you name the features
that make each part what it claims to be, at 240px and at 4×?" A boulder must show
a faceted top, a shadowed side and a contact with the ground; these show none.

## The one real difference

Both houses draw the same way underneath (orthographic camera, world-space
pointer, painter's algorithm, no z-buffer). The philosophy is what diverges:

- **hairline keeps figures correct by keeping them small.** A pinned engine, a
  line budget, and a look you can verify in eight screenshots. Elegant, cheap,
  and it cannot scale past "one idea per figure".
- **anatomy makes figures correct by measuring them.** A large library, a high
  craft bar, and a geometry audit that proves painter's order and clearances on
  dense figures. Expensive, and it is what lets a figure carry 38 solids, pipes
  and 3D without falling apart.

For our own technique the useful synthesis is: hairline's *frozen, agent-facing
surface* and *restraint*, plus anatomy's *measured verification* — the audit is
the part that removes the "tune it by eye and break another frame" failure mode.

## How to run them

```sh
# hairline: build + static check, then look in any browser
node ../ref/hairline/skills/hairline-create/build.mjs hairline/beacon.js
node ../ref/hairline/skills/hairline-create/validate.mjs hairline/hairline-beacon.html

# anatomy: build both themes, then prove the geometry
node anatomy/build.mjs            # dark
node anatomy/build.mjs --light    # light
node anatomy/build.mjs --audit    # geometry audit (exit 0 = passed)
```

Screenshots in each `assets/` folder were taken with the cached headless
Chromium (`~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`), not the
skills' own Playwright scripts, because neither skill's browser deps are
installed in this environment. The static validator, the audit, and the drawn
output are all the real thing.
