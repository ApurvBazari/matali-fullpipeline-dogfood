# Password-Strength Meter — PLAN

## Context

Pure greenfield repo: no source files exist yet — only matali pipeline state, a README, the GitHub Pages workflow (`.github/workflows/pages.yml`, `upload-pages-artifact@v3` with `path: "."`, `workflow_dispatch` only), and the R0/P1 artifacts. `testRunner` is `unknown` and there is no test framework, so the human-approved spec deliberately trades importable/unit-testable logic for the single-file deployment guarantee. Every build unit therefore carries a **behavioral** red→green contract (static grep + headless-browser DOM assertions), matching the `verify:` instrument hints already embedded in the spec's acceptance criteria — VERIFY (P4) owns the running-app checks.

Project-wide constraints copied from the spec: one self-contained `index.html` at the repo root (inline `<style>`+`<script>`, zero deps, no build, no sibling files); gate-then-count scoring (length≥8 hard gate → Weak; then Fair at 3–4 of 5 rules, Strong at all 5; bar 33/66/100%); special-char regex `/[^A-Za-z0-9]/` labelled "special character"; `aria-live="polite"` `aria-atomic="true"` region primed with a single space and written only on tier change with the tier string alone; descriptive non-congratulatory copy; `.github/workflows/pages.yml` is not modified (deploy stays manual).

## Approach

Build the entire feature as ONE self-contained file: /Users/apurvbazari/Desktop/projects/matali-tests/full-pipeline-dogfood/index.html (inline <style> + inline <script>, zero deps, no build, no sibling files), exactly as the human-approved spec locks. Because the spec deliberately trades away importable/unit-testable logic for the single-file deployment guarantee (no relative-path failure on file:// or the GitHub Pages project-site URL), the test CONTRACT for every unit is behavioral, not node --test: a VERIFY harness (a) statically greps the file (no fetch/XHR/beacon/CDN/sibling refs; presence of required ARIA attributes), and (b) loads the file in a headless browser, dispatches synthetic 'input' events on the password field, then asserts DOM text/glyphs, bar fill width, computed styles, the live-region textContent, and a clean console. This matches the verify.instrument hints already embedded in the spec's acceptance criteria (browser / static+browser).

Decomposition strategy: although there is one physical file, the work splits into six dependency-ordered slices, each an independently red->green-verifiable vertical: (U1) static accessible scaffold incl. the primed live region and disclaimer; (U2) inline CSS for AA-contrast tiers, bar fill, and the prefers-reduced-motion guard; (U3) the inline gate-then-count scoring + five-rule predicates (incl. the broad /[^A-Za-z0-9]/ special-char rule); (U4) the single 'input' listener that re-evaluates all five rules per keystroke and paints the checklist glyph+text, bar width, and visible tier label; (U5) the tier-change-only aria-live update carrying ONLY the tier string; (U6) the integration/no-network seal verifying file:// + Pages parity with no console errors. Each unit edits the same index.html but adds a distinct, separately-assertable surface, so the contracts never overlap. Locked decisions honored verbatim: gate-then-count (length>=8 hard gate -> Weak until met; then Fair at 3-4 of 5, Strong at 5; bar 33/66/100%), special-char regex /[^A-Za-z0-9]/ with UI label 'special character', aria-live='polite' + aria-atomic='true' primed with a single space and written only on tier change, descriptive non-congratulatory copy, no edit to .github/workflows/pages.yml (deploy stays manual workflow_dispatch).

Data flow: keystroke -> 'input' event -> evaluate(value) returns {rules:{length,lower,upper,digit,special}, passCount, tier} -> render() writes per-rule <li> glyph+text + aria-state text, sets bar fill width% + tier color class, sets visible tier label text -> if tier !== lastTier, write tier string into the aria-live region and update lastTier. No value ever leaves the page; the live region never receives password-derived text.

Build sequence checklist: [ ] U1 scaffold+primed-live-region+disclaimer -> [ ] U2 CSS tiers+reduced-motion -> [ ] U3 scoring predicates+gate-then-count -> [ ] U4 input listener wiring (checklist/bar/label) -> [ ] U5 live-region tier-change-only update -> [ ] U6 no-network + console-clean + file://&Pages parity seal.

## Build Units

The single physical file decomposes into six dependency-ordered, independently red→green-verifiable vertical slices. Each edits the same `index.html` but adds a distinct, separately-assertable surface, so the contracts never overlap.

### Unit 1: Accessible static HTML scaffold: labelled input, checklist, bar, tier label, primed live region, disclaimer

- **id:** `U1-scaffold` · **depends-on:** []
- **complexity:** mechanical
- **files:** create=['index.html'] · modify=[] · test=['(behavioral — no test file; VERIFY harness greps + DOM-loads /Users/apurvbazari/Desktop/projects/matali-tests/full-pipeline-dogfood/index.html)']
- **interfaces:**
  - consumes: none (greenfield root file)
  - produces: Stable DOM contract for downstream units: <label for="pw">…</label><input id="pw" type="password">; checklist <ul id="rules"> with five <li> each having a glyph <span class="glyph" aria-hidden="true"> and a status text node, carrying data-rule attributes data-rule in {length,lower,upper,digit,special}; bar track <div class="bar"><div id="bar-fill" class="bar-fill"></div></div>; visible tier label <span id="tier-label"></span>; live region <p id="live" aria-live="polite" aria-atomic="true"> </p> (textContent is a single U+0020 space in initial HTML); disclaimer element with id="disclaimer". <!DOCTYPE html>, <html lang="en">, <meta charset>, <meta name=viewport>, <title>.
- **tests (red→green contract):** RED before file exists / GREEN after scaffold. Static: file /Users/apurvbazari/.../index.html exists at repo root and begins with <!DOCTYPE html>; contains no sibling <link rel=stylesheet>/<script src=…> (zero external refs). DOM (loaded in browser, no JS interaction needed): (a) exactly one <input type="password"> whose id is the target of a <label for=…> — assert the input has a non-empty accessible name via the for/id pairing; (b) a checklist container with exactly five rule items, each exposing data-rule in the set {length,lower,upper,digit,special} (one each, no dupes) and each containing both a glyph span and visible text; (c) a bar track containing a child with id="bar-fill"; (d) a visible tier-label element id="tier-label" present; (e) a live-region element id="live" present AT LOAD with aria-live="polite" and aria-atomic="true" and textContent exactly one space " " (length 1, charCode 32) — NOT empty, NOT injected by script; (f) a disclaimer element id="disclaimer" whose text contains both the idea 'educational'/'guidance' AND 'not a security guarantee' (case-insensitive substring match). The special-char rule item's visible label text reads 'special character' (not 'symbol').
- **dod:** index.html exists at repo root, validates as HTML, and the six required nodes (labelled password input, 5-item checklist with data-rule glyph+text, bar-fill, tier-label, primed aria-live='polite' aria-atomic='true' region holding a single space, disclaimer) are all present at load with zero external asset references. Satisfies AC1 (labelled input), AC5-presence (live region present+primed in INITIAL HTML), AC9 (standing disclaimer), and the structural half of AC2 (glyph+text checklist nodes exist).

### Unit 2: Inline CSS: AA-contrast tier colors, bar fill geometry, prefers-reduced-motion guard

- **id:** `U2-style` · **depends-on:** ['U1-scaffold']
- **complexity:** design-judgment
- **files:** create=[] · modify=['index.html'] · test=['(behavioral — computed-style assertions + media-query emulation in browser harness)']
- **interfaces:**
  - consumes: DOM hooks from U1: #bar-fill, #tier-label, and tier state classes applied to a known element (tier classes 'tier-weak'|'tier-fair'|'tier-strong' on the meter root or #tier-label).
  - produces: Inline <style> in <head> defining: .bar-fill { width:0; transition: width .3s ease } and tier color tokens (weak red, fair amber, strong green) chosen to meet >=4.5:1 against the page background for the #tier-label TEXT; a @media (prefers-reduced-motion: reduce){ .bar-fill { transition: none } } guard. Bar-fill width is style-driven (set later by U4).
- **tests (red→green contract):** RED before <style> exists / GREEN after. Computed style (browser): (a) for each tier class applied to #tier-label in turn (tier-weak/tier-fair/tier-strong), the resolved label text color vs. the resolved page/background color yields a WCAG contrast ratio >= 4.5:1 — compute ratio from getComputedStyle and assert >=4.5 for all three tiers (amber is the trap: assert the chosen amber is a darkened value, not #f39c12-class which fails). (b) Default/normal motion: #bar-fill has a non-zero transition-duration on the width property (e.g., > 0ms) — confirming an animation exists to suppress. (c) Reduced-motion: under emulated prefers-reduced-motion: reduce, #bar-fill computed transition-duration is 0s (or <= 0.01ms) — the bar snaps, does not animate. (d) Color is never the SOLE differentiator: assert the tier-label still carries text (cross-check with U4) and checklist glyphs exist (from U1) so the suite proves non-color signals coexist.
- **dod:** All three tier label colors pass WCAG AA (>=4.5:1) against the page background, a width transition exists under normal motion, and that transition is suppressed (duration 0) under @media (prefers-reduced-motion: reduce). Satisfies AC8 (AA contrast + reduced-motion suppression) and reinforces the not-color-alone basis of AC2/AC4.

### Unit 3: Inline scoring: five-rule predicates + gate-then-count tier mapping + special-char /[^A-Za-z0-9]/

- **id:** `U3-scoring` · **depends-on:** ['U1-scaffold']
- **complexity:** design-judgment
- **files:** create=[] · modify=['index.html'] · test=['(behavioral — driven through the input field; logic is inline/non-importable per spec, so verified via observable DOM outcomes once U4 wires it, AND via a temporary harness that calls window-exposed evaluate during VERIFY only if exposed; primary contract is behavioral)']
- **interfaces:**
  - consumes: none (pure inline function over the input string).
  - produces: Inline pure logic inside <script>: a function evaluate(value) -> { rules: { length:boolean, lower:boolean, upper:boolean, digit:boolean, special:boolean }, passCount:number(0..5), tier: 'Weak'|'Fair'|'Strong' }. Rule predicates: length = value.length >= 8; lower = /[a-z]/.test(value); upper = /[A-Z]/.test(value); digit = /[0-9]/.test(value); special = /[^A-Za-z0-9]/.test(value) (broad non-alphanumeric; a source comment documents that accented chars/emoji count). Tier (GATE-THEN-COUNT): if !rules.length -> 'Weak' (regardless of passCount); else if passCount === 5 -> 'Strong'; else (passCount in 3..4 with length met) -> 'Fair'; else 'Weak'. tier->fill% mapping table: Weak=33, Fair=66, Strong=100.
- **tests (red→green contract):** RED before logic exists / GREEN after. Behavioral, driven by typing into #pw and observing rendered tier (this unit's correctness is OBSERVED via the criteria-4 outcomes once U4 lands; the contract here pins the truth table): (a) '' (empty) -> length fails -> tier Weak. (b) 'abc' -> length<8 -> Weak even though lowercase passes. (c) 'abcdefg1' (8 chars, lower+digit+length = 3 rules, NO upper, NO special) -> length gate met, passCount 3 -> Fair, and explicitly NOT Strong. (d) 'Abcdefg1' (length+lower+upper+digit = 4) -> Fair. (e) 'Abcdefg1!' (all 5) -> Strong. (f) 'Sh0rt!A' (7 chars but has lower/upper/digit/special) -> length gate FAILS -> Weak (proves gate dominates count). (g) special-char regex breadth: 'aaaaaaa é' contains a space and an accented char -> special === true; 'aaaaaa1A' -> special === false; assert /[^A-Za-z0-9]/ matches space, punctuation, accented letters, and emoji, and does NOT match plain a-zA-Z0-9. (h) fill-mapping: Weak->33, Fair->66, Strong->100 (asserted via U4's bar width).
- **dod:** evaluate() implements gate-then-count exactly (length<8 forces Weak; length>=8 with 3-4 rules = Fair, all 5 = Strong) and the special rule uses /[^A-Za-z0-9]/ with a documenting comment; the full truth table above resolves to the specified tiers and fill percentages. Satisfies AC3 (gate-then-count tiers) and AC6 (special-char regex).

### Unit 4: Single 'input' listener: per-keystroke synchronous render of checklist glyph+text, bar fill width, visible tier label

- **id:** `U4-wiring` · **depends-on:** ['U1-scaffold', 'U2-style', 'U3-scoring']
- **complexity:** integration
- **files:** create=[] · modify=['index.html'] · test=["(behavioral — dispatch synthetic 'input' events, assert DOM text/glyph/width/label)"]
- **interfaces:**
  - consumes: evaluate(value) from U3; DOM hooks from U1 (#pw, #rules + data-rule items, #bar-fill, #tier-label) and tier classes + width transition from U2.
  - produces: A single addEventListener('input', handler) on #pw that calls evaluate(#pw.value) then render(result): for each of the five rule <li>, set glyph to a pass/fail mark (e.g., U+2713 check / U+2717 cross) AND set per-item status TEXT (e.g., 'met'/'not met' in the visible or visually-hidden text) so pass/fail is conveyed by glyph+text, never color alone; set #bar-fill.style.width to the tier fill% (33/66/100); apply the matching tier color class (tier-weak/fair/strong); set #tier-label.textContent to the tier string ('Weak'|'Fair'|'Strong'). Evaluation is synchronous, one pass per keystroke, no debounce, no async.
- **tests (red→green contract):** RED before listener exists / GREEN after. Browser, dispatch input events on #pw: (a) type 'A' -> the lowercase rule item shows the FAIL glyph and fail status text while uppercase shows PASS glyph+text — proving per-rule glyph+text toggles live and independently. (b) Each rule item, across crafted inputs, flips its glyph AND its status text together (assert the textContent changes, not only a class/color) for all five rules. (c) type 'abc' -> #tier-label.textContent === 'Weak' AND #bar-fill width resolves to 33% of the track. (d) type 'abcdefg1' -> tier label text NOT 'Strong' (it is 'Fair') and width 66%. (e) type 'Abcdefg1!' -> #tier-label.textContent === 'Strong' AND width 100%. (f) the bar fill width% and the visible tier-label text always agree (no state where label says Strong but width!=100). (g) handler is synchronous: immediately after dispatching the event (no timers), the DOM already reflects the new state.
- **dod:** A single synchronous 'input' listener re-evaluates all five rules per keystroke and updates (a) each rule's glyph AND status text, (b) #bar-fill width to 33/66/100%, (c) #tier-label visible text — with width and label always consistent. Satisfies AC2 (live glyph+text checklist), AC4 (bar width reflects tier and matches visible label text), and renders AC3/AC6 observable end-to-end.

### Unit 5: Tier-change-only aria-live update carrying ONLY the tier label string

- **id:** `U5-liveregion` · **depends-on:** ['U4-wiring']
- **complexity:** integration
- **files:** create=[] · modify=['index.html'] · test=['(behavioral — dispatch input sequences, snapshot #live.textContent transitions)']
- **interfaces:**
  - consumes: result.tier from U3/U4; #live region from U1 (already aria-live=polite, aria-atomic=true, primed with a single space).
  - produces: A module-scoped lastTier variable (init undefined/null) and, inside render(), a guarded write: if (result.tier !== lastTier) { #live.textContent = result.tier; lastTier = result.tier; }. The region receives ONLY the bare tier string ('Weak'|'Fair'|'Strong') — never #pw.value, never any password-derived or concatenated text. No setTimeout/debounce. The region is never recreated/replaced (updated in place).
- **tests (red→green contract):** RED before guard exists / GREEN after. Browser: (a) at load (before any input) #live.textContent is exactly ' ' (single space) — re-confirms the primed-not-empty contract survives. (b) type a single char that keeps tier Weak -> #live still reflects Weak only after the FIRST transition from primed state; typing further Weak-keeping chars does NOT rewrite identical content (assert no redundant write by observing #live unchanged across keystrokes within the same tier — e.g., via MutationObserver count or value stability). (c) drive 'abc'(Weak)->'abcdefg1'(Fair)->'Abcdefg1!'(Strong): #live.textContent passes through 'Weak'->'Fair'->'Strong', updating only on the three tier boundaries, never per intermediate keystroke. (d) at every observed moment #live.textContent is a member of {' ','Weak','Fair','Strong'} and NEVER contains any substring of the typed password (assert no password-derived text ever appears — e.g., type 'Zzz!9aaa' and confirm #live never contains 'Z','9','!', or the value). (e) the #live element identity is stable (same node reference) across updates (updated in place, not replaced).
- **dod:** The aria-live region updates ONLY on tier change, in place, with ONLY the tier string, and never receives any password-derived text; it remains primed with a single space until the first tier resolves. Satisfies AC5 (live region present+primed, updates only tier label text on tier change, never password-derived text).

### Unit 6: No-network seal + console-clean load + file:// and Pages project-site parity

- **id:** `U6-noNetwork-seal` · **depends-on:** ['U1-scaffold', 'U2-style', 'U3-scoring', 'U4-wiring', 'U5-liveregion']
- **complexity:** integration
- **files:** create=[] · modify=['index.html'] · test=['(behavioral — static grep + dual-origin browser load with network + console monitoring; pages.yml NOT modified)']
- **interfaces:**
  - consumes: the complete index.html from U1-U5.
  - produces: Final review pass guaranteeing zero network surface: no fetch(, no XMLHttpRequest/new XHR, no navigator.sendBeacon, no WebSocket/EventSource, no <img src> beacon, no <link>/<script src>/CDN tag, no external <iframe>/<base> pointing off-document, no localStorage/sessionStorage persistence of the value. Confirms .github/workflows/pages.yml is byte-for-byte unchanged (manual workflow_dispatch deploy preserved).
- **tests (red→green contract):** RED if any network/external surface present / GREEN when sealed. Static (grep over index.html): zero matches for /fetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /new\s+WebSocket/, /EventSource/, /<script[^>]+src=/, /<link[^>]+rel=[\"']?stylesheet/, /https?:\/\//, /<img[^>]+src=/, /localStorage|sessionStorage/ ; and confirm the file contains inline <style> and inline <script> only. Browser (load with a network interceptor): (a) loading index.html issues ZERO subresource/network requests beyond the document itself; (b) the page loads and a full interaction sequence (type 'Abcdefg1!') runs with an EMPTY console error/warning log (no uncaught exceptions, no 404s). Dual-origin parity: load via file:// AND via a simulated project-site base path (served under /repo-name/) — both render identically and error-free (no absolute-path/asset breakage), proving the single-file form is path-agnostic. Repo guard: git diff shows .github/workflows/pages.yml unchanged.
- **dod:** Static grep finds no fetch/XHR/beacon/WebSocket/external asset references; the page makes zero network requests and loads with no console errors on both file:// and a Pages-style project-site path; pages.yml is untouched. Satisfies AC7 (no network calls; works on file:// and Pages URL with no console errors) and locks the F1/F2/F5 floors and the no-CI-edit boundary.

## Acceptance Map

- **AC1: Root-level index.html renders a programmatically labelled native password input (label for/id).** → U1-scaffold
- **AC2: Typing updates a live checklist of the 5 rules, each pass/fail via glyph+text (not color alone).** → U1-scaffold, U4-wiring
- **AC3: Tier follows gate-then-count: length<8 => Weak; length>=8 with 3-4 rules => Fair, all 5 => Strong.** → U3-scoring, U4-wiring
- **AC4: Bar fill width reflects tier (33/66/100%) and visible tier label text matches.** → U3-scoring, U4-wiring
- **AC5: aria-live polite+atomic region present+primed in initial HTML, updates only tier label text on tier change, never password-derived text.** → U1-scaffold, U5-liveregion
- **AC6: Special-char rule matches /[^A-Za-z0-9]/.** → U3-scoring
- **AC7: No network calls (no fetch/XHR/beacon); works on file:// and Pages URL with no console errors.** → U6-noNetwork-seal
- **AC8: Tier label colors meet WCAG AA; bar transition suppressed under prefers-reduced-motion.** → U2-style
- **AC9: Visible standing disclaimer: educational guidance, not a security guarantee.** → U1-scaffold

## Risks & Rollback

**Risks**
- *Rule-based false confidence* (NDSS 2017 / USENIX 2023): a meter can label `P@ssw0rd` as Strong. Mitigated in U3 by the gate-then-count model + the standing educational disclaimer (U1); the meter is framed as guidance, never a guarantee.
- *WCAG AA amber trap* (U2): the obvious amber `#f39c12` fails text contrast (~2.4:1). U2's contract asserts a darkened amber ≥4.5:1 for all three tier labels.
- *Live-region failure modes* (U5): dynamic injection or per-keystroke chatter break screen-reader UX. Mitigated by priming the region in the initial DOM (U1) and writing only on tier change (U5), tier string only — never password-derived text.
- *file:// vs Pages path drift* (U6): a stray absolute/sibling reference breaks one context. The single-file form removes cross-file refs; U6 greps to seal it.

**Rollback**
- The entire feature is one new file (`index.html`); the nuclear rollback is `git rm index.html` (or `rm index.html`) — nothing else in the repo is touched.
- Per-unit: because every unit edits the same file additively, recover a failed unit by reverting the working tree to the last green unit (`git checkout -- index.html` against the last good commit, or discard the in-progress edit). No migrations, no external state, no infra to unwind.

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
