// The setup walkthrough's steps. Pure, so it's testable in Node.
export const CATEGORIES = [
  {id: 'rent', name: 'Rent', title: 'Rent or mortgage', hint: 'What you pay for housing each month.', icon: 'home'},
  {id: 'car', title: 'Car payment', hint: "Your monthly loan or lease payment. Skip it if you don't have one.", icon: 'car'},
  {id: 'food', name: 'Groceries', title: 'Groceries', hint: "Set aside for food each month. Skip it if you'd rather log groceries as purchases.", icon: 'groceries'},
  {id: 'utilities', name: 'Utilities', title: 'Utilities', hint: 'Electric, gas, water and internet together.', icon: 'bills'},
  {id: 'phone', name: 'Phone', title: 'Phone', hint: 'Your monthly phone bill.', icon: 'phonebox'},
  {id: 'insurance', name: 'Insurance', title: 'Insurance', hint: 'Health, renters or car insurance you pay yourself.', icon: 'health'},
  {id: 'subscriptions', name: 'Subscriptions', title: 'Subscriptions', hint: 'Streaming, music, gym, apps.', icon: 'fun'},
];
export const STEPS = ['name', 'plan', ...CATEGORIES.map(c => c.id), 'summary'];
export const percentAt = index => Math.round((index + 1) / STEPS.length * 100);
