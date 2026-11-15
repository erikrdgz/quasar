// App state shape, legacy migration and backup validation. Pure, so it is testable in Node.
import {blank, validatePlan} from './finance.js?v=21';
import {validateBudget, validateMonth} from './ledger.js?v=21';

export const LEGACY_KEY = 'room-plans-v1';
export const STATE_VERSION = 2;

export function defaultState() {
  const plan = blank();
  return {version: STATE_VERSION, plans: [plan], currentPlanId: plan.id, budget: null, months: [], prefs: {installDismissed: false, name: '', lastGreeting: ''}};
}

// Version 1 stored only plans in localStorage under the app's old name.
export function fromLegacy(legacy) {
  if (!legacy?.plans?.length) return null;
  const plans = legacy.plans.map(p => validatePlan(p, true));
  const current = plans.find(p => p.id === legacy.current) || plans[0];
  return {...defaultState(), plans, currentPlanId: current.id};
}

export function validateState(raw) {
  if (!raw || raw.version !== STATE_VERSION || !Array.isArray(raw.plans) || !raw.plans.length || raw.plans.length > 100 || !Array.isArray(raw.months) || raw.months.length > 600) throw Error('This file is not a Quasar backup.');
  const plans = raw.plans.map(p => validatePlan(p, true));
  const months = raw.months.map(validateMonth);
  if (months.filter(m => !m.closedAt).length > 1) throw Error('Backup has more than one open month.');
  return {
    version: STATE_VERSION,
    plans,
    currentPlanId: plans.some(p => p.id === raw.currentPlanId) ? raw.currentPlanId : plans[0].id,
    budget: validateBudget(raw.budget ?? null),
    months,
    prefs: {
      installDismissed: !!raw.prefs?.installDismissed,
      name: typeof raw.prefs?.name === 'string' ? raw.prefs.name.trim().slice(0, 40) : '',
      lastGreeting: typeof raw.prefs?.lastGreeting === 'string' ? raw.prefs.lastGreeting.slice(0, 80) : '',
    },
  };
}
