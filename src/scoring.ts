import type { FitResult, OpportunityCycle, PersonalOverlay, UserProfile } from "./types";

const NORMALIZED_INTERESTS: Record<string, string[]> = {
  "AI / ML": ["ai", "machine learning", "deep learning", "computer vision", "nlp", "robotics"],
  Optimization: ["optimization", "operations research", "control"],
  "Signal processing": ["signal processing", "image processing", "communications"],
  "Scientific ML": ["scientific machine learning", "scientific ml", "computational science"],
  Mathematics: ["mathematics", "statistics", "probability", "theory"],
  Physics: ["physics", "particle physics", "quantum"],
  Engineering: ["engineering", "electronics", "energy"],
  "Scientific computing": ["scientific computing", "numerical", "high-performance computing"]
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function alignmentScore(opportunity: OpportunityCycle, profile: UserProfile) {
  const haystack = opportunity.fields.join(" ").toLowerCase();
  const interests = profile.interests.flatMap((interest) => NORMALIZED_INTERESTS[interest] ?? [interest.toLowerCase()]);
  if (!interests.length) return 0.5;
  const matched = interests.filter((interest) => haystack.includes(interest.toLowerCase())).length;
  return clamp(matched / Math.min(interests.length, 3));
}

function eligibilityAssessment(opportunity: OpportunityCycle, profile: UserProfile) {
  const eligibility = `${opportunity.eligibility} ${opportunity.visaRestrictions}`.toLowerCase();
  const levelEligible = opportunity.levels.includes(profile.studyLevel);
  const missingIdentity = !profile.nationality.trim() || !profile.permitType.trim();

  if (!levelEligible) {
    return { value: 0, definitive: true, provisional: false, reason: `${profile.studyLevel} students are not listed as eligible.` };
  }
  if (eligibility.includes("cambridge") && eligibility.includes("only")) {
    return { value: 0, definitive: true, provisional: false, reason: "Restricted to current Cambridge students." };
  }
  if (eligibility.includes("epfl students only")) {
    return { value: 0, definitive: true, provisional: false, reason: "Restricted to current EPFL students." };
  }
  if (eligibility.includes("uk resident") && profile.residenceRegion !== "Europe") {
    return { value: 0, definitive: true, provisional: false, reason: "Requires UK residence." };
  }
  if (missingIdentity) {
    return { value: 0.55, definitive: false, provisional: true, reason: "Add nationality and permit type to verify mobility restrictions." };
  }
  if (opportunity.visaClarity === "unclear") {
    return { value: 0.55, definitive: false, provisional: true, reason: "Official source does not fully explain nationality or visa rules." };
  }
  if (opportunity.visaClarity === "partial") {
    return { value: 0.7, definitive: false, provisional: true, reason: "Some visa or nationality conditions still require confirmation." };
  }
  return { value: 1, definitive: false, provisional: false, reason: "Listed level and published mobility rules appear compatible." };
}

function timingScore(opportunity: OpportunityCycle) {
  if (opportunity.applicationState === "open" || opportunity.applicationState === "rolling") return 1;
  if (opportunity.applicationState === "upcoming") return 0.8;
  if (opportunity.applicationState === "unknown") return 0.45;
  return 0.2;
}

export function computeFit(
  opportunity: OpportunityCycle,
  profile: UserProfile,
  overlay?: PersonalOverlay
): FitResult {
  const eligibility = eligibilityAssessment(opportunity, profile);
  const components = {
    alignment: alignmentScore(opportunity, profile),
    researchDepth: opportunity.researchDepth / 5,
    eligibility: eligibility.value,
    funding: opportunity.funding.funded === true ? 1 : opportunity.funding.funded === false ? 0 : 0.45,
    timing: timingScore(opportunity)
  };

  const reasons = [
    `Research alignment ${Math.round(components.alignment * 100)}%.`,
    `Research depth ${opportunity.researchDepth}/5.`,
    eligibility.reason,
    opportunity.funding.funded === true ? "Funding is confirmed." : "Funding needs verification or is unavailable.",
    `Application state is ${opportunity.applicationState}.`
  ];

  if (eligibility.definitive) {
    return {
      score: 1,
      provisional: false,
      verifyEligibility: false,
      definitiveIneligibility: true,
      reasons,
      components
    };
  }

  const weighted =
    components.alignment * 0.4 +
    components.researchDepth * 0.25 +
    components.eligibility * 0.2 +
    components.funding * 0.1 +
    components.timing * 0.05;
  const computed = Math.max(1, Math.min(5, Math.round(1 + weighted * 4))) as 1 | 2 | 3 | 4 | 5;
  const override = overlay?.scoreOverride;

  return {
    score: (override ?? computed) as 1 | 2 | 3 | 4 | 5,
    provisional: eligibility.provisional,
    verifyEligibility: eligibility.provisional,
    definitiveIneligibility: false,
    reasons: override ? [`Personal override: ${override}/5.`, ...reasons] : reasons,
    components
  };
}
