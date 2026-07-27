import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, exportPrivateData, loadProfile, parsePrivateImport, saveProfile } from "./storage";

describe("private browser storage", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to a provisional master's profile", () => {
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
    expect(loadProfile().nationality).toBe("");
  });

  it("round-trips the profile locally", () => {
    const profile = { ...DEFAULT_PROFILE, nationality: "Test", permitType: "Student", expectedGraduation: "2027-06" };
    saveProfile(profile);
    expect(loadProfile()).toEqual(profile);
  });

  it("imports only the explicit private-data format", () => {
    const exported = exportPrivateData(DEFAULT_PROFILE, {}, []);
    expect(parsePrivateImport(exported).profile.studyLevel).toBe("Master");
    expect(() => parsePrivateImport('{"format":"unknown"}')).toThrow();
  });
});
