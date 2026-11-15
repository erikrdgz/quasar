// Ledger: this month's purchases, period stats, reality check, close month, history.
import {ctx, $, esc, money, cash} from './context.js?v=21';
import {icon} from './icons.js?v=21';
import {attachSwipe} from './swipe.js?v=21';
import {movePill} from './motion.js?v=21';
import {closedMonths, monthKey, monthName, openMonthOf, periodStats, realityGap, totals} from './ledger.js?v=21';
import {deleteEntry, openPurchase} from './purchase.js?v=21';
import {entryRow, openCloseMonth, openHistoryMonth, openRealityCheck} from './month-flows.js?v=21';
import {donut, legend} from './today.js?v=21';

let period = 1;
const PERIOD_LABEL = {1: 'This month', 3: 'Last 3 months', 12: 'Last 12 months'};

function dayLabel(iso) {
  const d = new Date(iso), today = new Date(), y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});
}

export function renderLedger() {
  const root = $('ledgerContent'), s = ctx.state, month = openMonthOf(s);
  if (!s.budget || !month) {
    $('ledgerSub').textContent = '';
    root.innerHTML = `<div class="bento"><div class="tile span-2 short"><div class="tile-head"><span class="tile-icon">${icon('ledger')}</span><span class="tile-label">Nothing to track yet</span></div><p class="fine" style="margin-top:12px">Lock in a plan from Plans to start a monthly ledger.</p></div><button type="button" class="tile accent span-2 short" data-go="plans"><div class="tile-head"><span class="tile-icon">${icon('lock')}</span><span class="tile-label">Go to Plans</span></div></button></div>`;
    return;
  }
  const stats = periodStats(s, period), t = totals(month), history = closedMonths(s);
  const entries = [...month.entries].sort((a, b) => b.at.localeCompare(a.at));
  const groups = [];
  for (const e of entries) { const label = dayLabel(e.at); if (groups.at(-1)?.label !== label) groups.push({label, items: []}); groups.at(-1).items.push(e); }
  const delta = stats.change === null ? '' : `<span class="delta ${stats.change <= 0 ? 'down' : 'up'}">${stats.change <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(stats.change * 100))}%</span>`;
  const gap = month.check ? realityGap(month, month.check.bank) : null;
  $('ledgerSub').textContent = monthName(month.key, true);

  root.innerHTML = `
    <div class="segmented ledger-period" id="periodSeg"><span class="pace-lens" aria-hidden="true"></span>${[1, 3, 12].map(p => `<button type="button" data-period="${p}" class="${p === period ? 'selected' : ''}" aria-pressed="${p === period}">${p === 1 ? 'Month' : p === 3 ? '3 Months' : 'Year'}</button>`).join('')}</div>
    <div class="bento">
      <div class="tile span-2">
        <div class="tile-head"><span class="tile-label">${PERIOD_LABEL[period]}</span><span style="margin-left:auto">${delta}</span></div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:14px"><span class="tile-value">${money(stats.spent)}</span><span class="tile-sub" style="margin:0">${period === 1 ? `of ${money(t.available)}` : `avg ${money(stats.average)} / month`}</span></div>
        <span class="tile-sub">${stats.count} purchase${stats.count === 1 ? '' : 's'}${stats.change === null ? '' : ` · vs ${money(stats.before)} the ${period === 1 ? 'month' : period === 3 ? '3 months' : 'year'} before`}</span>
        ${stats.categories.length ? `<div class="donut-row">${donut(stats.categories, 84)}${legend(stats.categories, 5)}</div>` : ''}
      </div>
      <button type="button" class="tile ${month.check ? '' : 'outline'}" data-tile="check">
        <div class="tile-head"><span class="tile-icon">${icon('bank')}</span><span class="tile-label">Reality check</span></div>
        <div class="tile-foot">${gap === null ? `<span class="tile-sub" style="white-space:normal">Compare with your bank</span>` : `<span class="tile-value" style="font-size:min(26px,13cqw)">${gap === 0 ? 'Matched' : cash(Math.abs(gap))}</span><span class="tile-sub">${gap === 0 ? 'with your bank' : gap > 0 ? 'missing from ledger' : 'more than bank'}</span>`}</div>
      </button>
      <button type="button" class="tile" data-tile="close">
        <div class="tile-head"><span class="tile-icon">${icon('lock')}</span><span class="tile-label">Close month</span></div>
        <div class="tile-foot"><span class="tile-value" style="font-size:min(26px,13cqw)">${monthName(month.key)}</span><span class="tile-sub">${monthKey(new Date()) > month.key ? 'Ready to close' : 'Review, then hold'}</span></div>
      </button>
      <div class="tile span-2 list-tile">
        <div class="tile-head" style="padding:10px 12px 4px"><span class="tile-label">${monthName(month.key)} purchases</span><span class="tile-sub" style="margin:0 0 0 auto">${month.entries.length ? 'Swipe left to delete' : ''}</span></div>
        ${groups.length ? groups.map(g => `<p class="entry-day">${g.label}</p>${g.items.map(e => `<div class="swipe-row" data-item-id="${e.id}"><button type="button" class="swipe-delete" aria-label="Delete ${esc(e.name || 'purchase')}">${icon('trash')}<span>Delete</span></button><div class="swipe-front">${entryRow(e, {button: true})}</div></div>`).join('')}`).join('') : `<p class="empty-note">No purchases logged in ${monthName(month.key)} yet.</p>`}
      </div>
      ${history.length ? `<p class="entry-day span-2" style="margin:10px 4px 0">History</p>` : ''}
      ${history.map(m => { const h = totals(m); return `<button type="button" class="tile span-2 short" data-tile="month-${m.key}" style="min-height:0"><div class="tile-head"><span class="tile-label">${monthName(m.key, true)}</span><span class="tile-chevron">${icon('chevron')}</span></div><div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:12px"><span class="tile-sub" style="margin:0">Spent ${money(h.used)} of ${money(h.available)}</span><span class="tile-value" style="font-size:22px;color:${h.left < 0 ? 'var(--bad)' : 'var(--good)'}">${h.left < 0 ? '−' : '+'}${money(Math.abs(h.left))}</span></div></button>`; }).join('')}
    </div>`;

  requestAnimationFrame(() => movePill($('periodSeg')));
  root.querySelectorAll('.swipe-row').forEach(row => attachSwipe(row, id => deleteEntry(id)));
}

export function setupLedger(goTo) {
  $('ledgerContent').addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { goTo(go.dataset.go); return; }
    const p = e.target.closest('[data-period]');
    if (p) { period = Number(p.dataset.period); renderLedger(); return; }
    const tile = e.target.closest('[data-tile]');
    if (!tile) return;
    const key = tile.dataset.tile;
    if (key === 'check') openRealityCheck(tile);
    else if (key === 'close') openCloseMonth(tile);
    else if (key.startsWith('month-')) openHistoryMonth(tile, key.slice(6));
    else if (key.startsWith('entry-')) openPurchase(tile, tile.dataset.edit);
  });
}
