// App-wide text field behavior:
//  • while a field is being edited and has text, a clear (×) button sits at its
//    right edge; clearing keeps focus so the keyboard stays up,
//  • focusing a field puts the cursor at the end, not the start,
//  • number fields ([data-num]) accept only digits and one decimal point.
import {icon} from './icons.js?v=37';

const TEXT_FIELDS = 'input[type=text], input[type=search], input[type=email], input[type=tel], input[type=url], input:not([type])';
const isTextField = el => el instanceof HTMLInputElement && el.matches(TEXT_FIELDS) && !el.matches('[data-no-clear]');

let current = null, freshFocus = null;
const button = document.createElement('button');
button.type = 'button';
button.className = 'field-clear';
button.tabIndex = -1;
button.hidden = true;
button.setAttribute('aria-label', 'Clear text');
button.innerHTML = icon('close');
// Keep focus in the field when the button is pressed.
button.addEventListener('pointerdown', e => e.preventDefault());
button.addEventListener('mousedown', e => e.preventDefault());
button.addEventListener('click', () => {
  if (!current) return;
  current.value = '';
  current.dispatchEvent(new Event('input', {bubbles: true}));
  current.focus({preventScroll: true});
  place();
});

// Dialogs render in the top layer, so the button has to live inside them.
const hostOf = input => input.closest('dialog') || document.body;

function place() {
  const input = current;
  if (!input || !input.isConnected || !input.value || input.readOnly || input.disabled) { button.hidden = true; input?.classList.remove('has-clear'); return; }
  // Don't chase a field while its screen is sliding; show it once it settles.
  if (input.closest('.setup-page')?.getAnimations().some(a => a.playState === 'running')) { button.hidden = true; return; }
  const r = input.getBoundingClientRect();
  if (!r.width) { button.hidden = true; return; }
  if (button.parentElement !== hostOf(input)) hostOf(input).append(button);
  input.classList.add('has-clear');
  const size = 28;
  button.style.left = `${Math.round(r.right - size - 6)}px`;
  button.style.top = `${Math.round(r.top + (r.height - size) / 2)}px`;
  button.hidden = false;
}

function toEnd(input) {
  if (document.activeElement !== input || input.selectionStart !== input.selectionEnd) return;
  try { input.setSelectionRange(input.value.length, input.value.length); } catch { /* not a text field */ }
}

document.addEventListener('focusin', e => {
  const input = e.target;
  if (!isTextField(input)) return;
  current = input;
  freshFocus = input;
  // Keyboard or programmatic focus: move to the end once the browser has placed the cursor.
  setTimeout(() => toEnd(input), 0);
  requestAnimationFrame(place);
});
// A tap that focuses a field ends with the cursor at the end; later taps can place it anywhere.
document.addEventListener('pointerup', e => {
  if (freshFocus && e.target === freshFocus) { const input = freshFocus; setTimeout(() => toEnd(input), 0); }
  freshFocus = null;
}, true);
document.addEventListener('focusout', e => {
  if (e.target !== current) return;
  current.classList.remove('has-clear');
  current = null;
  button.hidden = true;
});
document.addEventListener('input', e => {
  const input = e.target;
  if (input instanceof HTMLInputElement && input.matches('[data-num]')) {
    const clean = input.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    if (clean !== input.value) input.value = clean;
  }
  if (input === current) place();
}, true);
addEventListener('resize', place);
document.addEventListener('scroll', () => { if (current) place(); }, true);
// Panels and pages animate fields into place; follow them for a moment after focus.
document.addEventListener('focusin', () => { let frames = 0; const follow = () => { if (!current || ++frames > 60) return; place(); requestAnimationFrame(follow); }; requestAnimationFrame(follow); });
