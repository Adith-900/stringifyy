# STRINGIFY — AI-style String Art Portrait Studio

A browser-based portrait-to-string-art prototype with a real nail-to-nail route generator.

## Run locally

No build step or package installation is needed.

1. Unzip this folder.
2. Open `index.html` in a modern browser, or run a local static server:
   - Python: `python -m http.server 8000`
   - Then visit `http://localhost:8000`
3. Upload a portrait and click **Generate string art**.

## Features

- Local image upload (JPG, PNG, WEBP)
- Circular or square nail layout
- Adjustable nail count and thread-line count
- Multiple thread colours
- Greedy image-to-string-art route optimizer
- Numbered nail-to-nail instructions
- Downloadable JSON pattern data
- Printable nail placement and connection guide
- Responsive layout; photo processing stays in the browser

## Important technical note

This version uses an image-analysis and greedy line-optimization algorithm to create a string-art rendering and physical thread sequence. It does **not** call a hosted generative-AI image model. The result is a computational string-art approximation, not a guaranteed photorealistic AI conversion. The generated route is a starting pattern: test it on a small board first, because nail spacing, thread thickness, tension, and board dimensions affect the physical result.

## Pattern coordinates

Nail coordinates are normalized to the range 0–1 relative to the 900 × 900 canvas. The default print guide assumes a 40 cm board. Scale the nail guide to the actual board diameter when printing.

## Suggested production upgrades

- Add an image segmentation / face-cropping step for better facial contrast.
- Add server-side image generation using a selected AI image provider.
- Add PDF export with a scaled nail map and split connection sheets.
- Calibrate thread-length estimates for the selected board diameter and nail geometry.
