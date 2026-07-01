/**
 * Module 1.2 — Card List relative timestamps ("2h ago", "Yesterday").
 */
import { getRelativeTime } from "../utils/dateUtils";

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("getRelativeTime", () => {
  it("shows 'Just now' for under a minute", () => {
    expect(getRelativeTime(isoAgo(30 * SEC))).toBe("Just now");
  });

  it("shows minutes for under an hour", () => {
    expect(getRelativeTime(isoAgo(5 * MIN))).toBe("5m ago");
  });

  it("shows hours for under a day", () => {
    expect(getRelativeTime(isoAgo(2 * HOUR))).toBe("2h ago");
  });

  it("shows 'Yesterday' for exactly one day ago", () => {
    expect(getRelativeTime(isoAgo(DAY + HOUR))).toBe("Yesterday");
  });

  it("shows days for under a week", () => {
    expect(getRelativeTime(isoAgo(3 * DAY))).toBe("3d ago");
  });

  it("falls back to a locale date string beyond a week", () => {
    const result = getRelativeTime(isoAgo(10 * DAY));
    expect(result).not.toMatch(/ago|Yesterday|Just now/);
    // A locale date string contains digits (day/month/year).
    expect(result).toMatch(/\d/);
  });
});
