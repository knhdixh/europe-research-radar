import { describe, expect, it } from "vitest";
import raw from "../data/opportunities.json";
import { catalogueSchema, opportunitySchema } from "./schema";

describe("reviewed catalogue", () => {
  it("validates every record and acceptance count", () => {
    const parsed = catalogueSchema.parse(raw);
    expect(parsed.length).toBeGreaterThanOrEqual(30);
    expect(parsed.length).toBeLessThanOrEqual(50);
  });

  it("has unique stable IDs", () => {
    const ids = raw.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("publishes fixed deadlines only with official evidence", () => {
    const fixed = raw.filter((item) => item.deadlineType === "fixed");
    expect(fixed.every((item) => item.deadline && item.evidence.some((source) => source.confidence === "official"))).toBe(true);
  });

  it("rejects a rolling record with a fixed deadline", () => {
    const source = raw.find((item) => item.deadlineType === "rolling")!;
    const invalid = { ...source, deadline: "2027-01-01" };
    expect(opportunitySchema.safeParse(invalid).success).toBe(false);
  });

  it("keeps historical estimates visibly distinct", () => {
    const estimated = raw.filter((item) => item.deadlineType === "estimated-window");
    expect(estimated.length).toBeGreaterThan(0);
    expect(estimated.every((item) => item.deadline === null)).toBe(true);
  });
});
