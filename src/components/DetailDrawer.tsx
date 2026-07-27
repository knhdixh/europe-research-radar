import { ExternalLink, X } from "lucide-react";
import type { FitResult, OpportunityCycle, PersonalOverlay, PersonalStatus } from "../types";
import { PERSONAL_STATUSES } from "../types";
import { formatDeadline } from "../utils";
import { ScoreBadge } from "./ScoreBadge";

interface DetailDrawerProps {
  opportunity: OpportunityCycle;
  fit: FitResult;
  overlay?: PersonalOverlay;
  onUpdate: (overlay: PersonalOverlay) => void;
  onClose: () => void;
}

export function DetailDrawer({ opportunity, fit, overlay, onUpdate, onClose }: DetailDrawerProps) {
  const update = (patch: Partial<PersonalOverlay>) => onUpdate({
    opportunityId: opportunity.id,
    status: overlay?.status ?? "To check",
    notes: overlay?.notes ?? "",
    scoreOverride: overlay?.scoreOverride ?? null,
    updatedAt: new Date().toISOString(),
    ...patch
  });

  return (
    <aside className="detail-drawer" aria-label={`${opportunity.programmeName} details`}>
      <div className="drawer-heading">
        <div>
          <span className="eyebrow">{opportunity.country} · {opportunity.cycleYear}</span>
          <h2>{opportunity.programmeName}</h2>
          <p>{opportunity.institution}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button>
      </div>

      <div className="fit-summary">
        <ScoreBadge fit={fit} />
        <div><strong>{fit.provisional ? "Provisional fit" : "Fit score"}</strong><span>{fit.verifyEligibility ? "Verify eligibility details" : "Based on your private profile"}</span></div>
      </div>
      <div className="score-breakdown">
        {Object.entries(fit.components).map(([name, value]) => (
          <div key={name}><span>{name.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}</span><meter min="0" max="1" value={value} /><b>{Math.round(value * 100)}%</b></div>
        ))}
      </div>
      <ul className="reason-list">{fit.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>

      <div className="detail-grid">
        <section><span>Application</span><strong className={`state state-${opportunity.applicationState}`}>{opportunity.applicationState}</strong></section>
        <section><span>Deadline</span><strong>{formatDeadline(opportunity)}</strong></section>
        <section><span>Duration</span><strong>{opportunity.duration.text}</strong></section>
        <section><span>Funding</span><strong>{opportunity.funding.text}</strong></section>
      </div>

      <section className="detail-section"><h3>Eligibility</h3><p>{opportunity.eligibility}</p></section>
      <section className="detail-section"><h3>Visa & nationality</h3><p>{opportunity.visaRestrictions}</p><span className={`clarity clarity-${opportunity.visaClarity}`}>{opportunity.visaClarity} clarity</span></section>
      <section className="detail-section"><h3>Opening period</h3><p>{opportunity.applicationOpeningPeriod}</p></section>
      {opportunity.contactPerson && <section className="detail-section"><h3>Contact</h3><p>{opportunity.contactPerson}{opportunity.contactEmail ? ` · ${opportunity.contactEmail}` : ""}</p></section>}

      <section className="personal-section">
        <span className="eyebrow">Private activity</span>
        <div className="two-column">
          <label>Status<select value={overlay?.status ?? "To check"} onChange={(event) => update({ status: event.target.value as PersonalStatus })}>{PERSONAL_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Score override<select value={overlay?.scoreOverride ?? ""} onChange={(event) => update({ scoreOverride: event.target.value ? Number(event.target.value) : null })}><option value="">Computed</option>{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select></label>
        </div>
        <label>Personal notes<textarea value={overlay?.notes ?? ""} onChange={(event) => update({ notes: event.target.value })} placeholder="Application angle, supervisor ideas, document checklist…" /></label>
      </section>

      <section className="evidence-section">
        <h3>Official evidence</h3>
        {opportunity.evidence.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            <div><strong>{source.pageTitle}</strong><span>Verified {new Date(source.verifiedAt).toLocaleDateString("en-GB")} · {source.confidence}</span></div>
            <ExternalLink size={16} />
          </a>
        ))}
        <p>Record last verified {opportunity.lastVerified}. Review after {opportunity.freshnessDays} days.</p>
      </section>

      <div className="drawer-actions">
        <a className="primary-button" href={opportunity.applicationUrl} target="_blank" rel="noreferrer">Application page <ExternalLink size={16} /></a>
        {opportunity.projectCatalogueUrl && <a className="secondary-button" href={opportunity.projectCatalogueUrl} target="_blank" rel="noreferrer">Projects <ExternalLink size={16} /></a>}
      </div>
    </aside>
  );
}
