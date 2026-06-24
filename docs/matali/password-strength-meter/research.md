# Research — A single static web page (vanilla HTML/CSS/JS, no build step, no dependencies) with a password input that, live as you type, shows a strength bar (weak/fair/strong), a color-coded label, and a checklist of satisfied rules (length >= 8, has lowercase, has uppercase, has a digit, has a symbol). Accessible (labelled input and an ARIA live region for the strength text), deployable as a static page.

## Intent

A single static web page (vanilla HTML/CSS/JS, no build step, no dependencies) with a password input that, live as you type, shows a strength bar (weak/fair/strong), a color-coded label, and a checklist of satisfied rules (length >= 8, has lowercase, has uppercase, has a digit, has a symbol). Accessible (labelled input and an ARIA live region for the strength text), deployable as a static page.

## Summary
A dependency-free, no-build single static page is the correct architecture; the lowest-risk form is one self-contained index.html with inlined CSS/JS, eliminating asset-path resolution entirely. The repo's pages.yml deploys via actions/upload-pages-artifact@v3 with path "." to the ApurvBazari/matali-fullpipeline-dogfood repo, which serves as a GitHub project page under the subpath /matali-fullpipeline-dogfood/, so any root-absolute asset path (e.g. /style.css) resolves to the domain root and 404s — only relative or single-file references are safe. The five-rule scoring model is acceptable only with honest tiering and a length floor (clamp to Weak below length 8; require all rules plus a high length gate for Strong) so the "Password1!" false-strong trap is avoided. Accessibility is non-negotiable: the input needs a programmatic label, and the strength tier needs a static (parse-time) ARIA live region using polite + atomic, announced on tier change only, with state conveyed by text/icons rather than color alone to satisfy WCAG 1.4.1. All computation must stay client-side with zero network/telemetry/CDN dependencies, and label colors must meet WCAG AA 4.5:1 contrast.

## Prior Art
### Scoring Model: Rule-Count vs. Entropy

The dominant production approach for strength estimation is **zxcvbn** (Dropbox, 2016; USENIX Security), which estimates crack-time by pattern-matching against dictionaries, keyboard walks, repeats, and l33t-speak — not by checking composition rules. It returns a 0–4 score that maps cleanly to tiers. The key insight from the zxcvbn paper and the CSS-Tricks write-up is that composition rules ("has uppercase + digit + symbol") are a *poor proxy* for entropy: a password like `Password1!` satisfies all five rules yet scores 0 on zxcvbn because it is in every cracking dictionary. NIST SP 800-63B Rev 4 (2025) makes this concrete: verifiers **shall not** impose mandatory composition rules, because users respond with predictable patterns that attackers exploit. NIST's primary lever is length — minimum 8 chars for user-chosen passwords, 15 when the password is the sole authenticator.

**For a dependency-free 5-rule meter**, the defensible model is: count satisfied rules, *weight length more heavily*, and be honest about the tier floor. A workable heuristic that avoids the `Password1!` trap: score = rule count (0–5), but clamp to **Weak** if length < 8 regardless of other rules, and require at least 4 of 5 rules *plus* length ≥ 12 to reach **Strong**. This prevents the meter from calling a short all-rule password "strong" while remaining explainable to users. The W3C WAI Complete Password Example demonstrates this kind of honest tiering with a live text label ("Really Weak / Weak / Good / Strong") tied to a crack-time estimate, rather than just a rule count.

### The Five Rule Predicates

Standard regex idioms for vanilla JS:
- **Length ≥ 8**: `value.length >= 8`
- **Lowercase**: `/[a-z]/.test(value)` — ASCII-only is conventional; full Unicode lowercase (`\p{Ll}` with `u` flag) is edge-case overkill for a strength hint
- **Uppercase**: `/[A-Z]/.test(value)`
- **Digit**: `/[0-9]/.test(value)` or `/\d/`
- **Symbol**: `/[^A-Za-z0-9\s]/.test(value)` — "any non-alphanumeric, non-whitespace" is the idiomatic definition seen across Formstack, PasswordStrength.io, and DEV Community examples. Whitespace is intentionally excluded (spaces in passwords are valid but not usually what the symbol rule targets); Unicode symbols pass automatically since they are neither ASCII alpha nor digits.

### Live-Update Event Strategy

Bind to `input` (not `keyup`). The `input` event fires on typing, paste, drag-drop, and autofill — `keyup` misses paste. At the scale of five regex tests on a single string, no debouncing is needed: the computation is sub-millisecond. The DEV Community vanilla-JS example and every recent implementation reviewed use `addEventListener('input', handler)` as the canonical pattern.

### Accessibility: ARIA Live Region

The single most common a11y bug in password meters is either (a) no live region at all, or (b) `aria-live` on an element that never actually changes text. The W3C WAI tutorial (https://www.w3.org/WAI/tutorials/forms/examples/password/) uses the minimal correct pattern: a `<span>` with `aria-live="polite"` whose text content is replaced on each strength change. Key decisions:

- **`polite` over `assertive`**: The user is actively typing; assertive would interrupt every character. Polite waits for a speech pause — appropriate for a tier label that changes infrequently relative to keystrokes.
- **`aria-atomic="true"`**: Ensures the entire label ("Weak", "Fair", "Strong") is re-read as a unit, not just the changed character portion. Omitting this causes some screen readers to read "rong" when "Weak" changes to "Strong".
- **`role="status"`**: Semantically equivalent to `aria-live="polite"` + `aria-atomic="true"` — using both is belt-and-suspenders and the most widely supported pattern per MDN.
- **Don't spam**: Replacing the live region text only when the tier *changes* (not on every keystroke) prevents readers from announcing on each character. Gate the update: `if (newTier !== lastTier) { liveRegion.textContent = label; lastTier = newTier; }`.
- The Drupal a11y issue (#521904) and the PrimeVue issue (#7544) both document real-world bugs from incorrect or missing live regions, confirming this is a practical pitfall.

The checklist items should use `<ul>` with `<li>` elements, each containing a visible icon/symbol (✓/✗ or similar) and text. Do not rely solely on color for pass/fail state — include the check icon or "satisfied"/"not satisfied" text. `role="img"` with `aria-label` on icon spans, or visually-hidden text, covers screen reader needs for the checklist without needing `aria-checked` (which belongs on checkbox roles, not static list items).

Password input association: `<label for="password-input">` is the correct, robust approach — `aria-label` or `aria-labelledby` are fallbacks for cases where a visible label is impossible.

### Color Palette and Contrast

WCAG AA requires 4.5:1 contrast ratio for normal-sized text against its background. For a white background:
- **Weak (red)**: `#B91C1C` (Tailwind red-700) yields ~7:1 — safe
- **Fair (amber/orange)**: `#B45309` (amber-700) yields ~4.7:1 — passes AA; avoid `#F59E0B` (amber-400) as text — it fails
- **Strong (green)**: `#15803D` (green-700) yields ~5.9:1 — safe

The red/green combination is a colorblind concern (deuteranopia/protanopia affect ~8% of men). Mitigation: the text label and checklist carry the semantic meaning; color on the bar is additive, not sole indicator. Using amber for "fair" rather than yellow reduces deuteranopia confusion between fair and strong.

### GitHub Pages Path Mechanics

The workflow in this repo uses `actions/upload-pages-artifact` with `path: "."`, deploying to `https://<org>.github.io/<repo>/`. All asset paths in `index.html` must be **relative** (e.g., `style.css`, `./script.js`) rather than root-relative (`/style.css`) because root-relative paths resolve to the domain root, not the repo subpath. A `<base href="/repo-name/">` tag is an alternative but creates maintenance burden. The simplest correct approach for a single-file `index.html` with optional sibling `.css`/`.js` is bare relative references: `href="style.css"` and `src="script.js"`. Single-file (all inline) eliminates the path problem entirely and has no downside at this scale.

### Honest UX Messaging

Client-side rule-counting cannot detect dictionary membership, credential stuffing lists, or contextual guessability. The meter should be framed as "guidance" not "security certification". The UX pattern research (Toptal, ui-patterns.com) warns against designs that cause users to chase "Strong" at the cost of memorability — e.g., a user who reaches Strong on `P@ssw0rd1!` has been misled. This reinforces keeping the **Strong** threshold meaningfully high (≥ 4 rules + length ≥ 12 or ≥ 5 rules + length ≥ 10) and pairing the label with the checklist so users understand *why* rather than just gaming the bar.

## Existing Implementations
### Scoring Model: Rule-Count Heuristic vs. Entropy

The dominant dependency-free pattern across implementations (e.g., [martech.zone](https://martech.zone/javascript-password-strength/), [kurmis.com](https://www.kurmis.com/2019/11/01/password-strength-javascript.html), [lubosdz/simple-js-password-checker](https://github.com/lubosdz/simple-js-password-checker)) is a plain **rule-count score**: run N boolean checks, sum the `true` values, bucket the sum into tiers. For a 5-rule UI (length ≥ 8, lowercase, uppercase, digit, symbol) the natural mapping is 0–2 rules → **weak**, 3–4 → **fair**, 5 → **strong**. This is honest *if* the label wording is modest ("strong" means "passes all five rules," not "uncrackable"). The key pitfall is that a 5-rule count can grant "strong" to `Password1!` — which [Dropbox zxcvbn](https://github.com/dropbox/zxcvbn) / [its blog post](https://dropbox.tech/security/zxcvbn-realistic-password-strength-estimation) rates as weak due to dictionary-pattern detection. For a dependency-free page this is acceptable *only if* the UI avoids overclaiming; labeling the top tier "strong" (not "very strong" or "unbreakable") and pairing it with a visible checklist keeps the claim defensible. A defensible enhancement without dependencies: blend rule-count with a length bonus (e.g., length ≥ 12 bumps tier +1), so a long passphrase can reach "fair" without all five character classes — aligning loosely with [NIST SP 800-63B Rev 4](https://pages.nist.gov/800-63-4/sp800-63b/passwords/) which prioritizes length over composition mandates and explicitly discourages forcing character-type mixtures.

### The 5-Rule Predicates and Symbol Definition

Standard idiom ([DEV.to regex guide](https://dev.to/ayka_code/how-to-validate-password-strength-using-regex-and-javascript-4083), [GeeksforGeeks](https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-password-using-regular-expressions/)):

- Length: `pw.length >= 8`
- Lowercase: `/[a-z]/.test(pw)`
- Uppercase: `/[A-Z]/.test(pw)`
- Digit: `/[0-9]/.test(pw)` (or `\d`)
- Symbol: two competing approaches — **narrow explicit list** `/@$!%*?&/.test(pw)` vs. **broad negation** `/[^a-zA-Z0-9]/.test(pw)` ([martech.zone](https://martech.zone/javascript-password-strength/) uses the negation form)

The narrow list is safer for a strength meter: users know exactly which characters satisfy it and the UI can document them. The negation form accepts spaces and Unicode symbols, which may surprise users. Whitespace (`\s`) is a real edge case: NIST 800-63B permits spaces in passwords, but most UIs exclude them from "symbol" credit — document the choice. For this all-ASCII page, `!/[^a-zA-Z0-9\s]/.test(pw)` (negation minus whitespace) is a clean middle ground.

### Live-Input Event Binding

The **`input` event** is the correct modern choice over `keyup` ([W3C WAI password example](https://www.w3.org/WAI/tutorials/forms/examples/password/) uses `keyup`, a common older pattern, but `input` fires on paste, drag-drop, and voice input). At password-meter scale (< 1 ms to run 5 regex tests), debouncing the computation itself is unnecessary. The only useful timing intervention is for screen-reader announcements (see below).

### Accessibility: ARIA Live Region

The canonical pattern from [W3C WAI](https://www.w3.org/WAI/tutorials/forms/examples/password/) is a single `<span aria-live="polite">` whose `textContent` is updated each time the tier changes. Key decisions:

- **`polite` not `assertive`**: tier changes are informational, not urgent; `assertive` would interrupt every keystroke ([ESDC aria-live module](https://bati-itao.github.io/learning/esdc-self-paced-web-accessibility-course/module11/aria-live.html)).
- **`aria-atomic="true"`**: ensures the full tier string (e.g., "Password strength: Fair") is read as one unit rather than a diff.
- **Announce on tier change only**, not on every keystroke: track `previousTier` and update the live region's text only when the tier flips. This prevents screen reader spam.
- **200 ms `setTimeout` delay** before populating the live region: documented in the [fstorr accessibility gist](https://gist.github.com/fstorr/0520fbdcbcfdf0284647b009eb323047) as a practical fix for screen readers that miss rapid DOM updates during active typing.
- **`<output>` element** (implicit `role="status"`, implicit `aria-live="polite"`) is a clean alternative to a `<span aria-live>`, as the fstorr gist uses.
- The [PrimeVue ARIA issue #7544](https://github.com/primefaces/primevue/issues/7544) documents the common anti-pattern of putting `aria-expanded` on the password input itself — don't do this.

For checklist items, the idiomatic approach is a `<ul>` with each `<li>` containing a visible icon/checkmark and text. Do **not** use `aria-checked` on `<li>` elements (that requires `role="checkbox"` or `role="option"`). Instead, update the text or a visually-hidden status prefix ("Met: has uppercase" / "Not met: has uppercase") so screen readers get the state without color dependence — per [advancedbytez.com](https://advancedbytez.com/password-accessibility/) and [W3C guidance](https://www.w3.org/WAI/tutorials/forms/examples/password/).

**Label association**: `<label for="pw-input">` plus optionally `aria-describedby="requirements-list-id"` on the `<input>` to connect the checklist. The [advancedbytez guide](https://advancedbytez.com/password-accessibility/) explicitly recommends this pairing.

### Color Palette (WCAG AA, Colorblind-Safe)

The standard traffic-light palette fails for red-green colorblindness. A widely-cited accessible alternative (conforming to [WCAG AA 4.5:1 on white](https://webaim.org/resources/contrastchecker/)):

- Weak: `#C0392B` (red, ~5.1:1 on white) — acceptable but tight; `#B91C1C` gives more headroom
- Fair: `#D97706` (amber, ~3.1:1 on white for UI components; use bold weight or larger text to hit text AA)
- Strong: `#15803D` (dark green, ~5.4:1 on white)

The [IBM Design Language colorblind palette](https://toolsana.com/tools/colorblind-safe-palette-generator/) and [Wong palette](https://toolsana.com/tools/colorblind-safe-palette-generator/) use orange (`#E69F00`) + blue (`#0072B2`) for a two-state meter — for a three-state meter, pairing color with the text label and checklist (which the spec already requires) satisfies the WCAG "not color alone" rule regardless of the exact palette chosen.

### GitHub Pages Static Deployment

The workflow uses `actions/upload-pages-artifact` with `path: "."` (root). For a **project-page site** (`username.github.io/repo-name`), root-relative asset paths like `/style.css` **break** — they resolve to `github.io/style.css`, not `github.io/repo-name/style.css` ([GitHub Community discussion #188844](https://github.com/orgs/community/discussions/188844), [codestudy.net guide](https://www.codestudy.net/blog/github-pages-and-relative-paths/)). The two safe strategies: (1) **relative paths** — `href="style.css"` (no leading slash) resolves correctly from any subpath; (2) **single-file** `index.html` with all CSS/JS inlined — eliminates path resolution entirely. For this deliverable, inlining into one `index.html` is the zero-risk option and aligns with the "no build step" constraint.

### Reference Implementations

- [caitlindaitch/passwordStrengthMeter](https://github.com/caitlindaitch/passwordStrengthMeter) — pure vanilla JS plugin, good rule-count scoring skeleton
- [dmitmix/vanilla-password-strength-meter](https://github.com/dmitmix/vanilla-password-strength-meter) — modern vanilla JS, no jQuery
- [W3C WAI complete password example](https://www.w3.org/WAI/tutorials/forms/examples/password/) — the a11y reference; its `aria-live` + `keyup` pattern is the closest to a canonical standard
- [fstorr gist](https://gist.github.com/fstorr/0520fbdcbcfdf0284647b009eb323047) — the most a11y-refined meter gist, adds `<output>`, `role="meter"` with `aria-valuetext`, and the 200 ms announcement delay
- zxcvbn ([GitHub](https://github.com/dropbox/zxcvbn)) — sets the intellectual ceiling; demonstrates why rule-count "strong" can be misleading, useful as a calibration reference even when not imported

## Constraints & Floors
### Scoring model: rule-count is defensible but needs a length floor

A pure 5-rule checklist (count satisfied rules → map to tier) is the idiomatic choice for a meter whose UI _shows_ exactly those 5 rules, because it keeps the score and the display truthful to each other. zxcvbn (Dropbox, USENIX Security 2016) shows that entropy-based scoring catches patterns rule-counters miss ("Password1!" satisfies all 5 rules yet is trivially guessable), so the honest hybrid is: **rule-count provides the floor, but length is the dominant signal for the top tier**. A defensible dependency-free mapping without entropy math:

- 0–2 rules met → **Weak**
- 3–4 rules met → **Fair**
- All 5 rules met AND length ≥ 12 → **Strong** (length ≥ 8 alone with all rules earns Fair, not Strong)

This avoids the "Password1!" problem: it satisfies all 5 rules but is only 9 characters, landing at Fair rather than Strong. Label copy should reinforce honest limits: "Strong by these rules — longer is better."

NIST SP 800-63B Rev. 4 (finalised September 2024) explicitly **prohibits** mandatory complexity composition rules for verifiers and requires accepting all printable ASCII and Unicode. The UI can still display these rules as guidance; it must not enforce them as blockers.

### "Symbol" definition and Unicode edge cases

The idiomatic JavaScript predicate is `/[^a-zA-Z0-9\s]/` — any character that is not a letter, digit, or whitespace. This is preferable to enumerating specific punctuation because: (a) it accepts the full printable ASCII symbol set plus any Unicode symbol without maintenance; (b) it correctly excludes whitespace, which is a common edge-case ambiguity (a space satisfies "not alphanumeric" but is semantically not a symbol in UX terms). An alternative explicit ASCII class `/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/` is more predictable but will reject valid symbols like `£`, `€`, or `©`. For a meter (not a validator), the broader `/[^a-zA-Z0-9\s]/u` with the `u` (Unicode) flag is the better default; the `u` flag also future-proofs against surrogate-pair edge cases in emoji-containing passwords.

### DOM event strategy: `input`, no debounce needed

Bind to the `input` event (not `keyup`): `input` fires on paste, drag-drop, autofill, and programmatic value changes — `keyup` misses all of these. At the scale of 5 regex tests against a ≤64-character string, computation is sub-millisecond; **no debounce is warranted or beneficial** for the visual checklist and bar. For the ARIA live region, debouncing the text-update by ~300–500 ms _is_ recommended to avoid flooding screen readers on fast typing — update the strength bar/checklist synchronously, but delay writing to the live region until input pauses.

### ARIA live region: the single most common implementation bug

The canonical pattern:
1. Render the live region **empty** in initial HTML markup — never inject it dynamically. Screen readers register live regions at parse time; a region added after page load may not be observed.
2. Use `role="status"` (implicit `aria-live="polite"`) plus the explicit redundant `aria-live="polite"` for AT compatibility: `<div role="status" aria-live="polite" aria-atomic="true" id="strength-status"></div>`
3. `aria-atomic="true"` ensures the entire region text is read as a unit ("Password strength: Strong") rather than just the changed fragment.
4. **Do not use `aria-live="assertive"`** — strength is not time-critical; assertive interrupts the current reading and is disruptive.
5. **Avoid combining `role="alert"` + `aria-live="assertive"`** — this causes double-announcements on VoiceOver/iOS.
6. Write only the tier name change to the region (e.g., the strength tier transitions), not every checklist rule tick. Checklist items use visible tick/cross icons with `aria-hidden="true"` icons plus screen-reader-only text (`.sr-only` pattern), not live regions.
7. `<label for="password-input">Password</label>` is the only required association; `aria-describedby` pointing to the live region is optional but useful for AT that reads it on focus.

### Color palette meeting WCAG AA and colorblind safety

WCAG 2.1 AA requires ≥4.5:1 contrast ratio for normal text against the page background. A three-tier palette that passes AA and is safe across the most common color-blindness types (deuteranopia, protanopia):

| Tier | Foreground label color | Notes |
|------|----------------------|-------|
| Weak | `#c0392b` (dark red) | Contrast ~5.1:1 on white |
| Fair | `#b7710d` (amber/orange-brown) | Contrast ~4.6:1 on white; avoids pure yellow which fails AA |
| Strong | `#1a7a3c` (dark green) | Contrast ~5.5:1 on white |

Critically, **color must not be the only signal** (WCAG 1.4.1). The checklist ticks and the text label ("Weak", "Fair", "Strong") already satisfy this — the bar color is an additional enhancement, not the sole indicator.

### GitHub Pages path / base-href behavior with this repo's workflow

The repo's workflow (`pages.yml`) uses `actions/upload-pages-artifact@v3` with `path: "."`, which packages the entire repo root as the artifact. `index.html` at root resolves correctly as the site root (`/` or `/repo-name/` on project sites).

**The critical base-path issue:** for a GitHub _organization or user_ site (`username.github.io`), the site is served at `/` — no subpath, no `<base>` tag needed, and all root-relative paths (`/style.css`) resolve correctly. For a _project_ site (`username.github.io/repo-name/`), root-relative paths like `/style.css` resolve to `username.github.io/style.css` (wrong). The safest cross-context approach is to use **only relative paths** (`./style.css`, `./app.js`) — these resolve correctly regardless of whether the site is served at `/` or `/repo-name/`. A single `index.html` inlining all CSS and JS entirely sidesteps the issue and is the lowest-friction deploy for this project.

### Security and privacy posture

All computation must stay client-side — never transmit the password value via network call, analytics event, or telemetry. No third-party scripts, no CDN resources (even for fonts), no `fetch`/`XHR` of any kind. The honest UX caveat: client-side rule checking cannot detect dictionary words, credential-stuffing lists, or keyboard patterns — the meter should label itself as a "composition guide" rather than a cracking-resistance estimate.

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
```

## Risks
### Scoring honesty: the "Password1!" false-strong problem

A pure 5-rule checklist (length, lower, upper, digit, symbol) will rate "Password1!" as strong despite it being trivially crackable — it matches every rule while sitting in every dictionary-mangler's top candidates. Research confirms this: the same password receives scores ranging from "very weak" to "very strong" across major commercial meters, with no consistent signal ([Wang et al., USENIX Sec 2023](https://www.usenix.org/system/files/sec23fall-prepub-291_wang-ding.pdf); [NDSS 2017 survey](https://www.ndss-symposium.org/wp-content/uploads/2017/09/06_3_1.pdf)). The risk for this build is overstating confidence: a user who satisfies all 5 rules may believe they are well-protected when they are not. Mitigation: tier the score so "strong" requires both all-5-rules AND length ≥ 12 (or ≥ 16), and add honest UX copy ("meets complexity rules — also avoid common words") rather than implying the password is hard to crack. Do not label any 8-character pattern "strong."

### ARIA live-region over-announcement

The most common implementation bug in password meters is updating an `aria-live` region on every `input` event keystroke. Screen readers queue these rapid-fire announcements and either flood the user with syllable-by-syllable readouts or drop them unpredictably ([MDN ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions); [TetraLogical — why live regions fail](https://tetralogical.com/blog/2024/05/01/why-are-my-live-regions-not-working/)). `aria-live="polite"` naturally defers until the user pauses, which partially self-debounces, but a 500 ms JS debounce on the DOM write is still required to avoid queuing mid-word. Use `role="status"` (implicit `aria-live="polite"`) with `aria-atomic="true"` so the reader announces the full tier string, not a character delta. Never use `aria-live="assertive"` on a strength meter — it interrupts the user mid-keystroke.

### Color-only signaling

Weak/fair/strong conveyed purely by bar color fails WCAG SC 1.4.1 (use of color) and is invisible to red-green colorblind users (~8% of men). Risk: the checklist and text label must independently communicate state; color is enhancement only. All three label text colors must meet 4.5:1 contrast ratio against their background (WCAG AA). Standard red/amber/green palettes often fail against white backgrounds at small text sizes — verify with a checker before shipping ([WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)).

### Symbol definition ambiguity and Unicode edge cases

The "has a symbol" rule is undefined without a character-class commitment. `[^a-zA-Z0-9]` accepts spaces and Unicode emoji, which many backends reject silently. `[\W_]` is equivalent to `[^a-zA-Z0-9]` in JS and has the same problem. A tight ASCII-printable symbol class — `[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` `` ` ``]` — is predictable and round-trips safely through form submission. Explicitly exclude whitespace and document the choice. Failing to do so lets a password of only spaces pass the symbol rule.

### GitHub Pages subpath asset resolution

When the repo is served as a project site (e.g. `username.github.io/repo-name/`), root-relative asset paths like `/style.css` resolve to the domain root, not the repo sub-path, breaking the page silently. The workflow uses `actions/upload-pages-artifact` with `path: "."`, which preserves the directory structure but does not rewrite URLs. Mitigation: use only same-directory-relative paths (`./style.js`, `./style.css`) or inline everything into a single `index.html`. A `<base href="./"> ` tag is an alternative but interacts subtly with anchor hash links.

### Security and privacy posture

A rule-based, dependency-free meter has a minimal attack surface: computation is local, no network calls are made, and no password material is transmitted ([arxiv 2505.08292, ACM AsiaCCS 2025](https://arxiv.org/abs/2505.08292)). The residual risks are (a) the page being served over HTTP rather than HTTPS (GitHub Pages enforces HTTPS, so this is mitigated by the deployment target) and (b) browser extensions with access to password fields — outside scope to defend against. The UI should not log, `console.log`, or persist the value at any point; this is a code-review gate, not an architectural concern. No honest strength-only claim (no entropy model, no breach lookup) warrants "this password is safe" copy — frame all output as "complexity rules satisfied," not "this password is secure."

## Open Questions
### Scoring model: rule-count alone misleads — blend it with length

A pure 5-rule checklist driving weak/fair/strong is defensible as a UX teaching tool but it is honest only if you acknowledge its limits. NIST SP 800-63B (updated through 2024) explicitly discourages mandatory composition rules because they produce predictable transformations — "P@ss1word!" ticks all five boxes yet is trivially crackable. Research on zxcvbn ([Wheeler 2016, USENIX Security](https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_wheeler.pdf); [Wang et al. 2023](https://www.usenix.org/system/files/usenixsecurity23-wang-ding-silver-bullet.pdf)) shows pattern-matching estimators are materially more accurate than rule checklists. However, zxcvbn is a dependency and adding it violates the brief.

The defensible dependency-free approach: count satisfied rules (0–5) AND weight length separately. A concrete tiering that avoids the false-strong trap:

- **Weak**: fewer than 3 rules satisfied, OR length < 8
- **Fair**: 3–4 rules satisfied AND length >= 8
- **Strong**: all 5 rules satisfied AND length >= 12

Adding the length >= 12 gate on "Strong" (not just the rule-count check for length >= 8) meaningfully increases honest signal. Pair the meter with a brief caveat line ("Length matters most — longer is always better") to set realistic expectations without implying the meter is a comprehensive security oracle.

### The "symbol" definition and Unicode edge cases

No universal standard exists. Common implementations use the ASCII punctuation class `[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~\`]` or the broader negation `[^a-zA-Z0-9\s]`. Key decisions:

- **Whitespace**: most policies exclude it from "symbol" (spaces in passwords are allowed per NIST but not typically counted as a special character for strength purposes). Use `[^a-zA-Z0-9]` with a `\s` exclusion if you want to be strict: `[^a-zA-Z0-9\s]`.
- **Unicode symbols**: if you allow non-ASCII input, characters like ñ or é would match `[^a-zA-Z0-9]` unintentionally. For a simple ASCII-oriented meter, the safe regex is `/[^a-zA-Z0-9\s]/` — matches any non-alphanumeric, non-whitespace character. This is the most broadly understood idiom ([The Art of Web](https://www.the-art-of-web.com/javascript/validate-password/), [OCPsoft](https://www.ocpsoft.org/tutorials/regular-expressions/password-regular-expression/)).
- Avoid relying on `\W` (word-boundary negation) as it matches `_` as a non-word character in some engines but not others.

### DOM event: use `input`, not `keyup`

`input` fires on every value change including paste, drag-and-drop, speech input, and autocomplete — `keyup` misses all of these. The [`input` event](https://www.w3docs.com/learn-javascript/events-change-input-cut-copy-paste.html) is the correct single binding. No debounce is needed at this scale: the strength calculation over five regex tests against a short string is sub-millisecond and poses zero layout-thrash risk. Debouncing would only delay feedback and hurt UX without benefit.

### ARIA live region: the single most common bug

Use `role="status"` with an explicit `aria-live="polite"` and `aria-atomic="true"` ([MDN ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)). Critical implementation rules:

1. **The region must exist empty in DOM before any JS runs.** Screen readers only track dynamic changes; content present on load is not announced. Inject the region in HTML as `<div role="status" aria-live="polite" aria-atomic="true" id="strength-live"></div>` and update its `textContent` via JS.
2. **Announce tier changes only, not every keystroke.** Since `input` fires on every character, compare the new tier to the previous tier and only update the live region's text when the tier actually changes. This eliminates screen-reader spam.
3. **`aria-atomic="true"`** ensures the full label ("Strength: Strong") is read, not just the changed word.
4. **Avoid `aria-live="assertive"`** — strength feedback is not time-critical and assertive interrupts whatever the user is hearing ([Sara Soueidan, Part 2](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/); [A11Y Collective](https://www.a11y-collective.com/blog/aria-live/)).
5. A debounce of ~350ms on the live-region update (not on the visual update) can smooth announcements when the user is typing fast, though it is optional given the tier-change guard.

### Color palette: contrast and colorblind safety

Standard red/yellow/green fails WCAG AA (4.5:1) on white backgrounds for all three hues at typical saturation. A contrast-safe and colorblind-safe palette on white (#ffffff):

- **Weak**: `#b91c1c` (dark red, ~5.9:1 on white) — readable under protanopia/deuteranopia due to luminance difference
- **Fair**: `#b45309` (dark amber/orange, ~4.7:1 on white) — avoids pure yellow which fails at ~1.07:1
- **Strong**: `#15803d` (dark green, ~4.9:1 on white)

Never rely on color alone: the text label ("Weak / Fair / Strong") and the checklist together satisfy the non-color requirement ([Section508.gov](https://www.section508.gov/create/making-color-usage-accessible/)).

### GitHub Pages path behavior

When deployed via `actions/upload-pages-artifact` with `path: "."` from a repo at `https://username.github.io/repo-name/`, the page is served at a subpath. Use **relative asset paths** (e.g., `./style.css`, `./app.js`) or root-relative paths combined with a `<base href="/repo-name/">` tag — never bare root-absolute paths like `/style.css`, which resolve to the domain root and 404 on project pages ([GitHub community discussion](https://github.com/orgs/community/discussions/188844); [Pluralsight](https://www.pluralsight.com/guides/fixing-broken-relative-links-on-github-pages)). The single-file `index.html` approach eliminates this risk entirely: all JS and CSS inlined removes any asset path to resolve.
