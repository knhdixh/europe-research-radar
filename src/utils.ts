import type { OpportunityCycle } from "./types";

export const TODAY = new Date();

export function daysUntil(date: string | null, from = TODAY) {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00Z`);
  return Math.ceil((target.getTime() - from.getTime()) / 86_400_000);
}

export function daysSince(date: string, from = TODAY) {
  const target = new Date(`${date}T12:00:00Z`);
  return Math.floor((from.getTime() - target.getTime()) / 86_400_000);
}

export function isStale(opportunity: OpportunityCycle) {
  return daysSince(opportunity.lastVerified) > opportunity.freshnessDays;
}

export function formatDeadline(opportunity: OpportunityCycle) {
  if (opportunity.deadlineType === "rolling") return "Rolling";
  if (!opportunity.deadline) return opportunity.deadlineType === "estimated-window" ? "Not announced" : "Unknown";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${opportunity.deadline}T12:00:00Z`)
  );
}

export function sortByPriority(a: OpportunityCycle, b: OpportunityCycle) {
  const rank = { open: 0, rolling: 1, upcoming: 2, unknown: 3, closed: 4 };
  const state = rank[a.applicationState] - rank[b.applicationState];
  if (state) return state;
  const aDeadline = a.deadline ? Date.parse(a.deadline) : Number.MAX_SAFE_INTEGER;
  const bDeadline = b.deadline ? Date.parse(b.deadline) : Number.MAX_SAFE_INTEGER;
  return aDeadline - bDeadline;
}
