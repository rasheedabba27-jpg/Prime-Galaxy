# Prime Galaxy

An interactive 3D visualization of the prime numbers, built with Three.js WebGL.

- **The galaxy**: the first 60,001 integers arranged as a golden-angle phyllotaxis
  spiral. Every prime glows bright blue; composites stay dim violet. Watch the
  prime spiral arms and prime-rich rays emerge from pure arithmetic.
- **The Mersenne Stairway**: all 52 known Mersenne primes rise above the galaxy,
  one step higher than the last, growing brighter and bigger as the numbers grow.
  Star #52 is the world-record prime `2^136279841 - 1` (41,024,320 digits,
  verified by GIMPS in October 2024) — the single gold star at the top.
- **Interaction**: drag to orbit, scroll to zoom, auto-rotates by itself, and
  clicking any Mersenne star tells you its exponent and digit count.
- **Guided tour**: press **▶ Tour the stairway** and the camera flies up the
  stairway star by star with a narration panel. Spacebar jumps to the next
  star, Esc exits. A faint luminous rail connects all 52 record primes.

## How to view

Open `index.html` in any modern browser — no build step, no install.
(A local server gives the best loading behavior, e.g. `python3 -m http.server`,
then visit `http://localhost:8000`.)

If GitHub Pages is enabled for this repository, the site runs at:
`https://<username>.github.io/<repo-name>/`
