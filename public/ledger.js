// Monthly tracker math. Pure functions only, so everything here is testable in Node.
//
// A budget is a snapshot of a plan taken when it is locked in. Fixed bills, the car
// payment and goal savings are treated as already spoken for, so purchases only draw
// down what is left after them ("spendable").
import {calculate, uid} from './finance.js?v=39';

export const CATEGORIES = [
  {id: 'groceries', label: 'Groceries', color: '#7fd1a4'},
  {id: 'dining', label: 'Dining', color: '#f2a65e'},
  {id: 'transport', label: 'Transport', color: '#6fb3ff'},
  {id: 'fun', label: 'Fun', color: '#c39cff'},
  {id: 'shopping', label: 'Shopping', color: '#f282b4'},
  {id: 'health', label: 'Health', color: '#5fd2cc'},
  {id: 'misc', label: 'Misc', color: '#9b9ba6'},
];
export const ADJUSTMENT = {id: 'adjustment', label: 'Unlogged spending', color: '#ff7a6b'};
export const category = id => CATEGORIES.find(c => c.id === id) || (id === ADJUSTMENT.id ? ADJUSTMENT : CATEGORIES.at(-1));

const cents = n => Math.round(n * 100) / 100;

export const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const parts = key => key.split('-').map(Number);
export function nextKey(key) { const [y, m] = parts(key); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; }
export function daysIn(key) { const [y, m] = parts(key); return new Date(y, m, 0).getDate(); }
export function monthName(key, withYear = false) {
  const [y, m] = parts(key);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', withYear ? {month: 'long', year: 'numeric'} : {month: 'long'});
}
export const dayKey = date => `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;

export function createBudget(plan, now = new Date()) {
  const c = calculate(plan);
  return {
    planId: plan.id,
    planName: plan.name,
    lockedAt: now.toISOString(),
    income: cents(c.net),
    bills: plan.expenses.map(e => ({id: e.id, name: e.name, amount: e.amount})),
    car: plan.car,
    savings: cents(c.savings),
    spendable: cents(c.left),
  };
}

export function openMonth(key, budget, carry = 0) {
  return {key, allowance: budget.spendable, carry: cents(carry), entries: [], paid: [], check: null, closedAt: null};
}

export function totals(month) {
  let spent = 0, adjusted = 0;
  for (const e of month.entries) { if (e.kind === 'adjustment') adjusted += e.amount; else spent += e.amount; }
  const available = month.allowance + month.carry;
  return {available: cents(available), spent: cents(spent), adjusted: cents(adjusted), used: cents(spent + adjusted), left: cents(available - spent - adjusted)};
}

// Days left counts today, so the per-day figure is what can be spent today too.
export function daysLeft(month, today = new Date()) {
  const current = monthKey(today);
  if (current < month.key) return daysIn(month.key);
  if (current > month.key) return 0;
  return daysIn(month.key) - today.getDate() + 1;
}

export function perDay(month, today = new Date()) {
  const left = totals(month).left, days = daysLeft(month, today);
  return days > 0 ? Math.max(0, left) / days : 0;
}

// Compare spending against how far through the month we are.
export function pace(month, today = new Date()) {
  const t = totals(month);
  if (t.left < 0) return 'over';
  if (t.available <= 0) return 'tight';
  const elapsed = 1 - daysLeft(month, today) / daysIn(month.key);
  const usedShare = t.used / t.available;
  return usedShare > elapsed + 0.15 ? 'hot' : 'track';
}

export function makeEntry({amount, name = '', category: cat = 'misc', kind = 'purchase', at = new Date()}) {
  const value = cents(Number(amount));
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) > 1e6) throw Error('Enter an amount.');
  if (kind === 'purchase' && value < 0) throw Error('Enter an amount.');
  return {id: uid(), amount: value, name: String(name).trim().slice(0, 80), category: kind === 'adjustment' ? ADJUSTMENT.id : cat, kind, at: new Date(at).toISOString()};
}

// Gap between what the bank says was spent and what was logged here.
// Positive means spending is missing from the ledger.
export function realityGap(month, bankSpent) { return cents(bankSpent - totals(month).used); }

export const openMonthOf = state => state.months.find(m => !m.closedAt) || null;
export const closedMonths = state => state.months.filter(m => m.closedAt).sort((a, b) => b.key.localeCompare(a.key));

// The month to open after closing one: the following month, or the current
// calendar month when months were skipped.
export function followingKey(closedKey, today = new Date()) {
  const next = nextKey(closedKey), current = monthKey(today);
  return current > next ? current : next;
}

export function closeMonth(state, {carry = false}, now = new Date()) {
  const month = openMonthOf(state);
  if (!month || !state.budget) throw Error('No open month.');
  const left = totals(month).left;
  month.closedAt = now.toISOString();
  month.carriedOut = carry ? left : 0;
  const next = openMonth(followingKey(month.key, now), state.budget, carry ? left : 0);
  state.months.push(next);
  return next;
}

// Only the most recent close can be undone, and only before the new month has entries.
export function canReopen(state) {
  const open = openMonthOf(state), last = closedMonths(state)[0];
  return !!(open && last && open.entries.length === 0 && open.paid.length === 0);
}
export function reopenLast(state) {
  if (!canReopen(state)) throw Error('This month can no longer be reopened.');
  const open = openMonthOf(state), last = closedMonths(state)[0];
  state.months = state.months.filter(m => m !== open);
  delete last.carriedOut;
  last.closedAt = null;
  return last;
}

// Locking a new plan updates the budget and the open month's allowance.
export function lockIn(state, plan, now = new Date()) {
  state.budget = createBudget(plan, now);
  let month = openMonthOf(state);
  if (!month) { month = openMonth(monthKey(now), state.budget); state.months.push(month); }
  else { month.allowance = state.budget.spendable; month.paid = month.paid.filter(id => state.budget.bills.some(b => b.id === id)); }
  return month;
}

// Unlocking stops tracking but keeps every month and purchase, so locking any
// plan again picks the open month back up. Returns the old budget for undo.
export function unlock(state) {
  const previous = state.budget;
  state.budget = null;
  return previous;
}

// Consecutive days without a purchase, ending today if nothing was bought today,
// otherwise yesterday. Starts no earlier than the day the budget was locked.
export function noSpendStreak(state, today = new Date()) {
  if (!state.budget) return 0;
  const days = new Set();
  for (const m of state.months) for (const e of m.entries) if (e.kind === 'purchase') days.add(dayKey(new Date(e.at)));
  const start = new Date(state.budget.lockedAt); start.setHours(0, 0, 0, 0);
  const cursor = new Date(today); cursor.setHours(0, 0, 0, 0);
  if (days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (cursor >= start && !days.has(dayKey(cursor)) && streak < 3660) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

export function dailySpend(month) {
  const out = Array(daysIn(month.key)).fill(0);
  for (const e of month.entries) if (e.kind === 'purchase') { const d = new Date(e.at); if (monthKey(d) === month.key) out[d.getDate() - 1] += e.amount; }
  return out.map(cents);
}

export function byCategory(entries) {
  const sums = new Map();
  for (const e of entries) sums.set(e.category, (sums.get(e.category) || 0) + e.amount);
  return [...sums].map(([id, amount]) => ({...category(id), amount: cents(amount)})).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
}

// Stats over the last 1, 3 or 12 months (by month key), plus the period before for a delta.
export function periodStats(state, months, today = new Date()) {
  const keys = [];
  let key = monthKey(today);
  for (let i = 0; i < months * 2; i++) { keys.push(key); const [y, m] = parts(key); key = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; }
  const recent = new Set(keys.slice(0, months)), prior = new Set(keys.slice(months));
  const inRecent = state.months.filter(m => recent.has(m.key)), inPrior = state.months.filter(m => prior.has(m.key));
  const spend = list => cents(list.reduce((s, m) => s + totals(m).used, 0));
  const entries = inRecent.flatMap(m => m.entries);
  const spent = spend(inRecent), before = spend(inPrior);
  return {spent, before, tracked: inRecent.length, average: inRecent.length ? cents(spent / inRecent.length) : 0, categories: byCategory(entries), count: entries.filter(e => e.kind === 'purchase').length, change: before > 0 ? (spent - before) / before : null};
}

export function validateMonth(m) {
  const num = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e7;
  if (!m || typeof m.key !== 'string' || !/^\d{4}-\d{2}$/.test(m.key) || !num(m.allowance) || !num(m.carry) || !Array.isArray(m.entries) || !Array.isArray(m.paid) || m.entries.length > 5000) throw Error('Invalid month.');
  for (const e of m.entries) if (typeof e.id !== 'string' || !num(e.amount) || typeof e.name !== 'string' || e.name.length > 80 || typeof e.category !== 'string' || !['purchase', 'adjustment'].includes(e.kind) || Number.isNaN(Date.parse(e.at))) throw Error('Invalid ledger entry.');
  return m;
}
export function validateBudget(b) {
  const num = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e7;
  if (b === null) return null;
  if (!b || typeof b.planName !== 'string' || !num(b.income) || !num(b.car) || !num(b.savings) || !num(b.spendable) || !Array.isArray(b.bills) || Number.isNaN(Date.parse(b.lockedAt))) throw Error('Invalid budget.');
  for (const bill of b.bills) if (typeof bill.name !== 'string' || !num(bill.amount)) throw Error('Invalid bill.');
  return b;
}
