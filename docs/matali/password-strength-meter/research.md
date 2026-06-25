# Research — Build a password-strength meter as a single static web page (vanilla HTML/CSS/JS, no build step, no dependencies). As you type, it live-updates a strength bar (weak/fair/strong), a color-coded label, and a checklist of satisfied rules: length >= 8, lowercase, uppercase, digit, symbol. Accessible: labelled input plus an ARIA live region for the strength text. Deploys as a static page.

## Intent

Build a password-strength meter as a single static web page (vanilla HTML/CSS/JS, no build step, no dependencies). As you type, it live-updates a strength bar (weak/fair/strong), a color-coded label, and a checklist of satisfied rules: length >= 8, lowercase, uppercase, digit, symbol. Accessible: labelled input plus an ARIA live region for the strength text. Deploys as a static page.

## Summary
A password-strength meter as a single static web page (vanilla HTML/CSS/JS) is well-trodden territory with strongly converged patterns: a count-of-rules scoring model over five fixed rules (length >= 8, lowercase, uppercase, digit, symbol) mapped to a 3-tier weak/fair/strong bar, with the W3C WAI "Complete Password Example" serving as the canonical accessibility reference. The non-negotiable floors are architectural and accessibility-driven: zero runtime/build dependencies, the password never leaving the page (no fetch/XHR), an `aria-live="polite"` region present in the initial DOM, color never the sole signal for strength (text labels and checklist icons/glyphs required per WCAG 1.4.1), and static-file deployment that works on both `file://` and GitHub Pages project-site URLs (relative paths only). Open design choices that remain risks rather than floors include the exact tier cutoffs (pure rule-count vs. gate-then-count vs. length-aware), the precise symbol regex (`[^a-zA-Z0-9]` vs. an explicit ASCII set), and the live-region update strategy (debounce interval vs. tier-change-only). The central UX risk, flagged by NDSS 2017 and USENIX 2023 research, is that rule-based scoring catastrophically misclassifies passwords like `P@ssw0rd` as "strong" — so the meter must be framed as educational guidance, never a security guarantee, and the scoring formula (being client-side and visible) should not be presented as one.

## Prior Art
### Canonical ARIA Pattern

The W3C WAI "Complete Password Example" (https://www.w3.org/WAI/tutorials/forms/examples/password/) is the clearest reference implementation. Its structure is the baseline to follow: a `<label>` explicitly associated with the input, a visual `<span>` meter element, and a separate `<span id="passwordmessage" aria-live="polite">` that carries the strength text. The live region must be in the DOM before any updates are injected (otherwise some screen readers miss the first announcement). `aria-atomic="true"` is recommended so the whole strength label re-announces as a unit rather than piecemeal. `aria-live="polite"` is the consensus choice over `assertive` — polite queues the announcement until the user pauses typing, avoiding per-keystroke chatter. TetraLogical's diagnostic guide (https://tetralogical.com/blog/2024/05/01/why-are-my-live-regions-not-working/) confirms the most common failure mode: injecting content into a live region that did not yet exist in the DOM at page load. Sara Soueidan's two-part series on accessible notifications (https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/) adds the debounce/setTimeout pattern: clear the live region immediately on keydown, then write the strength text into it ~350–500 ms after the user stops typing. This collapses rapid-fire updates into a single announcement per perceived pause.

The Drupal core issue #521904 (https://www.drupal.org/project/drupal/issues/521904) documents the same pattern landing in a production CMS: it confirms that wrapping the strength text in a visually-hidden `<span>` inside the live region (distinct from the color-coded visual label) is the safest approach across NVDA/JAWS/VoiceOver.

### Checklist Accessibility

The Kiip/Medium article (https://medium.com/kiipco/password-creation-3-ways-to-make-it-accessible-bc8f2b53b7ee) documents the requirement to use `aria-describedby` to associate the requirements list with the input, and to give each rule item an `aria-label` (or visually-hidden text) that conveys pass/fail in words, not just via icon color. The `aria-live` region should announce a count ("3 of 5 requirements met") rather than the full checklist — re-reading every rule on each keystroke is the canonical screen-reader chatter problem.

### Scoring Tier Logic

No universal standard for tier cutoffs exists. The dev.to "Stunning Password Strength Analyzer" article (https://dev.to/learncomputer/create-a-stunning-password-strength-analyzer-with-real-time-feedback-1m99) uses a 5-rule model (length, uppercase, lowercase, digit, `/[^A-Za-z0-9]/` for symbols) where each rule contributes 20 points, with weak < 40, fair 40–59, strong ≥ 80. The ui-patterns.com Password Strength Meter entry (https://ui-patterns.com/patterns/PasswordStrengthMeter) documents the dominant visual metaphor: a horizontal bar filling left-to-right, color-shifted from red → amber → green. A practical 3-tier mapping for 5 rules: 0–1 rules → weak, 2–3 → fair, 4–5 → strong. Length-aware variants grant extra weight when `length >= 12` to push users past "fair" without all character classes.

### Symbol Definition

The near-universal regex is `/[^A-Za-z0-9]/` (any non-alphanumeric). This catches `!@#$%^&*()_+-=[]{}|;':"./<>?` and also emoji or accented characters — intentionally broad. If narrower coverage is desired, OWASP (https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) suggests an explicit set: `!"#$%&'()*+,-./:;<=>?@[\]^_{|}~` (printable ASCII non-alphanumeric). For this project's rule-based (non-entropy) model, `/[^A-Za-z0-9]/` is the pragmatic choice — it is self-explanatory, contains no Unicode surprises in evergreen JS, and can be documented in the UI as "special character."

### WCAG 1.4.1 — Color Not Sole Signal

WCAG SC 1.4.1 (Level A) explicitly requires that color not be the only visual means of conveying information (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). For a strength bar this means: the text label ("Weak / Fair / Strong") must always be visible alongside the color fill, and the rule checklist must use icons or text ("✓ / ✗") not only green/red fills. Roughly 1-in-12 men have color vision deficiency; red/green alone fails them. PatternFly's component (https://www.patternfly.org/components/password-strength/design-guidelines/) uses a combination of bar fill width, label text, and icon state — all three change simultaneously so no single channel carries the full message.

### Reduced-Motion

The strength bar's width transition must be gated on `@media (prefers-reduced-motion: reduce)`. The canonical approach (MDN, CSS-Tricks: https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/) is to set `transition-duration: 0.01ms` inside the media query so the bar snaps instantly rather than animating. WCAG 2.1 SC 2.3.3 (AAA) covers animation from interactions; while AAA, the reduced-motion query is a trivial one-liner and should be treated as a non-negotiable floor for any new UI.

### NIST Posture

NIST SP 800-63B Rev. 4 (https://pages.nist.gov/800-63-4/sp800-63b/passwords/) explicitly discourages composition rules as a primary defense, noting they produce predictable patterns ("Password1!"). However, for a demonstration/educational strength meter — not an authentication verifier — rule-based scoring is still the correct implementation target since it teaches users what makes passwords complex. The spec does endorse strength meters as user guidance ("verifiers should offer guidance … such as a password-strength meter"). Length is flagged as the primary strength driver; the 8-character floor is a hard minimum and ≥12 is encouraged.

### Non-Disarmable Floors

Based on prior art, the following constraints are unambiguous:

- **No dependencies, no build step** — zero third-party JS; the W3C example and every vanilla reference confirm this is achievable in < 100 lines.
- **Password never leaves the page** — all evaluation is synchronous in-browser; no `fetch` or `XHR`.
- **`aria-live="polite"` region present in initial HTML load** — not injected dynamically.
- **Color is not the sole signal** — text label + icon/text checklist required alongside color fill.
- **Deploys as static files** — relative asset paths, no server logic, `file://` compatible.

## Existing Implementations
### Reference Implementations in the Wild

The landscape of vanilla, no-dependency password-strength meters is well-trodden and the patterns have converged around a small set of decisions.

**Scoring model — count-of-rules → 3 tiers.** The dominant pattern across open-source examples is a simple integer score: one point per satisfied rule, then a threshold map. The Medium tutorial by Ali Aslam ([source](https://medium.com/@a1guy/validate-password-strength-live-beginner-friendly-javascript-tutorial-436e29368030)) is the closest match to this spec: it evaluates the same five rules (length ≥ 8, lowercase, uppercase, digit, symbol) and maps them as **< 3 rules → Weak / 3–4 rules → Moderate / all 5 → Strong**. The GeeksforGeeks walkthrough ([source](https://www.geeksforgeeks.org/javascript/create-a-password-strength-checker-using-html-css-and-javascript/)) uses a 0–4 point scale with five visual tiers (two shades of green/red plus yellow), which is one tier more granular than the target spec but confirms the rule-counting approach is canonical. CSS-Tricks ([source](https://css-tricks.com/password-strength-meter/)) is the outlier — it leans on zxcvbn for scoring, which is explicitly out of scope here.

**Symbol regex — two schools.** Most no-dependency implementations use one of two approaches: `/[^a-zA-Z0-9]/` (anything that is not alphanumeric — broader, catches Unicode punctuation, accented chars, emoji) or the explicit enumeration `/[!@#$%^&*]/` used in the Medium tutorial. For this spec the broader class `/[^a-zA-Z0-9]/` is the safer default: it avoids a bespoke allow-list and correctly handles common keyboard symbols without ambiguity, though it would also count emoji — a minor and acceptable edge case noted below.

**Live update wiring.** All surveyed examples attach a single `input` event listener on the password field and re-evaluate synchronously on every keystroke. No debouncing is used for the logic itself; debouncing is only relevant for the ARIA announcement (see Accessibility below).

**Checklist HTML pattern.** The standard structure across GitHub repositories ([jagathishwaran](https://github.com/jagathishwaran/Password-Strength-Checker), [lubosdz](https://github.com/lubosdz/simple-js-password-checker)) is a `<ul>` with one `<li>` per rule, toggling a CSS class (e.g., `.valid` / `.invalid`) on each item on every keystroke. Icon swaps (✅/❌ or a checkmark SVG) provide non-color cues per WCAG 1.4.1. The CSS Script roundup ([source](https://www.cssscript.com/password-strength-checker/)) confirms this is the prevalent pattern.

**Strength bar.** Two valid HTML semantics appear: (a) a `<div>` with a width percentage controlled by JS class or inline style, or (b) the native `<meter>` element (advocated by CSS-Tricks for semantic correctness). The `<meter>` approach gives built-in browser rendering of a bar but has inconsistent cross-browser styling; the `<div>`/`<span>` approach is more style-controllable and universally used in from-scratch implementations.

### Accessibility Patterns

The W3C WAI forms tutorial ([source](https://www.w3.org/WAI/tutorials/forms/examples/password/)) is the canonical reference. Its key decisions:

- `<label for="password">` — programmatic association, mandatory.
- A dedicated `<span aria-live="polite" id="passwordmessage">` updated with the strength text string on each evaluation. `polite` (not `assertive`) is correct: assertive would interrupt the user mid-keystroke on every character.
- Text labels ("Really Weak", "Weak", "Good", "Strong") serve as the non-color signal, satisfying WCAG 1.4.1. Color reinforces but does not carry meaning alone.
- The W3C example does *not* handle debouncing of the live region; for a chatty live region, a common refinement is to update the `aria-live` span only when the tier *changes* (not on every keystroke), avoiding per-character screen-reader chatter.

A CodePen by Tarah-S ([source](https://codepen.io/Tarah-S/pen/EjRLPR)) extends this with `aria-describedby` pointing the input at the checklist container, so AT users also receive the per-rule breakdown. The PrimeVue issue tracker ([source](https://github.com/primefaces/primevue/issues/7544)) documents the failure mode: using `aria-haspopup` + `aria-controls` on a password strength panel is incorrect ARIA; `aria-live` on the result region is the right primitive.

For the checklist items themselves: toggling `aria-checked` or using `role="checkbox"` is over-engineering for a static feedback list. The accessible pattern is to include visually-hidden text ("satisfied" / "not yet satisfied") alongside the icon, or to rely on the live region re-reading the count of passing rules.

### Key Open Questions Resolved by Prior Art

- **Tier cutoffs:** `< 3 rules → weak`, `3–4 → fair`, `5 → strong` is the most common split for a 5-rule, 3-tier system. An alternative is length-aware: treat length ≥ 12 as a bonus point, so a long-but-simple password can still reach "fair". Most simple implementations skip this; it is an optional refinement.
- **Symbol definition:** `/[^a-zA-Z0-9]/` is preferred. Emoji and accented characters will match — this is acceptable (they are genuinely uncommon chars) and avoids under-counting.
- **ARIA live debouncing:** Update the live region text only on tier change, not every keystroke, to prevent per-character announcements. Store the last-announced tier and skip the DOM write when it has not changed.
- **Reduced motion:** Any CSS transition on the bar width should be wrapped in `@media (prefers-reduced-motion: reduce) { transition: none; }`.
- **Color palette (WCAG 1.4.3 AA contrast on the label text):** Red `#D73502` / Amber `#E6890A` / Green `#2E7D32` on white all clear 4.5:1. The bar fill itself need not meet text contrast ratios but should differ enough from the background to be visible; a dark-background track solves this.

### Non-Disarmable Floors (confirmed by prior art consensus)

1. Zero runtime or build-time dependencies — all surveyed vanilla implementations confirm this is straightforwardly achievable.
2. Password never leaves the page — all client-side regex evaluation, no XHR/fetch calls anywhere in the pattern.
3. Color is never the sole signal — text label + checklist icons are required alongside the colored bar.
4. `aria-live="polite"` region must be present and contain the strength tier text.
5. Static-file deployment — no server logic; relative asset paths or single-file inline CSS/JS work on `file://` and GitHub Pages alike.

## Constraints & Floors
### Deployment floor: truly zero-dependency static files

The page must work when loaded from `file://` or any static host. GitHub Pages project sites serve under `username.github.io/repo-name/`, so asset paths must be relative (no leading slash) or anchored via an HTML `<base>` tag — never root-relative absolute paths. A self-contained single HTML file sidesteps all path issues entirely. No bundler, no npm install, no CDN script tag (that would introduce a runtime dependency). All logic lives in inline `<script>` and `<style>` blocks or in sibling `.js`/`.css` files referenced with bare relative paths. [GitHub Pages relative paths guide](https://www.codestudy.net/blog/github-pages-and-relative-paths/) | [Static site deploy walkthrough](https://docs.bswen.com/blog/2026-03-26-how-to-deploy-static-site-github-pages/)

### Strength scoring: rule-count model with a concrete cutoff

With five fixed rules (length ≥ 8, lowercase, uppercase, digit, symbol), the simplest defensible mapping is:

- 0–2 rules passed → **Weak** (red)
- 3–4 rules passed → **Fair** (amber)
- 5 rules passed → **Strong** (green)

Variants in the wild sometimes require length ≥ 12 before awarding the top tier, or weight length more heavily. For this scope the 0-2/3-4/5 split is the conventional floor — it requires all five rules simultaneously for "Strong", which naturally enforces meaningful passwords without zxcvbn entropy math. The bar should fill to 33 % / 66 % / 100 % correspondingly. [check-password-strength npm scoring model](https://www.npmjs.com/package/check-password-strength) | [Vanilla JS strength examples](https://www.jqueryscript.net/blog/best-password-strength-checker.html)

### Symbol definition and Unicode handling

"Symbol" is safest defined as any character that is not a letter (a-z, A-Z), not a digit (0-9), and not whitespace. Two implementation options:

1. **ASCII-safe regex** (widest browser compatibility, unambiguous): `/[^a-zA-Z0-9\s]/` — matches any non-alphanumeric, non-space character, including punctuation and symbols from the printable ASCII range.
2. **Unicode property escape** (ES2018+, `u` flag): `/[^\p{L}\p{N}\s]/u` — correctly handles accented letters (é, ñ) as letters rather than symbols. Safe in all evergreen browsers; `\p{}` is not supported in IE.

Emoji and combining characters are an edge case: the ASCII-safe regex would count an emoji as a symbol, which is probably acceptable behavior for this scope. The spec should document the chosen regex class so the checklist label ("contains symbol") matches user expectation. [Unicode property escapes guide](https://symbolfyi.com/guides/unicode-regex-guide/) | [Password regex reference](https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s19.html)

### ARIA live region: polite, atomic, no manual debounce needed

Use `aria-live="polite"` — never `assertive` for this use case. The W3C password example (`<span id="passwordmessage" aria-live="polite">`) confirms this. The `polite` setting queues announcements until the user pauses, which naturally prevents screen-reader chatter during rapid typing without requiring any `setTimeout` debounce in JS. Add `aria-atomic="true"` on the live region so the full strength label ("Strong") is announced as a unit rather than a diff fragment.

The live region element must exist in the DOM at page load (not injected dynamically), contain the strength text as plain text content (not only CSS-class-driven), and be updated in place rather than replaced. When the field is empty, set the region content to a single space rather than empty string to avoid some screen-reader implementations silently ignoring the node. [MDN ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) | [W3C password form example](https://www.w3.org/WAI/tutorials/forms/examples/password/) | [Sara Soueidan — accessible notifications](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/)

### Checklist accessibility: not color-only, not aria-live

The per-rule checklist must not convey pass/fail through color alone (WCAG 1.4.1). Use a visible text indicator per item — a "✓" / "✗" character or text "met"/"not met" — plus `aria-label` or visually-hidden text if the visible indicator is a bare glyph. Do **not** put the checklist items inside the live region; they would cause excessive announcements on every keystroke. Instead, the checklist items can use `role="listitem"` with static rendering; the live region handles the summary strength announcement. [WCAG 1.4.1 Use of Color](https://webaim.org/articles/contrast/)

### Color palette: AA contrast floors

- **Weak (red)**: background bar color must achieve ≥ 4.5:1 against any overlaid text and ≥ 3:1 against the page background for UI component purposes. A safe choice: `#c0392b` on white = ~5.1:1.
- **Fair (amber)**: amber/yellow is the most dangerous tier for contrast — pure `#f39c12` on white is only ~2.4:1 and fails AA. Use a darker amber such as `#b7770d` (≈ 4.7:1 on white) for any text labels placed on or near it.
- **Strong (green)**: `#27ae60` on white = ~4.5:1, right at the AA floor; `#1e8449` is safer at ~5.9:1.
- Color is never the sole signal: the text label (Weak/Fair/Strong) plus the checklist are mandatory co-signals per WCAG 1.4.1. [WebAIM contrast guide](https://webaim.org/articles/contrast/) | [WCAG contrast ratios](https://www.accessibilitychecker.org/wcag-guides/ensure-the-contrast-between-foreground-and-background-colors-meets-wcag-2-aa-minimum-contrast-ratio-thresholds/)

### Input labeling and keyboard operability

The password `<input>` must have a programmatically associated `<label>` (via `for`/`id` pairing, not `placeholder` alone). No custom widgets are needed; native `<input type="password">` is keyboard-operable by default. If a show/hide toggle is added later it must be a `<button>` with an accessible name.

### Reduced motion

Any bar width transition (`transition: width 0.3s`) must be suppressed inside `@media (prefers-reduced-motion: reduce)` to avoid vestibular issues. This is a one-line CSS guard.

### Non-disarmable floors

1. Zero runtime dependencies — no CDN, no npm package loaded at runtime.
2. Password never leaves the page — no `fetch`, `XMLHttpRequest`, or `<img src>` beacon.
3. Color is not the sole signal for strength tier — text label and checklist are mandatory.
4. `aria-live="polite"` region present in DOM at load, updated in place.
5. All assets use relative paths; page works from `file://` and GitHub Pages project-site URL structure alike.

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

## Risks
### False Confidence From Rule-Based Scoring

The five-rule model (length, lowercase, uppercase, digit, symbol) is the exact pattern that academic literature identifies as prone to catastrophic misclassification. Research from NDSS 2017 and the USENIX Security 2023 "No Single Silver Bullet" study both document rule-based meters labelling substitution-pattern passwords like `P@ssw0rd` as "strong" while rating genuinely hard-to-guess random strings as "weak" because they lack a symbol or uppercase character. The meter built here will exhibit the same flaw by design — a user who sees "strong" after satisfying all five rules may stop there, even though a five-character password with all classes passes only on a generous length threshold. This is the central UX risk: the meter communicates confidence the algorithm does not earn. Mitigation within scope is to set the weak/fair/strong cutoffs conservatively (e.g., all five rules AND length ≥ 12 for "strong") and to word the label as descriptive rather than congratulatory ("fair" instead of "good").

A secondary concern surfaced by a 2025 arXiv paper ([arxiv.org/html/2505.08292v1](https://arxiv.org/html/2505.08292v1)): rule-based meters that ship a blocked-password list client-side expose that list to attackers, letting them build meter-aware guessing attacks that skip excluded passwords. This project carries no blocklist, so that specific vector does not apply — but it reinforces that client-side scoring logic is visible to adversaries; the scoring formula itself should never be presented as a security guarantee.

### ARIA Live Region: Chatter and Cross-Browser Fragility

Firing an `aria-live` update on every keystroke is the fastest path to screen-reader chatter: the strength label changes character-by-character and the reader queues or overwrites announcements continuously. The fix — `aria-live="polite"` plus a debounce (300–500 ms) so the region only updates after the user pauses — is well-understood but must be implemented deliberately. MDN and TPGI testing both confirm that `polite` causes the reader to wait until the user is idle, which is the correct behaviour here ([MDN aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live); [TPGI live region support](https://www.tpgi.com/screen-reader-support-aria-live-regions/)).

A second pitfall: TetraLogical's cross-browser testing ([tetralogical.com/blog/2024/05/01/why-are-my-live-regions-not-working/](https://tetralogical.com/blog/2024/05/01/why-are-my-live-regions-not-working/)) shows that pre-populated live regions are ignored by most screen reader / browser combinations — only changes to an already-rendered empty container trigger announcements. The live region element must exist in the DOM empty on page load; strength text is then injected via JS. Skipping this priming step is a common and silent failure.

### Screen-Reader Announcement of the Password Itself

The `aria-live` region must announce the *strength label* only — never the password value. Léonie Watson's analysis of the proposed ARIA `password` role ([tink.uk/proposed-aria-password-role/](https://tink.uk/proposed-aria-password-role/)) documents that character-echoing by screen readers is a real eavesdropping vector in shared spaces. The risk here is accidental: if the live region's `textContent` is set to anything derived from the password string (e.g., concatenating it with feedback), the reader will announce it. The region must contain only the tier label ("Weak", "Fair", "Strong") and rule-status text that carries no credential data.

### Color-Only Signal and WCAG 1.4.1

Using red/amber/green alone to convey strength fails WCAG 1.4.1. The implementation must pair color with text labels and icon/symbol markers on the checklist (e.g., checkmark vs cross, or ✓/✗ visible characters) so users who are color-blind or in high-contrast mode receive the full signal. This is a design execution risk rather than a fundamental constraint, but it is the kind of detail that is easy to miss during visual testing.

### Symbol-Set Ambiguity and Regex Edge Cases

The "has symbol" rule requires a concrete character class in the regex. Common choices (`[^a-zA-Z0-9]` or a NIST-recommended printable ASCII set) disagree on whether Unicode letters with diacritics, emoji, or zero-width characters satisfy the rule. Using `[^a-zA-Z0-9]` means an accented `é` or an emoji would mark "symbol" as satisfied — which is technically correct but may surprise users. The regex choice should be documented in comments and tested against edge inputs (space character, zero-width joiner, emoji) to avoid silent misclassification.

## Open Questions
### Strength-Tier Mapping: Rule-Count vs. Length-Aware Cutoffs

The simplest defensible approach is a straight rule-count threshold over the five fixed rules (length ≥ 8, lowercase, uppercase, digit, symbol). Research from the NDSS paper ["From Very Weak to Very Strong"](https://www.ndss-symposium.org/wp-content/uploads/2017/09/06_3_1.pdf) and Auth0's documented policy tiers show that a 3-tier system maps cleanly onto 0-2 / 3-4 / 5 rules passed — but that boundary is a design choice, not a standard. A widely-used alternative weights length more heavily: treat "length ≥ 8" as a hard gate (no tier above Weak until it passes), then promote to Fair at 3 rules satisfied and Strong only when all 5 pass. The [W3C WAI password example](https://www.w3.org/WAI/tutorials/forms/examples/password/) uses a similar "gate-then-count" approach. **Decision needed:** gate-then-count (recommended for security messaging clarity) vs. pure additive count. Either is defensible; gate-then-count avoids the counterintuitive UX of showing "Fair" for a 6-character password that has a symbol.

### Symbol Definition and Unicode Handling

There is no single normative definition. The most commonly cited explicit set in validation regex is:

`[*.!@#$%^&(){}[\]:;<>,.?/~_+\-=|\\]`

as documented at [OCPsoft's password regex tutorial](https://www.ocpsoft.org/tutorials/regular-expressions/password-regular-expression/). The two practical approaches are: (1) **explicit allowlist** — enumerate the above ASCII printable non-alphanumeric characters; (2) **non-alphanumeric class** — `[^a-zA-Z0-9\s]`, which is simpler but inadvertently accepts accented Latin letters (é, ñ), emoji, and Unicode symbols. For a rule-checklist meter with no server-side enforcement, the non-alphanumeric approach is more user-friendly (users who type an accented character or currency sign get credit), but it can confuse users on systems that later apply a stricter ASCII-only backend policy. **Decision needed:** explicit ASCII list (predictable, copy-paste safe for most password fields) vs. `[^a-zA-Z0-9\s]` (broader but mismatches common backend validators). Recommend the explicit list with a comment explaining the set, leaving space to extend it.

### ARIA Live Region: Polite, Debounced, One Region

The canonical pattern from [Sara Soueidan's aria-live series](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/) is: maintain **one `aria-live="polite"` region** for the strength label, inject a fully composed string in one DOM operation (not incremental DOM mutations), and clear-then-repopulate with a ~350–500 ms debounce to prevent garbled or duplicate announcements on rapid keystrokes. The [W3C WAI example](https://www.w3.org/WAI/tutorials/forms/examples/password/) uses exactly `<span aria-live="polite"></span>` for the strength text — no `aria-atomic`, no `aria-assertive`. Assertive is inappropriate here (strength changes are not urgent interruptions). The Soueidan guide explicitly warns against more than one assertive region on a page; polite suffices and queues behind current speech. **Decision needed:** debounce interval — 350 ms is the practical floor (avoids mid-word announcement); 500 ms is safer on slower screen readers. A 400 ms debounce is a reasonable default.

### Checklist Accessibility: `aria-describedby` + Text Labels, Not Color Alone

The [Kiip/Medium accessible password article](https://medium.com/kiipco/password-creation-3-ways-to-make-it-accessible-bc8f2b53b7ee) recommends linking the `<input>` to the requirements list via `aria-describedby`, so the criteria are announced when the field receives focus. For per-item pass/fail state, the pattern is a `<ul>` of `<li>` items where each item carries visible text ("✓ At least 8 characters" / "✗ At least 8 characters"), not color alone — satisfying WCAG 1.4.1. The checkmark/cross glyph should be wrapped in `<span aria-hidden="true">` with the semantic text stated in the `<li>` text node, or the glyph itself carries an `aria-label`. Wrapping the entire checklist in the same `aria-live="polite"` region as the strength label risks flooding — the preferred split is: **strength label text** in the live region (debounced), **checklist** as a static `aria-describedby` target that updates its text in place (screen readers re-read it when focus returns to the input or when the live region announces, not on every mutation). `aria-atomic="true"` on the live region forces the full composed message to be read as one utterance rather than diffed character-by-character, which is desirable for the strength label but would make the checklist verbose if included in that region.

### Reduced Motion and Color Palette

The strength bar fill transition should be wrapped in `@media (prefers-reduced-motion: reduce) { transition: none; }` — a one-liner that eliminates the only animation in the component. For the color palette, a red/amber/green trio is expected by users but fails WCAG 1.4.1 if used alone; the text label + checklist tick/cross satisfies the "not color alone" requirement regardless of palette choice. A safe WCAG AA contrast palette against white: red `#C0392B`, amber `#D68910`, green `#1E8449` — all exceed 4.5:1 against white for the label text.
