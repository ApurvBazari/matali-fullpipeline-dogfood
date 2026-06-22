# Password-Strength Meter — Build Plan

## Context

R0 RESEARCH settled the scoring model (additive composition rules; entropy estimation rejected by the no-dependencies floor) and 8 binding floors. P1 SPEC pinned the band mapping (length-8 Weak floor, **length-12 Strong gate**) and 11 testable acceptance criteria. The repo is greenfield: only `README.md`, the matali scaffolding under `.claude/`, the R0/P1 artifacts under `docs/matali/`, and `.github/workflows/pages.yml` (`workflow_dispatch`, `path: "."` publishes the repo root to the GitHub Pages `/matali-fullpipeline-dogfood/` subpath). No application code exists yet.

Project-wide constraints (verbatim from spec): vanilla HTML/CSS/JS only; no build step, dependency, CDN, or web font; sibling-relative asset paths only; all scoring client-side with zero exfiltration; the meter is composition **guidance**, never a security gate.

## Approach

Clean layered single-page meter with the scoring core in an importable pure ES module, exactly as approved in the spec. Three files at the repo root (so the existing pages.yml `path: "."` upload publishes them under the GitHub Pages /matali-fullpipeline-dogfood/ subpath): score.js (pure scorer), index.html (inline style + declarative render adapter + thin wiring listener, importing ./score.js via a sibling-relative `<script type="module">`), and score.test.js (node --test unit suite — the configured test runner).

Layering and dependency order: the pure scorer (U1) is the foundation and is built test-first against its own node --test suite (U2 is the same red->green contract, called out separately only to pin acceptance #5 and #11 — the length-12 gate and full band/threshold/flag coverage). The HTML is then built bottom-up: accessible static skeleton with all ARIA/label/disclaimer semantics (U3), a declarative band->presentation lookup adapter that pure-maps a scorePassword result to {labelText, barClass, widthPct, livePhrase} (U4), and a thin input-event wiring listener that debounces ONLY the live-region text (U5). Finally a static-source privacy guard (U6) and a deploy-readiness gate (U7) lock the no-exfiltration and static-deploy floors.

The band logic is the single load-bearing decision and is specified exactly: classCount = number of the 4 character-class rules (lower/upper/digit/symbol) satisfied. Neutral when length===0; Weak when length<8 OR (length>=8 AND classCount<=1); Strong when length>=12 AND classCount===4; Fair otherwise (length>=8 AND classCount in 2..4 but not Strong). This makes Password1! (9 chars, 4 classes) Fair, not Strong, because of the length-12 gate. The rules object is {length:len>=8, lower:/[a-z]/, upper:/[A-Z]/, digit:/[0-9]/, symbol:/[^A-Za-z0-9\s]/} and satisfiedCount is the count of all 5 true flags. The scorer touches no DOM, no globals, no network, no logging, no storage — purity IS the privacy floor expressed structurally.

Floors honored throughout: no-build/no-deps (vanilla only, no CDN/web font — inline system-font stack), relative-asset-paths-only (./score.js, never /score.js), label-explicit-association (visible `<label for=pw>` + matching input id, no placeholder-as-label), color-plus-text (visible band text label is primary; bar color is redundant reinforcement), live-region-polite-not-assertive (role=status / aria-live=polite + aria-atomic=true, carrying only the band phrase), aria-live-no-password-value (the value never enters the live region or any readable attribute), no-network-calls (zero fetch/XHR/console/localStorage of the value), and no-security-guarantee-claim (persistent composition-only disclaimer; copy never uses 'secure'/'safe'). The empty-input reset to Neutral (clear bar, empty live region, no stale Strong) is wired explicitly.

## Build Units

Dependency-ordered DAG. Topological build order: **U1, U3** (roots) → **U2, U4** → **U5** → **U6** → **U7**.

### Unit U1: Pure scorePassword core (score.js ES module)

- **id:** U1 · **depends-on:** [] (root)
- **complexity:** design-judgment
- **files:** create `score.js` · test `score.test.js`
- **interfaces:**
  - consumes: value: string (the raw password text from the input element; may be empty)
  - produces: export function scorePassword(value: string): { band: 'neutral'|'weak'|'fair'|'strong', rules: { length: boolean, lower: boolean, upper: boolean, digit: boolean, symbol: boolean }, satisfiedCount: number }  — pure, no side effects. rules.length = value.length>=8; rules.lower=/[a-z]/.test(value); rules.upper=/[A-Z]/.test(value); rules.digit=/[0-9]/.test(value); rules.symbol=/[^A-Za-z0-9\s]/.test(value). satisfiedCount = count of true flags across all 5 rules. classCount = count of true among {lower,upper,digit,symbol}. band: 'neutral' if value.length===0; 'weak' if value.length<8 OR (value.length>=8 AND classCount<=1); 'strong' if value.length>=12 AND classCount===4; else 'fair'.
- **tests (red→green):** node --test in score.test.js. RED->GREEN contract (assertions only, no implementation): (a) BANDS — scorePassword('').band==='neutral'; scorePassword('Ab1!').band==='weak' (len<8, full variety still Weak); scorePassword('correcthorsebatterystaple').band==='weak' (len>=8 but classCount 1); scorePassword('abcdefg8').band==='fair' (len 8, 2 classes); scorePassword('Password1!').band==='fair' (len 9, 4 classes, blocked by len<12); scorePassword('MyDogR3x!2024').band==='strong' (len 13, 4 classes). (b) LENGTH-8 THRESHOLD — a 7-char all-class input is 'weak'; the same content padded to 8 chars is not 'weak'. (c) LENGTH-12 THRESHOLD — an 11-char all-4-class input is 'fair'; a 12-char all-4-class input is 'strong' (the gate flips exactly at 12). (d) RULE FLAGS — for 'aB3$' rules === {length:false, lower:true, upper:true, digit:true, symbol:true} and satisfiedCount===4; an all-lowercase 10-char string sets only {length:true, lower:true} true; each of the 5 flags is asserted true in at least one case and false in at least one case (length via short input, lower/upper/digit/symbol each isolated). (e) PURITY — calling scorePassword twice with the same value returns deeply-equal results and never mutates the input; the returned rules object for distinct calls is not the same reference (no shared mutable state). (f) classCount===4 but length 8..11 yields 'fair' (Strong requires the length-12 gate AND 4 classes jointly).
- **dod:** score.js exports scorePassword as a pure ES module (no import of DOM/fetch/console/storage; no top-level side effects). `node --test score.test.js` exits 0 with every band (neutral/weak/fair/strong), both the length-8 and length-12 thresholds, and all 5 rule flags (each toggled true and false) covered. Satisfies acceptance #5 (Password1! is fair) and is the substrate for #6 and #11; underpins #2/#3/#4 band logic.

### Unit U2: scorePassword node --test suite — full band/threshold/flag coverage gate

- **id:** U2 · **depends-on:** [U1]
- **complexity:** mechanical
- **files:** modify `score.test.js` · test `score.test.js`
- **interfaces:**
  - consumes: scorePassword from ./score.js (imported via ESM `import { scorePassword } from './score.js'`)
  - produces: A complete node:test suite (test() + node:assert/strict) that is the executable acceptance gate for the scorer; exit code 0 on green. No production code.
- **tests (red→green):** This unit IS the test artifact; its red->green contract is coverage completeness, asserted by inspection of the suite plus `node --test` passing. Required, named test cases beyond U1's core set: explicit boundary table covering each band at least once; an explicit case asserting scorePassword('Password1!').band==='fair' (acceptance #5 verbatim); explicit length-8 boundary pair (7 vs 8 chars) and length-12 boundary pair (11 vs 12 chars) so both thresholds are observable; a per-flag matrix asserting rules.length/lower/upper/digit/symbol independently. The suite must import the scorer via the same sibling-relative './score.js' specifier the browser uses (no path rewrite), proving the module is dual-consumable by node and the browser.
- **dod:** `node --test` over score.test.js exits 0 and the suite demonstrably covers every band boundary, both length thresholds, and all 5 rule flags. Directly satisfies acceptance #11 (scorePassword pure + node --test passes covering every band, both length thresholds, all 5 rule flags) and re-confirms #5.

### Unit U3: Accessible static page skeleton (index.html structure + inline style)

- **id:** U3 · **depends-on:** [] (root)
- **complexity:** design-judgment
- **files:** create `index.html`
- **interfaces:**
  - consumes: Static markup only (no JS yet). Stable element ids/classes that U4/U5 will target: input#pw, label[for=pw], the band text node, the strength-bar fill element, the 5-rule checklist with one stable hook per rule keyed length/lower/upper/digit/symbol, the live region, the disclaimer node.
  - produces: index.html: <!doctype html><html lang=en> with inline <style> using a system-font stack only (no @import, no web font, no external href/src except ./score.js loaded in U5). DOM contract: (1) visible <label for="pw"> bound to <input type="password" id="pw">; (2) a visible band text label node (initially empty/neutral); (3) a strength bar with a child fill element whose width/class will be driven by U4; (4) an unordered 5-item checklist, each item carrying a data attribute or class keyed to a rule name (length,lower,upper,digit,symbol) and human copy framed as 'satisfied rules' (e.g. 'At least 8 characters', 'Lowercase letter', ...); (5) a single live region: <p id="sr-status" role="status" aria-live="polite" aria-atomic="true"> empty on load; (6) a persistent visible disclaimer stating the meter checks composition only — not entropy, breach exposure, or guessability — whose copy contains neither the word 'secure' nor 'safe'. All asset paths sibling-relative.
- **tests (red→green):** Browser/DOM-level red->green contract (assertions only): document.querySelector('label[for=pw]') exists and document.getElementById('pw') exists with type==='password' (acceptance #7 — explicit label, no placeholder-as-label; assert input has no reliance on placeholder for labelling). A band text node exists alongside the bar (acceptance #7). The live region matches role==='status' (or aria-live==='polite') AND aria-atomic==='true' and is empty on initial load (acceptance #8, #1). Exactly 5 checklist items render, each addressable by rule key length/lower/upper/digit/symbol (acceptance #6 scaffolding). A persistent disclaimer node is present and document.body.textContent contains neither 'secure' nor 'safe' (case-insensitive) (acceptance #10). No <link>/<script src>/@import referencing any external/CDN/web-font origin; no root-relative ('/...') asset path anywhere (no-build/no-deps + relative-asset-paths-only floors).
- **dod:** index.html renders the full accessible skeleton with no JS behavior yet: labelled password input, band text label, strength bar, 5-rule checklist, polite atomic live region (empty), and a persistent composition-only disclaimer using neither 'secure' nor 'safe'. Inline style uses system fonts only with zero external/CDN/web-font references and only sibling-relative paths. Satisfies acceptance #7 and #10; provides the DOM contract consumed by U4/U5 and the empty-state half of #1 and #8.

### Unit U4: Declarative render adapter (band -> presentation) in index.html

- **id:** U4 · **depends-on:** [U1, U3]
- **complexity:** integration
- **files:** modify `index.html`
- **interfaces:**
  - consumes: A scorePassword result object { band, rules, satisfiedCount } (shape from U1) and the DOM hooks from U3.
  - produces: Inside index.html's <script type="module">: (1) a declarative lookup PRESENTATION = { neutral:{labelText:'', barClass:'band-neutral', widthPct:0, livePhrase:''}, weak:{labelText:'Weak', barClass:'band-weak', widthPct:33, livePhrase:'Password strength: Weak'}, fair:{labelText:'Fair', barClass:'band-fair', widthPct:66, livePhrase:'Password strength: Fair'}, strong:{labelText:'Strong', barClass:'band-strong', widthPct:100, livePhrase:'Password strength: Strong'} } — retuning a band is a one-line edit; (2) a pure render(result) function that sets the band text label = PRESENTATION[band].labelText, sets the bar fill class + width, and toggles each of the 5 checklist items' satisfied/unsatisfied state from result.rules[key] (length/lower/upper/digit/symbol). render MUST NOT read or write the input value, MUST NOT touch the live region (that is U5's debounced concern), and MUST NOT log/transmit/store anything.
- **tests (red→green):** Browser/DOM red->green contract (assertions only): calling render(scorePassword('')) yields band text label empty and bar width 0 / neutral class (acceptance #1 visual reset). render(scorePassword('Ab1!')) sets band text label textContent==='Weak' (acceptance #2). render(scorePassword('abcdefg8')) and render(scorePassword('Password1!')) both set label==='Fair' (acceptance #3). render(scorePassword('MyDogR3x!2024')) sets label==='Strong' (acceptance #4). render(scorePassword('aB3$')) toggles lowercase+uppercase+digit+symbol checklist items to satisfied and the length item to unsatisfied, exactly matching scorePassword('aB3$').rules (acceptance #6). The band is reflected in BOTH the text label and a bar color class for every non-neutral band (acceptance #7 — color never sole signal). render never writes the password value into any element's textContent/attribute (assert no node textContent equals the input value).
- **dod:** A declarative band->presentation lookup plus a pure render(result) updates the band text label, bar color+width, and all 5 checklist item states to match a scorePassword result, conveying band by text AND color, without ever touching the input value, the live region, or any sink. Satisfies acceptance #2, #3, #4, #6, and the color+text half of #7; provides the visual-reset half of #1.

### Unit U5: Input wiring + debounced live-region announcement (index.html)

- **id:** U5 · **depends-on:** [U1, U3, U4]
- **complexity:** integration
- **files:** modify `index.html`
- **interfaces:**
  - consumes: input#pw 'input' events; scorePassword (imported via `import { scorePassword } from './score.js'` — sibling-relative); render(result) from U4; PRESENTATION[band].livePhrase from U4; the live region #sr-status from U3.
  - produces: A thin listener attached to input#pw: on each 'input' event it reads the current value, calls scorePassword(value), and synchronously calls render(result) (checklist + bar + label update per keystroke). It separately updates the live region #sr-status.textContent to PRESENTATION[band].livePhrase via a 200ms debounce (trailing) — the debounce applies ONLY to the live-region text, not to render. On empty value (value.length===0 / band==='neutral') it resets: render shows neutral (bar 0, label empty) AND the live region is cleared to '' (canceling any pending debounced announcement so no stale 'Strong' is announced). The live region only ever receives the band phrase string from PRESENTATION — never the value or any rule text containing the value. No fetch/XHR/console.*/localStorage/sessionStorage anywhere in the script.
- **tests (red→green):** Browser red->green contract (assertions only): typing into #pw then clearing it leaves #sr-status.textContent === '' and the bar reset to neutral/empty, with no residual 'Strong' announced (acceptance #1 — no stale Strong). After typing a strong password and waiting past the 200ms debounce, #sr-status.textContent === 'Password strength: Strong' and never equals the typed value (acceptance #8). Per keystroke, the 5 checklist items reflect scorePassword(currentValue).rules without waiting on the debounce (acceptance #6 — checklist is live, not debounced). The live region uses role=status/aria-live=polite + aria-atomic (re-assert against U3) (acceptance #8). Static-source assertion on the inline <script>: it contains no fetch/XMLHttpRequest/console./localStorage/sessionStorage tokens and never assigns the input value to the live region or any readable attribute (acceptance #9 scaffolding, fully gated in U6).
- **dod:** Live wiring updates the checklist/bar/label on every keystroke and announces only the band phrase through the polite atomic live region on a 200ms trailing debounce, clears to Neutral (empty bar + empty live region, pending announcement canceled) on empty input, and the password value never enters the live region or any readable attribute. Satisfies acceptance #1 (no stale Strong), #6 (live checklist), and #8 (accessible announcement, value never leaked); contributes to #9.

### Unit U6: Zero-exfiltration static-source guard (score.js + index.html)

- **id:** U6 · **depends-on:** [U1, U5]
- **complexity:** mechanical
- **files:** test `score.test.js`
- **interfaces:**
  - consumes: The on-disk source text of score.js and index.html (read as strings).
  - produces: A node --test guard case (added to score.test.js) that reads score.js (and, where the runner can read it, index.html) and asserts the absence of exfiltration/dependency tokens. This is a source-level invariant gate, not runtime behavior.
- **tests (red→green):** node --test red->green contract (assertions only): the source of score.js contains none of: 'fetch', 'XMLHttpRequest', 'console.', 'localStorage', 'sessionStorage', 'import(' (dynamic), or any 'http://'/'https://' URL — confirming the pure scorer cannot reach a network/log/storage sink (acceptance #9). The source of index.html contains no '<script src=' or '<link ' referencing any external/CDN/web-font origin, no '@import url(', and no root-relative asset path (regex for src="/ or href="/ ) — confirming no-build/no-deps + relative-asset-paths-only. Assert the only script reference resolves to './score.js'. (If the harness scopes the test to score.js only, the index.html assertions are duplicated as a browser-instrument check in VERIFY; the score.js token-absence assertion is the authoritative node gate for acceptance #9.)
- **dod:** A node --test guard proves score.js source contains no fetch/XHR/console/localStorage/sessionStorage/network tokens, and index.html references only ./score.js with no external/CDN/web-font/root-relative assets. Directly satisfies acceptance #9 (zero exfiltration) at the source level and re-locks the no-build/no-deps and relative-asset-paths-only floors.

### Unit U7: Static-deploy readiness verification (root placement + pages.yml compatibility)

- **id:** U7 · **depends-on:** [U2, U3, U4, U5, U6]
- **complexity:** mechanical
- **files:** —
- **interfaces:**
  - consumes: Repo-root file layout (index.html, score.js at /Users/apurvbazari/Desktop/projects/matali-tests/full-pipeline-dogfood/) and the existing .github/workflows/pages.yml (upload path '.', ref main).
  - produces: A verification checklist (no new files, no pages.yml edit — editing pages.yml is ask-first per spec boundaries): confirm index.html and score.js sit at repo root so `actions/upload-pages-artifact path: '.'` publishes them; confirm index.html loads ./score.js as type=module with a sibling-relative specifier that resolves under the /matali-fullpipeline-dogfood/ project subpath; confirm a local static server (e.g. python3 -m http.server) serves the page with the scorer module loading and the meter functioning end-to-end.
- **tests (red→green):** Integration red->green contract (assertions only): index.html and score.js exist at the repo root (not nested) so the pages.yml '.' upload includes them. Served over a static origin under a /subpath/ prefix, the `<script type=module src/import ./score.js>` resolves (no 404, no root-relative '/score.js'). End-to-end smoke against the served page: type 'MyDogR3x!2024' -> label 'Strong' + live region 'Password strength: Strong'; clear -> Neutral + empty live region. pages.yml is unmodified (its mtime/content unchanged from baseline).
- **dod:** index.html and score.js are at repo root and load correctly under a project subpath via sibling-relative module import; the existing pages.yml deploys the page unmodified; an end-to-end static-server smoke confirms scoring, rendering, announcement, and Neutral reset all work in-browser. Confirms the 'deploys as a static page' requirement and the relative-asset-paths-only floor end-to-end; integrates all prior units.

## Acceptance Map

| Spec acceptance criterion | Build unit(s) |
|---|---|
| 1 Empty input is Neutral (bar reset, live region empty, no stale Strong) | U3, U4, U5 |
| 2 length<8 is Weak regardless of variety | U1, U4 |
| 3 length>=8 with 2-3 classes (or 8-11 with all 4) is Fair | U1, U4 |
| 4 length>=12 with all 4 classes is Strong | U1, U4 |
| 5 Password1! is Fair not Strong (length-12 gate; scorePassword('Password1!').band==='fair') | U1, U2 |
| 6 Live 5-rule checklist toggles per keystroke matching scorePassword(...).rules | U1, U3, U4, U5 |
| 7 Color never sole signal; explicit <label for> bound to input id | U3, U4 |
| 8 role=status/aria-live=polite aria-atomic region announces only band label, never the password value | U3, U5 |
| 9 Zero exfiltration: no fetch/XHR/console/localStorage of the value | U1, U5, U6 |
| 10 Persistent composition-only disclaimer; copy never uses 'secure'/'safe' | U3 |
| 11 scorePassword pure + node --test passes covering every band, both length thresholds, all 5 rule flags | U1, U2 |

## Risks & Rollback

- **Composition-only ceiling (accepted, disclosed):** `Password1!` (9 chars, 4 classes) → Fair via the length-12 gate; `correcthorsebatterystaple` → Weak (no upper/digit/symbol). Inherent to composition scoring; surfaced in the persistent disclaimer per the `no-security-guarantee-claim` floor — not a defect.
- **Subpath 404 risk:** a root-relative asset would 404 under `/matali-fullpipeline-dogfood/`; mitigated by sibling-relative `./score.js` (U3/U4) and verified by U7.
- **Live-region over-announcing:** fast typists; mitigated by the 200 ms trailing debounce on the live-region text only (U5) — visual bar/checklist stay instant.
- **Stale announcement:** clearing the field must not leave a stale "Strong"; U5 resets to Neutral.
- **Rollback:** every unit is additive (a new file or an additive edit to `index.html`); `git revert --no-edit HEAD && git push` is atomic with no orphaned assets; deploy re-triggers via `workflow_dispatch` on `pages.yml`. Per-unit recovery: U1/U2 revert the module+tests; U3–U5 revert the `index.html` edit; U6/U7 are read-only guards (no production code to roll back).

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
