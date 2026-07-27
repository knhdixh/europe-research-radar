import { z } from "zod";
import { APPLICATION_STATES, CONFIDENCE_LEVELS, LEVELS, PERSONAL_STATUSES } from "./types";

export const sourceEvidenceSchema = z.object({
  url: z.string().url(),
  pageTitle: z.string().min(3),
  verifiedAt: z.string().datetime(),
  sourceStatus: z.enum(["active", "redirected", "blocked", "missing"]),
  confidence: z.enum(CONFIDENCE_LEVELS),
  facts: z.array(z.string().min(2)).min(1)
});

export const opportunitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+-\d{4}$/),
  cycleYear: z.number().int().min(2020).max(2035),
  programmeName: z.string().min(3),
  country: z.string().min(2),
  institution: z.string().min(2),
  fields: z.array(z.string().min(2)).min(1),
  levels: z.array(z.enum(LEVELS)).min(1),
  applicationState: z.enum(APPLICATION_STATES),
  applicationOpenDate: z.string().date().nullable(),
  applicationOpeningPeriod: z.string().min(2),
  deadline: z.string().date().nullable(),
  deadlineType: z.enum(["fixed", "rolling", "estimated-window", "unknown"]),
  deadlineTimezone: z.string().nullable(),
  funding: z.object({
    funded: z.boolean().nullable(),
    type: z.enum(["salary", "stipend", "allowance", "bursary", "unfunded", "unknown"]),
    amount: z.number().nonnegative().nullable(),
    currency: z.string().nullable(),
    cadence: z.enum(["hour", "week", "month", "programme"]).nullable(),
    text: z.string().min(2)
  }),
  duration: z.object({
    minimumWeeks: z.number().positive().nullable(),
    maximumWeeks: z.number().positive().nullable(),
    text: z.string().min(2)
  }),
  eligibility: z.string().min(10),
  visaRestrictions: z.string().min(4),
  visaClarity: z.enum(["clear", "partial", "unclear"]),
  applicationUrl: z.string().url(),
  programmeUrl: z.string().url(),
  projectCatalogueUrl: z.string().url().nullable(),
  contactPerson: z.string().nullable(),
  contactEmail: z.string().email().nullable(),
  researchDepth: z.number().int().min(1).max(5),
  baselineFit: z.number().int().min(1).max(5),
  notes: z.string(),
  lastVerified: z.string().date(),
  freshnessDays: z.number().int().positive(),
  evidence: z.array(sourceEvidenceSchema).min(1)
}).superRefine((record, context) => {
  if (record.deadlineType === "fixed" && !record.deadline) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Fixed deadlines require a date." });
  }
  if (record.deadlineType === "rolling" && record.deadline) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Rolling calls cannot have a fixed deadline." });
  }
  if (record.funding.funded === true && record.funding.type === "unfunded") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["funding", "type"], message: "Funded records cannot be unfunded." });
  }
});

export const catalogueSchema = z.array(opportunitySchema).min(1);

export const profileSchema = z.object({
  studyLevel: z.enum(LEVELS),
  residenceRegion: z.enum(["Europe", "Outside Europe"]),
  euCitizen: z.boolean().nullable(),
  nationality: z.string(),
  permitType: z.string(),
  expectedGraduation: z.string(),
  interests: z.array(z.string())
});

export const overlaySchema = z.object({
  opportunityId: z.string(),
  status: z.enum(PERSONAL_STATUSES),
  notes: z.string(),
  scoreOverride: z.number().int().min(1).max(5).nullable(),
  updatedAt: z.string().datetime()
});
