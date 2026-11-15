// App-wide text field behavior:
//  • focusing a field puts the cursor at the end, not the start,
//  • number fields ([data-num]) accept only digits and one decimal point,
//  • the field being edited stays in the space above the on-screen keyboard.
// (Clearing is left to the native keyboard's own clear controls.)
const TEXT_FIELDS = 'input[type=text], input[type=search], input[type=email], input[type=tel], input[type=url], input:not([type])';
const isTextField = el => el instanceof HTMLInputElement && el.matches(TEXT_FIELDS);

let freshFocus = null;
function toEnd(input) {
  if (document.activeElement !== input || input.selectionStart !== input.selectionEnd) return;
  try { input.setSelectionRange(input.value.length, input.value.length); } catch { /* not a text field */ }
}
document.addEventListener('focusin', e => {
  const input = e.target;
  if (!isTextField(input)) return;
  freshFocus = input;
  // Keyboard or programmatic focus: move to the end once the browser has placed the cursor.
  setTimeout(() => toEnd(input), 0);
});
// A tap that focuses a field ends with the cursor at the end; later taps can place it anywhere.
document.addEventListener('pointerup', e => {
  if (freshFocus && e.target === freshFocus) { const input = freshFocus; setTimeout(() => toEnd(input), 0); }
  freshFocus = null;
}, true);
document.addEventListener('input', e => {
  const input = e.target;
  if (input instanceof HTMLInputElement && input.matches('[data-num]')) {
    const clean = input.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    if (clean !== input.value) input.value = clean;
  }
}, true);

// Keyboard awareness. The visual viewport is the part of the screen above the
// keyboard. Its size and offset are exposed as --vvh / --vvt (full-screen
// overlays like setup size themselves to it) and --kb (the keyboard's height,
// which scrolling panels add as bottom padding). The field being edited, or its
// row ([data-reveal]: a bill's name, amount and slider), is scrolled into view.
const vv = globalThis.visualViewport;
const keyboardHeight = () => (vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0);
const editing = () => { const el = document.activeElement; return isTextField(el) ? el : null; };

export function reveal(el) {
  if (!el?.isConnected) return;
  const target = el.closest('[data-reveal]') || el;
  const scroller = target.closest('.panel-body, .setup-page') || document.scrollingElement;
  // Setup screens are sized to the visible area and fit without scrolling.
  if (scroller.classList?.contains('setup-page')) {
    if (scroller.scrollHeight <= scroller.clientHeight + 1) { scroller.scrollTop = 0; return; }
  }
  const page = scroller === document.scrollingElement;
  const area = page ? {top: document.querySelector('.top')?.getBoundingClientRect().bottom ?? 0, bottom: innerHeight} : scroller.getBoundingClientRect();
  const viewTop = vv ? vv.offsetTop : 0, viewBottom = vv ? vv.offsetTop + vv.height : innerHeight;
  const top = Math.max(viewTop, area.top) + 12, bottom = Math.min(viewBottom, area.bottom) - 16;
  const r = target.getBoundingClientRect();
  let dy = 0;
  if (r.bottom > bottom) dy = r.bottom - bottom;
  if (r.top - dy < top) dy = r.top - top;
  // Instant: a smooth scroll races iOS's own keyboard scrolling and the cursor lags.
  if (Math.abs(dy) > 1) scroller.scrollBy({top: dy, behavior: 'auto'});
}

function onViewport() {
  const root = document.documentElement.style;
  root.setProperty('--kb', `${Math.round(keyboardHeight())}px`);
  document.documentElement.classList.toggle('keyboard-open', keyboardHeight() > 80);
  root.setProperty('--vvh', `${Math.round(vv ? vv.height : innerHeight)}px`);
  root.setProperty('--vvt', `${Math.round(vv ? vv.offsetTop : 0)}px`);
  const el = editing();
  if (el) reveal(el);
}
onViewport();
vv?.addEventListener('resize', onViewport);
vv?.addEventListener('scroll', onViewport);
addEventListener('resize', onViewport);
// Reveal on focus, then again once the keyboard has finished sliding up.
document.addEventListener('focusin', e => {
  if (!editing() || e.target !== editing()) return;
  const el = e.target;
  setTimeout(() => { if (document.activeElement === el) reveal(el); }, 60);
  setTimeout(() => { if (document.activeElement === el) reveal(el); }, 420);
  setTimeout(() => { if (document.activeElement === el) reveal(el); }, 800);
});
