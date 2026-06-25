# Password-Strength Meter — SPEC

## Intent

A person creating a password gets immediate, understandable feedback on how strong it is and exactly which composition rules they have satisfied — turning an opaque "make it stronger" demand into concrete, learnable guidance. The value is educational: it teaches what makes a password complex while the user types, fully accessible to keyboard and screen-reader users. It is explicitly a guidance aid, **not** a security guarantee or an authentication check.

## Approach

Ship the entire feature as **one self-contained `index.html` at the repo root**, with all CSS in a single inline `<style>` block and all logic in a single inline `<script>` block — no build step, no dependencies, no sibling assets. This was chosen over the testable two-file split (pure `evaluate()` module + controller) and over a multi-module ES split.

Rationale: the deploy workflow (`.github/workflows/pages.yml`) uploads the repo root verbatim (`upload-pages-artifact@v3`, `path: "."`) on `workflow_dispatch`. A single inline file eliminates the relative-path failure mode entirely (F5) — zero cross-file `href`/`src` references to break on the GitHub Pages project-site URL (`username.github.io/repo-name/`) or on `file://`. It makes the zero-dependency floor (F1) self-evident at a glance and keeps the diff reviewable in one place for the full-gate BUILD/VERIFY phases.

A single `input` event listener on the password field re-evaluates all five rules synchronously on every keystroke and updates four things: (a) per-rule checklist glyph + text, (b) bar fill width + color, (c) the visible tier label, and (d) the `aria-live` region — the last **only when the tier changes**.

Three decisions are locked (developer-confirmed):

1. **Tier model — gate-then-count.** `length >= 8` is a hard gate: until it passes, the tier is pinned to **Weak** regardless of how many character-class rules are met. Once the gate passes, promote to **Fair** at 3–4 of 5 rules and **Strong** only when all 5 pass. Bar fills 33% / 66% / 100%. This avoids the counterintuitive "Fair for a 6-char password with a symbol" UX, aligns the message with the reality that length is the primary strength driver, and partially mitigates the documented rule-based false-confidence risk (NDSS 2017 / USENIX 2023).
2. **Symbol rule — broad non-alphanumeric `/[^A-Za-z0-9]/`**, documented in a source comment, with the UI label reading "special character" so the rule name matches what the regex accepts. Accepted, documented edge case: accented characters and emoji count as symbols.
3. **Live region — `aria-live="polite"` + `aria-atomic="true"`, updated on tier change only** (no `setTimeout` debounce). The region holds only the tier label string; `polite` queues until the user pauses, and writing only on tier change eliminates per-keystroke chatter while keeping the logic synchronous.

Trade-off accepted by the single-file choice: the scoring logic is inline (not importable), so isolated unit tests are not available. Correctness is verified **behaviorally at VERIFY (P4)** against the running page rather than via `node --test`.

## Scope / Non-goals

**In scope**
- One root-level `index.html` (inline CSS + JS) implementing the meter.
- Live, per-keystroke evaluation of the five rules: length ≥ 8, has lowercase, has uppercase, has a digit, has a special character.
- A 3-tier strength bar (Weak / Fair / Strong), a color-coded **and** text tier label, and a rule checklist — all accessible.
- A standing, visible educational disclaimer.

**Non-goals (explicitly out)**
- No backend, no network, no storage/persistence of any kind.
- No password generation; no show/hide toggle (could be added later, not required now).
- No entropy / zxcvbn-style scoring and no dictionary/breach checks — rule-based only.
- No build tooling, no dependencies, no test-framework setup.
- No automatic deploy — deployment stays a manual `workflow_dispatch` step; `pages.yml` is not modified.

## Acceptance criteria

1. A root-level `index.html` exists and renders a programmatically labelled password input (native `type="password"`, `<label for>`/`id` pairing).
2. Typing in the field updates, live on `input`, a checklist of the five rules, each conveying pass/fail via **glyph + text** (e.g. ✓ / ✗ with words), never color alone.
3. The strength tier follows **gate-then-count**: when `length < 8` the tier is Weak regardless of other rules; when `length >= 8`, 3–4 rules met = Fair and all 5 = Strong.
4. The strength bar fill width reflects the tier (Weak 33% / Fair 66% / Strong 100%) and the visible tier-label **text** matches the tier. `verify: { instrument: "browser", assertions: ["type 'abc' -> Weak/33%", "type 'abcdefg1' -> tier not Strong", "type 'Abcdefg1!' -> Strong/100%"] }`
5. An `aria-live="polite"` `aria-atomic="true"` region is present in the **initial** HTML, primed with a single space, and updates with **only the tier label text** when the tier changes — never any password-derived text. `verify: { instrument: "browser", assertions: ["live region exists at load", "contains only Weak|Fair|Strong after typing"] }`
6. The special-character rule matches any non-alphanumeric character (`/[^A-Za-z0-9]/`).
7. There are **no network calls anywhere** (no `fetch` / `XMLHttpRequest` / `<img>` beacon); the page works from `file://` and from a Pages project-site URL with no console errors. `verify: { instrument: "static+browser", assertions: ["grep finds no fetch/XHR/beacon", "no console errors on load"] }`
8. Tier label colors meet WCAG AA text contrast on the page background, and the bar width transition is suppressed under `@media (prefers-reduced-motion: reduce)`.
9. A visible standing disclaimer states the meter is educational guidance, not a security guarantee.

## Boundaries

- **always-do:** keep the entire feature in one root-level `index.html`; honor all seven floors (F1–F7); use descriptive, non-congratulatory copy ("Fair", not "Good"); use AA-contrast tier label colors; reference no external assets.
- **ask-first:** adding any sibling file (`.js` / `.css` / a test file); adding a show/hide toggle or any new interactive control; changing the tier model or the symbol regex; editing `pages.yml` or any CI.
- **never-do:** introduce a dependency, CDN tag, or build step; send the password value off the page (`fetch` / `XHR` / beacon / persisting the value); place any password-derived text inside the live region; use color as the only signal for any state; use an `assertive` live region.

```yaml
floors:
  - id: "F1"
    rule: "Zero runtime and build-time dependencies: no npm install, no bundler, no CDN script tag, no third-party JS loaded at runtime. All logic lives in inline <script>/<style> blocks or sibling .js/.css files referenced by bare relative paths."
    source: "Prior Art (W3C vanilla reference, <100 lines); Existing Implementations consensus; Constraints & Floors (deployment floor)"
  - id: "F2"
    rule: "The password value never leaves the page: all evaluation is synchronous in-browser regex; no fetch, XMLHttpRequest, or <img src> beacon anywhere in the implementation."
    source: "Prior Art (non-disarmable floors); Constraints & Floors; Risks (client-side eavesdropping vector)"
  - id: "F3"
    rule: "An aria-live=\"polite\" region must be present in the initial HTML/DOM at page load (not injected dynamically) and updated in place; it carries only the strength tier label text and must never contain any data derived from the password value. polite (never assertive) is required to avoid per-keystroke interruption."
    source: "Prior Art (W3C WAI example, TetraLogical, Sara Soueidan); Constraints & Floors; Risks (pre-populated/empty-region failure mode, password-echo vector)"
  - id: "F4"
    rule: "Color must never be the sole signal (WCAG 1.4.1 Level A): the strength tier text label (Weak/Fair/Strong) must always be visible alongside the color fill, and each checklist rule must convey pass/fail via text or icon/glyph (e.g. checkmark/cross), not green/red color alone."
    source: "Prior Art & Constraints & Floors (WCAG 1.4.1 / W3C Understanding); PatternFly; Risks (color-only failure)"
  - id: "F5"
    rule: "Deploys as static files with no server logic: assets use relative paths (no root-relative absolute paths) or an HTML <base> tag, so the page works identically from file:// and from a GitHub Pages project-site URL (username.github.io/repo-name/). A single self-contained HTML file is the safest form."
    source: "Constraints & Floors (deployment floor, GitHub Pages relative-paths guide); Existing Implementations (static-file deployment)"
  - id: "F6"
    rule: "The password <input> must have a programmatically associated <label> via for/id pairing (not placeholder alone); native input type=password is used so it is keyboard-operable by default, and any added show/hide toggle must be a <button> with an accessible name."
    source: "Constraints & Floors (input labeling); Prior Art (W3C WAI <label for=\"password\">)"
  - id: "F7"
    rule: "Any strength-bar width transition must be suppressed inside @media (prefers-reduced-motion: reduce) (transition: none or transition-duration: 0.01ms) so the bar snaps rather than animates."
    source: "Prior Art (MDN, CSS-Tricks); Constraints & Floors; Open Questions (one-line CSS guard)"
```
