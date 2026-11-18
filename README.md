# STRINGIFY Studio V2

A browser-only portrait string-art prototype with crop/zoom/reposition controls, image tuning, a nail-to-nail route generator and downloadable build instructions.

## Run
Open `index.html` in a modern browser, or run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.

## New in V2
- Upload JPG/PNG/WEBP.
- Drag to reposition the image inside a circular crop.
- Zoom from 1× to 3× and reset crop position.
- Brightness, contrast and detail-strength controls.
- 180, 240 or 300 nail settings.
- Multiple route densities and thread colours.
- PNG artwork export, JSON connection list and printable nail/thread guide.
- Photo processing is local in the browser.

## Important algorithm note
This is a computational greedy line-art prototype, not a hosted generative-AI model. The line optimizer uses grayscale darkness and iteratively reduces darkness along selected chords. String-art quality depends strongly on source photo, crop, lighting and parameter tuning. For best results, use a well-lit, front-facing portrait against a simple background; crop from top of hair to below chin/shoulders; increase contrast moderately. This is a starting route and should be test-woven before committing to a large board.

The printable board guide uses a 36 cm nail circle. Confirm board thickness and nail size before building. The estimated pattern should be validated physically; thread length and tension vary by material.
