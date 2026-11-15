// Plans: compare salary scenarios. Each tile expands into its editor; a live
// "left / month" readout in the panel header shows the effect while you drag.
import {ctx, $, esc, money, cash, compact, toast} from './context.js?v=22';
import {icon} from './icons.js?v=22';
import {openPanel} from './expand.js?v=22';
import {syncRange} from './sliders.js?v=22';
import {attachSwipe} from './swipe.js?v=22';
import {movePill, slideToConfirm, springIn, springText} from './motion.js?v=22';
import {calculate, uid, spendingLimit, minimumSalary, carPriceRange, CAR_PRICE_ASSUMPTIONS, usesTakeHome, taxes} from './finance.js?v=22';
import {createBudget, lockIn} from './ledger.js?v=22';
import {persist} from './store.js?v=22';

const numeric = el => Math.max(0, Number(el.value) || 0);
const rentOf = plan => plan.expenses.find(e => /\brent\b/i.test(e.name));
const lockedHere = plan => ctx.state.budget?.planId === plan.id;
// The budget is "in sync" when locking again would change nothing.
function inSync(plan) {
  const b = ctx.state.budget;
  if (!lockedHere(plan)) return false;
  const fresh = createBudget(plan);
  return fresh.spendable === b.spendable && fresh.income === b.income && JSON.stringify(fresh.bills.map(x => [x.name, x.amount])) === JSON.stringify(b.bills.map(x => [x.name, x.amount]));
}

export function renderPlans() {
  const plan = ctx.plan(), c = calculate(plan), grid = $('plansGrid');
  if (document.activeElement !== $('planName')) $('planName').value = plan.name;
  const rent = rentOf(plan), takeHomeMode = usesTakeHome(plan);
  const denom = Math.max(c.net, c.expenses + plan.car + c.savings, 1);
  const alloc = [[c.expenses, '#5b5b65'], [plan.car, '#9b9ba6'], [c.savings, '#4fd18b'], [Math.max(0, c.left), '#ffffff']];
  const synced = inSync(plan), locked = lockedHere(plan);
  const goalsActive = c.goals.filter(g => g.remaining > 0).length;

  grid.innerHTML = `
    <button type="button" class="tile hero span-2 ${c.left < 0 ? 'is-over' : ''}" data-tile="p-hero">
      <div class="tile-head"><span class="tile-label">Left each month</span>${locked ? `<span class="status" style="--status:${synced ? 'var(--good)' : 'var(--warn)'}">${synced ? 'Your budget' : 'Changed'}</span>` : ''}</div>
      <span class="hero-value" id="planLeft"></span>
      <div class="allocation" aria-hidden="true">${alloc.map(([n, color]) => `<span style="flex:${Math.max(0, n) / denom};background:${color}"></span>`).join('')}</div>
      <div class="hero-meta"><span>${c.left >= 0 ? `${money(c.left * 12 / 52)} / week` : `Cut ${money(-c.left)} to balance`}</span><span>${money(c.left * 12)} / year</span></div>
    </button>
    <button type="button" class="tile" data-tile="p-income">
      <div class="tile-head"><span class="tile-icon">${icon('income')}</span><span class="tile-label">Income</span></div>
      <div class="tile-foot">${takeHomeMode ? `<span class="tile-value">${money(plan.takeHome)}</span><span class="tile-sub">take-home / month</span>` : `<span class="tile-value">${compact(plan.salary)}</span><span class="tile-sub">salary / year</span>`}</div>
    </button>
    <button type="button" class="tile" data-tile="p-net">
      <div class="tile-head"><span class="tile-icon">${icon('receipt')}</span><span class="tile-label">Take-home</span></div>
      <div class="tile-foot"><span class="tile-value">${money(c.net)}</span><span class="tile-sub">${takeHomeMode ? 'entered / month' : `/ month · ${c.tax.total && plan.salary ? Math.round(c.tax.total / plan.salary * 100) : 0}% tax`}</span></div>
    </button>
    <button type="button" class="tile" data-tile="p-rent">
      <div class="tile-head"><span class="tile-icon">${icon('home')}</span><span class="tile-label">Rent</span></div>
      <div class="tile-foot">${rent ? `<span class="tile-value">${money(rent.amount)}</span><span class="tile-sub">/ month</span>` : `<span class="tile-sub" style="white-space:normal">Add rent</span>`}</div>
    </button>
    <button type="button" class="tile" data-tile="p-car">
      <div class="tile-head"><span class="tile-icon">${icon('car')}</span><span class="tile-label">Car</span></div>
      <div class="tile-foot"><span class="tile-value">${money(plan.car)}</span><span class="tile-sub">/ month</span></div>
    </button>
    <button type="button" class="tile span-2 short" data-tile="p-bills">
      <div class="tile-head"><span class="tile-icon">${icon('bills')}</span><span class="tile-label">Monthly bills</span><span class="tile-chevron">${icon('chevron')}</span></div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:auto;padding-top:12px"><span class="tile-sub" style="margin:0;white-space:normal">${plan.expenses.length ? esc(plan.expenses.slice(0, 4).map(e => e.name || 'Untitled').join(' · ')) + (plan.expenses.length > 4 ? ` +${plan.expenses.length - 4}` : '') : 'No bills yet'}</span><span class="tile-value">${money(c.expenses)}</span></div>
    </button>
    <button type="button" class="tile span-2 short" data-tile="p-goals">
      <div class="tile-head"><span class="tile-icon">${icon('goals')}</span><span class="tile-label">Savings goals</span><span class="tile-chevron">${icon('chevron')}</span></div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:auto;padding-top:12px"><span class="tile-sub" style="margin:0">${plan.goals.length ? `${goalsActive} active goal${goalsActive === 1 ? '' : 's'}` : 'Save up for something'}</span><span class="tile-value">${money(c.savings)}<small>/ mo</small></span></div>
    </button>
    <button type="button" class="tile ${synced ? 'outline' : 'accent'} span-2 short" data-tile="p-lock">
      <div class="tile-head"><span class="tile-icon">${icon('lock')}</span><span class="tile-label">${synced ? 'Locked in as your budget' : locked ? 'Update your budget' : 'Lock in this plan'}</span></div>
      <div class="tile-foot"><span class="tile-sub" style="white-space:normal">${synced ? `Tracking since ${new Date(ctx.state.budget.lockedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}. Log purchases from Today.` : locked ? `This plan changed. Update to track with ${money(c.left)} a month.` : `Track this month with ${money(c.left)} to spend.`}</span></div>
    </button>`;
  springText('plan-left', $('planLeft'), c.left, money);
}

// Live readout shown in every plan panel header.
function readout(api) {
  const update = () => {
    const c = calculate(ctx.plan());
    api.setAside(`<b id="asideLeft"></b>left / month`);
    springText('aside-left', api.layer.querySelector('#asideLeft'), c.left, money);
  };
  return update;
}

function setLimits(body) {
  const plan = ctx.plan();
  const salary = body.querySelector('#salarySlider');
  if (salary) {
    const floor = minimumSalary(plan), min = Math.ceil(floor / 5000) * 5000, max = Math.ceil(Math.max(300000, plan.salary, min) / 5000) * 5000;
    Object.assign(salary, {min, max, step: 5000});
    salary.value = plan.salary;
    body.querySelector('#salaryMin').textContent = compact(min);
    body.querySelector('#salaryMax').textContent = compact(max);
    syncRange(salary);
  }
  const car = body.querySelector('#carSlider');
  if (car) {
    const cap = spendingLimit(plan, 'car');
    car.max = Math.floor(cap); car.value = plan.car; syncRange(car);
    body.querySelector('#carMax').textContent = money(cap);
    const range = carPriceRange(plan.car);
    body.querySelector('#carPrice').textContent = plan.car > 0 ? `${money(range.low)}–${money(range.high)}` : money(0);
  }
  for (const row of body.querySelectorAll('[data-expense]')) {
    const e = plan.expenses.find(x => x.id === row.dataset.expense);
    if (!e) continue;
    const max = spendingLimit(plan, e.id), input = row.querySelector('input[type=number]'), range = row.querySelector('input[type=range]');
    input.max = max; if (document.activeElement !== input) input.value = e.amount;
    range.max = Math.floor(max); range.value = e.amount; syncRange(range);
    row.querySelector('.spending-max').textContent = money(max);
  }
}

function expenseRow(e) {
  return `<div class="expense-item" data-expense="${e.id}"><div class="row"><input class="expense-name" data-field="name" value="${esc(e.name)}" maxlength="80" aria-label="Bill name" enterkeyhint="done"><span class="money-input"><span>$</span><input data-field="amount" type="number" min="0" step="0.01" inputmode="decimal" value="${e.amount}" aria-label="${esc(e.name)} monthly amount" enterkeyhint="done"></span><button type="button" class="remove" data-remove="${e.id}" aria-label="Remove ${esc(e.name)}">${icon('close')}</button></div><input type="range" min="0" step="1" data-field="amount" aria-label="${esc(e.name)} slider" value="${e.amount}"><div class="range-labels"><span>$0</span><span class="spending-max"></span></div></div>`;
}

// Shared input handling for bill rows (bills panel and rent panel).
function wireExpenses(body, afterChange) {
  const edit = ev => {
    const row = ev.target.closest('[data-expense]'), field = ev.target.dataset.field;
    if (!row || !field) return;
    const plan = ctx.plan(), item = plan.expenses.find(x => x.id === row.dataset.expense);
    if (!item) return;
    if (field === 'name') { item.name = ev.target.value; ctx.commit(); return; }
    const requested = numeric(ev.target), limit = spendingLimit(plan, item.id);
    item.amount = Math.min(requested, limit);
    if (item.amount !== requested && ev.type === 'change') toast('That would leave nothing to spend');
    if (ev.target.type === 'number' && ev.type === 'change') ev.target.value = item.amount;
    ctx.commit();
    afterChange();
  };
  body.addEventListener('input', ev => { if (ev.target.type !== 'number') edit(ev); else if (ev.target.value !== '') edit(ev); });
  body.addEventListener('change', ev => { if (ev.target.type === 'number') edit(ev); });
}

function openIncome(origin) {
  openPanel(origin, {
    title: 'Income',
    build(body, api) {
      const update = readout(api);
      body.innerHTML = `<div class="segmented" id="incomeMode"><span class="pace-lens" aria-hidden="true"></span><button type="button" data-mode="salary">From salary</button><button type="button" data-mode="takehome">Take-home</button></div><div id="incomeFields" style="display:grid;gap:16px"></div>`;
      const seg = body.querySelector('#incomeMode'), fields = body.querySelector('#incomeFields');
      function draw() {
        const plan = ctx.plan(), mode = plan.incomeMode;
        seg.querySelectorAll('button').forEach(b => { const on = b.dataset.mode === mode; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); });
        requestAnimationFrame(() => movePill(seg));
        fields.innerHTML = mode === 'salary' ? `
          <div><label class="amount-field"><span>$</span><input id="salaryInput" type="number" inputmode="numeric" min="0" max="1000000" step="1000" value="${plan.salary}" aria-label="Annual salary" enterkeyhint="done"></label><p class="fine" style="margin-top:8px">per year, before tax</p></div>
          <div><input id="salarySlider" type="range" aria-label="Annual salary slider"><div class="range-labels"><span id="salaryMin"></span><span id="salaryMax"></span></div></div>
          <div class="group switch-row"><span>Colorado FAMLI<small>0.44% paid-leave premium</small></span><label class="switch"><input type="checkbox" role="switch" id="famli" ${plan.famli ? 'checked' : ''}><i></i></label></div>
          <p class="fine">Estimated for a 2026 single filer in Colorado with the standard deduction. If you live elsewhere or have pre-tax deductions like a 401(k) or health insurance, use Take-home for an exact number.</p>` : `
          <div><label class="amount-field"><span>$</span><input id="takeHomeInput" type="number" inputmode="decimal" min="0" max="1000000" step="1" value="${plan.takeHome}" aria-label="Monthly take-home pay" enterkeyhint="done"></label><p class="fine" style="margin-top:8px">per month, after taxes and deductions</p></div>
          <p class="fine">Use what actually lands in your account in a typical month. Paid every two weeks? One paycheck × 26 ÷ 12.</p>`;
        setLimits(body);
        update();
      }
      seg.addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        const plan = ctx.plan();
        if (b.dataset.mode === plan.incomeMode) return;
        if (b.dataset.mode === 'takehome' && !plan.takeHome) plan.takeHome = Math.round(calculate({...plan, incomeMode: 'salary'}).net + plan.other);
        plan.incomeMode = b.dataset.mode;
        ctx.commit();
        draw();
      });
      fields.addEventListener('input', e => {
        const plan = ctx.plan();
        if (e.target.id === 'salaryInput') { const v = numeric(e.target); if (v >= minimumSalary(plan) && v <= 1e6) { plan.salary = v; ctx.commit(); setLimits(body); update(); } }
        else if (e.target.id === 'salarySlider') { plan.salary = Math.max(minimumSalary(plan), numeric(e.target)); body.querySelector('#salaryInput').value = plan.salary; ctx.commit(); setLimits(body); update(); }
        else if (e.target.id === 'takeHomeInput') { plan.takeHome = Math.min(1e6, numeric(e.target)); ctx.commit(); update(); }
      });
      fields.addEventListener('change', e => {
        const plan = ctx.plan();
        if (e.target.id === 'salaryInput') {
          const v = numeric(e.target), min = minimumSalary(plan);
          plan.salary = Math.max(min, Math.min(1e6, v));
          if (plan.salary !== v) toast(v < min ? 'Minimum income to cover this plan' : 'Maximum $1,000,000');
          e.target.value = plan.salary; ctx.commit(); setLimits(body); update();
        } else if (e.target.id === 'famli') { plan.famli = e.target.checked; ctx.commit(); update(); }
        else if (e.target.id === 'takeHomeInput') {
          const c = calculate(plan);
          if (c.available < 0) toast('Take-home is lower than your bills and car');
          e.target.value = plan.takeHome;
        }
      });
      draw();
    },
  });
}

function openNet(origin) {
  const plan = ctx.plan(), c = calculate(plan);
  openPanel(origin, {
    title: 'Take-home',
    build(body) {
      if (usesTakeHome(plan)) {
        body.innerHTML = `<div><p class="group-title">Each month</p><div class="big-number">${money(c.net)}</div></div><div class="group rows"><div><span>Entered take-home</span><b>${cash(plan.takeHome)}</b></div><div><span>Per year</span><b>${money(plan.takeHome * 12)}</b></div><div><span>Per biweekly paycheck</span><b>${money(plan.takeHome * 12 / 26)}</b></div></div><p class="fine">You entered take-home pay directly, so no tax estimate is applied. Switch to “From salary” in Income for the Colorado estimate.</p>`;
        return;
      }
      const t = taxes(plan.salary, plan.famli), m = n => `−${cash(n / 12)}`;
      body.innerHTML = `<div><p class="group-title">Each month</p><div class="big-number">${money(c.net)}</div></div>
        <div class="group rows">
          <div><span>Gross pay</span><b>${cash(plan.salary / 12)}</b></div>
          <div class="minus"><span>Federal income tax</span><b>${m(t.federal)}</b></div>
          <div class="minus"><span>Colorado income tax</span><b>${m(t.state)}</b></div>
          <div class="minus"><span>Social Security</span><b>${m(t.ss)}</b></div>
          <div class="minus"><span>Medicare</span><b>${m(t.medicare)}</b></div>
          ${plan.famli ? `<div class="minus"><span>FAMLI</span><b>${m(t.leave)}</b></div>` : ''}
          <div class="total"><span>Take-home</span><b>${cash(c.net)}</b></div>
        </div>
        <div class="group rows"><div><span>Per biweekly paycheck</span><b>${money(c.net * 12 / 26)}</b></div><div><span>Effective tax rate</span><b>${plan.salary ? (t.total / plan.salary * 100).toFixed(1) : '0.0'}%</b></div></div>
        <p class="fine">2026 single filer, Colorado, W-2 wages, $16,100 standard deduction. No credits, pre-tax benefits or local taxes.</p>`;
    },
  });
}

function openRent(origin) {
  const plan = ctx.plan();
  let rent = rentOf(plan);
  if (!rent) { rent = {id: uid(), name: 'Rent', amount: 0}; plan.expenses.unshift(rent); ctx.commit(); }
  openPanel(origin, {
    title: 'Rent',
    build(body, api) {
      const update = readout(api);
      body.innerHTML = `<div data-expense="${rent.id}"><label class="amount-field"><span>$</span><input data-field="amount" type="number" inputmode="decimal" min="0" step="1" value="${rent.amount}" aria-label="Monthly rent" enterkeyhint="done"></label><p class="fine" style="margin:8px 0 10px">per month</p><input type="range" min="0" step="1" data-field="amount" aria-label="Rent slider" value="${rent.amount}"><div class="range-labels"><span>$0</span><span class="spending-max"></span></div></div>
        <p class="fine">Drag to see how a cheaper or pricier place changes what's left each month. Rent is also listed with your other bills.</p>`;
      wireExpenses(body, () => { setLimits(body); update(); });
      setLimits(body);
      update();
    },
  });
}

function openCar(origin) {
  openPanel(origin, {
    title: 'Car',
    build(body, api) {
      const update = readout(api), plan = ctx.plan();
      body.innerHTML = `<div><label class="amount-field"><span>$</span><input id="carInput" type="number" inputmode="decimal" min="0" step="25" value="${plan.car}" aria-label="Monthly car budget" enterkeyhint="done"></label><p class="fine" style="margin:8px 0 10px">per month for a car payment</p><input id="carSlider" type="range" min="0" step="1" aria-label="Car budget slider"><div class="range-labels"><span>$0</span><span id="carMax"></span></div></div>
        <div class="estimate"><span>Estimated car price</span><output id="carPrice"></output><p class="fine">${CAR_PRICE_ASSUMPTIONS}. Rates are assumptions, not lender quotes.</p></div>`;
      const set = (el, fromChange) => {
        const p = ctx.plan(), requested = numeric(el), cap = spendingLimit(p, 'car');
        p.car = Math.min(requested, cap);
        if (fromChange && p.car !== requested) toast('That would leave nothing to spend');
        if (el.id === 'carSlider' || fromChange) body.querySelector('#carInput').value = p.car;
        ctx.commit(); setLimits(body); update();
      };
      body.addEventListener('input', e => { if (e.target.id === 'carSlider' || (e.target.id === 'carInput' && e.target.value !== '')) set(e.target, false); });
      body.addEventListener('change', e => { if (e.target.id === 'carInput') set(e.target, true); });
      setLimits(body);
      update();
    },
  });
}

function openBills(origin) {
  openPanel(origin, {
    title: 'Monthly bills',
    build(body, api) {
      const update = readout(api);
      function draw(focusLast = false) {
        const plan = ctx.plan();
        body.innerHTML = `<p class="lede">Fixed costs like rent, utilities and phone. They're set aside before anything else.</p><div id="billList">${plan.expenses.map(expenseRow).join('')}</div><button type="button" class="text-button" id="addBill">${icon('plus')} Add bill</button>`;
        setLimits(body);
        if (focusLast) { const input = body.querySelector('#billList .expense-item:last-child .expense-name'); input?.focus(); input?.select(); }
      }
      wireExpenses(body, () => { setLimits(body); update(); });
      body.addEventListener('click', e => {
        const plan = ctx.plan();
        const remove = e.target.closest('[data-remove]');
        if (remove) {
          const index = plan.expenses.findIndex(x => x.id === remove.dataset.remove), [removed] = plan.expenses.splice(index, 1);
          ctx.commit(); draw(); update();
          toast(`${removed.name || 'Bill'} removed`, () => { ctx.plan().expenses.splice(index, 0, removed); ctx.commit(); draw(); update(); });
        }
        if (e.target.closest('#addBill')) {
          if (plan.expenses.length >= 50) return toast('Maximum 50 bills per plan');
          plan.expenses.push({id: uid(), name: 'New bill', amount: 0});
          ctx.commit(); draw(true); update();
        }
      });
      draw();
      update();
    },
  });
}

function openGoals(origin) {
  let editing = null;
  openPanel(origin, {
    title: 'Savings goals',
    build(body, api) {
      const update = readout(api);
      function results() {
        const c = calculate(ctx.plan());
        for (const g of c.goals) {
          const el = body.querySelector(`[data-result="${g.id}"]`);
          if (!el) continue;
          const months = g.months;
          const when = months === 0 ? 'Goal reached' : months === null ? 'Needs money left over' : months > 1200 ? 'More than 100 years' : `${months} month${months === 1 ? '' : 's'} · ${new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}`;
          el.innerHTML = `<span>${money(g.monthly)} / month</span><span>${when}</span>`;
          body.querySelector(`[data-progress="${g.id}"]`).style.width = `${g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 100}%`;
        }
        for (const g of ctx.plan().goals) {
          const row = body.querySelector(`[data-goal="${g.id}"]`);
          if (!row) continue;
          for (const field of ['target', 'saved']) {
            const input = row.querySelector(`input[type=number][data-field="${field}"]`), range = row.querySelector(`input[type=range][data-field="${field}"]`);
            if (!input) continue;
            if (document.activeElement !== input) input.value = g[field];
            range.min = field === 'target' ? g.saved : 0;
            range.max = field === 'target' ? Math.max(100000, g.target) : g.target;
            range.value = g[field];
            syncRange(range);
          }
        }
        update();
      }
      function draw() {
        const plan = ctx.plan();
        if (!plan.goals.some(g => g.id === editing)) editing = null;
        body.innerHTML = `<p class="lede">Goals share a slice of what's left after bills and car. Slow, medium and fast set aside 10%, 25% or 40%.</p>
          <div id="goalList">${plan.goals.map(g => `<div class="goal ${g.id === editing ? 'is-editing' : ''}" data-goal="${g.id}">
            <div class="goal-swipe swipe-row" data-item-id="${g.id}" ${g.id === editing ? 'hidden' : ''}><button type="button" class="swipe-delete" aria-label="Delete ${esc(g.name || 'goal')}">${icon('trash')}<span>Delete</span></button><div class="swipe-front"><button type="button" class="goal-summary" data-edit-goal="${g.id}"><span class="goal-summary-name">${esc(g.name.trim() || 'New goal')}</span><span class="goal-summary-total">${money(g.target)}</span></button><button type="button" class="swipe-options" aria-label="Edit ${esc(g.name || 'goal')}">${icon('edit')}</button></div></div>
            <div class="goal-editor" ${g.id === editing ? '' : 'hidden'}>
              <div class="goal-head"><input data-field="name" aria-label="Goal name" maxlength="80" value="${esc(g.name)}" enterkeyhint="done"><button type="button" class="confirm-goal" data-confirm-goal="${g.id}" aria-label="Done">${icon('check')}</button></div>
              <div class="goal-fields"><label>Target ($)<input type="number" min="0" max="10000000" inputmode="decimal" data-field="target" value="${g.target}" enterkeyhint="done"><input type="range" step="100" data-field="target" aria-label="${esc(g.name)} target"></label><label>Already saved ($)<input type="number" min="0" inputmode="decimal" data-field="saved" value="${g.saved}" enterkeyhint="done"><input type="range" step="1" data-field="saved" aria-label="${esc(g.name)} saved"></label></div>
              <div class="segmented" aria-label="Savings pace"><span class="pace-lens" aria-hidden="true"></span>${['slow', 'medium', 'fast'].map(p => `<button type="button" data-pace="${p}" class="${g.pace === p ? 'selected' : ''}" aria-pressed="${g.pace === p}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>
              <div class="goal-result" data-result="${g.id}"></div><div class="goal-progress"><span data-progress="${g.id}"></span></div>
              <button type="button" class="text-button remove-goal" data-remove-goal="${g.id}">${icon('trash')} Delete goal</button>
            </div></div>`).join('')}</div>
          <button type="button" class="text-button" id="addGoal">${icon('plus')} Add goal</button>`;
        results();
        requestAnimationFrame(() => body.querySelectorAll('.segmented').forEach(movePill));
        body.querySelectorAll('.goal-swipe:not([hidden])').forEach(row => attachSwipe(row, id => removeGoal(id), () => edit(row.dataset.itemId)));
      }
      function edit(id) {
        editing = id; draw();
        const el = body.querySelector(`[data-goal="${id}"]`), name = el?.querySelector('input');
        if (!el) return;
        name.focus({preventScroll: true});
        requestAnimationFrame(() => { el.scrollIntoView({block: 'nearest', behavior: 'smooth'}); springIn(el); });
      }
      function removeGoal(id) {
        const plan = ctx.plan(), index = plan.goals.findIndex(g => g.id === id);
        if (index < 0) return;
        const [removed] = plan.goals.splice(index, 1);
        ctx.commit(); draw();
        toast('Goal deleted', () => { ctx.plan().goals.splice(Math.min(index, ctx.plan().goals.length), 0, removed); ctx.commit(); draw(); });
      }
      const change = e => {
        const row = e.target.closest('[data-goal]'), field = e.target.dataset.field;
        if (!row || !field) return;
        const g = ctx.plan().goals.find(x => x.id === row.dataset.goal);
        if (field === 'name') { g.name = e.target.value; ctx.commit(); return; }
        if (e.target.type === 'number' && e.target.value === '' && e.type === 'input') return;
        g[field] = field === 'target' ? Math.max(g.saved, Math.min(1e7, numeric(e.target))) : Math.min(g.target, numeric(e.target));
        if (e.type === 'change') e.target.value = g[field];
        ctx.commit(); results();
      };
      body.addEventListener('input', change);
      body.addEventListener('change', e => { if (e.target.type === 'number') change(e); });
      body.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.id === 'addGoal') {
          const plan = ctx.plan();
          if (plan.goals.length >= 30) return toast('Maximum 30 goals');
          const goal = {id: uid(), name: 'New goal', target: 5000, saved: 0, pace: 'medium'};
          plan.goals.push(goal); ctx.commit(); edit(goal.id);
          body.querySelector(`[data-goal="${goal.id}"] input`)?.select();
        } else if (b.dataset.editGoal) edit(b.dataset.editGoal);
        else if (b.dataset.confirmGoal) { const g = ctx.plan().goals.find(x => x.id === b.dataset.confirmGoal); g.name = g.name.trim() || 'New goal'; editing = null; ctx.commit(); draw(); }
        else if (b.dataset.removeGoal) removeGoal(b.dataset.removeGoal);
        else if (b.dataset.pace) {
          const row = b.closest('[data-goal]'), g = ctx.plan().goals.find(x => x.id === row.dataset.goal);
          g.pace = b.dataset.pace;
          row.querySelectorAll('[data-pace]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
          movePill(row.querySelector('.segmented'));
          ctx.commit(); results();
        }
      });
      draw();
    },
  });
}

function openBreakdown(origin) {
  const plan = ctx.plan(), c = calculate(plan);
  openPanel(origin, {
    tone: 'hero',
    title: plan.name,
    build(body) {
      body.innerHTML = `<div><p class="group-title">Left each month</p><div class="big-number" style="${c.left < 0 ? 'color:var(--bad)' : ''}">${money(c.left)}</div></div>
        <div class="group rows">
          <div><span>Take-home</span><b>${cash(c.net)}</b></div>
          <div class="minus"><span>Bills</span><b>−${cash(c.expenses)}</b></div>
          <div class="minus"><span>Car</span><b>−${cash(plan.car)}</b></div>
          <div class="minus"><span>Savings goals</span><b>−${cash(c.savings)}</b></div>
          <div class="total"><span>Left to spend</span><b>${cash(c.left)}</b></div>
        </div>
        <div class="group rows"><div><span>Per week</span><b>${money(c.left * 12 / 52)}</b></div><div><span>Per year</span><b>${money(c.left * 12)}</b></div>${usesTakeHome(plan) ? '' : `<div><span>Minimum salary for these costs</span><b>${money(minimumSalary(plan))}</b></div>`}</div>
        ${c.left < 0 ? '<p class="lede" style="color:var(--bad)">This plan spends more than your take-home pay. Goal savings are paused.</p>' : ''}`;
    },
  });
}

function openLock(origin, goTo) {
  const plan = ctx.plan(), c = calculate(plan), s = ctx.state, synced = inSync(plan);
  const replacing = s.budget && !lockedHere(plan);
  openPanel(origin, {
    tone: synced ? '' : 'accent',
    title: synced ? 'Your budget' : lockedHere(plan) ? 'Update budget' : 'Lock in plan',
    build(body, api) {
      body.innerHTML = `<div><p class="group-title">To spend each month</p><div class="big-number">${money(c.left)}</div></div>
        <div class="group rows">
          <div><span>Take-home</span><b>${cash(c.net)}</b></div>
          <div class="minus"><span>Bills (${plan.expenses.length})</span><b>−${cash(c.expenses)}</b></div>
          ${plan.car ? `<div class="minus"><span>Car</span><b>−${cash(plan.car)}</b></div>` : ''}
          ${c.savings ? `<div class="minus"><span>Savings goals</span><b>−${cash(c.savings)}</b></div>` : ''}
        </div>
        <p class="lede">${synced ? 'This plan is your budget. Purchases you log on Today come out of this amount.' : `Bills, car and savings are set aside up front. Purchases you log come out of ${money(c.left)} each month.`}</p>
        ${replacing ? `<p class="fine">This replaces your current budget from “${esc(s.budget.planName)}”. Purchases already logged this month stay.</p>` : ''}
        ${lockedHere(plan) && !synced ? `<p class="fine">This month's amount changes to ${money(c.left)}. Purchases already logged stay.</p>` : ''}
        ${c.left <= 0 ? '<p class="lede" style="color:var(--bad)">This plan leaves nothing to spend. Adjust it before locking in.</p>' : ''}
        ${synced ? `<button type="button" class="button quiet" id="goToday">Go to Today</button>` : c.left > 0 ? `<div id="lockSlider"></div>` : ''}`;
      body.querySelector('#goToday')?.addEventListener('click', () => api.close().then(() => goTo('today')));
      const slider = body.querySelector('#lockSlider');
      if (slider) slideToConfirm(slider, () => {
        const first = !s.budget;
        lockIn(s, plan, new Date());
        ctx.commit({render: false});
        persist();
        api.close().then(() => { goTo('today'); toast(first ? 'Budget locked in. Log your first purchase.' : 'Budget updated'); });
      }, {label: lockedHere(plan) ? 'slide to update' : 'slide to lock in', done: lockedHere(plan) ? 'Updated' : 'Locked in', icon: icon('arrow'), doneIcon: icon('lock')});
    },
  });
}

export function setupPlans(goTo, showPlans) {
  $('plansGrid').addEventListener('click', e => {
    const tile = e.target.closest('[data-tile]');
    if (!tile) return;
    const key = tile.dataset.tile;
    ({
      'p-hero': openBreakdown, 'p-income': openIncome, 'p-net': openNet, 'p-rent': openRent, 'p-car': openCar,
      'p-bills': openBills, 'p-goals': openGoals, 'p-lock': o => openLock(o, goTo),
    })[key]?.(tile);
  });
  $('planName').addEventListener('input', e => { ctx.plan().name = e.target.value; ctx.commit({render: false}); });
  $('planName').addEventListener('blur', e => { const plan = ctx.plan(); if (!plan.name.trim()) { plan.name = 'Untitled plan'; e.target.value = plan.name; } ctx.commit(); });
  $('switchPlan').addEventListener('click', showPlans);
}
