import { RRule } from "rrule";

/**
 * Given an RRULE string and a reference date (usually the current due date),
 * returns the next occurrence after `after`, or null if the rule is exhausted.
 */
export function nextOccurrence(rruleStr: string, after: Date): Date | null {
  try {
    const rule = RRule.fromString(rruleStr);
    return rule.after(after, false);
  } catch {
    return null;
  }
}
