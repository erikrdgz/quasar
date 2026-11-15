// Today: the number you open the app for, and the fastest way to change it.
import {ctx, $, esc, money, cash, modal, toast} from './context.js?v=40';
import {icon} from './icons.js?v=40';
import {openPanel} from './expand.js?v=40';
import {springText} from './motion.js?v=40';
import {byCategory, dailySpend, daysIn, daysLeft, monthKey, monthName, noSpendStreak, openMonthOf, pace, perDay, totals} from './ledger.js?v=40';
import {openPurchase} from './purchase.js?v=40';
import {entryRow, openCloseMonth} from './month-flows.js?v=40';

const PACE_LABEL = {track: 'On track', hot: 'Spending fast', over: 'Over budget', tight: 'No room'};
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function donut(categories, size = 92) {
  const total = categories.reduce((s, c) => s + c.amount, 0), r = 38, circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = categories.map(c => {
    const len = total ? c.amount / total * circ : 0, gap = categories.length > 1 ? Math.min(3, len / 3) : 0;
    const arc = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${c.color}" stroke-width="12" stroke-dasharray="${Math.max(0, len - gap)} ${circ}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"/>`;
    offset += len;
    return arc;
  }).join('');
  return `<svg class="donut" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="#ffffff10" stroke-width="12"/>${arcs}</svg>`;
}
export function legend(categories, limit = 4) {
  return `<div class="legend">${categories.slice(0, limit).map(c => `<div><i style="background:${c.color}"></i><span>${c.label}</span><b>${money(c.amount)}</b></div>`).join('')}</div>`;
}

function ring(value, max) {
  const r = 26, circ = 2 * Math.PI * r, share = Math.min(1, value / max);
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="track" cx="32" cy="32" r="${r}"/><circle class="fill" cx="32" cy="32" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - share)}"/></svg>`;
}

function bars(month, today) {
  const days = dailySpend(month), daily = Math.max(0, totals(month).available) / daysIn(month.key);
  const max = Math.max(...days, daily * 1.4, 1), todayIndex = monthKey(today) === month.key ? today.getDate() - 1 : -1;
  return `<div class="bars" aria-hidden="true">${days.map((v, i) => `<span class="${i === todayIndex ? 'today' : v > daily ? 'over' : ''}" style="height:${Math.max(3, v / max * 100)}%;opacity:${todayIndex >= 0 && i > todayIndex ? .35 : 1}"></span>`).join('')}<i class="avg" style="bottom:${daily / max * 100}%"></i></div><div class="bars-axis"><span>1</span><span>Daily budget ${money(daily)}</span><span>${days.length}</span></div>`;
}

function emptyState(grid) {
  $('todaySub').textContent = '';
  grid.innerHTML = `
    <div class="tile hero span-2" style="justify-content:space-between">
      <div class="tile-head"><span class="tile-label">Left to spend</span></div>
      <span class="hero-value" style="color:#ffffff30">$—</span>
      <p class="lede" style="margin-top:16px">Pick the plan you're living on and lock it in. Quasar sets aside your bills, car and savings, and counts down what's left as you log purchases.</p>
    </div>
    <button type="button" class="tile accent span-2 short" data-go="plans"><div class="tile-head"><span class="tile-icon">${icon('lock')}</span><span class="tile-label">Choose a plan to lock in</span></div><div class="tile-foot"><span class="tile-sub">Plans → Lock in this plan</span></div></button>`;
}

export function renderToday() {
  const grid = $('todayGrid'), s = ctx.state, month = openMonthOf(s), now = new Date();
  if (!s.budget || !month) return emptyState(grid);
  const t = totals(month), status = pace(month, now), left = daysLeft(month, now), days = daysIn(month.key);
  const remainingShare = t.available > 0 ? Math.max(0, Math.min(1, t.left / t.available)) : 0;
  const expectedShare = left / days;
  const purchases = month.entries.filter(e => e.kind === 'purchase');
  const recent = [...month.entries].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const paid = s.budget.bills.filter(b => month.paid.includes(b.id)).length, billCount = s.budget.bills.length;
  const streak = noSpendStreak(s, now), cats = byCategory(month.entries);
  const ended = monthKey(now) > month.key;
  $('todaySub').textContent = now.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});

  grid.innerHTML = `
    ${ended ? `<button type="button" class="tile notice span-2" data-tile="close-banner"><span class="tile-icon">${icon('calendar')}</span><span style="flex:1;min-width:0"><strong>${monthName(month.key)} is over</strong><span>Review it and close the month</span></span><span class="tile-chevron">${icon('chevron')}</span></button>` : ''}
    <button type="button" class="tile hero span-2 ${t.left < 0 ? 'is-over' : ''}" data-tile="hero" data-pace="${status}">
      <div class="tile-head"><span class="tile-label">Left to spend</span><span class="status">${PACE_LABEL[status]}</span></div>
      <span class="hero-value" id="heroValue"></span>
      <div class="meter" aria-hidden="true"><span style="width:${remainingShare * 100}%"></span><i style="left:calc(${expectedShare * 100}% - 1px)"></i></div>
      <div class="hero-meta"><span>of ${money(t.available)} · ${monthName(month.key)}</span><span>${ended ? 'Month ended' : `${left} day${left === 1 ? '' : 's'} left`}</span></div>
    </button>
    <button type="button" class="tile accent add-tile" data-tile="add" aria-label="Add purchase"><span class="plus">${icon('plus')}</span><span class="tile-value">Add<br>purchase</span></button>
    <button type="button" class="tile" data-tile="perday">
      <div class="tile-head"><span class="tile-icon">${icon('calendar')}</span><span class="tile-label">Per day</span></div>
      <div class="tile-foot"><span class="tile-value" id="perDayValue"></span><span class="tile-sub">safe to spend today</span></div>
    </button>
    <button type="button" class="tile span-2" data-go="ledger">
      <div class="tile-head"><span class="tile-icon">${icon('ledger')}</span><span class="tile-label">Spent in ${monthName(month.key)}</span><span class="tile-chevron">${icon('chevron')}</span></div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:14px"><span class="tile-value">${money(t.used)}</span><span class="tile-sub" style="margin:0">${purchases.length} purchase${purchases.length === 1 ? '' : 's'}${t.adjusted ? ` · ${money(t.adjusted)} unlogged` : ''}</span></div>
      ${bars(month, now)}
    </button>
    <div class="tile">
      <div class="tile-head"><span class="tile-icon">${icon('flame')}</span><span class="tile-label">Streak</span></div>
      <div class="ring-row"><div><span class="tile-value">${streak}<small>day${streak === 1 ? '' : 's'}</small></span><span class="tile-sub">no spending</span></div>${ring(streak, 7)}</div>
    </div>
    <button type="button" class="tile" data-tile="bills">
      <div class="tile-head"><span class="tile-icon">${icon('bills')}</span><span class="tile-label">Bills</span></div>
      <div class="tile-foot"><span class="tile-value">${paid}<small>of ${billCount} paid</small></span><div class="mini-progress"><span style="width:${billCount ? paid / billCount * 100 : 0}%"></span></div></div>
    </button>
    ${cats.length ? `<button type="button" class="tile span-2" data-go="ledger"><div class="tile-head"><span class="tile-icon">${icon('compare')}</span><span class="tile-label">Where it went</span><span class="tile-chevron">${icon('chevron')}</span></div><div class="donut-row">${donut(cats)}${legend(cats)}</div></button>` : ''}
    <div class="tile span-2 recent">
      <div class="tile-head"><span class="tile-label">Recent</span>${month.entries.length ? `<button type="button" class="text-button" data-go="ledger" style="margin-left:auto">See all</button>` : ''}</div>
      ${recent.length ? `<div class="entry-list">${recent.map(e => entryRow(e, {button: true})).join('')}</div>` : `<p class="empty-note">Nothing logged yet this month. Tap Add purchase when you buy something, and watch the number come down.</p>`}
    </div>
    ${!standalone() && !s.prefs.installDismissed ? `<div class="tile outline span-2 short"><div class="tile-head"><span class="tile-icon">${icon('install')}</span><span class="tile-label">Keep your ledger safe</span></div><p class="fine" style="margin-top:10px">Safari can clear data for sites you haven't opened in a while. Add Quasar to your Home Screen to keep it.</p><div class="button-row" style="margin-top:12px"><button type="button" class="button quiet" data-act="install-how" style="min-height:44px;font-size:14px">How</button><button type="button" class="button quiet" data-act="install-dismiss" style="min-height:44px;font-size:14px">Dismiss</button></div></div>` : ''}`;

  springText('hero', $('heroValue'), t.left, money);
  springText('perday', $('perDayValue'), perDay(month, now), money);
}

function openHero(origin) {
  const s = ctx.state, month = openMonthOf(s), t = totals(month), b = s.budget;
  openPanel(origin, {
    tone: 'hero',
    title: monthName(month.key, true),
    build(body) {
      body.innerHTML = `
        <div><p class="group-title">Left to spend</p><div class="big-number" style="${t.left < 0 ? 'color:var(--bad)' : ''}">${money(t.left)}</div></div>
        <div class="group rows">
          <div><span>Take-home</span><b>${cash(b.income)}</b></div>
          <div class="minus"><span>Bills (${b.bills.length})</span><b>−${cash(b.bills.reduce((n, x) => n + x.amount, 0))}</b></div>
          ${b.car ? `<div class="minus"><span>Car</span><b>−${cash(b.car)}</b></div>` : ''}
          ${b.savings ? `<div class="minus"><span>Savings goals</span><b>−${cash(b.savings)}</b></div>` : ''}
          <div class="total"><span>To spend each month</span><b>${cash(month.allowance)}</b></div>
        </div>
        <div class="group rows">
          ${month.carry ? `<div><span>Carried from last month</span><b>${month.carry > 0 ? '+' : '−'}${cash(Math.abs(month.carry))}</b></div>` : ''}
          <div class="minus"><span>Purchases</span><b>−${cash(t.spent)}</b></div>
          ${t.adjusted ? `<div class="minus"><span>Unlogged spending</span><b>−${cash(t.adjusted)}</b></div>` : ''}
          <div class="total"><span>Left</span><b>${cash(t.left)}</b></div>
        </div>
        <p class="fine">From “${esc(b.planName)}”, locked ${new Date(b.lockedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}. Bills, car and savings are set aside up front; only purchases you log come out of this number. Change it from Plans.</p>`;
    },
  });
}

function openPerDay(origin) {
  const month = openMonthOf(ctx.state), now = new Date(), left = daysLeft(month, now), t = totals(month);
  const daily = perDay(month, now), weekly = daily * 7;
  openPanel(origin, {
    title: 'Per day',
    build(body) {
      body.innerHTML = `
        <div><p class="group-title">Safe to spend each day</p><div class="big-number">${money(daily)}</div></div>
        <div class="group rows">
          <div><span>Left this month</span><b>${cash(t.left)}</b></div>
          <div><span>Days left, including today</span><b>${left}</b></div>
          <div><span>Per week at this pace</span><b>${money(weekly)}</b></div>
          <div><span>Daily budget at the start</span><b>${money(Math.max(0, t.available) / daysIn(month.key))}</b></div>
        </div>
        <p class="fine">What's left divided by the days remaining. A no-spend day raises it for the rest of the month; a big purchase lowers it.</p>`;
    },
  });
}

function openBills(origin) {
  const s = ctx.state, month = openMonthOf(s);
  openPanel(origin, {
    title: 'Bills',
    build(body) {
      function draw() {
        const paid = s.budget.bills.filter(b => month.paid.includes(b.id));
        body.innerHTML = `
          <p class="lede">These are already set aside, so checking them off doesn't change what's left to spend. It's a to-do list for ${monthName(month.key)}.</p>
          <div class="checklist">${s.budget.bills.map(b => `<button type="button" class="check" role="checkbox" aria-checked="${month.paid.includes(b.id)}" data-bill="${b.id}"><span class="box">${icon('check')}</span><span>${esc(b.name)}</span><b>${cash(b.amount)}</b></button>`).join('') || '<p class="empty-note">This plan has no bills.</p>'}</div>
          <div class="group rows"><div><span>Paid</span><b>${cash(paid.reduce((n, b) => n + b.amount, 0))}</b></div><div><span>Still to pay</span><b>${cash(s.budget.bills.filter(b => !month.paid.includes(b.id)).reduce((n, b) => n + b.amount, 0))}</b></div></div>`;
      }
      body.addEventListener('click', e => {
        const row = e.target.closest('[data-bill]');
        if (!row) return;
        const id = row.dataset.bill, on = !month.paid.includes(id);
        month.paid = on ? [...month.paid, id] : month.paid.filter(x => x !== id);
        row.setAttribute('aria-checked', String(on));
        ctx.commit({render: false});
        setTimeout(() => { draw(); ctx.refresh(); body.querySelector(`[data-bill="${id}"]`)?.focus({preventScroll: true}); }, 220);
      });
      draw();
    },
  });
}

export function setupToday(goTo) {
  $('todayGrid').addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { goTo(go.dataset.go); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'install-dismiss') { ctx.state.prefs.installDismissed = true; ctx.commit(); toast('You can still back up from the menu'); return; }
    if (act === 'install-how') {
      modal('Add to Home Screen', `<p class="lede"><b>iPhone:</b> open Quasar in Safari, tap Share, then <b>Add to Home Screen</b>.</p><p class="lede"><b>Android:</b> in Chrome, open the ⋮ menu and tap <b>Install app</b>.</p><p class="fine">Open Quasar from the new icon from then on. Data in the browser and the installed app are kept separately, so export a backup from the menu if you've already logged purchases in the browser, then import it in the app.</p>`);
      return;
    }
    const tile = e.target.closest('[data-tile]');
    if (!tile) return;
    const key = tile.dataset.tile;
    if (key === 'add') openPurchase(tile);
    else if (key === 'hero') openHero(tile);
    else if (key === 'perday') openPerDay(tile);
    else if (key === 'bills') openBills(tile);
    else if (key === 'close-banner') openCloseMonth(tile);
    else if (key.startsWith('entry-')) openPurchase(tile, tile.dataset.edit);
  });
}
