/**
 * Module 4.2 — PDF Export.
 *
 * generateAndSharePDF builds the multi-page report HTML, renders it to a file
 * via expo-print, and hands it to expo-sharing's native share sheet. We capture
 * the generated HTML to assert the cover page, KPI summary, pipeline funnel,
 * 25-rows-per-page insight table, and drug appendix are all present, and that a
 * progress indicator is driven throughout.
 */
import { InsightStage } from "../types";
import { makeInsight, makeHCP } from "./factories";

const mockPrintToFileAsync = jest.fn(async (_opts: { html: string }) => ({
  uri: "file:///report.pdf",
}));
const mockShareAsync = jest.fn(async (_uri: string, _opts: unknown) => undefined);

jest.mock("expo-print", () => ({
  printToFileAsync: (opts: { html: string }) => mockPrintToFileAsync(opts),
}));
jest.mock("expo-sharing", () => ({
  shareAsync: (uri: string, opts: unknown) => mockShareAsync(uri, opts),
}));

import { generateAndSharePDF } from "../services/pdfExport";

function kpis(overrides: Partial<{
  total: number;
  delta: number;
  avgPipelineTime: number;
  mostActiveHCP: string;
  byStage: Record<InsightStage, number>;
}> = {}) {
  return {
    total: 40,
    delta: 5,
    avgPipelineTime: 12,
    mostActiveHCP: "Dr. Smith",
    byStage: {
      Observation: 10,
      Insight: 12,
      Actionable: 10,
      Impact: 8,
    } as Record<InsightStage, number>,
    ...overrides,
  };
}

const dateRange = {
  start: new Date("2026-06-01T00:00:00.000Z"),
  end: new Date("2026-06-30T00:00:00.000Z"),
};

async function generate(overrides: Parameters<typeof generateAndSharePDF>[0]) {
  await generateAndSharePDF(overrides);
  // The HTML is the first arg of mockPrintToFileAsync's options object.
  return mockPrintToFileAsync.mock.calls[0][0].html;
}

beforeEach(() => {
  mockPrintToFileAsync.mockClear();
  mockShareAsync.mockClear();
});

describe("generateAndSharePDF", () => {
  it("renders to a file, then opens the native share sheet as a PDF", async () => {
    await generateAndSharePDF({
      insights: [makeInsight()],
      kpis: kpis(),
      dateRange,
      userName: "Alice Rep",
    });

    expect(mockPrintToFileAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledWith(
      "file:///report.pdf",
      expect.objectContaining({ mimeType: "application/pdf" }),
    );
  });

  it("drives the progress indicator through each phase", async () => {
    const onProgress = jest.fn();
    await generateAndSharePDF({
      insights: [makeInsight()],
      kpis: kpis(),
      dateRange,
      userName: "Alice Rep",
      onProgress,
    });
    const messages = onProgress.mock.calls.map((c) => c[0]);
    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages.some((m: string) => /PDF/i.test(m))).toBe(true);
  });

  it("puts the user name and date range on the cover page", async () => {
    const html = await generate({
      insights: [makeInsight()],
      kpis: kpis(),
      dateRange,
      userName: "Alice Rep",
    });
    expect(html).toContain("Alice Rep");
    expect(html).toContain("June 1, 2026");
    expect(html).toContain("June 30, 2026");
    expect(html).toContain("InsightBoard");
  });

  it("includes a KPI summary table with the delta signed", async () => {
    const html = await generate({
      insights: [makeInsight()],
      kpis: kpis({ total: 40, delta: 5, avgPipelineTime: 12, mostActiveHCP: "Dr. Smith" }),
      dateRange,
      userName: "Alice",
    });
    expect(html).toContain("KPI Summary");
    expect(html).toContain("Total Insights");
    expect(html).toContain("+5"); // positive delta prefixed with +
    expect(html).toContain("12 days");
    expect(html).toContain("Dr. Smith");
  });

  it("renders a pipeline funnel table with every stage", async () => {
    const html = await generate({
      insights: [makeInsight()],
      kpis: kpis(),
      dateRange,
      userName: "Alice",
    });
    expect(html).toContain("Pipeline Funnel");
    (["Observation", "Insight", "Actionable", "Impact"] as InsightStage[]).forEach(
      (stage) => expect(html).toContain(stage),
    );
  });

  it("paginates the insight table at 25 rows per page", async () => {
    const insights = Array.from({ length: 30 }, (_, i) =>
      makeInsight({ title: `Insight ${i}` }),
    );
    const html = await generate({
      insights,
      kpis: kpis(),
      dateRange,
      userName: "Alice",
    });
    // 30 insights → two pages of the insight table.
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("Page 2 of 2");
    expect(html).toContain("30 total insights");
  });

  it("adds a drug appendix only when insights have a linked drug", async () => {
    const withDrug = await generate({
      insights: [makeInsight({ drugName: "Metformin", hcp: makeHCP() })],
      kpis: kpis(),
      dateRange,
      userName: "Alice",
    });
    // Assert on the appendix body (the "<!-- Drug Appendix -->" comment is
    // always emitted; only the rendered section is conditional).
    expect(withDrug).toContain("Insights with linked drug names");
    expect(withDrug).toContain("Metformin");

    mockPrintToFileAsync.mockClear();
    const noDrug = await generate({
      insights: [makeInsight({ drugName: null })],
      kpis: kpis(),
      dateRange,
      userName: "Alice",
    });
    expect(noDrug).not.toContain("Insights with linked drug names");
  });
});
