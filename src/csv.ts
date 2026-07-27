import type { FitResult, OpportunityCycle, PersonalOverlay } from "./types";

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function toPublicCsv(opportunities: OpportunityCycle[]) {
  const headers = [
    "Programme name", "Country", "Institution", "Field", "Level", "Deadline",
    "Application opening period", "Application state", "Funding / salary", "Duration",
    "Eligibility", "Visa / nationality restrictions", "Link", "Contact person",
    "Last verified", "Confidence"
  ];
  const rows = opportunities.map((opportunity) => [
    opportunity.programmeName,
    opportunity.country,
    opportunity.institution,
    opportunity.fields.join("; "),
    opportunity.levels.join("; "),
    opportunity.deadline ?? "",
    opportunity.applicationOpeningPeriod,
    opportunity.applicationState,
    opportunity.funding.text,
    opportunity.duration.text,
    opportunity.eligibility,
    opportunity.visaRestrictions,
    opportunity.programmeUrl,
    opportunity.contactPerson ?? opportunity.contactEmail ?? "",
    opportunity.lastVerified,
    opportunity.evidence.map((item) => item.confidence).join("; ")
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function toPersonalCsv(
  opportunities: OpportunityCycle[],
  overlays: Record<string, PersonalOverlay>,
  fits: Record<string, FitResult>
) {
  const headers = [
    "Programme name", "Country", "Institution", "Field", "Level", "Deadline",
    "Application opening period", "Funding / salary", "Duration", "Eligibility",
    "Visa / nationality restrictions", "Link", "Contact person", "Fit score 1–5",
    "Fit provisional", "Notes", "Status"
  ];
  const rows = opportunities.map((opportunity) => {
    const overlay = overlays[opportunity.id];
    const fit = fits[opportunity.id];
    return [
      opportunity.programmeName,
      opportunity.country,
      opportunity.institution,
      opportunity.fields.join("; "),
      opportunity.levels.join("; "),
      opportunity.deadline ?? "",
      opportunity.applicationOpeningPeriod,
      opportunity.funding.text,
      opportunity.duration.text,
      opportunity.eligibility,
      opportunity.visaRestrictions,
      opportunity.programmeUrl,
      opportunity.contactPerson ?? opportunity.contactEmail ?? "",
      fit.score,
      fit.provisional ? "yes" : "no",
      overlay?.notes ?? "",
      overlay?.status ?? "To check"
    ];
  });
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
