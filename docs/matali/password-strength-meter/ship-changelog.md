## Why

As a user types a password, give immediate, **honest**, **accessible** feedback on how strong it is by composition rules — so they can improve it before submitting, and **without the password ever leaving the browser**.

The problem: naive meters either give no guidance or actively mislead, calling a rule-satisfying-but-trivially-guessable password (e.g. `Password1!`) "strong." This meter is deliberately honest (length-gated Strong tier, no security overclaiming), screen-reader accessible, and 100% client-side.

## What changed

- Unit 1: Pure scoring core — scorer.js evaluate() with 5 predicates + Weak/Fair/Strong tier mapping
- Unit 2: Scorer unit tests — scorer.test.js under node --test (predicates + tier boundaries)
- Unit 3: Static markup — index.html at repo root (labelled input, 3-segment bar, color label, 5-item checklist, empty ARIA live region, show/hide button, caveat, loads ./ui.js)
- Unit 4: DOM glue — ui.js (import evaluate, input listener, render bar/label/checklist, show/hide toggle, debounced tier-change live-region write, never log value)

## Commits

