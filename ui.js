// ui.js — DOM glue: binds the scorer to the password-strength UI.
// Single source of truth for scoring lives in scorer.js (F11).
// No network, no storage, no logging of the value (F2).

import { evaluate } from './scorer.js';

const TIER_CLASSES = ['tier-weak', 'tier-fair', 'tier-strong'];
const TIER_FILL = { Weak: 1, Fair: 2, Strong: 3 };

function swapTierClass(el, tier) {
  el.classList.remove(...TIER_CLASSES);
  if (tier) {
    el.classList.add('tier-' + tier.toLowerCase());
  }
}

function init() {
  const input        = document.getElementById('password-input');
  const toggleBtn    = document.getElementById('toggle-visibility');
  const bar          = document.querySelector('.bar');
  const barSegments  = Array.from(bar.querySelectorAll('.bar-segment'));
  const strengthLabel = document.getElementById('strength-label');
  const ruleList     = document.getElementById('rule-list');
  const statusRegion = document.getElementById('strength-status');

  // ---- Show/hide toggle (behavior 4) ----
  toggleBtn.addEventListener('click', () => {
    const isShowing = input.type === 'text';
    input.type = isShowing ? 'password' : 'text';
    const nowShowing = input.type === 'text';
    toggleBtn.setAttribute('aria-pressed', String(nowShowing));
    toggleBtn.textContent = nowShowing ? 'Hide password' : 'Show password';
  });

  // ---- Live-region state (behavior 3) ----
  let lastTier = null;
  let liveTimer = null;

  // Render the bar fill, label text/class, and checklist met/not-met state for a value.
  // Pure DOM sync (no announcement) so it can be reused for the initial render in init()
  // and the post-clear render in the input handler — keeping both empty states consistent.
  function render(value) {
    const { rules, tier } = evaluate(value);

    // ---- Bar (synchronous) ----
    const fillCount = TIER_FILL[tier];
    barSegments.forEach((seg, i) => {
      if (i < fillCount) {
        seg.classList.add('is-filled');
      } else {
        seg.classList.remove('is-filled');
      }
    });
    swapTierClass(bar, tier);

    // ---- Strength label (synchronous) ----
    strengthLabel.textContent = tier;
    swapTierClass(strengthLabel, tier);

    // ---- Rule checklist (synchronous) ----
    ruleList.querySelectorAll('li[data-rule]').forEach(li => {
      const ruleName = li.dataset.rule;
      const met = !!rules[ruleName];
      li.classList.toggle('is-met', met);
      const stateSpan = li.querySelector('[data-rule-state]');
      if (stateSpan) stateSpan.textContent = met ? 'Met' : 'Not met';
    });

    return tier;
  }

  // ---- Input handler (behavior 1 & 2 & 3) ----
  input.addEventListener('input', () => {
    const value = input.value;

    // When the field is cleared, reset the show/hide toggle back to hidden (fix 4).
    // The label/bar/checklist still render via the normal path so empty reflects
    // the scorer ('' → "Weak"), per AC5.
    if (value === '') {
      input.type = 'password';
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.textContent = 'Show password';
    }

    const tier = render(value);

    // ---- Live region (debounced, tier-change-gated) (behavior 3) ----
    if (tier !== lastTier) {
      if (liveTimer !== null) {
        clearTimeout(liveTimer);
      }
      liveTimer = setTimeout(() => {
        statusRegion.textContent = 'Password strength: ' + tier;
        liveTimer = null;
      }, 350);
      lastTier = tier;
    }
  });

  // ---- Initial render (consistent empty state) ----
  // Render the empty state once at load so a clean page matches the post-clear state
  // ('' → "Weak", 1 filled segment, all 5 rules "Not met"). Seed lastTier to the
  // rendered tier WITHOUT scheduling a live-region write, so #strength-status stays
  // empty at load and only announces on subsequent tier changes (F6 / AC9).
  lastTier = render(input.value);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
