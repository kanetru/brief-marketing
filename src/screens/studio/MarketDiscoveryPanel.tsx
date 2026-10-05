import { useState } from "react";
import { Overlay } from "../../components/Overlay";
import { discoveryContext, addSearch, removeSearch, splitNames } from "../../domain/market/context";
import { formatFollowers } from "../../domain/workspace/marketCards";
import { emptyMarketDiscovery, groupedReview, MARKET_GROUP_LABEL, prominentAssessments, storeRun, watchingSummary, approveAccount, dismissAccount, reclassifyAccount, confirmIdentity } from "../../domain/market/review";
import { requestMarketDiscovery } from "../../services/marketClient";
import { useProjects } from "../../state/ProjectContext";
import type { BriefProject, ProjectIntelligence } from "../../types/project";
import type { MarketAccountAssessment, MarketAccountType, MarketDiscoveryRecord, SocialAccountCandidate, SocialPlatform } from "../../types/marketDiscovery";

const TYPES: MarketAccountType[] = ["direct_competitor", "indirect_competitor", "market_reference", "watch_account", "emerging_account", "irrelevant"];

export function MarketDiscoveryPanel({ project, intelligence }: { project: BriefProject; intelligence: ProjectIntelligence }) {
  const api = useProjects();
  const record = project.marketDiscovery ?? emptyMarketDiscovery(project.updatedAt);
  const [busy, setBusy] = useState(false);
  const [searches, setSearches] = useState(false);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const groups = groupedReview(record);
  const worth = prominentAssessments(record).length;
  const watching = watchingSummary(record);
  const evidence = record.assessments.find((item) => item.candidateId === evidenceId) ?? null;
  const evidenceCandidate = record.candidates.find((item) => item.id === evidenceId) ?? null;

  async function run(refresh: boolean, executeQueryIds?: string[]) {
    setBusy(true);
    const result = await requestMarketDiscovery({
      context: discoveryContext(project, intelligence),
      queries: record.set?.queries,
      executeQueryIds,
      refresh,
    });
    const mode = executeQueryIds && executeQueryIds.length > 0 && !refresh ? "merge" : "replace";
    api.setMarketDiscovery(project.id, storeRun(record, result, mode, new Date().toISOString()));
    setBusy(false);
  }

  function save(next: MarketDiscoveryRecord) {
    api.setMarketDiscovery(project.id, next);
  }

  return (
    <section className="studio-panel" data-screen="market-discovery">
      <div className="studio-row">
        <h3 className="intel-bucket">Accounts worth watching</h3>
        {record.origin === "live" ? <p className="provenance" data-origin="live">Live</p> : null}
        {record.origin === "cached" ? <p className="provenance" data-origin="cached">Cached</p> : null}
      </div>
      {record.origin === "idle" ? (
        <>
          <h3 className="intel-bucket">Competitors & market</h3>
          <p>Brief can use what it learned about this client to find businesses and accounts worth watching.</p>
        </>
      ) : null}
      <Mentioned project={project} />
      {record.message ? <p data-discovery-message="">{record.message}</p> : null}
      {worth > 0 ? <p>Brief found {worth} {worth === 1 ? "account" : "accounts"} worth reviewing.</p> : null}
      {record.candidates.length > 0 ? <p className="studio-meta">Showing the saved result.</p> : null}
      {watching.length > 0 ? (
        <div data-screen="market-map">
          <h3 className="intel-bucket">Watching</h3>
          {watching.map((item) => <p key={item.type}>{MARKET_GROUP_LABEL[item.type]} · {item.count}</p>)}
          {record.entities.filter((item) => item.monitoringStatus === "active").map((item) => (
            <p key={item.id}>{item.name} · {item.accounts.map((account) => `${account.platform} @${account.handle}`).join(" · ")}</p>
          ))}
        </div>
      ) : null}
      {groups.map((group) => (
        <div key={group.type}>
          <h3 className="intel-bucket">{MARKET_GROUP_LABEL[group.type]}</h3>
          {group.items.map((item) => {
            const candidate = record.candidates.find((entry) => entry.id === item.candidateId);
            if (!candidate) return null;
            return (
              <CandidateCard
                key={item.candidateId}
                candidate={candidate}
                assessment={item}
                onApprove={() => save(approveAccount(record, item.candidateId, new Date().toISOString()))}
                onDismiss={() => save(dismissAccount(record, item.candidateId, new Date().toISOString()))}
                onClassify={(classification) => save(reclassifyAccount(record, item.candidateId, classification, new Date().toISOString()))}
                onEvidence={() => setEvidenceId(item.candidateId)}
              />
            );
          })}
        </div>
      ))}
      {record.proposals.filter((item) => item.confidence === "proposed").map((item) => (
        <p key={item.id}>
          {item.name} may be the same business on both platforms. {item.reason}
          <button type="button" className="studio-text-button" onClick={() => save(confirmIdentity(record, item.id, new Date().toISOString()))}>Confirm same business</button>
        </p>
      ))}
      <div className="studio-row">
        <button type="button" className="studio-button" disabled={busy} onClick={() => void run(record.candidates.length > 0)}>
          {busy ? "Looking" : record.candidates.length > 0 ? "Refresh live" : "Find competitors"}
        </button>
        {record.set ? <button type="button" className="studio-text-button" onClick={() => setSearches((open) => !open)}>View searches</button> : null}
      </div>
      {searches && record.set ? (
        <div data-screen="discovery-searches">
          {record.set.queries.map((query) => (
            <p key={query.id}>
              {query.platform} · {query.query}
              <button type="button" className="studio-text-button" onClick={() => save({ ...record, set: record.set ? { ...record.set, queries: removeSearch(record.set.queries, query.id) } : record.set })}>Remove</button>
              <button type="button" className="studio-text-button" disabled={busy} onClick={() => void run(false, [query.id])}>Run</button>
            </p>
          ))}
          <form className="studio-row" onSubmit={(event) => {
            event.preventDefault();
            if (!record.set) return;
            const queries = addSearch(record.set.queries, draft, platform);
            save({ ...record, set: { ...record.set, queries } });
            setDraft("");
          }}>
            <select aria-label="Platform" value={platform} onChange={(event) => setPlatform(event.target.value === "tiktok" ? "tiktok" : "instagram")}>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
            <input aria-label="Add search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a search" />
            <button type="submit" className="studio-text-button">Add search</button>
          </form>
        </div>
      ) : null}
      {import.meta.env.DEV && record.usage.length > 0 ? (
        <details data-screen="provider-usage">
          <summary>Provider usage</summary>
          {record.usage.map((item, index) => (
            <p key={`${item.endpoint}-${item.requestedAt}-${index}`}>
              {item.endpoint} · {item.purpose} · {item.success ? "ok" : "failed"} · {item.cached ? "cached" : "requested"}
              {typeof item.units === "number" ? ` · ${item.units} units` : ""}
            </p>
          ))}
        </details>
      ) : null}
      {evidence && evidenceCandidate ? (
        <Overlay variant="drawer" title={evidenceCandidate.displayName || evidenceCandidate.handle} testId="account-evidence" onClose={() => setEvidenceId(null)}>
          <p>{evidence.epistemicStatus === "inference" ? "Inference." : ""} {evidence.decisionStatus === "approved" ? "Approved. Approving does not make this a fact." : "Unreviewed."}</p>
          {evidence.clientClaim ? <p>{evidence.clientClaim}</p> : null}
          <p>{evidence.whyItMatters}</p>
          {evidence.uncertainty ? <p>{evidence.uncertainty}</p> : null}
          <p>Machine read: {label(evidence.machineClassification)}. Current: {label(evidence.classification)}.</p>
          {evidenceCandidate.recentPosts.slice(0, 3).map((post) => <p key={post.postId}>{post.caption}</p>)}
        </Overlay>
      ) : null}
    </section>
  );
}

function Mentioned({ project }: { project: BriefProject }) {
  const raw = project.discovery?.strategyInputs?.neighbours;
  const names = splitNames(raw?.state === "evidence" ? raw.evidence.raw : "");
  if (names.length === 0) return null;
  return (
    <div data-screen="mentioned-during-discovery">
      <h3 className="intel-bucket">Mentioned during discovery</h3>
      <p className="studio-meta">Client-provided. Not yet checked.</p>
      {names.map((name) => <p key={name}>{name}</p>)}
      <h3 className="intel-bucket">Find others</h3>
    </div>
  );
}

function CandidateCard({
  candidate,
  assessment,
  onApprove,
  onDismiss,
  onClassify,
  onEvidence,
}: {
  candidate: SocialAccountCandidate;
  assessment: MarketAccountAssessment;
  onApprove: () => void;
  onDismiss: () => void;
  onClassify: (classification: MarketAccountType) => void;
  onEvidence: () => void;
}) {
  const themes = [...new Set(candidate.recentPosts.flatMap((post) => post.hashtags))].slice(0, 3);
  const followers = candidate.followers === null ? "" : formatFollowers(String(candidate.followers));
  return (
    <article className="intel-card" data-screen="market-account" data-origin={candidate.providerStatus}>
      <h3>{candidate.displayName || candidate.handle}</h3>
      <p>{candidate.platform === "instagram" ? "Instagram" : "TikTok"} · @{candidate.handle}</p>
      <p>{label(assessment.classification)}</p>
      {assessment.summary ? <p>{assessment.summary}</p> : null}
      <p className="studio-meta">Appeared in {candidate.discoveryFrequency} relevant {candidate.discoveryFrequency === 1 ? "search" : "searches"}</p>
      {followers ? <p className="studio-meta">{followers}</p> : null}
      {themes.length > 0 ? <p><span className="intel-label">Recent themes</span> {themes.join(" · ")}</p> : null}
      {assessment.clientClaim ? <p className="studio-meta">{assessment.clientClaim}</p> : null}
      <div className="studio-row">
        <button type="button" className="studio-text-button" onClick={onApprove}>Add to watchlist</button>
        <button type="button" className="studio-text-button" onClick={onDismiss}>Not a competitor</button>
        <button type="button" className="studio-text-button" onClick={onEvidence}>View evidence</button>
      </div>
      <label className="studio-meta">
        Classify differently
        <select aria-label={`Classify ${candidate.handle}`} value={assessment.classification} onChange={(event) => onClassify(event.target.value as MarketAccountType)}>
          {TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}
        </select>
      </label>
    </article>
  );
}

function label(type: MarketAccountType): string {
  if (type === "irrelevant") return "Not a fit";
  return MARKET_GROUP_LABEL[type].replace(/s$/, "");
}
