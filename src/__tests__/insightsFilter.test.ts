/**
 * Module 1.4 — Filter Bar (search, priority chips) and
 * Module 6.3 — Composable Filter Bar (category, HCP, date-range, AND logic).
 *
 * buildInsightsFilter shapes the GraphQL `filter` variable; countActiveFilters
 * drives the active-filter chip count / "Clear all" affordance.
 */
import {
  buildInsightsFilter,
  countActiveFilters,
  DEFAULT_FILTER,
  FilterInput,
} from "../hooks/useInsights";

function filter(overrides: Partial<FilterInput> = {}): FilterInput {
  return { ...DEFAULT_FILTER, ...overrides };
}

describe("buildInsightsFilter", () => {
  it("always constrains by stage using the lowercase db value", () => {
    expect(buildInsightsFilter("Actionable", filter())).toEqual({
      stage: { eq: "actionable" },
    });
  });

  it("adds a priority `in` clause when priorities are selected", () => {
    const f = buildInsightsFilter("Observation", filter({ priorities: ["P1", "P2"] }));
    expect(f.priority).toEqual({ in: ["P1", "P2"] });
  });

  it("adds a case-insensitive title search wrapped in wildcards", () => {
    const f = buildInsightsFilter("Observation", filter({ search: "dosing" }));
    expect(f.title).toEqual({ ilike: "%dosing%" });
  });

  it("trims whitespace-only searches so they add no clause", () => {
    const f = buildInsightsFilter("Observation", filter({ search: "   " }));
    expect(f.title).toBeUndefined();
  });

  it("adds category and hcp equality clauses", () => {
    const f = buildInsightsFilter(
      "Observation",
      filter({ categoryId: "cat-9", hcpId: "hcp-3" }),
    );
    expect(f.categoryId).toEqual({ eq: "cat-9" });
    expect(f.hcpId).toEqual({ eq: "hcp-3" });
  });

  it("builds an inclusive createdAt range from date bounds", () => {
    const f = buildInsightsFilter(
      "Observation",
      filter({ dateFrom: "2026-06-01", dateTo: "2026-06-30" }),
    );
    expect(f.createdAt).toEqual({
      gte: "2026-06-01T00:00:00Z",
      lte: "2026-06-30T23:59:59Z",
    });
  });

  it("supports an open-ended (from-only) date range", () => {
    const f = buildInsightsFilter("Observation", filter({ dateFrom: "2026-06-01" }));
    expect(f.createdAt).toEqual({ gte: "2026-06-01T00:00:00Z" });
  });

  it("combines every filter with AND logic (all clauses present together)", () => {
    const f = buildInsightsFilter(
      "Impact",
      filter({
        priorities: ["P1"],
        search: "cardio",
        categoryId: "cat-1",
        hcpId: "hcp-1",
        dateFrom: "2026-06-01",
      }),
    );
    expect(f).toEqual({
      stage: { eq: "impact" },
      priority: { in: ["P1"] },
      title: { ilike: "%cardio%" },
      categoryId: { eq: "cat-1" },
      hcpId: { eq: "hcp-1" },
      createdAt: { gte: "2026-06-01T00:00:00Z" },
    });
  });
});

describe("countActiveFilters", () => {
  it("counts zero for the default (empty) filter", () => {
    expect(countActiveFilters(DEFAULT_FILTER)).toBe(0);
  });

  it("counts each active dimension exactly once", () => {
    expect(
      countActiveFilters(
        filter({
          search: "x",
          priorities: ["P1", "P2"], // one dimension regardless of count
          categoryId: "cat-1",
          hcpId: "hcp-1",
          tagIds: ["t1"],
          dateFrom: "2026-06-01",
        }),
      ),
    ).toBe(6);
  });

  it("ignores whitespace-only search", () => {
    expect(countActiveFilters(filter({ search: "   " }))).toBe(0);
  });

  it("treats a date range (from OR to) as a single active filter", () => {
    expect(countActiveFilters(filter({ dateTo: "2026-06-30" }))).toBe(1);
    expect(
      countActiveFilters(filter({ dateFrom: "2026-06-01", dateTo: "2026-06-30" })),
    ).toBe(1);
  });
});
