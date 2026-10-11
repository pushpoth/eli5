# Typewriter — how a key prints a letter

A third worked example, chosen to stress the machinery differently from the
lighthouse (a field) and the shutter (parallel plates): a **kinematic chain**,
where a control drives a linkage and the machine leaves a mark.

- Figure: [`eli5/typewriter.js`](eli5/typewriter.js) → `eli5/eli5-typewriter.html`
- Sheet: [`eli5/assets/look.png`](eli5/assets/look.png)

## The figure

**Typebar.** A typewriter in cutaway. The pointer presses a key; its typebar
swings up out of the basket and strikes the ribbon against the platen, printing
a mark on the paper. The read-out names the key (`key 3·7`). Letters stay out of
the drawing (rule 10): the impression is a mark, the read-out carries the name.

Parts: frame (a slab base and a keyboard of round keys), post (a pillar under each
end of the platen), platen (a roller across the frame), paper (a sheet over the
platen), typebar (a fan in the basket, and the one in play lifting to the platen).

## What it added to the kernel

- **`latheX`** — a surface of revolution about the x axis, for the platen roller
  (we had z and y). With `latheY` and `ringY` this closes the three axes.
- Nothing else. The figure is otherwise built from the existing solids and lines,
  and it reads: it passes `validate`, `audit · 27 items`, `look`, and `read`.

## What the audit caught

- Keys overlapping row to row (pitch 4 < diameter 5): fixed by a wider pitch.
- The platen and the ribbon reels floating: fixed by giving the platen two posts
  to rest on and dropping the free reels.
- A coplanar sliver between the platen end and a side wall: fixed by replacing the
  walls with the posts rather than by loosening the tolerance.

## What is still thin

- The **carriage / escapement** (the paper stepping one space per strike) is not
  modelled; the marks simply accumulate. That is the next mechanism to add.
- The typebars are drawn as lines, not solids, so they carry no volume and the
  audit does not see them.
- The keys are plain cylinders; a real keycap has a bezel and a ring. Detail on
  the keyboard is deliberately spared (it recedes), but the play should still show.
