# The look

The validator reads text and the audit measures geometry. This is what only
eyes can judge. Do it every time the figure changes.

## One command

```
node look.mjs <figure.js> --answer x,y --out sheet.png
```

It runs the static check, builds the figure, photographs eight views onto one
sheet, and prints each view's read-out. `--answer x,y` is a viewBox point on the
part that should answer the pointer (take it from the figure's own `P(x, y, z)`,
rounded). Without `--answer` the answering views are taken at rest and it says
so — that is not a finished look. The eight views: `rest`, `answer`, `small`
(240px), `small-answer`, `low` (intensity 0), `high` (intensity 1), `dark`,
`light`.

Chrome is found from `--chrome`, `CHROME_PATH`, or Playwright's cache.

## What to see

Answer each with yes or no. A no is fixed in the figure before anything is
handed over. `look.mjs` answers 7, 8 and the read-out of 9; the rest are answered
from the sheet.

1. **The silhouette reads at 240px.** From the `small` view alone, say what the
   object is.
2. **Every part shows the features it claims.** For each part in the figure's
   `parts` list, point at it in the `small` view and name the features it must
   show. A part that shows none of them is a no, however it looks at 1×. *This
   is the check the audit cannot make: a flat `lo` cylinder passes every
   geometric test and still does not read as a rock.*
3. **Rest is a composition.** Not flat, not empty, not a regular grid; one bright
   mark says where the eye should start.
4. **The answer falls off or spreads from the pointer**, and at the slider's far
   end nothing comes apart or overlaps.
5. **Nothing flickers.** With the pointer held on a part that moves, the drawing
   comes to rest.
6. **One highlight.** At rest the bright mark is in one place; when the pointer
   chooses, the bright goes to what it chose and the rest mark gives it up. It is
   a stroke or a dot, never a fill.
7. **The read-out** names what is under the pointer, in a few characters, and
   says `rest` at rest. `look.mjs` prints every view's read-out and fails when the
   rest view is not `rest`.
8. **Nothing leaves the frame.** In `low` and `high`, every part stays inside the
   plate.
9. **Both themes.** In `dark` and `light`, nothing vanishes and nothing is the
   wrong colour.
10. **No words.** Nothing in the drawing is a letter, a digit, an arrow or an
    icon.

If you are unsure the figure is right, build `examples/board.js` the same way
and put the two sheets side by side.
