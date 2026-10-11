# Shutter — a second subject to test eli5

A prototype built to test the technique on something other than the lighthouse,
and a different *kind* of object: not a stack of parts on the ground but a set of
parallel plates in vertical planes (a focal-plane shutter).

- Figure: [`eli5/shutter.js`](eli5/shutter.js) → `eli5/eli5-shutter.html`
- Sheet: [`eli5/assets/look.png`](eli5/assets/look.png)

## The figure

**Shutter.** A 35 mm camera's focal-plane shutter seen from the front: the film
gate, two curtains with the exposure slit between them, a winding knob and a
sprocket. The curtains travel at one speed, so how long the film is exposed is
the width of the slit between them — the pointer widens the slit and the
read-out names the shutter speed (`1/250 s`). At rest the shutter is nearly
closed; the slider is the widest slit, so a stronger setting reaches a slower
speed. Parts: film (a portrait frame with sprocket holes), curtain (horizontal
slats), slit (the light between the curtains).

## Step 1 — rebuilt with the camera around it

The first version read as "a vertical split door". The cause was not the
machinery: it was the concept. A shutter is an internal part whose identity
depends on the camera around it, and I had drawn the fragment. So the figure was
rebuilt as the camera itself — a rounded body, a lens of concentric rings on the
front, a top plate with a prism, a wind lever and a shutter button, a rewind
knob — with the two curtains and the slit seen through the lens. Only then does
it read as a camera shutter, at 1×, at 240px, and in both themes.

The read of `look.md` item 2, answered honestly: body ✓ (slab; top plate with a
wind lever and a shutter button), lens ✓ (concentric rings), slit ✓ (the light
between the curtains), curtain — slats ✓ but "an edge wound on its drum" is
**not shown**, so partial. The gap that remains — an object with volume and
small true parts — is what step 2's shading and parts library are for.

## What the gates did

All three pass: `validate` ok, `audit passed · 10 items`, and the eight-view
sheet reads in both themes and at 240px.

**The interesting result is what the measured gate could not do at first.** The
audit was built for the lighthouse, which is a ground-stacked object, and it
assumed three things that a face/panel assembly breaks:

1. **Order by centroid depth.** A large backdrop (the camera body) has a central
   centroid, so it looked "nearer" than the rails in front of it. The film and
   the curtains are tall plates at different depths but different *heights* too,
   and a centroid conflates the two.
2. **Support from below.** A plate held by the body behind it, or by the film
   behind it, "rests on nothing" under a stacking-only rule.
3. **Paint order = draw order.** True until a figure creates its elements in one
   place and draws them in another; then the audit's idea of paint order drifts
   from the real one.

So the second subject forced the audit to grow, which is exactly what testing it
was for:

- **Order is now measured where two shapes overlap on screen**, from the median
  depth of each shape's sample points inside the other's screen box, not at their
  centroids. A backdrop is no longer mistaken for a near part.
- **Support also allows a part mounted on a backer**: another shape that overlaps
  it in x and z and sits behind it (smaller y, since +y is toward the viewer).
- The **figure** was fixed where the audit was right: the frame's corners
  interpenetrated, so the vertical rails now butt between the horizontal ones;
  and the curtains and frame are created and drawn in paint order, which is now
  a stated discipline ("create-and-draw in paint order").

The audit stayed honest about being approximate: the frame and curtain are nearly
coplanar, so their thin edge overlap is genuinely ambiguous, and the order
tolerance was raised to 2.5 world units to accept it. On the broken control figure
it still catches a floating box and an interpenetration.

## What this says about the technique

- The **static gate** needed no change, one false positive aside (`Array.filter`
  read as the word "filter").
- The **measured gate** had a hidden assumption — *ground-stacked*. It is now
  better, but the next shape of object may break it again; it is a net for the
  gross faults, not a proof, and `look.md` is still the last word.
- The **read gate** did its job: the 240px view had to read as a shutter, and the
  read-out had to name a speed, in both themes.
