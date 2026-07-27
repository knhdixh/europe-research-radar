import { describe, expect, it } from "vitest";
import raw from "../data/opportunities.json";
import type { OpportunityCycle, UserProfile } from "./types";
import { computeFit } from "./scoring";
import { DEFAULT_PROFILE } from "./storage";

const opportunities = raw as OpportunityCycle[];
const byId = (id: string) => opportunities.find((item) => item.id === id)!;
const completeProfile: UserProfile = {
  ...DEFAULT_PROFILE,
  nationality: "Vietnamese",
  permitType: "Finnish student residence permit",
  expectedGraduation: "2027-06"
};

describe("deterministic fit model", () => {
  it("produces an integer score from 1 to 5", () => {
    for (const opportunity of opportunities) {
      const result = computeFit(opportunity, completeProfile);
      expect(Number.isInteger(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeLessThanOrEqual(5);
    }
  });

  it("marks missing nationality and permit details as provisional", () => {
    const result = computeFit(byId("eth-ssrf-2026"), DEFAULT_PROFILE);
    expect(result.provisional).toBe(true);
    expect(result.verifyEligibility).toBe(true);
    expect(result.definitiveIneligibility).toBe(false);
  });

  it("forces definitively ineligible levels to score 1", () => {
    const result = computeFit(byId("ellis-dfki-research-internships-2026"), completeProfile);
    expect(result.score).toBe(1);
    expect(result.definitiveIneligibility).toBe(true);
  });

  it("forces institution-only programmes to score 1", () => {
    const result = computeFit(byId("cambridge-srim-2026"), completeProfile);
    expect(result.score).toBe(1);
    expect(result.reasons.join(" ")).toContain("Cambridge");
  });

  it("uses a personal override without erasing the explanation", () => {
    const result = computeFit(byId("inria-research-internships-2026"), completeProfile, {
      opportunityId: "inria-research-internships-2026",
      status: "Interesting",
      notes: "",
      scoreOverride: 2,
      updatedAt: new Date().toISOString()
    });
    expect(result.score).toBe(2);
    expect(result.reasons[0]).toContain("override");
  });

  it("distinguishes confirmed funding from unknown funding", () => {
    const funded = computeFit(byId("max-planck-cs-internships-2026"), completeProfile);
    const unknown = computeFit(byId("cwi-master-projects-2026"), completeProfile);
    expect(funded.components.funding).toBeGreaterThan(unknown.components.funding);
  });
});
