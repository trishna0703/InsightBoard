/**
 * Module 5.2 — Conflict Resolution.
 *
 * findConflictingFields produces the field-by-field "Yours vs Theirs" list the
 * ConflictModal renders — and must include ONLY the fields that actually
 * differ. ConflictError carries that list plus the winning server row.
 */
import type { ApolloClient } from "@apollo/client";
import {
  findConflictingFields,
  ConflictError,
  DetailNode,
} from "../hooks/useUpdateInsight";
import { InsightFormValues } from "../schemas/insightForm";

// Minimal fake client: no cached HCP/category names, so name-resolution falls
// back to raw IDs (sufficient for exercising the diff logic).
const fakeClient = {
  cache: { extract: () => ({}) },
  readQuery: () => null,
} as unknown as ApolloClient<object>;

function mine(overrides: Partial<InsightFormValues> = {}): InsightFormValues {
  return {
    title: "Original title",
    description: "Original description",
    priority: "P2",
    stage: "Observation",
    categoryId: "cat-1",
    hcpId: "hcp-1",
    drugName: "Metformin",
    tagIds: [],
    ...overrides,
  };
}

function theirs(overrides: Partial<DetailNode> = {}): DetailNode {
  return {
    id: "i1",
    title: "Original title",
    description: "Original description",
    priority: "P2",
    stage: "observation", // db lowercase
    drugName: "Metformin",
    updatedAt: "2026-06-01T00:00:00.000Z",
    hcp: { id: "hcp-1", name: "Dr. Smith", specialty: "", institution: "" },
    category: { id: "cat-1", name: "Efficacy" },
    ...overrides,
  };
}

describe("findConflictingFields", () => {
  it("returns no fields when nothing differs", () => {
    expect(findConflictingFields(mine(), theirs(), fakeClient)).toEqual([]);
  });

  it("reports only the title when only the title differs", () => {
    const fields = findConflictingFields(
      mine({ title: "My edit" }),
      theirs({ title: "Their edit" }),
      fakeClient,
    );
    expect(fields).toEqual([
      { field: "title", mine: "My edit", theirs: "Their edit" },
    ]);
  });

  it("reports every differing field, side by side", () => {
    const fields = findConflictingFields(
      mine({ title: "Mine", priority: "P1" }),
      theirs({ title: "Theirs", priority: "P3" }),
      fakeClient,
    );
    const byField = Object.fromEntries(fields.map((f) => [f.field, f]));
    expect(Object.keys(byField).sort()).toEqual(["priority", "title"]);
    expect(byField.title).toEqual({ field: "title", mine: "Mine", theirs: "Theirs" });
    expect(byField.priority).toEqual({ field: "priority", mine: "P1", theirs: "P3" });
  });

  it("normalizes stage casing when comparing (display vs db value)", () => {
    const fields = findConflictingFields(
      mine({ stage: "Insight" }),
      theirs({ stage: "actionable" }),
      fakeClient,
    );
    expect(fields).toContainEqual({
      field: "stage",
      mine: "Insight",
      theirs: "Actionable",
    });
  });

  it("does NOT flag stage when only casing differs (same logical stage)", () => {
    // mine stage 'Observation' maps to db 'observation' — equal to theirs.
    const fields = findConflictingFields(mine(), theirs(), fakeClient);
    expect(fields.find((f) => f.field === "stage")).toBeUndefined();
  });

  it("shows an em-dash for a cleared (null) drug name", () => {
    const fields = findConflictingFields(
      mine({ drugName: null }),
      theirs({ drugName: "Aspirin" }),
      fakeClient,
    );
    expect(fields).toContainEqual({ field: "drugName", mine: "—", theirs: "Aspirin" });
  });

  it("detects an HCP change (falls back to raw id without a name cache)", () => {
    const fields = findConflictingFields(
      mine({ hcpId: "hcp-2" }),
      theirs({ hcp: { id: "hcp-1", name: "Dr. Smith", specialty: "", institution: "" } }),
      fakeClient,
    );
    expect(fields).toContainEqual({ field: "hcp", mine: "hcp-2", theirs: "Dr. Smith" });
  });
});

describe("ConflictError", () => {
  it("carries the conflicting fields and the winning server row", () => {
    const fields = [{ field: "title", mine: "a", theirs: "b" }];
    const serverNode = theirs();
    const err = new ConflictError(fields, serverNode);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ConflictError");
    expect(err.fields).toBe(fields);
    expect(err.serverNode).toBe(serverNode);
  });
});
