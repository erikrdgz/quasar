// Shared app state and small UI helpers used by every view.
import {save} from './store.js?v=44';
import {icon} from './icons.js?v=44';
import {reduceMotion} from './motion.js?v=44';

export const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const whole = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const exact = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2});
// Whole dollars for headline numbers (rounded toward zero so $0.40 left never shows as $1).
export const money = n => whole.format(Math.abs(n) < 0.5 ? 0 : n);
// Cents only when there are cents.
export const cash = n => (Math.round(n * 100) % 100 === 0 ? whole : exact).format(n);
export const compact = n => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 || n >= 100000 ? 0 : 1)}k` : whole.format(n);

export const ctx = {
  state: null,
  storageWarning: false,
  tab: 'today',
  plan() { return this.state.plans.find(p => p.id === this.state.currentPlanId) || this.state.plans[0]; },
  // Persist and redraw the visible view (and any open panel).
  commit({render = true} = {}) {
    save(this.state);
    if (render) this.refresh();
  },
  refresh() {},
};

let toastTimer = 0;
export function toast(text, undo) {
  const el = $('toast');
  el.replaceChildren(document.createTextNode(text));
  if (undo) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = icon('undo') + ' Undo';
    let used = false;
    button.onclick = () => { if (used) return; used = true; hideToast(); undo(); };
    el.append(button);
  }
  el.classList.remove('is-visible');
  void el.offsetWidth;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 7000 : 3200);
}
export function hideToast() { $('toast').classList.remove('is-visible'); }

export function modal(title, html) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  if (!$('modal').open) {
    $('modal').showModal();
    if (!reduceMotion()) $('modal').animate([{opacity: 0, transform: 'translateY(16px) scale(.97)'}, {opacity: 1, transform: 'none'}], {duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)'});
  }
}

// Every number input submits on Enter by dismissing the keyboard.
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing && e.target instanceof HTMLInputElement && e.target.type !== 'range' && !e.target.closest('form')) { e.preventDefault(); e.target.blur(); }
});
