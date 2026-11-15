// Welcome-back lines. Pure, so they're testable in Node.
export function timeOfDay(date) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'late';
}

export function greetings(name, date = new Date()) {
  const n = name.trim();
  const timed = {morning: `Good morning, ${n}`, afternoon: `Good afternoon, ${n}`, evening: `Good evening, ${n}`, late: `Up late, ${n}?`}[timeOfDay(date)];
  const lines = [`Welcome back, ${n}`, `Hey ${n}`, `Nice to see you, ${n}`, `Back at it, ${n}?`, `Let's check in, ${n}`];
  if (date.getDate() === 1) lines.push(`New month, ${n}`);
  if (date.getDay() === 5) lines.push(`Happy Friday, ${n}`);
  return {timed, lines};
}

// Half the time it's the time-of-day line; otherwise one of the others, never
// the same line twice in a row.
export function pickGreeting(name, date = new Date(), random = Math.random, last = '') {
  if (!name?.trim()) return 'Welcome back';
  const {timed, lines} = greetings(name, date);
  if (random() < 0.5 && timed !== last) return timed;
  const pool = lines.filter(line => line !== last);
  return pool[Math.floor(random() * pool.length) % pool.length];
}
