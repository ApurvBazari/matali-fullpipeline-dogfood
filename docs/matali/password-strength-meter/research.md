# Research — feature

## Intent

Build a password-strength meter as a single static web page (vanilla HTML/CSS/JS, no build step, no dependencies) that live-scores a typed password as weak/fair/strong with a strength bar, color-coded label, and a checklist of satisfied rules (length >= 8, lowercase, uppercase, digit, symbol). Accessible: labelled input and an ARIA live region for the strength text. Deploys as a static page.

## Summary
A client-side password strength meter for a no-build, no-dependency static GitHub Pages deploy should use an additive composition-rule scorer (length plus the four character-class checks) mapped to a three-band label — Weak / Fair / Strong — because the entropy-estimation alternative (zxcvbn / zxcvbn-ts at ~400–800 KB) violates the no-runtime-dependency constraint. The dominant prior art (W3C WAI, CSS-Tricks, multiple vanilla-JS meters) converges on this additive model, with length weighted as the primary signal per NIST SP 800-63B, which discourages composition rules as a mandatory gate but endorses a strength meter as user guidance. The hard accessibility requirements are stable across every axis: an explicit <label for> association, a polite live region (aria-live="polite" or role="status") that announces only the band label and never the password value, and a text label paired with color to satisfy WCAG 1.4.1. The chief honestly-documented limitation is that composition-only scoring rewards predictable patterns ("Password1!" scores 5/5 yet is trivially crackable), so the UI copy must frame the meter as a composition guide rather than a security guarantee and must avoid words like "secure" or "safe." Per-keystroke regex scoring is sub-millisecond and poses no performance risk; an optional 150–300 ms debounce serves only to calm screen-reader announcement frequency, not throughput.

## Prior Art
### Scoring Models: Composition Rules vs. Entropy Estimation

The dominant prior art splits into two camps. **Composition-rule meters** assign one point per satisfied rule (length ≥ 8, lowercase, uppercase, digit, symbol) and map the total to an ordinal band — a 0–5 scale collapsing naturally to weak / fair / strong. This is the pattern documented by [UI Patterns](https://ui-patterns.com/patterns/PasswordStrengthMeter) and [UX Patterns for Developers](https://uxpatterns.dev/patterns/forms/password): each criterion adds a point; three or fewer → weak, four → fair, five → strong. The approach is zero-dependency, runs inline in a few lines of vanilla JS, and requires no network call — exactly what the no-build constraint demands.

**Entropy-estimation meters**, exemplified by Dropbox's [zxcvbn](https://dropbox.tech/security/zxcvbn-realistic-password-strength-estimation) (and its TypeScript port [zxcvbn-ts](https://zxcvbn-ts.github.io/zxcvbn/guide/)), detect common dictionary words, keyboard walks, date patterns, and l33t substitutions, then estimate crack-time to produce a 0–4 score. zxcvbn correctly notes that composition rules "allow weak passwords (like P@ssword1) and disallow strong passwords" — a passphrase scores higher than a short mixed-case string. However, the minified zxcvbn bundle is ~800 KB; the TypeScript port is modular but still non-trivial. Both conflict with the explicit no-dependencies constraint. The trade-off is documented: for a deliberately simple meter, the composition model is the right choice, provided its limitations are communicated.

### NIST 800-63B Stance

[NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) (Rev 3 and the draft Rev 4 at [nvlpubs.nist.gov](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63B-4.pdf)) explicitly **discourages mandatory composition rules** as a verifier policy, citing predictable user responses (e.g., "password" → "Password1!"). Rev 4 strengthens this to "shall not" impose arbitrary complexity. NIST does, however, **recommend offering a strength meter** as guidance to help users choose stronger passwords after a blocklist rejection. The practical implication: a composition-rule checklist is defensible as *user guidance* (showing what has been satisfied) rather than as a gate. Framing the five-rule checklist as "here's what you've achieved" rather than "these are mandatory" aligns with the NIST spirit. Length is called out as the primary strength factor.

### Accessible Password Field Pattern

The canonical accessible implementation is documented by the [W3C WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/examples/password/):

- `<label for="password">` explicitly associated with `<input type="password" id="password">` — no placeholder-as-label shortcut.
- A visually-styled but semantically separate `<span aria-live="polite" id="passwordmessage">` receives the strength text update on each keystroke. `polite` (not `assertive`) is the correct politeness level: it queues the announcement without interrupting the user mid-keystroke, which `assertive` would do destructively.
- The live region contains only the *label* ("Weak", "Fair", "Strong"), never the password value itself — the browser's `type="password"` masking does not prevent a poorly-coded live region from echoing the value if it were mistakenly written there.
- Per [Kiip accessibility research](https://medium.com/kiipco/password-creation-3-ways-to-make-it-accessible-bc8f2b53b7ee), `aria-describedby` on the input pointing to the requirements list ensures the rules are announced on field focus, reducing the need to repeat them on every keystroke.
- The [Drupal aria-live issue #521904](https://www.drupal.org/project/drupal/issues/521904) is a real-world case study confirming that omitting the live region from the strength container leaves screen-reader users with no strength feedback at all.

### Color-Only Indication Anti-Pattern

Multiple sources ([CSS-Tricks](https://css-tricks.com/password-strength-meter/), [PatternFly design guidelines](https://www.patternfly.org/components/password-strength/design-guidelines/)) confirm that color alone fails WCAG contrast requirements and is invisible to colorblind users. The canonical fix — already implied by the WAI example — is pairing bar color with a text label. The three-band label (Weak / Fair / Strong) directly satisfies this: sighted users get color, screen-reader users get the live-region text, colorblind users get the label text.

### Performance on Per-Keystroke Scoring

For a composition-rule scorer (five regex/`includes` checks), per-keystroke cost is negligible — sub-millisecond even on low-end mobile. [CSS-Tricks](https://css-tricks.com/password-strength-meter/) and [Medium/LearnComputer](https://medium.com/@learncomputer/modern-password-strength-analyzer-design-security-and-ux-508b56dad233) confirm this is a non-issue for rule-based meters; it is only a concern for heavy entropy libraries like zxcvbn on very old devices.

### GitHub Pages Static Constraints

No browser API used by a composition-rule meter (string methods, regex, DOM classList/setAttribute, EventListener on `input`) requires a build step or has compatibility gaps in any browser in active support. GitHub Pages serves static files from a project subpath (e.g., `/repo-name/`); relative asset paths and no `<base>` tag requirement mean a single-file deploy is safe. The existing `pages.yml` `workflow_dispatch` pattern requires only that the output HTML be in the configured publish directory — no framework-specific routing or bundler output needed.

### Documented Limitations of Composition-Only Meters

The clearest risk, acknowledged by [Dropbox/zxcvbn](https://dropbox.tech/security/zxcvbn-realistic-password-strength-estimation) and [UI Patterns](https://ui-patterns.com/patterns/PasswordStrengthMeter): a password satisfying all five rules can still be weak ("P@ssword1" scores five-out-of-five but is trivially crackable). The meter must be framed as a *composition guide*, not a security guarantee. A second risk: the Wix case study ([wix-ux.com](https://wix-ux.com/how-we-increased-our-users-passwords-strength-by-26-ab25efffa622)) found that some users optimize for the meter score and then forget the password — the "user obsession" anti-pattern. Neither risk is a reason to abandon the approach; both are reasons to label limitations honestly in UI copy.

```yaml
floors:
  - id: "no-network-calls"
    rule: "The password value must never be transmitted over the network or logged — scoring is client-side only."
    source: "NIST 800-63B §5.1.1; security/privacy baseline for any client-side meter"
  - id: "aria-live-no-password-value"
    rule: "The aria-live region must contain only the strength label — never echo the password value into it."
    source: "W3C WAI password example; WCAG 1.3.1 programmatic determination"
  - id: "label-explicit-association"
    rule: "The password input must have an explicit <label for=...> association — placeholder text is not a substitute."
    source: "WCAG 1.3.1 / 4.1.2; W3C WAI Forms Tutorial"
  - id: "color-plus-text"
    rule: "Strength indication must include a text label in addition to color — color alone fails WCAG 1.4.1."
    source: "WCAG 1.4.1 Use of Color; W3C WAI password example; PatternFly design guidelines"
  - id: "no-build-no-dependencies"
    rule: "The implementation must use no external libraries, bundlers, or build steps — vanilla HTML/CSS/JS only."
    source: "Feature constraint: static deploy to GitHub Pages, no npm, no framework"
```

## Existing Implementations
### Scoring Models in the Wild

The dominant pattern across vanilla JS implementations is **additive rule scoring**: five Boolean regex checks (length ≥ 8, `/[a-z]/`, `/[A-Z]/`, `/[0-9]/`, `/[^a-zA-Z0-9]/`) each award one point, and the total maps to an ordinal band. Published examples ([Martech Zone](https://martech.zone/javascript-password-strength/), [kurmis.com](https://www.kurmis.com/2019/11/01/password-strength-javascript.html), [dmitmix/vanilla-password-strength-meter](https://github.com/dmitmix/vanilla-password-strength-meter)) vary in how many rules they use (5–8), but the shape is consistent: 0–1 rules → weak, 2–3 → fair/moderate, 4–5 → strong. For a deliberate three-band system this translates directly: score 0–1 = weak, score 2–3 = fair, score 4–5 = strong. Length can be weighted more heavily (count 2 points if ≥ 12, or require it as a gate) to nudge users toward the NIST-endorsed priority of length over character diversity.

The heavier alternative — zxcvbn — estimates guessability against dictionaries and pattern databases, returning a 0–4 score, but its minified bundle is ~400 KB. At least one CodePen ([vanilla JS / zxcvbn](https://codepen.io/shreyash015/pen/NMLRJY)) wraps it in a no-build `<script src>` CDN tag, which technically satisfies "no build step" but violates "no runtime dependencies." For this feature the additive-regex model is the right call: it is ~10 lines of native JS, zero network requests, and its limitations (see Risks below) are fully documentable.

### Checklist vs. True Entropy

NIST SP 800-63B explicitly discourages composition requirements as a security mechanism — users satisfy rules predictably (`Password1!` for uppercase + digit + symbol), producing low-entropy passwords that pass all five checks. A composition checklist therefore serves a **UI affordance / educational role**, not a security guarantee. Several open-source meters ([caitlindaitch/passwordStrengthMeter](https://github.com/caitlindaitch/passwordStrengthMeter), [lubosdz/simple-js-password-checker](https://github.com/lubosdz/simple-js-password-checker)) combine checklist display with a strength bar, reinforcing that the two are complementary signals. The spec should state this limitation explicitly in the component's visible UI or adjacent help text.

### Accessibility: Label + Live Region

The W3C WAI [Complete Password Example](https://www.w3.org/WAI/tutorials/forms/examples/password/) is the canonical reference. It uses:

- `<label for="password-input">` + matching `id` on the `<input type="password">` for proper field association.
- A separate `<span aria-live="polite">` (or `<output>`) that receives only the strength text descriptor — "Weak", "Fair", "Strong" — never the password value itself.

`aria-live="polite"` is the established choice for strength meters: it queues the announcement rather than interrupting the user mid-keystroke. Some sources ([Drupal issue #521904](https://www.drupal.org/project/drupal/issues/521904), a [YouTube NVDA demo](https://www.youtube.com/watch?v=Pe-xtrfSEyM)) note that `polite` can be missed if the user types quickly, and recommend a short debounce (150–300 ms) so the region content settles before the screen reader reads it — this also prevents NVDA/JAWS from announcing every single character's intermediate state. An alternative pattern ([fstorr gist](https://gist.github.com/fstorr/0520fbdcbcfdf0284647b009eb323047)) uses `role="meter"` with `aria-valuenow` / `aria-valuetext` on the bar element itself; this is richer but has patchier AT support. The simpler `aria-live` span on a visually-hidden element is more broadly supported and sufficient for this feature.

### GitHub Pages / Static Deploy Constraints

Project-site repos are served under `/<repo-name>/`, so relative asset paths in a single `index.html` are inherently safe — no `<base href>` tag is needed as long as all CSS/JS is inline or referenced with relative paths (not root-relative `/` prefixes). The `workflow_dispatch`-triggered `pages.yml` publishes whatever is on the branch directly; there is no build artifact step to worry about. A single-file `index.html` with inline `<style>` and `<script>` is the least error-prone structure for this deploy target.

### Security and Privacy Expectations

All scoring must happen client-side with no network calls. The password value must never appear in the `aria-live` region, `console.log`, `localStorage`, or any attribute that could be read by browser extensions. Standard `<input type="password">` masks the value from the DOM. No third-party analytics or CDN scripts should be loaded, consistent with the "no dependencies" constraint.

### Risks and Anti-Patterns

- **Color-only indication** fails WCAG 1.4.1 (use without color): the text label is mandatory, not supplementary.
- **Composition rules push predictable patterns**: `Password1!` scores 5/5 but is trivially guessable — document this limit in the UI or an adjacent note.
- **Per-keystroke scoring performance**: regex on a ≤128-char string is sub-millisecond; no debounce is needed for performance, but a 150–200 ms debounce helps the ARIA live region as noted above.
- **False confidence**: a "Strong" rating with no blocklist check cannot detect `Passw0rd!` variants. The component should not claim to be a security gate.

## Constraints & Floors
### Scoring Model: Composition Rules vs. Entropy

NIST SP 800-63B (latest revision at [pages.nist.gov](https://pages.nist.gov/800-63-4/sp800-63b/passwords/)) explicitly discourages mandatory composition rules (uppercase, lowercase, digit, symbol), noting users respond with highly predictable substitutions ("Password1!") that erode real entropy while hurting usability. Length is the primary strength signal; NIST's verifier floor is 8 characters, with 15+ preferred.

For this meter, that creates a tension: the five composition-rule checklist is explicitly in scope as a UX affordance, but must not be presented as a proxy for true password strength. The defensible scoring model threads this needle as follows:

- **Weak** — length < 8, regardless of character variety. A short password is always weak; no composition bonus can rescue it.
- **Fair** — length ≥ 8 AND 2–3 of the four character-class rules satisfied (lowercase, uppercase, digit, symbol). Passes the minimum floor but lacks breadth.
- **Strong** — length ≥ 8 AND all four character-class rules satisfied. This is composition-complete, not entropy-verified.

This model is consistent with how tools like [passwordmeter.com](https://passwordmeter.com/) operate and is openly labeled "composition-only" — its documented limitation is that "correcthorsebatterystaple" scores Weak (fails uppercase/digit/symbol) despite being far stronger than an 8-char mixed-case password. The checklist UI makes that transparent without requiring zxcvbn or any external dependency.

### Accessible Password Field Pattern

**Label association:** Every `<input type="password">` must have an explicit `<label for="...">` linked via matching `id`. Per [W3C WAI form instructions](https://www.w3.org/WAI/tutorials/forms/instructions/) and WCAG 4.1.2, this is non-negotiable — `aria-label` is an acceptable fallback but a visible `<label>` is strongly preferred.

**Live region for strength:** [MDN ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) documents that `role="status"` carries an implicit `aria-live="polite"`, meaning the screen reader waits for user idle time before announcing — a natural debounce that prevents the reader from interrupting on every keystroke. `role="alert"` (implicit `aria-live="assertive"`) interrupts immediately and is appropriate only for errors, not status updates.

Drupal's [issue #521904](https://www.drupal.org/project/drupal/issues/521904) settled on `aria-live="assertive"` for their password strength container after JAWS/NVDA testing, finding real-time announcement preferable for form validation. However, MDN's guidance is explicit that assertive "can be extremely annoying and disruptive if overused." The safer default for a continuously updating strength label is `role="status"` (polite), with `aria-atomic="true"` so the full phrase ("Password strength: Fair") is announced rather than just the changed word. This avoids both over-interruption and partial announcements.

Critical constraint: the live region text must never mirror the password field's value — only the band label ("Weak", "Fair", "Strong") goes into the announced region.

**Color contrast:** WCAG SC 1.4.3 requires 4.5:1 contrast for normal text. A color-only strength bar fails WCAG 1.4.1 (Use of Color); the text label ("Weak / Fair / Strong") alongside the bar is mandatory, not optional.

### Static Deploy and GitHub Pages Constraints

For a no-build, no-dependency vanilla HTML/CSS/JS page, [Maximilian Orlov's GitHub Pages guide](https://maximorlov.com/deploying-to-github-pages-dont-forget-to-fix-your-links/) identifies the central hazard: a project site is served under `username.github.io/repo-name/`, so any root-relative path (`/style.css`) resolves against the domain root and 404s. The fix for a single-file or few-file static deploy is straightforward: use relative paths only (e.g., `href="style.css"`, not `/style.css`). If assets are co-located with `index.html`, relative paths work identically in local `python -m http.server` preview and in production under the subpath.

The `<base href="/repo-name/">` tag is an alternative ([codestudy.net](https://www.codestudy.net/blog/github-pages-and-relative-paths/)) but introduces its own fragility (anchor links and fragment navigation break unless carefully handled). For a single-page feature with no client-side routing, sibling-relative paths are the lower-risk choice.

The existing `pages.yml` workflow_dispatch deploy requires no changes to this logic — GitHub Pages serves whatever the branch root contains as static files with no further processing.

### Security and Privacy Floors

- All scoring is client-side; zero network calls are ever made. The password value never leaves the browser.
- No `console.log`, no `localStorage`, no event tracking must touch the password field's value.
- The meter must carry documented copy acknowledging it measures composition, not true entropy — composition-passing passwords can still be weak (common phrases, repeated patterns, breach-corpus hits). This is the standard disclaimer for any meter that doesn't perform offline dictionary/entropy checking.

### Known Risks and Anti-Patterns

- **Predictability nudge:** A checklist that requires one uppercase, one digit, one symbol trains users toward "Password1!" patterns — the exact anti-pattern NIST called out. Framing the checklist as "satisfied rules" rather than "requirements" mitigates this slightly; pairing it with a length-first message reinforces NIST intent.
- **False security signal:** A 9-character password satisfying all five rules scores Strong under the composition model but is trivially crackable. The label and any surrounding copy should never use words like "secure" or "safe."
- **Per-keystroke performance:** Scoring on `input` events with pure JS regex checks is O(1) per rule — no performance constraint applies.
- **Color-only failure mode:** Red/yellow/green bar without a text label fails WCAG 1.4.1 and is invisible to colorblind users. The accessible text label is the primary indicator; the bar is decorative reinforcement.

```yaml
floors:
  - id: "no-network-calls"
    rule: "The password value must never be transmitted over the network, logged to console, or written to localStorage/sessionStorage — all scoring is client-side only, in-browser, with zero XHR/fetch calls."
    source: "NIST SP 800-63B 5.1.1; PMC 'A Password Meter without Password Exposure'; client-side privacy baseline consistent across all axes"
  - id: "no-build-no-dependencies"
    rule: "The implementation must use only vanilla HTML/CSS/JS with no external libraries, CDN scripts, bundlers, or build steps. This architecturally excludes zxcvbn/zxcvbn-ts even via a no-build <script src> CDN tag, which would still introduce a runtime dependency."
    source: "Feature constraint: static deploy to GitHub Pages, no npm, no framework, no runtime dependencies"
  - id: "aria-live-no-password-value"
    rule: "The aria-live region (or role=status equivalent) must contain only the strength band label (e.g. 'Weak', 'Fair', 'Strong'); the password value must never be echoed into the live region or any announced/readable attribute."
    source: "W3C WAI Complete Password Example; WCAG 1.3.1 programmatic determination; MDN ARIA live regions"
  - id: "live-region-polite-not-assertive"
    rule: "The continuously-updating strength live region must use aria-live=\"polite\" (or role=\"status\", which implies polite); aria-live=\"assertive\"/role=\"alert\" must not be used for the per-keystroke status update because it interrupts the screen reader destructively."
    source: "MDN ARIA live regions guidance; W3C WAI password example; cross-axis consensus on polite for status updates"
  - id: "label-explicit-association"
    rule: "The password input must have an explicit <label for=...> association via matching id; placeholder text is not a valid substitute for a label."
    source: "WCAG 1.3.1 / 4.1.2; W3C WAI Forms Tutorial / form instructions"
  - id: "color-plus-text"
    rule: "Strength indication must include a text label in addition to bar color; color alone is prohibited as the sole means of conveying the strength state."
    source: "WCAG 1.4.1 Use of Color; Section508.gov; W3C WAI password example; PatternFly design guidelines"
  - id: "relative-asset-paths-only"
    rule: "All asset references in the deployed page must use sibling-relative paths (e.g. \"style.css\"), never root-relative paths (\"/style.css\"), because a GitHub Pages project site is served under a /<repo-name>/ subpath where root-relative paths 404."
    source: "GitHub Pages project-site subpath serving; Maximilian Orlov GitHub Pages guide; existing pages.yml workflow_dispatch deploy model"
  - id: "no-security-guarantee-claim"
    rule: "The meter must be framed as a composition guide and must not present its output as a security gate; the label vocabulary and surrounding copy must not use words like 'secure' or 'safe', and must disclose that it checks composition rules only — not entropy, breach exposure, or guessability."
    source: "NIST SP 800-63B (predictable composition responses); Dropbox/zxcvbn limitations writeup; USENIX Sec '23 'No Single Silver Bullet'"
```

## Risks
### Composition rules nudge users toward predictable patterns

The most important risk is that the five composition rules (length, lowercase, uppercase, digit, symbol) do not produce strong passwords — they produce *predictably formatted* ones. NIST SP 800-63B-4 documents this directly: "composition rules encourage users to respond in very predictable ways to the requirements imposed, so attackers are likely to guess passwords that have been successful in the past." In practice this means users append `1!` to an existing word, capitalize the first letter only, or substitute `@` for `a` — all well-known attacker heuristics. A meter that turns green when those five boxes are checked has rewarded a structurally weak password. The feature must surface this limitation in its UX copy (e.g., the label should not read "strong" purely on rule satisfaction) and the spec must document that the scoring model is compositional-only, not entropy-based.

### False sense of security from composition-only scoring

Without a dictionary/breach-corpus check, `Password1!` scores as "strong" on any naive composition meter. Research consistently describes this as a "misleading sense of security": the meter uses simple regex-class detection rather than any model of guessability, so it cannot distinguish `Tr0ub4dor&3` (actually strong) from `Password1!` (trivially guessable). For this feature the trade-off is explicit — no external library, no network call — but the spec should acknowledge the limitation so that downstream consumers (e.g., a future auth flow) are not tempted to use the meter's output as a security gate. The meter is a UX affordance, not a security control.

### Color-only indication fails WCAG 1.4.1

A red/yellow/green bar is illegible to users with protanopia or deuteranopia (red-green colorblindness affects roughly 8 % of males). Under WCAG success criterion 1.4.1, color must not be the *sole* means of conveying information. This means the strength bar must be accompanied by the text label ("Weak", "Fair", "Strong") *and* ideally the bar itself should differ in width/fill or carry an icon so the state is distinguishable without color. Omitting the text label would be both an accessibility failure and a WCAG non-conformance.

### aria-live over-announcing on every keystroke

Using `aria-live="assertive"` on a region that updates on each keystroke will interrupt the screen reader mid-announcement repeatedly, creating an unusable experience. MDN explicitly marks this as an anti-pattern. `aria-live="polite"` defers announcements until the user pauses, which is the correct choice for a strength label. However, even `polite` can be chatty: there are documented browser/screen-reader bugs where a polite region update is repeated 3–6 times in Chrome and Firefox. Mitigation: keep the live region content minimal (just the band label, not the full checklist), set `aria-atomic="true"` so only one coherent string is announced, and do not also expose the checklist items as live regions. The password value itself must never appear in or near the live region.

### Strength labels can be gamed or misread as a security gate

Displaying "Strong" in green is psychologically powerful. Users (and developers integrating this component) may treat it as clearance to proceed, when the meter has no knowledge of password reuse, breach exposure, or context-specific guessability. The spec should constrain the label vocabulary to reflect composition state only and should not use the word "Secure." A note in the page copy (or the checklist itself) that the meter checks composition rules only — not whether the password has been exposed — is the responsible disclosure posture.

### Performance is not a real risk at this scale

Per-keystroke scoring across five regex checks on a short string is O(1) and well under 1 ms in any modern browser. This is not a risk that warrants architectural mitigation for a vanilla single-page implementation.

## Open Questions
### Scoring model: rule-based composition vs. entropy, and how to map to three bands

For a no-dependency vanilla implementation the practical choice is a **weighted rule-checklist score** rather than true entropy estimation. Pure Shannon entropy (`E = log₂(N^L)`) is easy to compute inline but is a poor proxy for human-generated passwords: a 22-character string of repeated characters scores high but is trivially crackable ([DEV Community — Rethinking Password Strength](https://dev.to/ghamadi/rethinking-password-strength-estimation-beyond-composition-rules-408i)). zxcvbn-style "sanitized entropy" (strip repeats/sequences, compute entropy on the residue) is more honest but requires ~800 KB of pattern data — incompatible with the no-dependency constraint.

The defensible middle ground for a three-band meter is a **point-threshold system over the five composition rules plus length tiers**:

- **Weak** — fewer than 3 rules satisfied, or length < 8.
- **Fair** — 3–4 rules satisfied AND length ≥ 8.
- **Strong** — all 5 rules satisfied AND length ≥ 12 (or ≥ 10 as a less strict floor).

This matches how Auth0 and similar providers segment their "low / fair / good" tiers ([Auth0 password-options docs](https://auth0.com/docs/authenticate/database-connections/password-options)) and is honest about what the meter actually tests. The key documented limitation: NIST SP 800-63B explicitly notes that composition rules produce predictable user behavior ("Password1!") and recommends against them as the primary security control in favor of blocklist-based checks ([NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b/passwords/)). The meter must surface this in its UX copy — it shows composition coverage, not crackability.

### Accessible password field and live-region pattern

The W3C WAI canonical example ([W3C — Complete Password Example](https://www.w3.org/WAI/tutorials/forms/examples/password/)) establishes the pattern:

- `<label for="password">` with matching `id` on the `<input>` — no `aria-label` shortcut; explicit `<label>` is required.
- A sibling `<span aria-live="polite">` (or `role="status"`, which implies `aria-live="polite"`) carries the strength text. `polite` — not `assertive` / `role="alert"` — is correct because the update is informational, not urgent; assertive would interrupt reading mid-word.
- The live region announces **the text label only** (e.g., "Weak", "Fair", "Strong") — the password value itself must never enter the live region.
- The W3C example updates on every `input` event; a short debounce (150–300 ms) reduces the announcement frequency for fast typists without breaking the pattern. The debounce window should be shorter than typical screen-reader queue flush intervals (~500 ms) so the announcement still arrives promptly after a pause.

### Color-only failure and WCAG 1.4.1

WCAG 1.4.1 (Use of Color) prohibits conveying information by color alone ([Section508.gov — Making Color Usage Accessible](https://www.section508.gov/create/making-color-usage-accessible/)). A red/yellow/green bar with no accompanying text fails for colorblind users. The visible text label ("Weak / Fair / Strong") paired with the bar satisfies 1.4.1; the bar's color is then a redundant enhancement, not the sole signal.

### Privacy and client-side-only constraint

Client-side-only scoring is the correct and complete answer for this feature. The documented best practice is never to transmit, log, or store the raw password value ([PMC — A Password Meter without Password Exposure](https://pmc.ncbi.nlm.nih.gov/articles/PMC7825399/)). Because the scoring runs entirely in the browser's JS event handler with no XHR/fetch calls and no `localStorage`/`sessionStorage` writes, the privacy requirement is satisfied by architecture. The remaining risk to document: browser autofill, password managers, and developer-tools console logging are outside the meter's control — the meter cannot prevent a user from pasting their password into DevTools.

### Performance on per-keystroke scoring

Scoring five regex checks plus a length comparison on each `input` event is O(n) in password length and completes in microseconds for any practical password length. No debouncing is required for performance; if debouncing is added, it is purely to reduce screen-reader announcement frequency.

### Known anti-patterns to guard against

1. **Composition rules nudge predictable patterns.** "Password1!" satisfies all five rules and scores "Strong" under a naive rule-sum. A length bonus (rewarding ≥ 12 chars) partially counteracts this; the UX copy should clarify the meter measures rule coverage, not entropy.
2. **False sense of security.** A three-band meter with no dictionary check will rate "Iloveyou1!" as "Strong". This is a known, documented limitation of composition-only meters ([USENIX Sec '23 — No Single Silver Bullet](https://www.usenix.org/system/files/sec23fall-prepub-291_wang-usenix.pdf)) and should be noted in a brief tooltip or helper text.
3. **Color-only indication** — addressed above under WCAG 1.4.1.
4. **Stale live-region state.** Clearing the input must reset the live region to empty or a neutral message; otherwise a screen reader may announce a stale "Strong" after the field is emptied.
