# Password-Strength Meter

## Intent

Users typing a new password get no honest, immediate feedback about how their choice
composes. This feature gives **live, accessible, client-side guidance** as they type: a
strength band (Weak / Fair / Strong), a color-and-text bar, and a checklist of which
composition rules are satisfied. The value is *educational nudging* toward longer, more
varied passwords — explicitly framed as a **composition guide, not a security guarantee**
(NIST SP 800-63B discourages composition rules as a gate but endorses a strength meter as
guidance; length is the primary signal). It runs entirely in the browser, transmits and
stores nothing, and deploys as a single static page to GitHub Pages.

## Approach

Chosen approach (options level — the file-by-file blueprint is P2 PLAN's job): **a clean,
layered single-page meter with the scoring core in an importable module.**

- **`score.js`** — a pure ES module exporting `scorePassword(value) -> { band, rules, satisfiedCount }`.
  Five Boolean checks (`length >= 8`, `/[a-z]/`, `/[A-Z]/`, `/[0-9]/`, `/[^A-Za-z0-9\s]/` — whitespace
  excluded, so a space is not counted as a symbol; refined at VERIFY/V-4); no DOM,
  no globals, no network, no logging. Purity *is* the privacy floor expressed structurally — a
  function that cannot reach `fetch`/`console`/`storage` cannot leak the password.
- **`index.html`** — loads `./score.js` via `<script type="module">` (sibling-relative, which the
  `relative-asset-paths-only` floor permits), with an inline `<style>` (system-font stack, no
  external fonts) and a thin render adapter + wiring listener. The render adapter is a declarative
  band→presentation lookup so retuning a band is a one-line edit.
- **`score.test.js`** — `node --test` unit tests over `scorePassword` (the test-first red→green
  contract for P3 BUILD).

Rationale vs. alternatives: an entropy engine (zxcvbn) is excluded by the no-dependencies floor; a
single inline `<script>` would block `node --test` from unit-testing the scorer (the configured test
runner); a multi-file CSS/JS split adds relative-path surface for no benefit. The pure-core-in-a-module
shape is the smallest structure that is both deploy-safe on the `/matali-fullpipeline-dogfood/` subpath
and unit-testable.

**Band mapping** (total and unambiguous; the length-12 Strong gate weights length per NIST and blunts
the `Password1!` failure mode):

| Band | Condition |
|------|-----------|
| Neutral | empty input — no band, no announcement, bar reset |
| Weak | `length < 8`  OR  (`length >= 8` AND ≤1 character class) |
| Fair | `length >= 8` AND 2–4 character classes, but not Strong |
| Strong | `length >= 12` AND all 4 character classes |

Worked examples (carried into UI/disclaimer copy): `Password1!` (9 chars, all 4 classes) → **Fair**
(not Strong, by the length-12 gate); `correcthorsebatterystaple` (25 chars, 1 class) → **Weak**
(the disclosed passphrase limitation of composition-only scoring).

## Scope / Non-goals

**In scope:** the single static page; live strength bar (color + fill-width); text band label; the
5-rule satisfied-checklist; explicit input label; a polite, atomic ARIA live region announcing only
the band label; a persistent composition-only disclaimer; the pure scorer + its unit tests; deploy as
a static page via the existing `pages.yml`.

**Out of scope / non-goals:** any entropy / dictionary / breach-corpus / guessability model; any
backend, network call, or persistence; password *generation*; enforcing the password (it is guidance,
never a gate); policing browser autofill, password managers, or DevTools (boundary acknowledged, not
policed); a build step, bundler, framework, CDN script, or web font; i18n/localization.

## Acceptance criteria

1. **Empty input is Neutral.** With the field empty (or after clearing), no band is shown, the bar is
   reset to empty/neutral, and the live region is empty — no stale "Strong" announcement persists.
   `verify: { instrument: "browser", assertions: ["clear field → bar empty", "live region textContent is empty/neutral"] }`
2. **`length < 8` is Weak.** Any input under 8 characters shows the text label "Weak" regardless of
   character variety. `verify: { instrument: "browser", assertions: ["type 'Ab1!' → label text == Weak"] }`
3. **Mid-variety at `length >= 8` is Fair.** An 8+ character input with 2–3 character classes (and any
   8–11 input even with all 4 classes) shows "Fair".
   `verify: { instrument: "browser", assertions: ["type 'abcdefg8' → Fair", "type 'Password1!' → Fair"] }`
4. **Long + full-variety is Strong.** A `length >= 12` input with all 4 character classes shows "Strong".
   `verify: { instrument: "browser", assertions: ["type 'MyDogR3x!2024' → label text == Strong"] }`
5. **`Password1!` is Fair, not Strong** (the length-12 gate is observable). 
   `verify: { instrument: "node", assertions: ["scorePassword('Password1!').band === 'fair'"] }`
6. **Live checklist of 5 rules.** The checklist renders all five rules (length ≥ 8, lowercase,
   uppercase, digit, symbol) framed as "satisfied rules", and each toggles satisfied/unsatisfied live on
   every keystroke matching `scorePassword(...).rules`.
   `verify: { instrument: "browser", assertions: ["type 'aB3$' → lowercase+uppercase+digit+symbol satisfied, length unsatisfied"] }`
7. **Color is never the sole signal; label is explicit.** The band is conveyed by the visible text label
   (primary) in addition to bar color; the `<input type="password">` has an explicit `<label for>` with a
   matching `id` (no placeholder-as-label).
   `verify: { instrument: "browser", assertions: ["label[for=pw] exists and references the input id", "band text node present alongside the bar"] }`
8. **Accessible live announcement, value never leaked.** A single `role="status"` (or `aria-live="polite"`)
   `aria-atomic="true"` region announces only the band phrase (e.g. "Password strength: Fair") and never the
   password value or any rule text containing it.
   `verify: { instrument: "browser", assertions: ["live region uses role=status/aria-live=polite", "live region text never equals the typed value"] }`
9. **Zero exfiltration.** No `fetch`/`XHR`, no `console.*` of the value, no `localStorage`/`sessionStorage`
   writes; the password value never enters the live region or any readable attribute.
   `verify: { instrument: "node", assertions: ["score.js source contains no fetch/console/localStorage tokens"] }`
10. **Honest framing.** A persistent visible disclaimer states the meter checks composition only — not
    entropy, breach exposure, or guessability; UI copy never uses the words "secure" or "safe".
    `verify: { instrument: "browser", assertions: ["disclaimer text present", "document body text contains neither 'secure' nor 'safe'"] }`
11. **`scorePassword` is pure and unit-tested.** `node --test` over `score.test.js` passes, covering each
    band boundary (Neutral/Weak/Fair/Strong), the length-8 and length-12 thresholds, and each of the 5 rule
    flags. `verify: { instrument: "node", assertions: ["node --test exits 0", "every band + both length thresholds covered"] }`

## Boundaries

- **always-do:** vanilla HTML/CSS/JS only; keep the scorer a pure side-effect-free module with `node --test`
  coverage (SoC/SRP — scoring, rendering, and wiring are separate concerns); sibling-relative asset paths
  only; explicit `<label for>`; a single polite atomic live region carrying only the band label; color **and**
  text for the band; reset to Neutral on empty input; the persistent composition-only disclaimer.
- **ask-first:** changing the band thresholds (the length-8 / length-12 gates or class counts); adding any
  file, dependency, build step, CDN script, or web font; editing `.github/workflows/pages.yml`; changing the
  band label vocabulary.
- **never-do:** transmit, log, or persist the password value; use `aria-live="assertive"`/`role="alert"` for
  the per-keystroke live region; use the words "secure" or "safe" in any copy; use root-relative asset paths
  (`/style.css`); add an external library, CDN, bundler, or web font; present the meter as a security gate.

```yaml
floors:
  - id: "no-network-calls"
    rule: "The password value must never be transmitted over the network, logged to console, or written to localStorage/sessionStorage — all scoring is client-side only, in-browser, with zero XHR/fetch calls."
    source: "research.md (R0); NIST SP 800-63B 5.1.1; client-side privacy baseline"
  - id: "no-build-no-dependencies"
    rule: "The implementation must use only vanilla HTML/CSS/JS with no external libraries, CDN scripts, bundlers, build steps, or web fonts. This architecturally excludes zxcvbn even via a no-build <script src> CDN tag."
    source: "research.md (R0); feature constraint: static GitHub Pages deploy"
  - id: "aria-live-no-password-value"
    rule: "The aria-live region (or role=status equivalent) must contain only the strength band label; the password value must never be echoed into the live region or any announced/readable attribute."
    source: "research.md (R0); W3C WAI Complete Password Example; WCAG 1.3.1"
  - id: "live-region-polite-not-assertive"
    rule: "The continuously-updating strength live region must use aria-live=\"polite\" (or role=\"status\"); aria-live=\"assertive\"/role=\"alert\" must not be used for the per-keystroke status update."
    source: "research.md (R0); MDN ARIA live regions; W3C WAI password example"
  - id: "label-explicit-association"
    rule: "The password input must have an explicit <label for=...> association via matching id; placeholder text is not a valid substitute for a label."
    source: "research.md (R0); WCAG 1.3.1 / 4.1.2; W3C WAI Forms Tutorial"
  - id: "color-plus-text"
    rule: "Strength indication must include a text label in addition to bar color; color alone is prohibited as the sole means of conveying the strength state."
    source: "research.md (R0); WCAG 1.4.1 Use of Color; W3C WAI password example"
  - id: "relative-asset-paths-only"
    rule: "All asset references in the deployed page must use sibling-relative paths (e.g. \"score.js\"), never root-relative paths (\"/score.js\"), because the GitHub Pages project site is served under a /<repo-name>/ subpath where root-relative paths 404."
    source: "research.md (R0); GitHub Pages project-site subpath; existing pages.yml deploy"
  - id: "no-security-guarantee-claim"
    rule: "The meter must be framed as a composition guide and must not present its output as a security gate; the label vocabulary and surrounding copy must not use words like 'secure' or 'safe', and must disclose that it checks composition rules only — not entropy, breach exposure, or guessability."
    source: "research.md (R0); NIST SP 800-63B; Dropbox/zxcvbn limitations"
```
