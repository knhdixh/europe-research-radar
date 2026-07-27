import { useMemo, useRef, useState } from "react";
import {
  BellRing, CalendarClock, Check, ChevronDown, Download, Filter, Radar,
  Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles
} from "lucide-react";
import rawOpportunities from "../data/opportunities.json";
import { toPersonalCsv, toPublicCsv, downloadText } from "./csv";
import { catalogueSchema } from "./schema";
import { computeFit } from "./scoring";
import {
  DEFAULT_PROFILE, exportPrivateData, loadOverlays, loadProfile, loadSavedFilters,
  parsePrivateImport, saveOverlays, saveProfile, saveSavedFilters
} from "./storage";
import type {
  ApplicationState, FilterState, Level, OpportunityCycle, PersonalOverlay,
  SavedFilter, UserProfile
} from "./types";
import { APPLICATION_STATES, LEVELS } from "./types";
import { daysUntil, formatDeadline, isStale, sortByPriority } from "./utils";
import { DetailDrawer } from "./components/DetailDrawer";
import { ProfilePanel } from "./components/ProfilePanel";
import { ScoreBadge } from "./components/ScoreBadge";
import "./styles.css";

const opportunities = catalogueSchema.parse(rawOpportunities) as OpportunityCycle[];
const DEFAULT_FILTERS: FilterState = {
  query: "", countries: [], fields: [], levels: [], funding: "all",
  applicationStates: [], visa: "all", minimumFit: 1, freshness: "all"
};

type QuickView = "all" | "open" | "14days" | "30days" | "opening60" | "highfit" | "review";

function matchesQuickView(opportunity: OpportunityCycle, quickView: QuickView, score: number) {
  const deadlineDays = daysUntil(opportunity.deadline);
  const openingDays = daysUntil(opportunity.applicationOpenDate);
  if (quickView === "open") return ["open", "rolling"].includes(opportunity.applicationState);
  if (quickView === "14days") return deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 14;
  if (quickView === "30days") return deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 30;
  if (quickView === "opening60") return openingDays != null && openingDays >= 0 && openingDays <= 60;
  if (quickView === "highfit") return score >= 4;
  if (quickView === "review") return isStale(opportunity) || opportunity.evidence.some((item) => item.sourceStatus !== "active");
  return true;
}

function selectionMatch<T extends string>(selected: T[], values: readonly T[]) {
  return !selected.length || selected.some((item) => values.includes(item));
}

function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [overlays, setOverlays] = useState<Record<string, PersonalOverlay>>(() => loadOverlays());
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => loadSavedFilters());
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [quickView, setQuickView] = useState<QuickView>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterNaming, setFilterNaming] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [sort, setSort] = useState<"priority" | "fit" | "deadline" | "name">("priority");
  const importInput = useRef<HTMLInputElement>(null);

  const fits = useMemo(() => Object.fromEntries(
    opportunities.map((opportunity) => [opportunity.id, computeFit(opportunity, profile, overlays[opportunity.id])])
  ), [profile, overlays]);

  const countries = useMemo(() => [...new Set(opportunities.map((item) => item.country))].sort(), []);
  const fields = useMemo(() => [...new Set(opportunities.flatMap((item) => item.fields))].sort(), []);

  const visible = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const result = opportunities.filter((opportunity) => {
      const searchable = `${opportunity.programmeName} ${opportunity.institution} ${opportunity.country} ${opportunity.fields.join(" ")}`.toLowerCase();
      const fundingMatch = filters.funding === "all" ||
        (filters.funding === "funded" && opportunity.funding.funded === true) ||
        (filters.funding === "unknown" && opportunity.funding.funded == null);
      const freshnessMatch = filters.freshness === "all" ||
        (filters.freshness === "fresh" && !isStale(opportunity)) ||
        (filters.freshness === "stale" && isStale(opportunity));
      return (!query || searchable.includes(query)) &&
        selectionMatch(filters.countries, [opportunity.country]) &&
        selectionMatch(filters.fields, opportunity.fields) &&
        selectionMatch(filters.levels, opportunity.levels) &&
        fundingMatch &&
        (!filters.applicationStates.length || filters.applicationStates.includes(opportunity.applicationState)) &&
        (filters.visa === "all" || filters.visa === opportunity.visaClarity) &&
        fits[opportunity.id].score >= filters.minimumFit &&
        freshnessMatch &&
        matchesQuickView(opportunity, quickView, fits[opportunity.id].score);
    });
    return result.sort((a, b) => {
      if (sort === "fit") return fits[b.id].score - fits[a.id].score || sortByPriority(a, b);
      if (sort === "deadline") return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
      if (sort === "name") return a.programmeName.localeCompare(b.programmeName);
      return sortByPriority(a, b) || fits[b.id].score - fits[a.id].score;
    });
  }, [filters, quickView, fits, sort]);

  const metrics = useMemo(() => ({
    open: opportunities.filter((item) => ["open", "rolling"].includes(item.applicationState)).length,
    within14: opportunities.filter((item) => { const days = daysUntil(item.deadline); return days != null && days >= 0 && days <= 14; }).length,
    within30: opportunities.filter((item) => { const days = daysUntil(item.deadline); return days != null && days >= 0 && days <= 30; }).length,
    opening60: opportunities.filter((item) => { const days = daysUntil(item.applicationOpenDate); return days != null && days >= 0 && days <= 60; }).length,
    highfit: opportunities.filter((item) => fits[item.id].score >= 4).length,
    review: opportunities.filter((item) => isStale(item) || item.evidence.some((source) => source.sourceStatus !== "active")).length
  }), [fits]);

  const selected = opportunities.find((item) => item.id === selectedId);

  const updateProfile = (next: UserProfile) => {
    setProfile(next);
    saveProfile(next);
  };
  const updateOverlay = (overlay: PersonalOverlay) => {
    const next = { ...overlays, [overlay.opportunityId]: overlay };
    setOverlays(next);
    saveOverlays(next);
  };
  const downloadPrivate = () => downloadText(
    `europe-radar-private-${new Date().toISOString().slice(0, 10)}.json`,
    exportPrivateData(profile, overlays, savedFilters),
    "application/json"
  );
  const handleImport = async (file: File) => {
    const parsed = parsePrivateImport(await file.text());
    setProfile(parsed.profile);
    setOverlays(parsed.overlays);
    setSavedFilters(parsed.savedFilters);
    saveProfile(parsed.profile);
    saveOverlays(parsed.overlays);
    saveSavedFilters(parsed.savedFilters);
  };
  const saveCurrentFilter = () => {
    if (!newFilterName.trim()) return;
    const next = [...savedFilters, { id: crypto.randomUUID(), name: newFilterName.trim(), state: filters }];
    setSavedFilters(next);
    saveSavedFilters(next);
    setNewFilterName("");
    setFilterNaming(false);
  };

  const toggleArray = <T extends string>(key: keyof FilterState, value: T) => {
    const current = filters[key] as T[];
    setFilters({ ...filters, [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span><Radar size={21} /></span><div>Europe Research <b>Radar</b></div></a>
        <nav><a href="#radar">Radar</a><a href="#timeline">Timeline</a><a href="#catalogue">Catalogue</a></nav>
        <div className="top-actions">
          <button className="secondary-button compact" onClick={() => downloadText("opportunities.csv", toPublicCsv(opportunities), "text/csv")}><Download size={15} /> Public CSV</button>
          <button className="icon-button profile-button" onClick={() => setSettingsOpen(true)} aria-label="Open private profile"><Settings2 size={18} /><span>{profile.studyLevel}</span></button>
        </div>
      </header>

      <main>
        <section className="hero" id="radar">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> Reviewed research opportunities · verified 27 July 2026</span>
            <h1>Find the research role<br />that moves you toward a PhD.</h1>
            <p>A source-backed radar for European AI, mathematics, computing, physics and engineering programmes—without job-board noise.</p>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={20} />
            <div><strong>Public facts. Private decisions.</strong><span>Your score, notes and application status stay in this browser.</span></div>
          </div>
        </section>

        {(!profile.nationality || !profile.permitType || !profile.expectedGraduation) && (
          <button className="onboarding-banner" onClick={() => setSettingsOpen(true)}>
            <span><BellRing size={18} /><span><strong>Make your fit scores eligibility-aware</strong><small>Add nationality, residence permit and graduation timing privately.</small></span></span>
            <span>Complete profile →</span>
          </button>
        )}

        <section className="metric-grid" aria-label="Opportunity overview">
          {[
            ["open", "Open now", metrics.open, "Accepting applications"],
            ["14days", "Next 14 days", metrics.within14, "Deadlines approaching"],
            ["30days", "Next 30 days", metrics.within30, "Plan application work"],
            ["opening60", "Opening soon", metrics.opening60, "Within 60 days"],
            ["highfit", "High fit", metrics.highfit, "Score 4 or 5"],
            ["review", "Needs review", metrics.review, "Stale or changed source"]
          ].map(([key, label, value, description]) => (
            <button key={key} className={quickView === key ? "metric-card active" : "metric-card"} onClick={() => setQuickView(key as QuickView)}>
              <span>{label}</span><strong>{value}</strong><small>{description}</small>
            </button>
          ))}
        </section>

        <section className="timeline-section" id="timeline">
          <div className="section-heading">
            <div><span className="eyebrow">Next known moments</span><h2>Opening & deadline timeline</h2></div>
            <CalendarClock size={24} />
          </div>
          <div className="timeline">
            {opportunities
              .flatMap((item) => [
                item.applicationOpenDate ? { date: item.applicationOpenDate, type: "Opens", item } : null,
                item.deadline && daysUntil(item.deadline) != null && daysUntil(item.deadline)! >= 0 ? { date: item.deadline, type: "Deadline", item } : null
              ])
              .filter((value): value is { date: string; type: string; item: OpportunityCycle } => Boolean(value))
              .filter((event) => daysUntil(event.date) != null && daysUntil(event.date)! >= 0)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 8)
              .map((event) => (
                <button key={`${event.item.id}-${event.type}`} onClick={() => setSelectedId(event.item.id)}>
                  <time>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(`${event.date}T12:00:00Z`))}</time>
                  <i className={event.type === "Opens" ? "opening-dot" : "deadline-dot"} />
                  <span><b>{event.type}</b>{event.item.programmeName}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="catalogue-section" id="catalogue">
          <div className="section-heading catalogue-heading">
            <div><span className="eyebrow">Reviewed catalogue</span><h2>{visible.length} opportunities</h2></div>
            <div className="catalogue-actions">
              <label className="search-box"><Search size={17} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search programme, field, institution…" /></label>
              <button className={filtersOpen ? "secondary-button active" : "secondary-button"} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters</button>
              <label className="sort-select">Sort<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="priority">Priority</option><option value="fit">Fit score</option><option value="deadline">Deadline</option><option value="name">Name</option></select><ChevronDown size={14} /></label>
            </div>
          </div>

          <div className="saved-filter-row">
            <button className={quickView === "all" ? "chip active" : "chip"} onClick={() => setQuickView("all")}>All</button>
            {savedFilters.map((saved) => <button key={saved.id} className="chip" onClick={() => setFilters(saved.state)}>{saved.name}</button>)}
            {filterNaming ? (
              <span className="filter-name-box">
                <input aria-label="Saved filter name" value={newFilterName} onChange={(event) => setNewFilterName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveCurrentFilter()} placeholder="Filter name" autoFocus />
                <button onClick={saveCurrentFilter}>Save</button>
                <button onClick={() => { setFilterNaming(false); setNewFilterName(""); }}>Cancel</button>
              </span>
            ) : <button className="chip dashed" onClick={() => setFilterNaming(true)}>+ Save current filter</button>}
            {(quickView !== "all" || JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)) && <button className="clear-link" onClick={() => { setQuickView("all"); setFilters(DEFAULT_FILTERS); }}>Clear all</button>}
          </div>

          {filtersOpen && (
            <div className="filter-panel">
              <div><label>Country</label><select value="" onChange={(event) => event.target.value && toggleArray("countries", event.target.value)}><option value="">Add country…</option>{countries.map((country) => <option key={country}>{country}</option>)}</select><div className="mini-chips">{filters.countries.map((country) => <button key={country} onClick={() => toggleArray("countries", country)}>{country} ×</button>)}</div></div>
              <div><label>Field</label><select value="" onChange={(event) => event.target.value && toggleArray("fields", event.target.value)}><option value="">Add field…</option>{fields.map((field) => <option key={field}>{field}</option>)}</select><div className="mini-chips">{filters.fields.map((field) => <button key={field} onClick={() => toggleArray("fields", field)}>{field} ×</button>)}</div></div>
              <div><label>Level</label><div className="check-row">{LEVELS.map((level) => <button key={level} className={filters.levels.includes(level) ? "selected" : ""} onClick={() => toggleArray<Level>("levels", level)}>{filters.levels.includes(level) && <Check size={13} />}{level}</button>)}</div></div>
              <div><label>Application state</label><div className="check-row wrap">{APPLICATION_STATES.map((state) => <button key={state} className={filters.applicationStates.includes(state) ? "selected" : ""} onClick={() => toggleArray<ApplicationState>("applicationStates", state)}>{state}</button>)}</div></div>
              <div><label>Funding</label><select value={filters.funding} onChange={(event) => setFilters({ ...filters, funding: event.target.value as FilterState["funding"] })}><option value="all">Any</option><option value="funded">Confirmed funded</option><option value="unknown">Needs verification</option></select></div>
              <div><label>Visa clarity</label><select value={filters.visa} onChange={(event) => setFilters({ ...filters, visa: event.target.value as FilterState["visa"] })}><option value="all">Any</option><option value="clear">Clear</option><option value="partial">Partial</option><option value="unclear">Unclear</option></select></div>
              <div><label>Minimum fit · {filters.minimumFit}/5</label><input type="range" min="1" max="5" value={filters.minimumFit} onChange={(event) => setFilters({ ...filters, minimumFit: Number(event.target.value) })} /></div>
              <div><label>Freshness</label><select value={filters.freshness} onChange={(event) => setFilters({ ...filters, freshness: event.target.value as FilterState["freshness"] })}><option value="all">Any</option><option value="fresh">Fresh</option><option value="stale">Needs review</option></select></div>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>Programme</th><th>Country</th><th>Field</th><th>Level</th><th>Application</th><th>Funding</th><th>Fit</th><th>My status</th></tr></thead>
              <tbody>
                {visible.map((opportunity) => (
                  <tr key={opportunity.id} onClick={() => setSelectedId(opportunity.id)}>
                    <td><strong>{opportunity.programmeName}</strong><span>{opportunity.institution}</span></td>
                    <td>{opportunity.country}</td>
                    <td><span className="field-line">{opportunity.fields.slice(0, 2).join(" · ")}</span>{opportunity.fields.length > 2 && <small>+{opportunity.fields.length - 2} more</small>}</td>
                    <td>{opportunity.levels.join(" / ")}</td>
                    <td><span className={`state state-${opportunity.applicationState}`}>{opportunity.applicationState}</span><small>{formatDeadline(opportunity)}</small></td>
                    <td>{opportunity.funding.funded === true ? <span className="funded">Funded</span> : opportunity.funding.funded === false ? "Unfunded" : "Verify"}</td>
                    <td><ScoreBadge fit={fits[opportunity.id]} /></td>
                    <td><span className="personal-status">{overlays[opportunity.id]?.status ?? "To check"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <div className="empty-state"><Filter size={28} /><h3>No opportunities match</h3><p>Clear a filter or lower the minimum fit score.</p></div>}
          </div>

          <div className="catalogue-footer">
            <div><strong>{opportunities.length} official-source records</strong><span>Personal fields are added only to the download in your browser.</span></div>
            <button className="secondary-button" onClick={() => downloadText("my-europe-research-radar.csv", toPersonalCsv(opportunities, overlays, fits), "text/csv")}><Download size={16} /> Download combined personal CSV</button>
          </div>
        </section>
      </main>

      <footer><div className="brand"><span><Radar size={18} /></span><div>Europe Research <b>Radar</b></div></div><p>Official sources first. Historical dates stay historical. No automated applications or messages.</p><a href="https://github.com/knhdixh/europe-research-radar" target="_blank" rel="noreferrer">Data & methodology</a></footer>

      {selected && <div className="drawer-backdrop" onClick={() => setSelectedId(null)}><div onClick={(event) => event.stopPropagation()}><DetailDrawer opportunity={selected} fit={fits[selected.id]} overlay={overlays[selected.id]} onUpdate={updateOverlay} onClose={() => setSelectedId(null)} /></div></div>}
      {settingsOpen && <div className="drawer-backdrop" onClick={() => setSettingsOpen(false)}><div onClick={(event) => event.stopPropagation()}><ProfilePanel profile={profile} onChange={updateProfile} onClose={() => setSettingsOpen(false)} onExport={downloadPrivate} onImport={() => importInput.current?.click()} /></div></div>}
      <input ref={importInput} hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && handleImport(event.target.files[0]).catch((error) => window.alert(error instanceof Error ? error.message : "Import failed"))} />
    </div>
  );
}

export default App;
