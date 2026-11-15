// The setup walkthrough's steps. Pure, so it's testable in Node.
export const CATEGORIES = [
  {id: 'rent', name: 'Rent', title: 'Rent or mortgage', hint: 'Monthly housing payment.', icon: 'home'},
  {id: 'car', title: 'Car payment', hint: 'Monthly loan or lease.', icon: 'car'},
  {id: 'food', name: 'Groceries', title: 'Groceries', hint: 'Monthly food budget.', icon: 'groceries'},
  {id: 'utilities', name: 'Utilities', title: 'Utilities', hint: 'Electric, gas, water and internet.', icon: 'bills'},
  {id: 'phone', name: 'Phone', title: 'Phone', hint: 'Monthly phone bill.', icon: 'phonebox'},
  {id: 'insurance', name: 'Insurance', title: 'Insurance', hint: 'Health, renters or car.', icon: 'health'},
  {id: 'subscriptions', name: 'Subscriptions', title: 'Subscriptions', hint: 'Streaming, music, gym, apps.', icon: 'fun'},
];
export const STEPS = ['name', 'plan', ...CATEGORIES.map(c => c.id), 'summary'];
export const percentAt = index => Math.round((index + 1) / STEPS.length * 100);
