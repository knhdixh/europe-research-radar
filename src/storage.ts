import { overlaySchema, profileSchema } from "./schema";
import type { PersonalOverlay, SavedFilter, UserProfile } from "./types";

const PROFILE_KEY = "europe-radar.profile.v1";
const OVERLAYS_KEY = "europe-radar.overlays.v1";
const FILTERS_KEY = "europe-radar.saved-filters.v1";

export const DEFAULT_PROFILE: UserProfile = {
  studyLevel: "Master",
  residenceRegion: "Europe",
  euCitizen: false,
  nationality: "",
  permitType: "",
  expectedGraduation: "",
  interests: ["AI / ML", "Optimization"]
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadProfile(): UserProfile {
  const parsed = profileSchema.safeParse(readJson(PROFILE_KEY, DEFAULT_PROFILE));
  return parsed.success ? parsed.data : DEFAULT_PROFILE;
}

export function saveProfile(profile: UserProfile) {
  profileSchema.parse(profile);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadOverlays(): Record<string, PersonalOverlay> {
  const values = readJson<unknown[]>(OVERLAYS_KEY, []);
  if (!Array.isArray(values)) return {};
  return Object.fromEntries(
    values
      .map((value) => overlaySchema.safeParse(value))
      .filter((result) => result.success)
      .map((result) => [result.data.opportunityId, result.data])
  );
}

export function saveOverlays(overlays: Record<string, PersonalOverlay>) {
  localStorage.setItem(OVERLAYS_KEY, JSON.stringify(Object.values(overlays)));
}

export function loadSavedFilters(): SavedFilter[] {
  const value = readJson<SavedFilter[]>(FILTERS_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function saveSavedFilters(filters: SavedFilter[]) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}

export function exportPrivateData(profile: UserProfile, overlays: Record<string, PersonalOverlay>, savedFilters: SavedFilter[]) {
  return JSON.stringify(
    {
      format: "europe-research-radar-private-v1",
      exportedAt: new Date().toISOString(),
      profile,
      overlays: Object.values(overlays),
      savedFilters
    },
    null,
    2
  );
}

export function parsePrivateImport(raw: string) {
  const value = JSON.parse(raw) as {
    format?: string;
    profile?: unknown;
    overlays?: unknown;
    savedFilters?: unknown;
  };
  if (value.format !== "europe-research-radar-private-v1") throw new Error("Unsupported private-data format.");
  const profile = profileSchema.parse(value.profile);
  if (!Array.isArray(value.overlays)) throw new Error("Private overlays must be an array.");
  const overlays = Object.fromEntries(
    value.overlays.map((item) => {
      const overlay = overlaySchema.parse(item);
      return [overlay.opportunityId, overlay];
    })
  );
  return {
    profile,
    overlays,
    savedFilters: Array.isArray(value.savedFilters) ? (value.savedFilters as SavedFilter[]) : []
  };
}
