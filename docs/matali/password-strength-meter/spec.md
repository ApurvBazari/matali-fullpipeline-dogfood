# Spec — Password-Strength Meter

## Intent

As a user types a password, give immediate, **honest**, **accessible** feedback on how strong it is by composition rules — so they can improve it before submitting, and **without the password ever leaving the browser**.

The problem: naive meters either give no guidance or actively mislead, calling a rule-satisfying-but-trivially-guessable password (e.g. `Password1!`) "strong." This meter is deliberately honest (length-gated Strong tier, no security overclaiming), screen-reader accessible, and 100% client-side.

## Approach

**Chosen: layered 4-file design (Approach B), with a single source of truth for the scoring logic.** Options-level only — the file-by-file build blueprint is PLAN's (P2) job.

```
        scorer.js  (pure ES module — the ONLY tested unit)
        - 5 rule predicates + Weak/Fair/Strong tier mapping
        - no DOM, no window, no network, no logging
              │ import { evaluate }              │ import { evaluate }
              ▼                                  ▼
   ui.js (DOM glue)                       scorer.test.js (node --test)
   - input listener, bar/label/checklist  - predicates + tier boundaries
   - show/hide toggle, live-region write   - Password1!→Fair, len-12 gate
              │ <script type="module" src="./ui.js">
              ▼
   index.html (repo root — static markup, parse-time-empty live region, caveat copy)
```

- **`scorer.js`** — pure, side-effect-free. The exact bytes the browser scores with are the exact bytes `node --test` asserts against (no drift).
- **`ui.js`** — imports `evaluate`, binds the `input` event, renders the bar / color-coded label / checklist, drives the show/hide toggle, and writes the tier string to the live region only on tier change (debounced ~300–500 ms; visual update stays synchronous).
- **`index.html`** — static structure at repo root, loads `./ui.js` (relative path).
- **`scorer.test.js`** — `node:test` + `node:assert`, imports `scorer.js`.

**Rationale.** Research called pure single-file inline the "zero-risk" deploy, but `config.json` mandates `node --test`, which can't import logic inlined in `index.html`. Extracting the pure scorer resolves this. The developer chose B over the minimal 3-file variant (A) for explicit separation of DOM glue (`ui.js`) from markup. Single-source-of-truth eliminates shipped-vs-tested drift.

**Rejected:** (A) 3-file with glue inline in `index.html` — fewer files but glue mixed into markup; (pure single-file inline) — breaks `node --test`; (duplicate logic in page + test) — silent drift, tests assert code the user never runs.

## Scope / Non-goals

**In scope**
- Four hand-written static files at repo root: `index.html`, `ui.js`, `scorer.js`, `scorer.test.js`.
- Live (on `input`) evaluation: 3-tier strength bar, color-coded text label, 5-rule checklist.
- Accessibility: labelled input, parse-time ARIA live region, no-color-alone state, WCAG-AA text contrast.
- Accessible show/hide password toggle.
- Honest framing + a visible caveat line.
- Unit tests for the scoring core under `node --test`.

**Non-goals (explicitly out)**
- No entropy / dictionary / breach-list detection (needs a dependency and would overclaim).
- No framework, bundler, build step, `package.json`, `node_modules`, CDN, or web fonts.
- No backend, network calls, persistence, or analytics.
- No edits to `pages.yml` or `.claude/matali` config/state.
- No password generation, form-submission handling, or multi-field forms.

## Acceptance criteria

1. `index.html` exists at the repository root and its raw HTML contains the literal word "password" (case-insensitive). `verify: { instrument: "grep", assertions: ["grep -qi password index.html exits 0"] }`
2. The password input has a matching `id` and an associated visible `<label for="…">`. `verify: { instrument: "dom", assertions: ["label[for] resolves to the input", "input is type=password initially"] }`
3. On the `input` event (typing, paste, autofill), the bar, color-coded label, and checklist all update live (binding is `input`, not `keyup`).
4. `scorer.js` exports a pure `evaluate(value)` returning the five rule booleans and a tier name; it performs no DOM, network, storage, or console I/O.
5. Tier mapping is exactly: **Weak** when fewer than 3 rules satisfied OR length < 8; **Fair** when 3–4 rules satisfied AND length ≥ 8; **Strong** when all 5 rules satisfied AND length ≥ 12. Reference vectors: `""`→Weak, `"abcdefgh"`→Weak (2 rules), `"Password1!"` (9 chars, all 5 rules)→Fair, `"Password123!"` (12 chars, all 5)→Strong. `verify: { instrument: "node --test", assertions: ["table-driven boundary cases incl. Password1!→Fair and len-12 Strong gate"] }`
6. The five predicates are: length ≥ 8; `/[a-z]/`; `/[A-Z]/`; `/[0-9]/`; symbol `/[^a-zA-Z0-9\s]/u` (excludes whitespace, accepts Unicode symbols).
7. The color-coded label uses WCAG-AA text colors on its background (`#c0392b` Weak / `#b7710d` Fair / `#1a7a3c` Strong) AND the tier is conveyed by the text label, not color alone.
8. The 5-item checklist shows met/not-met per rule conveyed by text/icon (e.g. sr-only "Met"/"Not met" prefix or visible text), not by color alone; decorative icons carry `aria-hidden="true"`.
9. The ARIA live region is present and EMPTY in the initial parsed HTML with `role="status"`, `aria-live="polite"`, `aria-atomic="true"`; its text is updated only when the tier changes; the live-region write is debounced ~300–500 ms; it never uses `aria-live="assertive"`.
10. A show/hide toggle button with an accessible name and `aria-pressed` reflecting state toggles the input between `type="password"` and `type="text"`; toggling never transmits, persists, or logs the value.
11. No network calls, no storage, and no console logging of the password value anywhere across `scorer.js`, `ui.js`, `index.html`. `verify: { instrument: "grep", assertions: ["no fetch|XMLHttpRequest|localStorage|sessionStorage|console.* of the value"] }`
12. `index.html` and `ui.js` reference modules with same-directory relative paths (`./ui.js`, `./scorer.js`) — no leading-slash / root-absolute paths.
13. `scorer.test.js` runs green under `node --test`, covering all five predicates and the tier boundaries (including `Password1!`→Fair and the length-12 Strong gate). `verify: { instrument: "node --test", assertions: ["node --test exits 0"] }`
14. Honest framing: the top tier is labeled "Strong" (never "Very Strong"/"Unbreakable"); a visible caveat communicates that length matters most and to avoid common words; rules are guidance only and never block input.

## Boundaries

**always-do**
- Vanilla HTML/CSS/JS only; keep `scorer.js` pure and the single source of truth for scoring.
- Author the ARIA live region empty at parse time; use same-directory relative paths only.
- Meet WCAG-AA contrast and the no-color-alone rule; use honest, non-overclaiming copy.
- Keep `index.html` at repo root and containing the word "password".

**ask-first**
- Adding any file beyond `index.html` / `ui.js` / `scorer.js` / `scorer.test.js`.
- Changing the tier thresholds or predicate definitions.
- Adding a separate stylesheet file.
- Any change to `pages.yml` or `.claude/matali` config/state.

**never-do**
- Add a dependency / build step / `package.json` / CDN / web font / imported third-party script.
- Transmit, persist, or log the password value.
- Use root-absolute asset paths or nest `index.html` in a subdirectory.
- Use `aria-live="assertive"`; convey state by color alone; overclaim security; block input/submission on composition rules.

```yaml
floors:
  - id: "F1"
    rule: "No build step and zero runtime/third-party dependencies: vanilla HTML/CSS/JS only. No bundler, no npm/package install, no CDN resources (including web fonts), no external/imported scripts. Stated brief constraint that downstream phases cannot relax."
    source: "Task brief ('no build step, no dependencies'); Constraints & Floors > Security and privacy posture ('No third-party scripts, no CDN resources (even for fonts)')"
  - id: "F2"
    rule: "All password computation stays client-side. The password value must never be transmitted over the network (no fetch/XHR), sent to analytics/telemetry, persisted to storage, or written to console/logs. No network calls of any kind at any point."
    source: "Constraints & Floors > Security and privacy posture; Risks > Security and privacy posture"
  - id: "F3"
    rule: "Asset references must NOT use root-absolute paths (e.g. /style.css). The deploy workflow uses actions/upload-pages-artifact@v3 with path '.' on a GitHub PROJECT page (repo ApurvBazari/matali-fullpipeline-dogfood, served at /matali-fullpipeline-dogfood/), so root-absolute paths resolve to the domain root and 404. Use only same-directory relative paths (./style.css, ./app.js) or inline everything into a single index.html."
    source: "Verified: .github/workflows/pages.yml (path: '.') + git remote (project-page subpath); Constraints & Floors > GitHub Pages path / base-href behavior; Risks > GitHub Pages subpath asset resolution"
  - id: "F4"
    rule: "index.html must exist at the repository root (it is packaged as the artifact root and served as the site root). Entry point cannot be nested without configuration changes."
    source: "Verified: .github/workflows/pages.yml (upload-pages-artifact path: '.'); Constraints & Floors > GitHub Pages path / base-href behavior ('index.html at root resolves correctly as the site root')"
  - id: "F5"
    rule: "The password input must have a programmatic accessible label — a <label for='...'> associated with the input id (aria-label/aria-labelledby only as fallback where a visible label is impossible). Required for WCAG conformance and an explicit spec requirement."
    source: "Task brief ('labelled input'); Prior Art > Accessibility (label-for association); Existing Implementations > Accessibility (label association)"
  - id: "F6"
    rule: "Strength text must be exposed via an ARIA live region: an element present and EMPTY in the initial parsed HTML (never injected after load), using role='status' / aria-live='polite' with aria-atomic='true'. Must NOT use aria-live='assertive' (interrupts typing). Updated only when the tier changes, not on every keystroke. Required for WCAG and an explicit spec requirement."
    source: "Task brief ('ARIA live region for the strength text'); Constraints & Floors > ARIA live region; Risks > ARIA live-region over-announcement"
  - id: "F7"
    rule: "Do not rely on color alone to convey weak/fair/strong or checklist pass/fail (WCAG 2.1 SC 1.4.1). State must be carried independently by the text label and by text/icon indicators on each checklist item; bar color is additive enhancement only."
    source: "Risks > Color-only signaling (WCAG SC 1.4.1); Constraints & Floors > Color palette ('color must not be the only signal'); Existing Implementations > Color Palette"
  - id: "F8"
    rule: "All text used to communicate strength state (the tier label and checklist text) must meet WCAG 2.1 AA contrast of at least 4.5:1 against its background. Pure yellow/amber-400 and similarly light hues fail and must not be used as text color; use darkened variants (e.g. red ~#b91c1c, amber ~#b45309, green ~#15803d on white)."
    source: "Risks > Color-only signaling ('All three label text colors must meet 4.5:1 contrast ratio'); Constraints & Floors > Color palette meeting WCAG AA; Prior Art > Color Palette and Contrast"
  - id: "F9"
    rule: "The meter must not enforce composition rules as input blockers and must not overclaim security. The five rules are displayed as guidance only; the input accepts any value. The top-tier label must avoid implying uncrackability — frame output as 'complexity rules satisfied', not 'this password is secure'. Aligns with NIST SP 800-63B Rev.4, which prohibits verifiers imposing mandatory composition rules."
    source: "Constraints & Floors > Scoring model (NIST SP 800-63B Rev.4 prohibits mandatory composition rules; 'must not enforce them as blockers'); Risks > Scoring honesty / Security posture ('no honest strength-only claim warrants \"this password is safe\" copy')"
  - id: "F10"
    rule: "The project test runner is `node --test`; the scoring logic must live in an importable ES module (scorer.js) with tests in scorer.test.js. No additional test framework (Jest/Mocha/Vitest) or any dependency may be introduced (reinforces F1)."
    source: "SPEC dialogue + context finding 'Test runner and file structure convention' (.claude/matali/config/config.json testRunner='node --test')"
  - id: "F11"
    rule: "Single source of truth for scoring: the browser (via ui.js) and node:test must import the SAME scorer.js module. Scoring logic must never be duplicated or hand-copied into index.html or the test file, so shipped code equals tested code (no drift)."
    source: "SPEC chosen approach B (clean, single-source-of-truth); research tension resolution (single-file-inline vs node --test)"
  - id: "F12"
    rule: "index.html (at repo root) raw HTML must contain the literal word 'password' (case-insensitive) so the configured deploy smoke check `curl -fsSL <pages-url> | grep -qi password` passes."
    source: "context finding 'Smoke test constraint shapes visible HTML content' (.claude/matali/config/config.json ship.smoke.cmd)"
```
