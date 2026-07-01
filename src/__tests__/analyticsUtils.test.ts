/**
 * Module 4 — Analytics & Export (data-transformation functions)
 *
 * Covers the client-side computations behind the 4 KPI cards and 5 charts:
 * category distribution, HCP leaderboard, most-active HCP, average pipeline
 * time, priority-by-stage heatmap, weekly time-series buckets, and the
 * date-range filter that drives every chart.
 */
import {
  computeWeeklyBuckets,
  computeCategoryDistribution,
  computeHCPLeaderboard,
  computeMostActiveHCP,
  computeAvgPipelineTime,
  computePriorityStageHeatmap,
  filterByDateRange,
} from "../utils/analyticsUtils";
import { makeInsight, makeHCP, ALL_PRIORITIES, ALL_STAGES } from "./factories";

describe("computeCategoryDistribution", () => {
  it("counts insights per category", () => {
    const result = computeCategoryDistribution([
      makeInsight({ category: "Efficacy" }),
      makeInsight({ category: "Efficacy" }),
      makeInsight({ category: "Safety" }),
    ]);
    expect(result).toEqual([
      { name: "Efficacy", count: 2 },
      { name: "Safety", count: 1 },
    ]);
  });

  it("sorts by count descending", () => {
    const result = computeCategoryDistribution([
      makeInsight({ category: "Safety" }),
      makeInsight({ category: "Efficacy" }),
      makeInsight({ category: "Efficacy" }),
    ]);
    expect(result[0].name).toBe("Efficacy");
  });

  it("buckets null categories under 'Unknown'", () => {
    const result = computeCategoryDistribution([makeInsight({ category: null })]);
    expect(result).toEqual([{ name: "Unknown", count: 1 }]);
  });

  it("returns an empty array for no insights (empty-state)", () => {
    expect(computeCategoryDistribution([])).toEqual([]);
  });
});

describe("computeHCPLeaderboard", () => {
  it("ranks HCPs by insight count", () => {
    const result = computeHCPLeaderboard([
      makeInsight({ hcp: makeHCP({ id: "1", name: "Dr. Smith" }) }),
      makeInsight({ hcp: makeHCP({ id: "1", name: "Dr. Smith" }) }),
      makeInsight({ hcp: makeHCP({ id: "2", name: "Dr. Jones" }) }),
    ]);
    expect(result).toEqual([
      { name: "Dr. Smith", count: 2 },
      { name: "Dr. Jones", count: 1 },
    ]);
  });

  it("caps the leaderboard at the top 5 HCPs", () => {
    const insights = Array.from({ length: 8 }, (_, i) =>
      makeInsight({ hcp: makeHCP({ id: String(i), name: `Dr. ${i}` }) }),
    );
    expect(computeHCPLeaderboard(insights)).toHaveLength(5);
  });

  it("ignores insights without a linked HCP", () => {
    expect(
      computeHCPLeaderboard([makeInsight({ hcp: null }), makeInsight({ hcp: null })]),
    ).toEqual([]);
  });
});

describe("computeMostActiveHCP", () => {
  it("returns the top HCP name", () => {
    expect(
      computeMostActiveHCP([
        makeInsight({ hcp: makeHCP({ id: "1", name: "Dr. Smith" }) }),
        makeInsight({ hcp: makeHCP({ id: "1", name: "Dr. Smith" }) }),
        makeInsight({ hcp: makeHCP({ id: "2", name: "Dr. Jones" }) }),
      ]),
    ).toBe("Dr. Smith");
  });

  it("returns 'N/A' when there are no HCPs", () => {
    expect(computeMostActiveHCP([])).toBe("N/A");
  });
});

describe("computeAvgPipelineTime", () => {
  it("returns 0 when nothing has reached Impact", () => {
    expect(computeAvgPipelineTime([makeInsight({ stage: "Observation" })])).toBe(0);
  });

  it("averages created→updated days across Impact insights", () => {
    const insights = [
      makeInsight({
        stage: "Impact",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-11T00:00:00.000Z", // 10 days
      }),
      makeInsight({
        stage: "Impact",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-05T00:00:00.000Z", // 4 days
      }),
    ];
    expect(computeAvgPipelineTime(insights)).toBe(7); // (10 + 4) / 2
  });

  it("only considers Impact-stage insights", () => {
    const insights = [
      makeInsight({
        stage: "Impact",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-03T00:00:00.000Z", // 2 days
      }),
      makeInsight({
        stage: "Observation",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ];
    expect(computeAvgPipelineTime(insights)).toBe(2);
  });
});

describe("computePriorityStageHeatmap", () => {
  it("always produces 16 cells (4 priorities x 4 stages)", () => {
    expect(computePriorityStageHeatmap([])).toHaveLength(
      ALL_PRIORITIES.length * ALL_STAGES.length,
    );
  });

  it("counts each priority/stage combination", () => {
    const result = computePriorityStageHeatmap([
      makeInsight({ priority: "P1", stage: "Observation" }),
      makeInsight({ priority: "P1", stage: "Observation" }),
      makeInsight({ priority: "P2", stage: "Impact" }),
    ]);
    expect(
      result.find((c) => c.priority === "P1" && c.stage === "Observation")?.count,
    ).toBe(2);
    expect(
      result.find((c) => c.priority === "P2" && c.stage === "Impact")?.count,
    ).toBe(1);
    expect(
      result.find((c) => c.priority === "P4" && c.stage === "Actionable")?.count,
    ).toBe(0);
  });
});

describe("computeWeeklyBuckets", () => {
  const range = {
    start: new Date("2026-05-01T00:00:00.000Z"),
    end: new Date("2026-06-30T00:00:00.000Z"),
  };

  it("uses weekly buckets for a ~8 week range", () => {
    const buckets = computeWeeklyBuckets([], range);
    // 60 days / 7-day buckets ≈ 9 buckets
    expect(buckets.length).toBeGreaterThanOrEqual(8);
    buckets.forEach((b) => expect(b.count).toBe(0));
  });

  it("uses daily buckets for a short (<=14 day) range", () => {
    const shortRange = {
      start: new Date("2026-06-01T00:00:00.000Z"),
      end: new Date("2026-06-08T00:00:00.000Z"),
    };
    const buckets = computeWeeklyBuckets([], shortRange);
    // Daily granularity over a 7-day window (±1 for local-midnight alignment),
    // clearly finer-grained than the weekly bucketing used for longer ranges.
    expect(buckets.length).toBeGreaterThanOrEqual(7);
    expect(buckets.length).toBeLessThanOrEqual(8);
  });

  it("places an insight into the bucket matching its createdAt", () => {
    const insight = makeInsight({ createdAt: "2026-05-02T12:00:00.000Z" });
    const buckets = computeWeeklyBuckets([insight], range);
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(1);
    expect(buckets[0].count).toBe(1); // first week of the range
  });

  it("excludes insights created outside the range", () => {
    const outside = makeInsight({ createdAt: "2026-01-01T00:00:00.000Z" });
    const buckets = computeWeeklyBuckets([outside], range);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });
});

describe("filterByDateRange", () => {
  const start = new Date("2026-06-01T00:00:00.000Z");
  const end = new Date("2026-06-30T23:59:59.000Z");

  it("keeps insights created within the range (inclusive)", () => {
    const inside = makeInsight({ createdAt: "2026-06-15T00:00:00.000Z" });
    expect(filterByDateRange([inside], start, end)).toEqual([inside]);
  });

  it("drops insights created before the range", () => {
    const before = makeInsight({ createdAt: "2026-05-31T00:00:00.000Z" });
    expect(filterByDateRange([before], start, end)).toEqual([]);
  });

  it("drops insights created after the range", () => {
    const after = makeInsight({ createdAt: "2026-07-01T00:00:00.000Z" });
    expect(filterByDateRange([after], start, end)).toEqual([]);
  });
});
