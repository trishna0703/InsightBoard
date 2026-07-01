import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Insight, InsightStage } from "../types";

const STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

const STAGE_COLORS: Record<InsightStage, string> = {
  Observation: "#607D8B",
  Insight: "#3F51B5",
  Actionable: "#FF9800",
  Impact: "#4CAF50",
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: "#F44336",
  P2: "#FF9800",
  P3: "#FFC107",
  P4: "#9E9E9E",
};

interface ExportOptions {
  insights: Insight[];
  kpis: {
    total: number;
    delta: number;
    avgPipelineTime: number;
    mostActiveHCP: string;
    byStage: Record<InsightStage, number>;
  };
  dateRange: { start: Date; end: Date };
  userName: string;
  onProgress?: (message: string) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildInsightRows(insights: Insight[]): string {
  return insights
    .map(
      (ins, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}">
        <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px;max-width:200px">${ins.title}</td>
        <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px">${ins.hcp?.name ?? "—"}</td>
        <td style="padding:8px;border:1px solid #e0e0e0;text-align:center">
          <span style="background:${PRIORITY_COLORS[ins.priority]};color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">${ins.priority}</span>
        </td>
        <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px">${ins.category ?? "—"}</td>
        <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px">
          <span style="color:${STAGE_COLORS[ins.stage]};font-weight:600">${ins.stage}</span>
        </td>
        <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px">${new Date(ins.createdAt).toLocaleDateString()}</td>
      </tr>`,
    )
    .join("");
}

function buildHTML(options: ExportOptions): string {
  const { insights, kpis, dateRange, userName } = options;
  const now = new Date();
  const insightPages = chunkArray(insights, 25);
  const drugInsights = insights.filter((i) => i.drugName);

  // Insight table pages
  const insightTablePages = insightPages
    .map(
      (pageInsights, pageIdx) => `
      <div style="page-break-before:always;padding:40px">
        <h2 style="color:#3F51B5;font-family:sans-serif;margin-bottom:4px">
          Insight Details
        </h2>
        <p style="color:#757575;font-family:sans-serif;font-size:12px;margin-bottom:20px">
          Page ${pageIdx + 1} of ${insightPages.length} · ${insights.length} total insights
        </p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#3F51B5">
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Title</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">HCP</th>
              <th style="padding:10px;color:#fff;text-align:center;font-family:sans-serif;font-size:11px">Priority</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Category</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Stage</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Created</th>
            </tr>
          </thead>
          <tbody>
            ${buildInsightRows(pageInsights)}
          </tbody>
        </table>
      </div>`,
    )
    .join("");

  // Drug appendix
  const drugAppendix =
    drugInsights.length > 0
      ? `
      <div style="page-break-before:always;padding:40px">
        <h2 style="color:#3F51B5;font-family:sans-serif;margin-bottom:4px">Drug Appendix</h2>
        <p style="color:#757575;font-family:sans-serif;font-size:12px;margin-bottom:20px">
          Insights with linked drug names
        </p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#3F51B5">
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Drug Name</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Insight Title</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">HCP</th>
              <th style="padding:10px;color:#fff;text-align:left;font-family:sans-serif;font-size:11px">Stage</th>
            </tr>
          </thead>
          <tbody>
            ${drugInsights
              .map(
                (ins, i) => `
              <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}">
                <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px;font-weight:600;color:#3F51B5">${ins.drugName}</td>
                <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px">${ins.title}</td>
                <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px">${ins.hcp?.name ?? "—"}</td>
                <td style="padding:8px;border:1px solid #e0e0e0;font-size:11px;color:${STAGE_COLORS[ins.stage]};font-weight:600">${ins.stage}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: sans-serif; color: #212121; }
      </style>
    </head>
    <body>

      <!-- Page 1: Cover -->
      <div style="padding:60px 40px;min-height:100vh;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(135deg,#3F51B5,#1A237E)">
        <div style="background:rgba(255,255,255,0.1);border-radius:16px;padding:40px">
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin-bottom:8px;letter-spacing:2px;text-transform:uppercase">Speer Health</p>
          <h1 style="color:#fff;font-size:36px;font-weight:700;margin-bottom:8px">InsightBoard</h1>
          <h2 style="color:rgba(255,255,255,0.85);font-size:20px;font-weight:400;margin-bottom:40px">Field Intelligence Report</h2>
          <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:24px;margin-top:24px">
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin-bottom:8px">Date Range</p>
            <p style="color:#fff;font-size:16px;font-weight:600;margin-bottom:20px">${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}</p>
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin-bottom:8px">Prepared by</p>
            <p style="color:#fff;font-size:16px;font-weight:600;margin-bottom:20px">${userName}</p>
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin-bottom:8px">Generated</p>
            <p style="color:#fff;font-size:16px;font-weight:600">${formatDate(now)} at ${now.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      <!-- Page 2: KPI Summary + Funnel -->
      <div style="page-break-before:always;padding:40px">
        <h2 style="color:#3F51B5;margin-bottom:4px">KPI Summary</h2>
        <p style="color:#757575;font-size:12px;margin-bottom:24px">
          ${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}
        </p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:40px">
          <tr style="background:#3F51B5">
            <th style="padding:12px;color:#fff;text-align:left;font-size:12px">Metric</th>
            <th style="padding:12px;color:#fff;text-align:right;font-size:12px">Value</th>
          </tr>
          <tr style="background:#f5f5f5">
            <td style="padding:12px;font-size:13px;border:1px solid #e0e0e0">Total Insights</td>
            <td style="padding:12px;font-size:13px;font-weight:700;text-align:right;border:1px solid #e0e0e0">${kpis.total}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-size:13px;border:1px solid #e0e0e0">vs Previous 7 Days</td>
            <td style="padding:12px;font-size:13px;font-weight:700;text-align:right;border:1px solid #e0e0e0;color:${kpis.delta >= 0 ? "#4CAF50" : "#F44336"}">
              ${kpis.delta >= 0 ? "+" : ""}${kpis.delta}
            </td>
          </tr>
          <tr style="background:#f5f5f5">
            <td style="padding:12px;font-size:13px;border:1px solid #e0e0e0">Avg Pipeline Time</td>
            <td style="padding:12px;font-size:13px;font-weight:700;text-align:right;border:1px solid #e0e0e0">${kpis.avgPipelineTime} days</td>
          </tr>
          <tr>
            <td style="padding:12px;font-size:13px;border:1px solid #e0e0e0">Most Active HCP</td>
            <td style="padding:12px;font-size:13px;font-weight:700;text-align:right;border:1px solid #e0e0e0">${kpis.mostActiveHCP}</td>
          </tr>
        </table>

        <h2 style="color:#3F51B5;margin-bottom:16px">Pipeline Funnel</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#3F51B5">
            <th style="padding:12px;color:#fff;text-align:left;font-size:12px">Stage</th>
            <th style="padding:12px;color:#fff;text-align:right;font-size:12px">Count</th>
            <th style="padding:12px;color:#fff;text-align:right;font-size:12px">% of Total</th>
          </tr>
          ${STAGES.map(
            (stage, i) => `
            <tr style="background:${i % 2 === 0 ? "#f5f5f5" : "#fff"}">
              <td style="padding:12px;font-size:13px;border:1px solid #e0e0e0;color:${STAGE_COLORS[stage]};font-weight:600">${stage}</td>
              <td style="padding:12px;font-size:13px;font-weight:700;text-align:right;border:1px solid #e0e0e0">${kpis.byStage[stage]}</td>
              <td style="padding:12px;font-size:13px;text-align:right;border:1px solid #e0e0e0;color:#757575">
                ${kpis.total > 0 ? Math.round((kpis.byStage[stage] / kpis.total) * 100) : 0}%
              </td>
            </tr>
          `,
          ).join("")}
        </table>
      </div>

      <!-- Pages 3+: Insight Table -->
      ${insightTablePages}

      <!-- Drug Appendix -->
      ${drugAppendix}

    </body>
    </html>
  `;
}

export async function generateAndSharePDF(
  options: ExportOptions,
): Promise<void> {
  const { onProgress } = options;

  onProgress?.("Building report…");
  const html = buildHTML(options);

  onProgress?.("Generating PDF…");
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  onProgress?.("Opening share sheet…");
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Share InsightBoard Report",
    UTI: "com.adobe.pdf",
  });
}
