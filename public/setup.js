// First-run setup: one full-screen question per step with Back, Skip and a
// percentage bar. Answers are written straight into the first plan, so going
// back shows what was entered, and any step can be skipped.
import {ctx, esc, money, cash} from './context.js?v=39';
import {icon} from './icons.js?v=39';
import {reduceMotion, slideToConfirm, movePill} from './motion.js?v=39';
import {blank, calculate, isUntouched, uid, usesTakeHome} from './finance.js?v=39';

import {CATEGORIES, STEPS, percentAt} from './setup-steps.js?v=39';
import {stateSelect} from './plans-view.js?v=39';

// A plain carousel: both pages slide one screen width on the same ease.
const PUSH_MS = 380, PUSH_EASE = 'cubic-bezier(.32,.72,0,1)';
const parse = text => { const n = Number(String(text).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
// Live thousands separators while typing, keeping up to two decimals.
function formatTyping(raw) {
  const clean = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  const [whole, decimals] = clean.split('.');
  const grouped = whole ? Number(whole.slice(0, 9)).toLocaleString('en-US') : '';
  return decimals !== undefined ? `${grouped || '0'}.${decimals.slice(0, 2)}` : grouped;
}
const shown = n => (n ? formatTyping(String(n)) : '');

// Expenses created by setup are matched by name, so Back and re-entry update them.
function expenseFor(plan, name) { return plan.expenses.find(e => e.name.toLowerCase() === name.toLowerCase()); }
function setExpense(plan, name, amount) {
  const existing = expenseFor(plan, name);
  if (amount > 0) { if (existing) existing.amount = amount; else plan.expenses.push({id: uid(), name, amount}); }
  else if (existing) plan.expenses.splice(plan.expenses.indexOf(existing), 1);
}

/**
 * @param root    the full-screen intro element
 * @param back    called when Back is pressed on the first step
 * @param finish  called with {locked} when setup ends
 */
export function startSetup(root, {back, finish}) {
  let index = 0;
  // Setup always fills a fresh, empty plan. Plans carried over from an earlier
  // version stay under All plans but never pre-fill these screens.
  // Coming back to an unfinished setup resumes the plan it started.
  const prefs = ctx.state.prefs, resumed = ctx.state.plans.find(p => p.id === prefs.setupPlanId);
  if (resumed) ctx.state.currentPlanId = resumed.id;
  else if (!isUntouched(ctx.plan())) {
    const fresh = blank();
    ctx.state.plans.unshift(fresh);
    ctx.state.currentPlanId = fresh.id;
  }
  prefs.setupPlanId = ctx.state.currentPlanId;
  ctx.commit({render: false});
  root.innerHTML = `<div class="setup">
    <div class="setup-top">
      <button type="button" class="round-button setup-back" aria-label="Back">${icon('chevron')}</button>
      <div class="setup-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100"><span></span></div>
      <span class="setup-pct" aria-hidden="true"></span>
      <button type="button" class="setup-skip">Skip</button>
    </div>
    <div class="setup-stage"></div>
  </div>`;
  const stage = root.querySelector('.setup-stage'), bar = root.querySelector('.setup-progress'), shell = root.querySelector('.setup');
  if (!reduceMotion()) root.querySelector('.setup-top').animate([{opacity: 0}, {opacity: 1}], {duration: 360, easing: 'ease-out'});
  root.querySelector('.setup-back').addEventListener('click', goBack);
  root.querySelector('.setup-skip').addEventListener('click', () => { skip(); });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); goBack(); } });

  const plan = () => ctx.plan();
  const save = () => ctx.commit({render: false});

  // Leaving setup glides the whole screen out before the next screen eases in.
  let leaving = false;
  function leave(direction) {
    leaving = true;
    if (reduceMotion()) return shell.animate([{opacity: 1}, {opacity: 0}], {duration: 160, fill: 'forwards'}).finished;
    return shell.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: `translateX(${-direction * 44}px)`}], {duration: 320, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'}).finished;
  }
  const done = result => { if (!leaving) leave(1).then(() => finish(result)); };
  function goBack() { if (leaving) return; if (index === 0) leave(-1).then(back); else show(index - 1, -1); }
  function next() { show(index + 1, 1); }
  // Skip means "doesn't apply": clear that answer, then move on.
  function skip() {
    const id = STEPS[index], cat = CATEGORIES.find(c => c.id === id);
    if (cat) { if (cat.id === 'car') plan().car = 0; else setExpense(plan(), cat.name, 0); save(); }
    if (id === 'summary') done({locked: false}); else next();
  }

  // Continue/Skip push the current screen out left as the next slides in from
  // the right; Back is the mirror. Both pages ride one spring, side by side, so
  // nothing overlaps or cross-fades. A tap mid-transition snaps it to its end.
  let moving = null;
  function show(i, direction) {
    if (leaving) return;
    if (moving) { moving.forEach(a => a.finish()); moving = null; }
    index = i;
    const id = STEPS[i], pct = percentAt(i);
    bar.querySelector('span').style.width = pct + '%';
    bar.setAttribute('aria-valuenow', String(pct));
    root.querySelector('.setup-pct').textContent = pct + '%';
    root.querySelector('.setup-skip').hidden = id === 'summary';

    const page = document.createElement('div');
    page.className = 'setup-page';
    page.innerHTML = id === 'name' ? nameHTML() : id === 'plan' ? planHTML() : id === 'summary' ? summaryHTML() : categoryHTML(CATEGORIES.find(c => c.id === id));
    const old = stage.querySelector('.setup-page:not(.is-leaving)');
    if (old) { old.classList.add('is-leaving'); old.inert = true; }
    stage.append(page);
    wire(id, page);

    if (reduceMotion()) {
      old?.remove();
      page.animate([{opacity: 0}, {opacity: 1}], {duration: 180});
      return;
    }
    if (!old) {
      // First screen: slide in from the side with nothing leaving.
      page.animate([{opacity: 0, transform: `translateX(${direction * 40}px)`}, {opacity: 1, transform: 'none'}], {duration: PUSH_MS, easing: PUSH_EASE, fill: 'backwards'});
      return;
    }
    const w = stage.clientWidth;
    const incoming = page.animate([{transform: `translateX(${direction * w}px)`}, {transform: 'translateX(0)'}], {duration: PUSH_MS, easing: PUSH_EASE, fill: 'backwards'});
    const outgoing = old.animate([{transform: 'translateX(0)'}, {transform: `translateX(${-direction * w}px)`}], {duration: PUSH_MS, easing: PUSH_EASE, fill: 'forwards'});
    moving = [incoming, outgoing];
    outgoing.finished.then(() => old.remove(), () => old.remove());
    incoming.finished.then(() => { if (moving?.[0] === incoming) moving = null; }, () => {});
  }

  function amountField(value, label, suffix = '/ month') {
    return `<label class="amount-field setup-amount"><span>$</span><input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="0" value="${shown(value)}" aria-label="${label}"><em>${suffix}</em></label>`;
  }

  function nameHTML() {
    return `<h1>What should we call you?</h1><p>Just a first name. It stays on this device.</p>
      <input class="intro-name" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" placeholder="Name" aria-label="Your name" value="${esc(ctx.state.prefs.name)}">
      <button type="button" class="button primary setup-next">Continue</button>`;
  }

  function planHTML() {
    const p = plan(), takeHome = usesTakeHome(p);
    return `<h1>Your plan</h1><p>Name it and add what you earn.</p>
      <label class="text-field"><span>Plan name</span><input class="setup-plan-name" type="text" maxlength="80" enterkeyhint="next" placeholder="Current job, New offer…" value="${p.name === 'My plan' ? '' : esc(p.name)}"></label>
      <div class="segmented setup-income-mode"><span class="pace-lens" aria-hidden="true"></span><button type="button" data-mode="salary" class="${takeHome ? '' : 'selected'}" aria-pressed="${!takeHome}">Salary / year</button><button type="button" data-mode="takehome" class="${takeHome ? 'selected' : ''}" aria-pressed="${takeHome}">Take-home / month</button></div>
      ${amountField(takeHome ? p.takeHome : p.salary, takeHome ? 'Monthly take-home pay' : 'Annual salary', takeHome ? '/ month' : '/ year')}
      <div class="setup-income-extra">${incomeExtra(takeHome)}</div>
      <button type="button" class="button primary setup-next">Continue</button>`;
  }

  // Salary mode picks the state for the tax estimate; take-home needs no estimate.
  function incomeExtra(takeHome) {
    return takeHome ? '<p class="fine">What lands in your account each month after taxes and deductions.</p>' : stateSelect(plan().state);
  }

  function categoryHTML(cat) {
    const value = cat.id === 'car' ? plan().car : expenseFor(plan(), cat.name)?.amount || 0;
    return `<span class="setup-icon">${icon(cat.icon)}</span><h1>${cat.title}</h1><p>${cat.hint}</p>
      ${amountField(value, `${cat.title} per month`)}
      <button type="button" class="button primary setup-next">Continue</button>
      <button type="button" class="text-button setup-finish-early">I'll add the rest myself</button>`;
  }

  function summaryHTML() {
    const p = plan(), c = calculate(p);
    const rows = [`<div><span>Take-home</span><b>${cash(c.net)}</b></div>`];
    if (p.expenses.length) rows.push(`<div class="minus"><span>Bills (${p.expenses.length})</span><b>−${cash(c.expenses)}</b></div>`);
    if (p.car) rows.push(`<div class="minus"><span>Car</span><b>−${cash(p.car)}</b></div>`);
    return `<h1>Here's your month</h1><p>${c.net > 0 ? 'What you have to spend after bills.' : 'Add your income in Plans any time to see what\'s left.'}</p>
      <div class="big-number setup-left">${money(c.left)}</div>
      <div class="group rows">${rows.join('')}</div>
      ${c.left > 0 ? `<p class="fine">Lock it in to start tracking purchases against this number, or explore first.</p><div class="setup-lock"></div><button type="button" class="button quiet setup-explore">Explore first</button>` : `<button type="button" class="button primary setup-explore">Open Quasar</button>`}`;
  }

  function wire(id, page) {
    const continueButton = page.querySelector('.setup-next');
    const enter = (input, action) => input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); action(); } });
    const amount = page.querySelector('.setup-amount input');
    // Width follows the digits (plus room for the clear button once there's a value).
    const fit = () => {
      if (!amount) return;
      const n = amount.value.length, editing = document.activeElement === amount && n > 0;
      amount.style.fontSize = n > 7 ? '42px' : n > 5 ? '48px' : '';
      amount.style.width = `calc(${Math.max(1, n) + 0.2}ch${editing ? ' + 40px' : ''})`;
    };
    if (amount) {
      amount.addEventListener('input', () => { amount.value = formatTyping(amount.value); fit(); });
      amount.addEventListener('focus', fit);
      amount.addEventListener('blur', fit);
      fit();
    }

    if (id === 'name') {
      const input = page.querySelector('input');
      const go = () => { ctx.state.prefs.name = input.value.trim().slice(0, 40); save(); next(); };
      continueButton.addEventListener('click', go);
      enter(input, go);
      input.focus({preventScroll: true});
    } else if (id === 'plan') {
      const name = page.querySelector('.setup-plan-name'), seg = page.querySelector('.setup-income-mode');
      const store = () => {
        const p = plan(), value = parse(amount.value);
        p.name = name.value.trim().slice(0, 80) || 'My plan';
        if (usesTakeHome(p)) p.takeHome = Math.min(1e6, value); else p.salary = Math.min(1e6, value);
        save();
      };
      name.addEventListener('input', store);
      page.addEventListener('change', e => { if (e.target.matches('[data-state]')) { plan().state = e.target.value; save(); } });
      amount.addEventListener('input', store);
      seg.addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        plan().incomeMode = b.dataset.mode;
        save();
        const mode = b.dataset.mode === 'takehome';
        seg.querySelectorAll('button').forEach(x => { const on = x === b; x.classList.toggle('selected', on); x.setAttribute('aria-pressed', String(on)); });
        movePill(seg);
        amount.value = shown(mode ? plan().takeHome : plan().salary);
        fit();
        amount.setAttribute('aria-label', mode ? 'Monthly take-home pay' : 'Annual salary');
        page.querySelector('.setup-amount em').textContent = mode ? '/ month' : '/ year';
        page.querySelector('.setup-income-extra').innerHTML = incomeExtra(mode);
        amount.focus({preventScroll: true});
      });
      requestAnimationFrame(() => movePill(seg));
      enter(name, () => amount.focus({preventScroll: true}));
      enter(amount, () => { store(); next(); });
      continueButton.addEventListener('click', () => { store(); next(); });
      (name.value ? amount : name).focus({preventScroll: true});
    } else if (id === 'summary') {
      const lock = page.querySelector('.setup-lock');
      if (lock) slideToConfirm(lock, () => done({locked: true}), {label: 'slide to lock in', done: 'Locked in', icon: icon('arrow'), doneIcon: icon('lock')});
      page.querySelector('.setup-explore').addEventListener('click', () => done({locked: false}));
    } else {
      const cat = CATEGORIES.find(c => c.id === id);
      const store = () => { const value = Math.min(1e6, parse(amount.value)); if (cat.id === 'car') plan().car = value; else setExpense(plan(), cat.name, value); save(); };
      amount.addEventListener('input', store);
      enter(amount, () => { store(); next(); });
      continueButton.addEventListener('click', () => { store(); next(); });
      page.querySelector('.setup-finish-early').addEventListener('click', () => { store(); show(STEPS.length - 1, 1); });
      amount.focus({preventScroll: true});
    }
  }

  show(0, 1);
}
