// Plans: compare salary scenarios. Each tile expands into its editor; a live
// "left / month" readout in the panel header shows the effect while you drag.
import {ctx, $, esc, money, cash, compact, toast} from './context.js?v=34';
import {icon} from './icons.js?v=34';
import {openPanel} from './expand.js?v=34';
import {syncRange} from './sliders.js?v=34';
import {attachSwipe} from './swipe.js?v=34';
import {movePill, reduceMotion, slideToConfirm, springIn, springText} from './motion.js?v=34';
import {calculate, uid, spendingLimit, minimumSalary, carPriceRange, CAR_PRICE_ASSUMPTIONS, usesTakeHome, taxes, GOAL_ICONS, goalIcon, GOAL_COLORS, goalColor} from './finance.js?v=34';
import {createBudget, lockIn, unlock} from './ledger.js?v=34';
import {persist} from './store.js?v=34';

// Inline custom property for a goal's optional color.
const tint = g => (goalColor(g) ? ` style="--goal:${goalColor(g)}"` : '');
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
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:auto;padding-top:12px"><span class="tile-sub goal-icon-row" style="margin:0">${plan.goals.length ? `${plan.goals.slice(0, 5).map(g => `<i class="goal-chip${goalColor(g) ? ' has-color' : ''}"${tint(g)} title="${esc(g.name)}">${icon(goalIcon(g))}</i>`).join('')}${plan.goals.length > 5 ? `<span>+${plan.goals.length - 5}</span>` : ''}<span class="sr-only">${goalsActive} active goal${goalsActive === 1 ? '' : 's'}</span>` : 'Save up for something'}</span><span class="tile-value">${money(c.savings)}<small>/ mo</small></span></div>
    </button>
    ${lockTile(plan, c, synced, locked)}`;
  wireLock(plan, synced, locked);
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
    const max = spendingLimit(plan, e.id), input = row.querySelector('input[data-num]'), range = row.querySelector('input[type=range]');
    input.max = max; if (document.activeElement !== input) input.value = e.amount;
    range.max = Math.floor(max); range.value = e.amount; syncRange(range);
    row.querySelector('.spending-max').textContent = money(max);
  }
}

function expenseRow(e) {
  return `<div class="expense-item" data-expense="${e.id}"><div class="row"><input class="expense-name" data-field="name" value="${esc(e.name)}" maxlength="80" aria-label="Bill name" enterkeyhint="done"><span class="money-input"><span>$</span><input data-field="amount" type="text" data-num min="0" step="0.01" inputmode="decimal" value="${e.amount}" aria-label="${esc(e.name)} monthly amount" enterkeyhint="done"></span><button type="button" class="remove" data-remove="${e.id}" aria-label="Remove ${esc(e.name)}">${icon('close')}</button></div><input type="range" min="0" step="1" data-field="amount" aria-label="${esc(e.name)} slider" value="${e.amount}"><div class="range-labels"><span>$0</span><span class="spending-max"></span></div></div>`;
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
    if (ev.target.dataset.num !== undefined && ev.type === 'change') ev.target.value = item.amount;
    ctx.commit();
    afterChange();
  };
  body.addEventListener('input', ev => { if (ev.target.dataset.num === undefined) edit(ev); else if (ev.target.value !== '') edit(ev); });
  body.addEventListener('change', ev => { if (ev.target.dataset.num !== undefined) edit(ev); });
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
          <div><label class="amount-field"><span>$</span><input id="salaryInput" type="text" data-num inputmode="numeric" min="0" max="1000000" step="1000" value="${plan.salary}" aria-label="Annual salary" enterkeyhint="done"></label><p class="fine" style="margin-top:8px">per year, before tax</p></div>
          <div><input id="salarySlider" type="range" aria-label="Annual salary slider"><div class="range-labels"><span id="salaryMin"></span><span id="salaryMax"></span></div></div>
          <div class="group switch-row"><span>Colorado FAMLI<small>0.44% paid-leave premium</small></span><label class="switch"><input type="checkbox" role="switch" id="famli" ${plan.famli ? 'checked' : ''}><i></i></label></div>
          <p class="fine">Estimated for a 2026 single filer in Colorado with the standard deduction. If you live elsewhere or have pre-tax deductions like a 401(k) or health insurance, use Take-home for an exact number.</p>` : `
          <div><label class="amount-field"><span>$</span><input id="takeHomeInput" type="text" data-num inputmode="decimal" min="0" max="1000000" step="1" value="${plan.takeHome}" aria-label="Monthly take-home pay" enterkeyhint="done"></label><p class="fine" style="margin-top:8px">per month, after taxes and deductions</p></div>
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
      body.innerHTML = `<div data-expense="${rent.id}"><label class="amount-field"><span>$</span><input data-field="amount" type="text" data-num inputmode="decimal" min="0" step="1" value="${rent.amount}" aria-label="Monthly rent" enterkeyhint="done"></label><p class="fine" style="margin:8px 0 10px">per month</p><input type="range" min="0" step="1" data-field="amount" aria-label="Rent slider" value="${rent.amount}"><div class="range-labels"><span>$0</span><span class="spending-max"></span></div></div>
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
      body.innerHTML = `<div><label class="amount-field"><span>$</span><input id="carInput" type="text" data-num inputmode="decimal" min="0" step="25" value="${plan.car}" aria-label="Monthly car budget" enterkeyhint="done"></label><p class="fine" style="margin:8px 0 10px">per month for a car payment</p><input id="carSlider" type="range" min="0" step="1" aria-label="Car budget slider"><div class="range-labels"><span>$0</span><span id="carMax"></span></div></div>
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

const readyDate = months => new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
// "4 months · Mar 2027", or why there's no date yet.
function timing(g) {
  if (g.months === 0) return {months: 'Reached', date: 'Goal complete'};
  if (g.months === null) return {months: '—', date: 'Nothing set aside yet'};
  if (g.months > 1200) return {months: '100+ years', date: ''};
  const y = Math.floor(g.months / 12), m = g.months % 12;
  return {months: y >= 2 ? `${y}${m ? `.${Math.round(m / 12 * 10)}` : ''} years` : `${g.months} month${g.months === 1 ? '' : 's'}`, date: readyDate(g.months)};
}

// Goals list. Each card opens its own goal sheet stacked on top (goals are
// targets over time, not monthly buckets, so they get a focused view).
function openGoals(origin) {
  openPanel(origin, {
    title: 'Savings goals',
    build(body, api) {
      const update = readout(api);
      body.classList.add('goal-list-body');
      function draw() {
        const plan = ctx.plan(), c = calculate(plan);
        body.innerHTML = `<div id="goalList">${c.goals.map(g => { const t = timing(g); return `<div class="goal" data-goal="${g.id}"${tint(g)}>
            <div class="goal-swipe swipe-row" data-item-id="${g.id}"><button type="button" class="swipe-delete" aria-label="Delete ${esc(g.name || 'goal')}">${icon('trash')}<span>Delete</span></button><div class="swipe-front" data-tile="goal-${g.id}"><button type="button" class="goal-summary" data-edit-goal="${g.id}"><span class="goal-chip${goalColor(g) ? ' has-color' : ''}" aria-hidden="true"${tint(g)}>${icon(goalIcon(g))}</span><span class="goal-summary-text"><span class="goal-summary-name">${esc(g.name.trim() || 'New goal')}</span><small>${g.months === 0 ? 'Reached' : g.months === null ? t.date : `${money(g.monthly)}/mo · ${t.date}`}</small></span><span class="goal-summary-total">${money(g.target)}</span></button></div></div></div>`; }).join('')}</div>
          <button type="button" class="text-button" id="addGoal">${icon('plus')} Add goal</button>`;
        body.querySelectorAll('.goal-swipe').forEach(row => attachSwipe(row, id => removeGoal(id)));
        update();
      }
      function removeGoal(id) {
        const plan = ctx.plan(), index = plan.goals.findIndex(g => g.id === id);
        if (index < 0) return;
        const [removed] = plan.goals.splice(index, 1);
        ctx.commit(); draw();
        toast('Goal deleted', () => { ctx.plan().goals.splice(Math.min(index, ctx.plan().goals.length), 0, removed); ctx.commit(); draw(); });
      }
      body.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.id === 'addGoal') {
          const plan = ctx.plan();
          if (plan.goals.length >= 30) return toast('Maximum 30 goals');
          const goal = {id: uid(), name: '', target: 5000, saved: 0, pace: 'medium'};
          plan.goals.push(goal); ctx.commit(); draw();
          const card = body.querySelector(`[data-tile="goal-${goal.id}"]`);
          card.scrollIntoView({block: 'nearest'});
          openGoalSheet(card, goal.id, {redraw: draw, remove: removeGoal});
        } else if (b.dataset.editGoal) openGoalSheet(b.closest('.swipe-front'), b.dataset.editGoal, {redraw: draw, remove: removeGoal});
      });
      draw();
    },
  });
}

// One goal, sized to fit a phone screen without scrolling.
function openGoalSheet(card, id, {redraw, remove}) {
  const find = () => ctx.plan().goals.find(x => x.id === id);
  const g0 = find();
  if (!g0) return;
  openPanel(card, {
    nested: true,
    tone: 'goal',
    shape: api => api.layer.querySelector('.panel-inner'),
    title: '',
    style: goalColor(g0) ? `--goal:${goalColor(g0)}` : '',
    build(body, api) {
      body.classList.add('goal-sheet');
      body.innerHTML = `
        <div class="gs-name"><button type="button" class="goal-chip gs-chip" data-act="style" aria-expanded="false" aria-controls="gsStyle" aria-label="Icon and color"></button><input class="gs-name-input" data-field="name" maxlength="80" enterkeyhint="done" placeholder="Name your goal" aria-label="Goal name" value="${esc(g0.name)}"></div>
        <div class="gs-style" id="gsStyle" hidden>
          <div class="goal-icons gs-icons" role="radiogroup" aria-label="Goal icon">${GOAL_ICONS.map(([iconId, label]) => `<button type="button" class="goal-icon-option" role="radio" data-goal-icon="${iconId}" aria-checked="false" aria-label="${label}" title="${label}">${icon(iconId)}</button>`).join('')}</div>
          <div class="goal-colors gs-colors" role="radiogroup" aria-label="Goal color"><button type="button" class="goal-color-option is-none" role="radio" data-goal-color="" aria-checked="false" aria-label="No color" title="No color"></button>${GOAL_COLORS.map(([colorId, label, hex]) => `<button type="button" class="goal-color-option" role="radio" data-goal-color="${colorId}" aria-checked="false" aria-label="${label}" title="${label}" style="--swatch:${hex}"></button>`).join('')}</div>
        </div>
        <div class="gs-hero">
          <div><span class="gs-label">Ready in</span><b class="gs-when"></b><span class="gs-date"></span></div>
          <div class="gs-rate"><span class="gs-label">Each month</span><b class="gs-monthly"></b></div>
        </div>
        <div><div class="goal-progress gs-progress"><span></span></div><p class="fine gs-progress-label"></p></div>
        <div class="gs-amounts">
          <label class="gs-field"><span>Target</span><span class="gs-money">$<input data-num data-field="target" type="text" inputmode="decimal" enterkeyhint="done" value="${g0.target}"></span></label>
          <label class="gs-field"><span>Saved so far</span><span class="gs-money">$<input data-num data-field="saved" type="text" inputmode="decimal" enterkeyhint="done" value="${g0.saved}"></span></label>
        </div>
        <div class="segmented gs-pace" aria-label="Savings pace"><span class="pace-lens" aria-hidden="true"></span>${['slow', 'medium', 'fast', 'custom'].map(p => `<button type="button" data-pace="${p}" class="${g0.pace === p ? 'selected' : ''}" aria-pressed="${g0.pace === p}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>
        <div class="gs-pace-detail"></div>
        <div class="button-row gs-actions"><button type="button" class="button danger" data-act="delete" aria-label="Delete goal">${icon('trash')}</button><button type="button" class="button primary" data-act="done">Done</button></div>`;
      const seg = body.querySelector('.gs-pace'), detail = body.querySelector('.gs-pace-detail');

      function paint() {
        const g = find();
        if (!g) return;
        const computed = calculate(ctx.plan()).goals.find(x => x.id === id), t = timing(computed);
        const hex = goalColor(g);
        if (hex) api.panel.style.setProperty('--goal', hex); else api.panel.style.removeProperty('--goal');
        const chip = body.querySelector('.gs-chip');
        chip.classList.toggle('has-color', !!hex);
        chip.innerHTML = icon(goalIcon(g)) + `<span class="gs-chip-badge" aria-hidden="true">${icon('edit')}</span>`;
        body.querySelector('.gs-when').textContent = t.months;
        body.querySelector('.gs-date').textContent = t.date;
        springText(`goal-${id}`, body.querySelector('.gs-monthly'), computed.monthly, money);
        const pct = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 100;
        body.querySelector('.gs-progress span').style.width = pct + '%';
        body.querySelector('.gs-progress-label').textContent = `${money(g.saved)} of ${money(g.target)} saved · ${Math.round(pct)}%`;
        body.querySelectorAll('[data-goal-icon]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.goalIcon === goalIcon(g))));
        body.querySelectorAll('[data-goal-color]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.goalColor === (g.color || ''))));
      }
      function paintDetail() {
        const g = find();
        detail.hidden = g.pace !== 'custom';
        detail.innerHTML = g.pace === 'custom'
          ? `<label class="gs-field gs-inline"><span>Set aside each month</span><span class="gs-money">$<input data-num data-field="perMonth" type="text" inputmode="decimal" enterkeyhint="done" value="${g.perMonth ?? 0}" aria-label="Amount to set aside each month"></span></label>`
          : '';
      }
      function changed() { ctx.commit(); redraw(); paint(); }

      body.addEventListener('input', e => {
        const g = find(), field = e.target.dataset.field;
        if (!g || !field) return;
        if (field === 'name') { g.name = e.target.value; ctx.commit(); redraw(); paint(); return; }
        if (e.target.value === '') return;
        const n = numeric(e.target);
        if (field === 'target') g.target = Math.min(1e7, Math.max(g.saved, n));
        else if (field === 'saved') g.saved = Math.min(g.target, n);
        else if (field === 'perMonth') g.perMonth = Math.min(1e6, n);
        changed();
      });
      body.addEventListener('change', e => {
        const g = find(), field = e.target.dataset.field;
        if (!g || !field || field === 'name') return;
        const n = numeric(e.target);
        if (field === 'target') g.target = Math.min(1e7, Math.max(g.saved, n));
        else if (field === 'saved') g.saved = Math.min(g.target, n);
        else if (field === 'perMonth') g.perMonth = Math.min(1e6, n);
        e.target.value = g[field];
        changed();
      });
      body.addEventListener('click', e => {
        const b = e.target.closest('button');
        const g = find();
        if (!b || !g) return;
        if (b.dataset.pace) {
          if (b.dataset.pace === 'custom' && g.perMonth === undefined) g.perMonth = Math.round(calculate(ctx.plan()).goals.find(x => x.id === id).monthly);
          g.pace = b.dataset.pace;
          seg.querySelectorAll('[data-pace]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
          movePill(seg);
          paintDetail();
          changed();
          if (g.pace === 'custom') detail.querySelector('input')?.focus();
        } else if (b.dataset.goalIcon) { g.icon = b.dataset.goalIcon; changed(); }
        else if (b.dataset.goalColor !== undefined) { if (b.dataset.goalColor) g.color = b.dataset.goalColor; else delete g.color; changed(); }
        else if (b.dataset.act === 'style') {
          const section = body.querySelector('#gsStyle'), open = section.hidden;
          section.hidden = !open;
          b.setAttribute('aria-expanded', String(open));
          if (open && !reduceMotion()) section.animate([{opacity: 0, transform: 'translateY(-6px)'}, {opacity: 1, transform: 'none'}], {duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)'});
        }
        else if (b.dataset.act === 'done') api.close();
        else if (b.dataset.act === 'delete') api.close().then(() => remove(id));
      });
      paintDetail();
      paint();
      requestAnimationFrame(() => movePill(seg));
    },
    // An unnamed goal keeps a readable name.
    onClose() { const g = find(); if (g && !g.name.trim()) { g.name = 'New goal'; ctx.commit(); redraw(); } },
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

// The Lock tile is the control: slide right to lock this plan in as the budget,
// slide back left to unlock. Nothing navigates away from Plans.
function lockTile(plan, c, synced, locked) {
  const b = ctx.state.budget, since = b && new Date(b.lockedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  let head, note;
  if (locked) {
    head = `<span class="tile-label">Locked in</span><span class="status" data-pace="${synced ? 'track' : 'hot'}">${synced ? `Since ${since}` : 'Plan changed'}</span>`;
    note = synced ? `Tracking ${money(b.spendable)} a month. Log purchases from Today.` : `Your budget still uses ${money(b.spendable)} a month. This plan now leaves ${money(c.left)}.`;
  } else {
    head = `<span class="tile-label">Lock in this plan</span>`;
    note = c.left > 0 ? `Track ${money(c.left)} to spend each month.${b ? ` Replaces “${esc(b.planName)}”; purchases stay.` : ''}` : 'This plan leaves nothing to spend yet. Add income first.';
  }
  return `<div class="tile span-2 lock-tile ${locked ? 'is-locked' : ''}" data-tile="p-lock">
      <div class="tile-head"><span class="tile-icon">${icon('lock')}</span>${head}</div>
      <p class="tile-sub lock-note">${note}</p>
      ${locked || c.left > 0 ? '<div class="lock-slider" id="lockSlider"></div>' : ''}
      ${locked && !synced && c.left > 0 ? `<button type="button" class="button primary lock-update" id="updateBudget">Update budget to ${money(c.left)}</button>` : ''}
    </div>`;
}

function wireLock(plan, synced, locked) {
  const s = ctx.state, slider = $('lockSlider');
  if (slider) slideToConfirm(slider, () => {
    const hadFocus = document.activeElement === slider;
    queueMicrotask(() => { if (hadFocus) $('lockSlider')?.focus({preventScroll: true}); });
    if (locked) {
      const previous = unlock(s);
      ctx.commit();
      toast('Unlocked. Your purchases are kept.', () => { s.budget = previous; ctx.commit(); });
    } else {
      const first = !s.budget;
      lockIn(s, plan, new Date());
      ctx.commit();
      persist();
      toast(first ? 'Locked in. Log purchases from Today.' : 'Locked in as your budget');
    }
  }, locked
    ? {label: 'slide to unlock', done: 'Unlocked', icon: icon('lock'), doneIcon: icon('arrow'), reverse: true}
    : {label: 'slide to lock in', done: 'Locked in', icon: icon('arrow'), doneIcon: icon('lock')});
  $('updateBudget')?.addEventListener('click', () => {
    lockIn(s, plan, new Date());
    ctx.commit();
    toast(`Budget updated to ${money(s.budget.spendable)} a month`);
  });
}

export function setupPlans(goTo, showPlans) {
  $('plansGrid').addEventListener('click', e => {
    const tile = e.target.closest('[data-tile]');
    if (!tile) return;
    const key = tile.dataset.tile;
    ({
      'p-hero': openBreakdown, 'p-income': openIncome, 'p-net': openNet, 'p-rent': openRent, 'p-car': openCar,
      'p-bills': openBills, 'p-goals': openGoals,
    })[key]?.(tile);
  });
  $('planName').addEventListener('input', e => { ctx.plan().name = e.target.value; ctx.commit({render: false}); });
  $('planName').addEventListener('blur', e => { const plan = ctx.plan(); if (!plan.name.trim()) { plan.name = 'Untitled plan'; e.target.value = plan.name; } ctx.commit(); });
  $('switchPlan').addEventListener('click', showPlans);
}
