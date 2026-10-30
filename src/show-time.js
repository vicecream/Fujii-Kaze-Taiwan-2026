import { EVENT, SHOW_TIMELINE } from "./data.js";
export function taipeiDateKey(value){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}
export function showState(now = Date.now()){
  const date = taipeiDateKey(now);
  const start = Date.parse(EVENT.start);
  if (date > EVENT.date) return { phase: "past", days: 0, remaining: 0 };
  if (now >= start) return { phase: "started", days: 0, remaining: 0 };
  const dayNumber = value => Date.parse(value + "T00:00:00Z");
  return {
    phase: "upcoming",
    days: Math.round((dayNumber(EVENT.date) - dayNumber(date)) / 86400000),
    remaining: start - now,
  };
}
export function todayTimeline(now = Date.now()){
  const date = taipeiDateKey(now);
  const steps = SHOW_TIMELINE[date] || [];
  const times = steps.map(step => Date.parse(`${date}T${step.t}:00+08:00`));
  const nextIndex = times.findIndex(time => time > now);
  const currentIndex = nextIndex < 0 ? steps.length - 1 : nextIndex - 1;
  return { steps, times, nextIndex, currentIndex };
}
