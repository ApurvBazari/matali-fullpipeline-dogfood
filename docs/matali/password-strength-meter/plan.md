# Plan — Password-Strength Meter

## Context

Greenfield static page built from the approved `spec.md` (P1) and `research.md` (R0). The repo root currently has **no** `index.html` / `ui.js` / `scorer.js` / `scorer.test.js` — only `README.md`, `docs/`, `.github/workflows/pages.yml`, and `.claude/matali` config+state. All four application files are net-new at the repository **root**.

Project-wide constraints (verbatim from the spec, non-negotiable):

- Vanilla HTML/CSS/JS only — no build step, no dependencies, no CDN, no web fonts (F1, F10).
- 100% client-side: the password value never hits network / storage / console (F2).
- Deploy is a GitHub **project** page served under `/matali-fullpipeline-dogfood/`, so every asset reference is a same-directory **relative** path `./ui.js` / `./scorer.js` — no leading slash (F3, F4).
- Test runner is `node --test`; scoring logic lives in an importable ES module imported by BOTH the page and the tests — one source of truth, no drift (F10, F11).
- `index.html` at root contains the literal word "password" for the deploy smoke check (F12).
- Accessibility floors F5–F8 and honesty floor F9 carry through to markup + glue.

## Approach

Layered 4-file vanilla static page with scorer.js as the single source of truth, built bottom-up so the pure, testable core lands and goes green before any DOM glue or markup depends on it.

Greenfield confirmed: the repo root currently has NO index.html / ui.js / scorer.js / scorer.test.js (only README.md, docs/, .github/workflows/pages.yml, .claude/matali config+state). All four files are net-new at repo ROOT (/Users/apurvbazari/Desktop/projects/matali-tests/full-pipeline-dogfood/). Deploy is a GitHub PROJECT page served under /matali-fullpipeline-dogfood/ (config.json healthUrl), so every asset reference MUST be a same-directory relative path (./ui.js, ./scorer.js) — no leading slash. Test runner is `node --test` with no package.json / no deps (F1, F10), so the scored logic must live in an importable ES module and the page must import that SAME module (F11, no drift).

Dependency-ordered build sequence (4 units):
  U1 scorer.js (pure core) ──> U2 scorer.test.js (locks the contract) 
                          └──> U3 index.html (static markup, empty live region, caveat)
  U2, U3 ──> U4 ui.js (DOM glue: import evaluate, input listener, render bar/label/checklist, show/hide toggle, debounced tier-change live-region write)

Ordering rationale: U1 first because both the test (U2) and the glue (U4) import evaluate() — it is the foundation and the ONLY unit with executable unit tests, so it must be correct first (red->green via U2). U2 immediately after U1 to lock the tier-boundary + predicate contract (Password1!->Fair, len-12 Strong gate) before any UI consumes it; this is the regression net for floors F9/F11. U3 (markup) is authored before U4 because the live region MUST exist EMPTY in the parse-time HTML (F6) and ui.js queries those exact element ids/attributes — U4 binds to the DOM that U3 defines. U4 last because it depends on the verified scorer (U1/U2) AND the parsed structure (U3); it carries the integration + accessibility-behavior risk (debounce, aria-pressed toggle, tier-change-only announce, no-color-alone state writes, never log the value).

Single-source-of-truth (F11) is enforced structurally: scorer.js is imported by BOTH scorer.test.js (node --test) and ui.js (browser <script type=module>) — the bytes node asserts against are the exact bytes the browser scores with, so there is zero shipped-vs-tested drift. Visual updates (bar/label/checklist) are synchronous on every input event; only the ARIA live-region textContent write is debounced ~300-500ms and gated to fire ONLY on tier change (F6). The password value never touches fetch/XHR/localStorage/sessionStorage/console anywhere (F2). Honest framing throughout: top tier is exactly 'Strong' (never 'Very Strong'/'Unbreakable') with a visible caveat that length matters most / avoid common words, and the 5 rules are guidance only — they never block input (F9).

Test contracts are specified as red->green behaviors/assertions only (no implementation). U2 is the executable gate (`node --test` exits 0). U1/U3/U4 carry non-node verification gates: grep-based smoke/forbidden-token checks and DOM/manual a11y assertions named in each unit's dod, mapping to acceptance criteria 1-3, 6-12, 14.

## Build Units

### Unit 1: Pure scoring core — scorer.js evaluate() with 5 predicates + Weak/Fair/Strong tier mapping

- **id:** U1 · **depends-on:** []
- **complexity:** design-judgment
- **files:**
  - create: scorer.js
  - test: covered by U2 (scorer.test.js)
- **interfaces:**
  - consumes: nothing — pure module, no imports of DOM/window/fetch/storage/console
  - produces: ES module named export: evaluate(value: string) -> { rules: { length: boolean, lower: boolean, upper: boolean, digit: boolean, symbol: boolean }, tier: 'Weak' | 'Fair' | 'Strong' }. Predicates: length = value.length >= 8; lower = /[a-z]/.test(value); upper = /[A-Z]/.test(value); digit = /[0-9]/.test(value); symbol = /[^A-Za-z0-9\s]/u.test(value). Tier from count of satisfied rules + value.length: Weak when count<3 OR length<8; Fair when count is 3 or 4 AND length>=8; Strong when count===5 AND length>=12 (all-5-but-length-8..11 falls through to Fair).
- **tests (red→green contract):** RED->GREEN CONTRACT (assertions live in U2, must fail before U1 exists / passes after): (a) evaluate is an exported function; calling it returns an object with a `rules` object having exactly keys length/lower/upper/digit/symbol (all boolean) and a `tier` string. (b) Predicate truth table: '' -> all five rules false; 'abcdefgh' -> length true, lower true, upper/digit/symbol false (exactly 2 rules); a value with a leading/trailing space-only does NOT earn symbol (whitespace excluded by \s); a value containing a non-ASCII symbol (e.g. '£') earns symbol (Unicode via /u flag); each predicate isolated (e.g. 'A' earns only upper, '1' earns only digit, '!' earns only symbol, 'a' earns only lower). (c) Tier boundaries: ''->Weak; 'abcdefgh'->Weak (2 rules); 'Password1!' (9 chars, all 5 rules)->Fair (length<12 gate); 'Password123!' (12 chars, all 5 rules)->Strong; a 7-char value with all 5 character classes -> Weak (length<8 floor dominates); a 12-char value missing one class (4 rules)->Fair; an 11-char all-5-rules value->Fair (proves the len-12 Strong gate, not len>=8). (d) Purity: importing scorer.js produces no console output, makes no network/storage access (verified structurally in U1 dod via forbidden-token grep). Do NOT write the implementation here — only the contract.
- **dod:** scorer.js exists at repo root as an ES module exporting a pure evaluate(value). `node --check scorer.js` parses clean. Forbidden-token grep over scorer.js finds ZERO of: fetch, XMLHttpRequest, localStorage, sessionStorage, console, document, window (satisfies AC4 'no DOM/network/storage/console I/O' and AC6 predicate definitions). The five predicates are exactly length>=8, /[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9\s]/u (AC6). Tier mapping logic is exactly Weak(<3 rules OR len<8)/Fair(3-4 rules AND len>=8)/Strong(all5 AND len>=12) (AC5). Real green is proven by U2. Satisfies AC4, AC6, and the scorer half of AC5.

### Unit 2: Scorer unit tests — scorer.test.js under node --test (predicates + tier boundaries)

- **id:** U2 · **depends-on:** ['U1']
- **complexity:** mechanical
- **files:**
  - create: scorer.test.js
  - test: scorer.test.js (self)
- **interfaces:**
  - consumes: import { evaluate } from './scorer.js'; node built-ins: import { test } from 'node:test'; import assert from 'node:assert' (or node:assert/strict). No third-party test framework, no package.json (F1/F10).
  - produces: An executable test suite that `node --test` discovers (filename matches *.test.js) and runs to a green exit code 0.
- **tests (red→green contract):** RED->GREEN CONTRACT (these are the assertions to author; they must FAIL if scorer.js is absent/wrong and PASS against the correct U1): (1) Predicate suite — table-driven over the five rules: '' => {length:false,lower:false,upper:false,digit:false,symbol:false}; 'a'=>only lower; 'A'=>only upper; '1'=>only digit; '!'=>only symbol; '   '(spaces)=> symbol false AND length depends only on count (assert whitespace never satisfies symbol); '£'=> symbol true (Unicode via /u); 'abcdefgh'=> length true,lower true, others false. (2) Tier-boundary suite — the four spec reference vectors as named cases: assert evaluate('').tier==='Weak'; evaluate('abcdefgh').tier==='Weak'; evaluate('Password1!').tier==='Fair' (explicit case proving all-5-rules-but-len-9 is NOT Strong); evaluate('Password123!').tier==='Strong' (12 chars, all 5). (3) Gate-edge suite: an 11-char all-5-rules string => 'Fair' and a 12-char all-5-rules string => 'Strong' (locks the length-12 Strong gate, AC13 'len-12 gate'); a 7-char all-classes string => 'Weak' (length<8 floor); a 12-char 4-rules string => 'Fair'; a long lowercase-only string (>=8, 1 rule) => 'Weak' (count<3 floor). (4) Shape: every evaluate(...) return has boolean rules.{length,lower,upper,digit,symbol} and a tier in the set {Weak,Fair,Strong}. Do NOT include implementation of evaluate — only assertions importing it.
- **dod:** Running `node --test` from repo root exits 0 with the suite green; the suite covers ALL FIVE predicates and the tier boundaries INCLUDING the named cases 'Password1!'->Fair and the length-12 Strong gate (AC13). Suite uses only node:test + node:assert (no deps, no package.json) (F10). `node --check scorer.test.js` parses clean. Satisfies AC13 and is the executable proof of AC5.

### Unit 3: Static markup — index.html at repo root (labelled input, 3-segment bar, color label, 5-item checklist, empty ARIA live region, show/hide button, caveat, loads ./ui.js)

- **id:** U3 · **depends-on:** ['U1']
- **complexity:** design-judgment
- **files:**
  - create: index.html
  - test: grep + DOM/manual a11y assertions (see dod)
- **interfaces:**
  - consumes: loads ./ui.js via <script type="module" src="./ui.js"></script> (same-directory relative, no leading slash). Defines the stable element ids/attributes that U4 (ui.js) queries.
  - produces: A parse-time-complete DOM contract for ui.js: (a) a password <input type="password" id="password-input"> with a visible <label for="password-input">; (b) a 3-segment strength bar (3 child elements) the script can fill 0/1/2/3 segments; (c) a color-coded text strength label element conveying tier as TEXT ('Weak'/'Fair'/'Strong'), styled via per-tier class (no color-only); (d) a 5-item <ul> checklist, one <li> per rule (length>=8, lowercase, uppercase, digit, symbol), each with a decorative icon (aria-hidden="true") AND an sr-only Met/Not-met text span the script toggles; (e) an EMPTY live region <div id="strength-status" role="status" aria-live="polite" aria-atomic="true"></div> (no text content at parse time, never assertive); (f) a show/hide toggle <button type="button" id="toggle-visibility" aria-pressed="false"> with an accessible name; (g) a visible honest caveat line (length matters most / avoid common words). CSS inlined in a <style> block (no separate stylesheet without ask-first; no external/web-font/CDN link).
- **tests (red→green contract):** RED->GREEN CONTRACT (verification gates this markup must satisfy; non-node, asserted by grep + DOM inspection): (1) grep -qi 'password' index.html exits 0 (literal word present, AC1, F12). (2) DOM: querySelector for a <label[for]> whose for-value resolves to an existing input id, and that input is type="password" at parse time (AC2). (3) DOM: exactly one element with role="status" that ALSO has aria-live="polite" and aria-atomic="true" and whose textContent is empty/whitespace-only in the raw HTML (AC9 parse-time-empty); grep confirms NO occurrence of aria-live="assertive" anywhere (AC9 never assertive). (4) DOM: a <button> with aria-pressed="false" and a non-empty accessible name (text or aria-label) (AC10 markup half). (5) DOM: a <ul> with exactly 5 <li> children, each containing an aria-hidden="true" decorative icon and an sr-only text node carrying state wording (AC8 markup half). (6) DOM: a strength-label element present (AC7 markup half) and a 3-segment bar (3 child segment elements). (7) grep confirms script reference is exactly src="./ui.js" (same-directory relative) and there is NO src="/ui.js" / href="/..." root-absolute path anywhere (AC12); grep confirms NO external/CDN <link>/<script src="http..."> and NO web-font link (F1). (8) Visible caveat text present mentioning length and common words; top-tier wording 'Strong' present, and no 'Very Strong'/'Unbreakable'/'Uncrackable' string (AC14). Do NOT author ui.js logic here.
- **dod:** index.html exists at repo ROOT (not nested) and `grep -qi password index.html` exits 0 (AC1, F4, F12). Labelled password input present with matching id (AC2). Empty role=status/aria-live=polite/aria-atomic=true live region present at parse time; zero aria-live=assertive (AC9 markup portion, F6). Show/hide button with aria-pressed and accessible name present (AC10 markup portion). 5-item checklist with aria-hidden decorative icons + sr-only state text present (AC8 markup portion). Color-label element + 3-segment bar present (AC7 markup portion). Loads ./ui.js with a same-directory relative path; no root-absolute or external/CDN/web-font references (AC12, F1, F3). Visible caveat (length matters most / avoid common words) and honest 'Strong' top-tier wording with no overclaiming strings (AC14). `node --check` not applicable (HTML); valid via DOM-parse with no unclosed structural tags. Satisfies AC1, AC2, and the markup portions of AC7/AC8/AC9/AC10/AC12/AC14.

### Unit 4: DOM glue — ui.js (import evaluate, input listener, render bar/label/checklist, show/hide toggle, debounced tier-change live-region write, never log value)

- **id:** U4 · **depends-on:** ['U2', 'U3']
- **complexity:** integration
- **files:**
  - create: ui.js
  - test: grep forbidden-token gate + manual/DOM behavior assertions (see dod); U2 guarantees the scoring it consumes
- **interfaces:**
  - consumes: import { evaluate } from './scorer.js' (same-directory relative, no leading slash, F11 single source of truth); reads the DOM ids/attributes defined by U3 (password-input, strength bar segments, strength label, checklist li/sr-only spans, strength-status live region, toggle-visibility button).
  - produces: Runtime behavior bound at load: (a) addEventListener('input', handler) on the password input — fires on typing/paste/autofill (NOT keyup); (b) on each input: call evaluate(input.value), SYNCHRONOUSLY update the 3-segment bar fill, the color-coded text label (set text to tier + swap per-tier CSS class so state is text+color, never color-alone), and each checklist li's met/not-met state via its sr-only text + icon (not color alone); (c) maintain a lastTier variable; only when evaluate's tier differs from lastTier, schedule a debounced (~300-500ms, single trailing timer that resets on each input) write of the tier string to the strength-status live region textContent, then update lastTier — visual updates stay synchronous; (d) show/hide toggle click handler: flip input.type between 'password' and 'text' and set aria-pressed to match, update the button accessible name/state; the value is never copied off-element, never sent anywhere. No fetch/XHR/storage; never console-log the password value.
- **tests (red→green contract):** RED->GREEN CONTRACT (behavior + static-safety gates; manual/DOM-driven since no jsdom dep is allowed — U2 already guarantees the scoring numbers): (1) Forbidden-token gate (static): grep over ui.js finds ZERO of fetch, XMLHttpRequest, localStorage, sessionStorage, and ZERO console.* that takes the password value (AC11, F2) — and the password value is never passed to any network/storage/log sink anywhere across scorer.js+ui.js+index.html. (2) Event binding: source binds the 'input' event (assert addEventListener('input', ...) present) and does NOT rely on 'keyup' for live update (AC3). (3) Live update: simulating an input value change updates the bar fill, the text label, and the checklist met/not-met states synchronously in the same turn (AC3). (4) No-color-alone: the label's textContent equals the tier word and checklist items expose Met/Not-met via text/sr-only (state survives with CSS color removed) (AC7/AC8 behavior half). (5) Live-region discipline: typing within a single tier does NOT change strength-status textContent; crossing a tier boundary updates it exactly once after the debounce window; the write path never sets aria-live to assertive (AC9 behavior half) and the region was empty until the first tier change. (6) Show/hide: clicking the toggle flips input.type password<->text and sets aria-pressed true/false to match; repeated toggling round-trips; the value is unchanged and never logged/transmitted (AC10 behavior half, AC11). (7) Path: import specifier is exactly './scorer.js' (same-directory relative, no leading slash) (AC12, F11). Do NOT inline or duplicate the scoring logic — import it (F11). Author assertions/contract only, not the implementation.
- **dod:** ui.js exists at repo root, `node --check ui.js` parses clean, imports evaluate from './scorer.js' (single source of truth, no duplicated scoring) (F11, AC12). Forbidden-token grep over ui.js (and the whole repo for the value path) finds zero fetch/XHR/localStorage/sessionStorage and no console logging of the password value (AC11, F2). Binds the 'input' event so bar+label+checklist update live (AC3). Label conveys tier by text and checklist by text/sr-only (not color alone) (AC7/AC8 behavior portions). Live-region textContent is written only on tier change, debounced ~300-500ms, never assertive, region empty until first change (AC9 behavior portion). Show/hide button toggles type password<->text with aria-pressed reflecting state and never transmits/persists/logs the value (AC10 behavior portion). Uses same-directory relative import (AC12). Manual run in a browser served from a subpath confirms the page works (no broken asset paths). Satisfies AC3, AC11, the behavior portions of AC7/AC8/AC9/AC10, and the ui.js portion of AC12.

## Acceptance Map

- index.html at repo root, raw HTML contains 'password' (smoke grep) → U3
- password input has matching id and visible <label for> → U3
- on 'input' event bar+label+checklist update live → U4, U3
- scorer.js exports pure evaluate(value); no DOM/network/storage/console I/O → U1, U2
- tier mapping exactly Weak(<3 rules OR len<8)/Fair(3-4 rules AND len>=8)/Strong(all5 AND len>=12); vectors ''->Weak, 'abcdefgh'->Weak, 'Password1!'->Fair, 'Password123!'->Strong → U1, U2
- five predicates length>=8, /[a-z]/, /[A-Z]/, /[0-9]/, symbol /[^A-Za-z0-9\s]/u → U1, U2
- color label uses AA colors #c0392b/#b7710d/#1a7a3c AND tier conveyed by text not color alone → U3, U4
- 5-item checklist met/not-met via text/icon not color alone; decorative icons aria-hidden → U3, U4
- ARIA live region empty at parse time, role=status aria-live=polite aria-atomic=true, updated only on tier change, debounced, never assertive → U3, U4
- show/hide toggle button accessible name + aria-pressed toggles password<->text; never transmits/persists/logs value → U3, U4
- no network/storage/console-logging of password value anywhere → U4, U1
- index.html and ui.js use same-directory relative paths (./ui.js, ./scorer.js), no root-absolute → U3, U4
- scorer.test.js green under 'node --test' covering predicates + tier boundaries incl Password1!->Fair and len-12 gate → U2, U1
- honest framing: top tier 'Strong', visible caveat (length matters most/avoid common words), rules never block input → U3, U4

## Risks & Rollback

**Risks**

- **U4 integration risk (highest):** debounce timing, tier-change-only announcement, `aria-pressed` toggle, no-color-alone state writes, and never logging the value all live in `ui.js`. Mitigated by U2 locking the scoring contract and U3 fixing the DOM contract before U4 binds to it; verified by a forbidden-token grep + a manual browser run served from a subpath.
- **ES-module load over the Pages subpath:** a stray leading-slash path would 404. Mitigated by same-directory relative specifiers only (F3) and a grep gate in U3/U4.
- **ARIA live-region over-announcement:** flooding screen readers on every keystroke. Mitigated by gating the write to tier changes only + ~300–500 ms debounce, `polite`/never `assertive` (F6).
- **False-strong (`Password1!`):** mitigated by the length-12 Strong gate, asserted explicitly in U2.
- **Logic drift between shipped + tested code:** structurally impossible — `scorer.js` is imported by both `scorer.test.js` and `ui.js` (F11).

**Rollback**

- Every unit is **additive** (a new root file); per-unit rollback = delete that file. No existing file, `pages.yml`, or matali config/state is modified.
- Whole-feature rollback = `git revert` the build commit (or delete the four root files). `stableRef` = the pre-build HEAD on `feat/password-strength-meter`.

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
