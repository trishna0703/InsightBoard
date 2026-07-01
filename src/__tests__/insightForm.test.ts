/**
 * Module 2 — Create & Edit Form (Zod validation schema)
 * NFR — "Zod validation with real-time inline errors".
 *
 * Verifies required fields, enum constraints (priority + stage discriminated
 * values), and the optional/nullable fields the form allows to be blank.
 */
import { InsightFormSchema } from "../schemas/insightForm";

function validValues() {
  return {
    title: "Dr. Lee flagged a dosing concern",
    description: "Details of the interaction",
    priority: "P1" as const,
    stage: "Observation" as const,
    categoryId: "cat-1",
    hcpId: "hcp-1",
    drugName: "Metformin",
    tagIds: ["tag-1", "tag-2"],
  };
}

describe("InsightFormSchema", () => {
  it("accepts a fully-populated valid form", () => {
    const result = InsightFormSchema.safeParse(validValues());
    expect(result.success).toBe(true);
  });

  it("rejects an empty title with the required message", () => {
    const result = InsightFormSchema.safeParse({ ...validValues(), title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Title is required");
      expect(result.error.issues[0].path).toEqual(["title"]);
    }
  });

  it("rejects a title longer than 255 characters", () => {
    const result = InsightFormSchema.safeParse({
      ...validValues(),
      title: "x".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Title must be under 255 characters",
      );
    }
  });

  it("accepts a title of exactly 255 characters (boundary)", () => {
    const result = InsightFormSchema.safeParse({
      ...validValues(),
      title: "x".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty description", () => {
    const result = InsightFormSchema.safeParse({
      ...validValues(),
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Description is required");
    }
  });

  it("rejects an invalid priority", () => {
    const result = InsightFormSchema.safeParse({
      ...validValues(),
      priority: "P9",
    });
    expect(result.success).toBe(false);
  });

  it.each(["P1", "P2", "P3", "P4"])("accepts priority %s", (priority) => {
    const result = InsightFormSchema.safeParse({ ...validValues(), priority });
    expect(result.success).toBe(true);
  });

  it.each(["Observation", "Insight", "Actionable", "Impact"])(
    "accepts stage %s",
    (stage) => {
      const result = InsightFormSchema.safeParse({ ...validValues(), stage });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an invalid stage value", () => {
    const result = InsightFormSchema.safeParse({
      ...validValues(),
      stage: "Done",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional category/hcp/drug to be null", () => {
    const result = InsightFormSchema.safeParse({
      ...validValues(),
      categoryId: null,
      hcpId: null,
      drugName: null,
    });
    expect(result.success).toBe(true);
  });

  it("allows optional fields to be omitted entirely", () => {
    const result = InsightFormSchema.safeParse({
      title: "Title",
      description: "Body",
      priority: "P2",
      stage: "Insight",
      tagIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("requires tagIds to be present (empty array is valid)", () => {
    const missingTags = InsightFormSchema.safeParse({
      title: "Title",
      description: "Body",
      priority: "P2",
      stage: "Insight",
    });
    expect(missingTags.success).toBe(false);

    const emptyTags = InsightFormSchema.safeParse({
      ...validValues(),
      tagIds: [],
    });
    expect(emptyTags.success).toBe(true);
  });

  it("reports multiple missing required fields at once", () => {
    const result = InsightFormSchema.safeParse({
      title: "",
      description: "",
      priority: "P1",
      stage: "Observation",
      tagIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("title");
      expect(paths).toContain("description");
    }
  });
});
