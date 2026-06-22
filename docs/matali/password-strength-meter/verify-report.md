# VERIFY Report — Password-Strength Meter (P4)

Provider: `verify-parallel` (mainloop) · profile production · gate `mixed`.

> **How this was verified.** The probe workflow's per-criterion verdict path **failed to run**
> (finding V-1 below: it dispatched `agentType: 'verifier'`, which is not registered — the agent is
> `matali:verifier`). All 11 verdict probes errored, so the workflow returned `verdicts: []`. Per R10
> (degrade, never fake), the orchestrator performed the authoritative verification itself via a
> **main-loop Chrome DevTools MCP drive** against the running page (`http://127.0.0.1:18920…`), typing
> each band-representative password through the real input→render→debounced-live path and asserting the
> DOM. The workflow's *exploration* stage (which used a working browser-capable agent) succeeded and
> surfaced 8 findings, captured below.

## Verdicts

All 11 acceptance criteria **MET** (evidence = live Chrome drive + `node --test` 26/26). Re-verified
after the a11y fix-cycle; no regression.

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC1 | Empty input is Neutral (+ stale-reset) | met | empty & cleared-after-strong → label "", bar `neutral` 0%, live "" |
| AC2 | `len<8` is Weak | met | `Ab1!` → "Weak" |
| AC3 | `len>=8` mid-variety is Fair | met | `abcdefg8`, `Password1!` → "Fair" |
| AC4 | `len>=12` + all classes is Strong | met | `MyDogR3x!2024` → "Strong" |
| AC5 | `Password1!` is Fair not Strong (len-12 gate) | met | browser label "Fair" + unit `band==='fair'` |
| AC6 | Live 5-rule checklist matches `rules` | met | per-input rule states match `scorePassword.rules`; markers ○/✓ + SR status text |
| AC7 | Color never sole signal; explicit label | met | text band label + bar color + marker glyph; `label[for=pw]`→#pw |
| AC8 | Polite atomic live region; value never leaked | met | `role=status aria-live=polite aria-atomic=true`; live text never contained the typed value in any state |
| AC9 | Zero exfiltration | met | source guard tests (no fetch/console/storage); confirmed in `score.js` + `index.html` |
| AC10 | Composition-only disclaimer; no "secure"/"safe" | met | disclaimer present; body text has neither word |
| AC11 | `scorePassword` pure + full node coverage | met | `node --test` 26/26 (every band, both thresholds, all flags, purity, whitespace) |

## Regressions

None. After the fix-cycle the full node suite is 26/26 and the Chrome drive shows every band/flag
behaving as before, plus the new whitespace handling (`"        "` → Weak).

## Exploration findings

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| **V-1** | HIGH | **matali bug:** `verify-probes.workflow.js` uses `agentType: 'verifier'` (unregistered) instead of `matali:verifier`; all 11 verdict probes errored → empty verdicts. | **fix-forward in matali** (namespace the agentType). Worked around via main-loop drive. |
| V-2 | HIGH | `aria-checked` on `<li>` with no `role` → invalid ARIA. | **FIXED** — removed; state now via `.satisfied` + glyph + SR status text. |
| V-3 | HIGH | Pending checklist text contrast 3.21:1 < AA 4.5:1. | **FIXED** — `--pending` → `#5a616b` (≈5.9:1). |
| V-4 | MED | Whitespace satisfied "A symbol" (`/[^A-Za-z0-9]/`). | **FIXED** — regex → `/[^A-Za-z0-9\s]/`; `"8 spaces"` now Weak; unit tests added. |
| V-5 | MED | Marker glyph never changed `○`→`✓` (color-only marker). | **FIXED** — `render()` swaps the glyph per rule (non-color cue). |
| V-9 | LOW | `strength-label` redundant `aria-hidden="false"` + dual announce path. | **FIXED** — set `aria-hidden="true"` (visual-only; live region is the SR channel). |
| V-6 | LOW | No dark mode (`prefers-color-scheme`). | deferred (not a spec requirement) → backlog. |
| V-7 | LOW | Missing `<meta name="description">` (SEO). | deferred (out of spec scope) → backlog. |
| V-8 | LOW | Password input not inside a `<form>`. | deferred (standalone meter, not a login form; wrapping risks Enter-submit) → backlog. |

## Summary

**11/11 acceptance criteria met.** VERIFY was `degraded` only because the pipeline's verdict path is
broken (V-1) — the orchestrator's main-loop Chrome drive provided authoritative verification (R10:
degrade, never fake). VERIFY's exploration caught 5 real product defects (2 HIGH a11y), all **fixed** in
a BUILD micro-cycle and re-verified; 3 low findings deferred to backlog. Substantive outcome: **pass**.
