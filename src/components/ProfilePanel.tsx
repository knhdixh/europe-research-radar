import { Download, Upload, X } from "lucide-react";
import type { UserProfile } from "../types";

const INTERESTS = ["AI / ML", "Optimization", "Signal processing", "Scientific ML", "Mathematics", "Physics", "Engineering", "Scientific computing"];

interface ProfilePanelProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function ProfilePanel({ profile, onChange, onClose, onExport, onImport }: ProfilePanelProps) {
  const toggleInterest = (interest: string) => {
    const interests = profile.interests.includes(interest)
      ? profile.interests.filter((item) => item !== interest)
      : [...profile.interests, interest];
    onChange({ ...profile, interests });
  };

  return (
    <aside className="settings-panel" aria-label="Private profile settings">
      <div className="drawer-heading">
        <div>
          <span className="eyebrow">Stored only in this browser</span>
          <h2>Your fit profile</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
      </div>
      <p className="privacy-note">Nothing here is uploaded, committed, or sent to GitHub.</p>
      <label>
        Study level
        <select value={profile.studyLevel} onChange={(event) => onChange({ ...profile, studyLevel: event.target.value as UserProfile["studyLevel"] })}>
          <option>Bachelor</option><option>Master</option><option>PhD</option>
        </select>
      </label>
      <label>
        Nationality
        <input value={profile.nationality} onChange={(event) => onChange({ ...profile, nationality: event.target.value })} placeholder="e.g. Vietnamese" />
      </label>
      <label>
        Residence permit / status
        <input value={profile.permitType} onChange={(event) => onChange({ ...profile, permitType: event.target.value })} placeholder="e.g. Finnish student permit" />
      </label>
      <label>
        Expected graduation
        <input type="month" value={profile.expectedGraduation} onChange={(event) => onChange({ ...profile, expectedGraduation: event.target.value })} />
      </label>
      <label>
        EU citizen
        <select value={profile.euCitizen == null ? "unknown" : String(profile.euCitizen)} onChange={(event) => onChange({ ...profile, euCitizen: event.target.value === "unknown" ? null : event.target.value === "true" })}>
          <option value="unknown">Prefer not to say</option><option value="true">Yes</option><option value="false">No</option>
        </select>
      </label>
      <fieldset>
        <legend>Research interests</legend>
        <div className="chip-grid">
          {INTERESTS.map((interest) => (
            <button key={interest} className={profile.interests.includes(interest) ? "chip active" : "chip"} onClick={() => toggleInterest(interest)}>{interest}</button>
          ))}
        </div>
      </fieldset>
      <div className="button-row">
        <button className="secondary-button" onClick={onImport}><Upload size={16} /> Import private JSON</button>
        <button className="secondary-button" onClick={onExport}><Download size={16} /> Export private JSON</button>
      </div>
    </aside>
  );
}
