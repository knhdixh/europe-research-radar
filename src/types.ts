export const LEVELS = ["Bachelor", "Master", "PhD"] as const;
export const APPLICATION_STATES = ["upcoming", "open", "rolling", "closed", "unknown"] as const;
export const PERSONAL_STATUSES = ["To check", "Interesting", "Apply", "Rejected", "Closed"] as const;
export const CONFIDENCE_LEVELS = ["official", "historical-estimate", "unverified"] as const;

export type Level = (typeof LEVELS)[number];
export type ApplicationState = (typeof APPLICATION_STATES)[number];
export type PersonalStatus = (typeof PERSONAL_STATUSES)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface SourceEvidence {
  url: string;
  pageTitle: string;
  verifiedAt: string;
  sourceStatus: "active" | "redirected" | "blocked" | "missing";
  confidence: Confidence;
  facts: string[];
}

export interface OpportunityCycle {
  id: string;
  cycleYear: number;
  programmeName: string;
  country: string;
  institution: string;
  fields: string[];
  levels: Level[];
  applicationState: ApplicationState;
  applicationOpenDate: string | null;
  applicationOpeningPeriod: string;
  deadline: string | null;
  deadlineType: "fixed" | "rolling" | "estimated-window" | "unknown";
  deadlineTimezone: string | null;
  funding: {
    funded: boolean | null;
    type: "salary" | "stipend" | "allowance" | "bursary" | "unfunded" | "unknown";
    amount: number | null;
    currency: string | null;
    cadence: "hour" | "week" | "month" | "programme" | null;
    text: string;
  };
  duration: {
    minimumWeeks: number | null;
    maximumWeeks: number | null;
    text: string;
  };
  eligibility: string;
  visaRestrictions: string;
  visaClarity: "clear" | "partial" | "unclear";
  applicationUrl: string;
  programmeUrl: string;
  projectCatalogueUrl: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  researchDepth: 1 | 2 | 3 | 4 | 5;
  baselineFit: 1 | 2 | 3 | 4 | 5;
  notes: string;
  lastVerified: string;
  freshnessDays: number;
  evidence: SourceEvidence[];
}

export interface UserProfile {
  studyLevel: Level;
  residenceRegion: "Europe" | "Outside Europe";
  euCitizen: boolean | null;
  nationality: string;
  permitType: string;
  expectedGraduation: string;
  interests: string[];
}

export interface PersonalOverlay {
  opportunityId: string;
  status: PersonalStatus;
  notes: string;
  scoreOverride: number | null;
  updatedAt: string;
}

export interface FitResult {
  score: 1 | 2 | 3 | 4 | 5;
  provisional: boolean;
  verifyEligibility: boolean;
  definitiveIneligibility: boolean;
  reasons: string[];
  components: {
    alignment: number;
    researchDepth: number;
    eligibility: number;
    funding: number;
    timing: number;
  };
}

export interface SavedFilter {
  id: string;
  name: string;
  state: FilterState;
}

export interface FilterState {
  query: string;
  countries: string[];
  fields: string[];
  levels: Level[];
  funding: "all" | "funded" | "unknown";
  applicationStates: ApplicationState[];
  visa: "all" | "clear" | "partial" | "unclear";
  minimumFit: number;
  freshness: "all" | "fresh" | "stale";
}
