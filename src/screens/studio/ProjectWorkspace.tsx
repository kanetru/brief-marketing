import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DEFAULT_PANEL, LAST_CLIENT_KEY, MANAGER_NAV, PRIMARY_NAV, type ManagerPanel } from "../../domain/workspace/managerNav";
import { ActionGroup } from "../../components/ActionGroup";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { buildBrandIntelligence } from "../../domain/brandIntelligence";
import { buildProjectIntelligence } from "../../domain/project/assemble";
import { nextAssetStatus } from "../../domain/project/assetRegister";
import { sharePath } from "../../domain/project/access";
import { describeClientSite } from "../../domain/project/research/compare";
import { requestSiteResearch } from "../../services/researchClient";
import { useProjects } from "../../state/ProjectContext";
import type { AgentFile, AssetCategory, AssetItem, BriefProject, CategoryPattern, ProjectIntelligence, ResearchTension, SourceQuote } from "../../types/project";
import { StrategyView } from "./StrategyView";
import { ContentDesk, StrategySummary, savedIdeas } from "./WorkSurfaces";
import { HistoryPanel, MarketWatch } from "./IntelligenceDesk";
import { CompetitorBoard, MarketBoard, OpportunityBoard, ResponseBoard } from "./ManagerBoards";
import { ClientOverview } from "./ClientOverview";
import { BrandReference, FilesPanel, IdeasPanel, NotesPanel } from "./WorkPlaces";
import { competitorViews, opportunityViews, originalResponses, researchFailed, researchPartial } from "../../domain/workspace/managerView";
import { marketFacts } from "../../domain/workspace/plainAnalytics";
import { researchRetry } from "../../domain/market/stages";
import { clientRemovalName } from "../../domain/project/removeClient";
import type { MarketRetry } from "../../types/marketDiscovery";
import { MoreNav } from "./MoreNav";
import { RemoveClientSection } from "./RemoveClient";
import { DevProviderChecks } from "./DevProviderChecks";
import { clientCardModel } from "../../domain/workspace/clientCard";
import { onboardingStatusLabel, sendOnboardingHeading } from "../../domain/workspace/onboardingAccess";
import { ClientOnboardingSection } from "./OnboardingAccess";
import { discoveryContext } from "../../domain/market/context";
import { emptyMarketDiscovery, storeRun } from "../../domain/market/review";
import { requestMarketDiscovery } from "../../services/marketClient";
import { buildStrategistPacket } from "../../domain/project/strategist/packet";
import { requestClientReading } from "../../services/ai/clientStrategistClient";
import { CHANNEL_LABEL } from "../../domain/project/strategy/channels";

const STRATEGY_AREAS = [
  ["matters", "What matters"],
  ["customer", "Audience"],
  ["channels", "Where to show up"],
  ["plan", "Roadmap"],
  ["unknown", "Open questions"],
] as const;

type Panel = ManagerPanel | "strategy" | "content" | "websites" | "needs" | "history";

function isPanel(value: string | null): value is ManagerPanel {
  return MANAGER_NAV.some((item) => item.id === value);
}

function justCreated(state: unknown): boolean {
  return Boolean(state && typeof state === "object" && "created" in state && (state as { created?: unknown }).created === true);
}

interface ResearchRun {
  status: "reading" | "complete";
  label: string;
  pages: string[];
  competitorsResearched: number;
}

function StrategyRelation({ project }: { project: BriefProject }) {
  const reading = project.watch.readings[0];
  if (!reading) return null;
  const lines = [...reading.changedHypotheses, ...reading.challengedDecisions];
  if (lines.length === 0) return null;
  return (
    <section className="studio-panel" data-screen="strategy">
      <p className="studio-kicker">Current strategy</p>
      <h2>Signals</h2>
      {lines.map((item) => (
        <p key={item.id}>
          {item.strategyRelation === "challenge" ? "Challenges an earlier read. " : item.strategyRelation === "support" ? "Supports the current hypothesis. " : "Does not affect the strategy. "}
          {item.headline}
        </p>
      ))}
      <p className="studio-meta">These stay hypotheses. You decide.</p>
    </section>
  );
}

export function ProjectWorkspace() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedPanel = searchParams.get("panel");
  const api = useProjects();
  const project = api.projects.find((item) => item.id === projectId) ?? null;
  const [panel, setPanel] = useState<Panel>(() => (isPanel(requestedPanel) ? requestedPanel : DEFAULT_PANEL));
  const [moreOpen, setMoreOpen] = useState(false);
  const [researching, setResearching] = useState(false);
  const [strategyArea, setStrategyArea] = useState<(typeof STRATEGY_AREAS)[number][0]>("matters");
  const [notice, setNotice] = useState("");
  const [researchRun, setResearchRun] = useState<ResearchRun | null>(null);
  const intelligence = useMemo(
    () => (project ? buildProjectIntelligence(project, project.updatedAt) : null),
    [project],
  );
  const reading = useMemo(
    () => (project ? buildBrandIntelligence(project.discovery).reading : null),
    [project],
  );

  useEffect(() => {
    if (!project) return;
    sessionStorage.setItem(LAST_CLIENT_KEY, project.id);
  }, [project]);

  useEffect(() => {
    if (isPanel(requestedPanel)) setPanel(requestedPanel);
  }, [requestedPanel]);

  if (!project || !intelligence || !reading) {
    return (
      <main className="studio-denied">
        <h1>That project isn't on this machine.</h1>
        <Link to="/studio">All clients</Link>
      </main>
    );
  }

  const link = `${window.location.origin}${sharePath(project.shareToken)}`;
  const card = clientCardModel(project);
  const competitors = competitorViews(project, intelligence);
  const opportunities = opportunityViews(project, intelligence);
  const facts = marketFacts(project);

  function choose(next: Panel) {
    setPanel(next);
    setMoreOpen(false);
    setNotice("");
  }

  async function findCompetitors(requested?: MarketRetry) {
    if (!project || !intelligence) return;
    setResearching(true);
    setNotice("");
    const record = project.marketDiscovery ?? emptyMarketDiscovery(project.updatedAt);
    const retry = requested ?? researchRetry(record);
    const result = await requestMarketDiscovery({
      context: discoveryContext(project, intelligence),
      queries: record.set?.queries,
      retry,
      previousCandidates: record.candidates,
      completedSearches: record.completedSearches,
      previousStages: record.stages,
      previousOrigin: record.origin === "live" || record.origin === "cached" ? record.origin : undefined,
    });
    api.setMarketDiscovery(project.id, storeRun(record, result, retry ? "merge" : "replace", new Date().toISOString()));
    setResearching(false);
    setPanel("competitors");
  }

  function reactTo(id: string, action: "save" | "dismiss") {
    if (!project) return;
    api.setReaction(project.id, {
      id: crypto.randomUUID(),
      targetType: "opportunity",
      targetId: id,
      action,
      note: "",
      at: new Date().toISOString(),
    });
    if (action === "save") {
      const item = opportunities.find((entry) => entry.id === id);
      const ideas = project.contentIdeas ?? [];
      if (item && !ideas.some((idea) => idea.id === id)) {
        api.setContentIdeas(project.id, [{ id, title: item.title, body: item.move, status: "idea", at: new Date().toISOString() }, ...ideas]);
      }
    }
    setNotice(action === "save" ? "Saved." : "Dismissed.");
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(label);
    } catch {
      setNotice("Copy didn't work in this browser. Download the file instead.");
    }
  }

  return (
    <div className="studio">
      <header className="studio-top">
        <div>
          <LoverLoverLogo kind="secondary" color="choc" className="studio-logo" alt="Lover Lover" />
          <p className="studio-kicker"><Link to="/studio">Clients</Link></p>
          <h1>{project.businessName || "Untitled project"}</h1>
          <p className="studio-lead">{project.category || project.clientName}</p>
          {card.updated ? <p className="studio-meta">{card.updated}</p> : null}
        </div>
        <div className="studio-links">
          <ActionGroup>
            <Link to="/studio?new=1">Onboard new client</Link>
            <Link to="/studio/look">Make Brief your own</Link>
          </ActionGroup>
        </div>
      </header>
      <nav className="studio-nav" aria-label="Project">
        {PRIMARY_NAV.map(({ id, label }) => (
          <button key={id} type="button" aria-current={panel === id ? "page" : undefined} onClick={() => choose(id)}>
            {label}
          </button>
        ))}
        <MoreNav panel={isPanel(panel) ? panel : DEFAULT_PANEL} open={moreOpen} onToggle={setMoreOpen} onChoose={choose} />
      </nav>
      {notice ? <p className="studio-notice">{notice}</p> : null}
      {panel === "overview" ? (
        <>
          {justCreated(location.state) ? (
            <ClientOnboardingSection
              project={project}
              heading={sendOnboardingHeading(true)}
              onCopy={() => void copy(link, "Client link copied.")}
              onSend={() => {
                api.sendDiscovery(project.id);
                setNotice("Link ready.");
              }}
              onViewResponses={() => choose("responses")}
            />
          ) : null}
          <ClientOverview
            project={project}
            onDetails={(details) => api.setDetails(project.id, details)}
            onSocials={(socials) => api.setSocials(project.id, socials)}
            onProfile={(profile) => api.setProfile(project.id, profile)}
          />
        </>
      ) : null}
      {panel === "competitors" ? (
        <CompetitorBoard
          views={competitors}
          busy={researching}
          failed={researchFailed(project)}
          partial={researchPartial(project)}
          technical={project.marketDiscovery?.technical ?? []}
          devDetails={import.meta.env.DEV}
          onFind={() => void findCompetitors()}
          onRetryInstagram={() => void findCompetitors("instagram")}
          onRetryTikTok={() => void findCompetitors("tiktok")}
          onRetryAnalysis={() => void findCompetitors("classification")}
          onAdd={(name) => api.setCompetitor(project.id, { id: crypto.randomUUID(), name, website: "", notes: "" })}
        />
      ) : null}
      {panel === "market" ? <MarketBoard facts={facts} /> : null}
      {panel === "opportunities" ? (
        <OpportunityBoard items={opportunities} onSave={(id) => reactTo(id, "save")} onDismiss={(id) => reactTo(id, "dismiss")} />
      ) : null}
      {panel === "files" ? (
        <FilesPanel
          assets={project.library}
          onAdd={(asset) => api.addLibraryAsset(project.id, asset)}
          onRemove={(id) => api.removeLibraryAsset(project.id, id)}
        />
      ) : null}
      {panel === "ideas" ? (
        <IdeasPanel ideas={project.contentIdeas ?? []} onChange={(ideas) => api.setContentIdeas(project.id, ideas)} />
      ) : null}
      {panel === "contracts" ? (
        <FilesPanel
          category="contracts"
          assets={project.library}
          onAdd={(asset) => api.addLibraryAsset(project.id, asset)}
          onRemove={(id) => api.removeLibraryAsset(project.id, id)}
        />
      ) : null}
      {panel === "notes" ? (
        <NotesPanel
          notes={project.workNotes ?? []}
          legacy={project.managerNotes}
          onChange={(notes) => api.setWorkNotes(project.id, notes)}
          onLegacy={(text) => api.setNotes(project.id, text)}
        />
      ) : null}
      {panel === "onboarding" ? (
        <ClientOnboardingSection
          project={project}
          heading="Client onboarding"
          onCopy={() => void copy(link, "Client link copied.")}
          onSend={() => {
            api.sendDiscovery(project.id);
            setNotice("Link ready.");
          }}
          onViewResponses={() => choose("responses")}
        />
      ) : null}
      {panel === "responses" ? <ResponseBoard lines={originalResponses(project)} /> : null}
      {panel === "strategy" ? (
        <>
          <StrategySummary plan={intelligence.strategy} questions={intelligence.openQuestions.map((item) => item.prompt)} />
          <details className="full-read">
            <summary>Full strategic read</summary>
            <StrategyView
              area="read"
              plan={intelligence.strategy}
              brain={intelligence.clientBrain}
              insight=""
              openQuestions={intelligence.openQuestions.map((item) => item.prompt)}
              onReread={async () => {
                const packet = buildStrategistPacket(project, {
                  evidence: intelligence.evidence,
                  categoryNote: intelligence.category?.observation,
                  competitorLines: intelligence.competitors.map((item) => `${item.name}: ${item.apparentPositioning || item.unavailableReason || ""}`),
                  contradictions: intelligence.contradictions.map((item) => item.statement),
                  candidateNote: intelligence.strategy.channels.map((item) => `${CHANNEL_LABEL[item.channel]} ${item.priority}: ${item.role}`).join("\n"),
                });
                const result = await requestClientReading(packet.text, packet.evidenceIds);
                if (!result.output) {
                  setNotice(result.failureCode === "not_configured" ? "No model configured." : "No usable reading.");
                  return;
                }
                api.setClientReading(project.id, {
                  evidenceHash: packet.hash,
                  source: "live_model",
                  provider: result.provider,
                  model: result.model,
                  generatedAt: new Date().toISOString(),
                  output: result.output,
                  challenges: [],
                });
                setNotice("Reading updated.");
              }}
              onSave={(fieldId, text, status) => api.setOverride(project.id, {
                fieldId,
                text,
                status,
                decisionStatus: status === "approved" ? "approved" : "unreviewed",
                epistemicStatus: "hypothesis",
                updatedAt: new Date().toISOString(),
              })}
            />
          </details>
          <StrategyRelation project={project} />
          <nav className="studio-nav" aria-label="Strategy">
            {STRATEGY_AREAS.map(([id, label]) => (
              <button key={id} type="button" aria-current={strategyArea === id ? "page" : undefined} onClick={() => setStrategyArea(id)}>{label}</button>
            ))}
          </nav>
          <StrategyView
          area={strategyArea}
          plan={intelligence.strategy}
          brain={intelligence.clientBrain}
          insight={intelligence.category?.observation || intelligence.tensions[0]?.statement || ""}
          openQuestions={intelligence.openQuestions.map((item) => item.prompt)}
          onReread={async () => {
            const packet = buildStrategistPacket(project, {
              evidence: intelligence.evidence,
              categoryNote: intelligence.category?.observation,
              competitorLines: intelligence.competitors.map((item) => `${item.name}: ${item.apparentPositioning || item.unavailableReason || ""}`),
              contradictions: intelligence.contradictions.map((item) => item.statement),
              candidateNote: intelligence.strategy.channels.map((item) => `${CHANNEL_LABEL[item.channel]} ${item.priority}: ${item.role}`).join("\n"),
            });
            const result = await requestClientReading(packet.text, packet.evidenceIds);
            if (!result.output) {
              setNotice(result.failureCode === "not_configured"
                ? "No model is configured. This stays a local assembly, not a reading."
                : "The model didn't return a usable reading.");
              return;
            }
            api.setClientReading(project.id, {
              evidenceHash: packet.hash,
              source: "live_model",
              provider: result.provider,
              model: result.model,
              generatedAt: new Date().toISOString(),
              output: result.output,
              challenges: [],
            });
            setNotice("A model reading is now the understanding. Approved lines were kept.");
          }}
          onSave={(fieldId, text, status) => api.setOverride(project.id, {
            fieldId,
            text,
            status,
            decisionStatus: status === "approved" ? "approved" : "unreviewed",
            epistemicStatus: "hypothesis",
            updatedAt: new Date().toISOString(),
          })}
        />
        </>
      ) : null}
      {panel === "content" ? (
        <ContentDesk
          plan={intelligence.strategy}
          opportunities={intelligence.opportunities}
          saved={savedIdeas(
            project.watch.readings[0]
              ? [
                ...project.watch.readings[0].importantChanges,
                ...project.watch.readings[0].opportunities,
                ...project.watch.readings[0].watchItems,
              ]
              : [],
            project.watch.reactions,
          )}
        />
      ) : null}
      {panel === "websites" ? (
        <>
        <MarketWatch project={project} intelligence={intelligence} />
        <Market
          project={project}
          profiles={intelligence.competitors}
          category={intelligence.category}
          tensions={intelligence.tensions}
          evidence={intelligence.evidence}
          opportunities={intelligence.opportunities}
          run={researchRun}
          onAdd={(competitor) => api.setCompetitor(project.id, competitor)}
          onRemove={(id) => api.removeCompetitor(project.id, id)}
          onResearch={async () => {
            const pages: string[] = [];
            let competitorsResearched = 0;
            const targets = project.competitors.filter((item) => item.website.trim()).slice(0, 10);
            if (project.website) {
              setResearchRun({ status: "reading", label: project.businessName, pages: [], competitorsResearched: 0 });
              const research = await requestSiteResearch(project.website, project.businessName);
              api.setWebsiteResearch(project.id, research);
              for (const item of research.site?.pages ?? []) pages.push(item.label);
            }
            for (const competitor of targets) {
              setResearchRun({ status: "reading", label: competitor.name, pages: [...pages], competitorsResearched });
              const research = await requestSiteResearch(competitor.website, competitor.name);
              api.setCompetitorResearch(project.id, competitor.id, research);
              if ((research.site?.pages.length ?? 0) > 0) {
                competitorsResearched += 1;
                for (const item of research.site?.pages ?? []) pages.push(`${competitor.name} · ${item.label}`);
              }
            }
            setResearchRun({ status: "complete", label: project.businessName, pages, competitorsResearched });
            setNotice(pages.length > 0 ? "Research stored." : "Research unavailable.");
          }}
        />
        </>
      ) : null}
      {panel === "brand" ? <BrandReference project={project} /> : null}
      {panel === "needs" ? (
        <Assets
          items={intelligence.assets}
          library={intelligence.library}
          onCycle={(asset) => api.setAssetState(project.id, asset.id, { status: nextAssetStatus(asset.status), owner: asset.owner, notes: asset.notes })}
          onAddLibrary={(asset) => api.addLibraryAsset(project.id, asset)}
        />
      ) : null}
      {panel === "settings" ? (
        <>
          <ClientSettings
            project={project}
            onOpenOnboarding={() => choose("onboarding")}
            onDetails={(details) => api.setDetails(project.id, details)}
            onSocials={(socials) => api.setSocials(project.id, socials)}
          />
          {import.meta.env.DEV ? <DevProviderChecks /> : null}
          <RemoveClientSection
            name={clientRemovalName(project)}
            onRemove={() => {
              const label = clientRemovalName(project);
              api.remove(project.id);
              if (sessionStorage.getItem(LAST_CLIENT_KEY) === project.id) sessionStorage.removeItem(LAST_CLIENT_KEY);
              navigate("/studio", { state: { removed: label } });
            }}
          />
        </>
      ) : null}
      {panel === "history" ? <HistoryPanel project={project} /> : null}
      {panel === "pack" ? (
        <AgentPackPanel
          files={intelligence.agentPack.files}
          master={intelligence.agentPack.master}
          onCopy={(text, label) => void copy(text, label)}
        />
      ) : null}
    </div>
  );
}

function Market({
  project,
  profiles,
  category,
  tensions,
  evidence,
  opportunities,
  run,
  onAdd,
  onRemove,
  onResearch,
}: {
  project: BriefProject;
  profiles: ProjectIntelligence["competitors"];
  category: ProjectIntelligence["category"];
  tensions: ResearchTension[];
  evidence: ProjectIntelligence["evidence"];
  opportunities: ProjectIntelligence["opportunities"];
  run: ResearchRun | null;
  onAdd: (competitor: { id: string; name: string; website: string; notes: string }) => void;
  onRemove: (id: string) => void;
  onResearch: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const site = project.websiteResearch?.site;
  const reading = site ? describeClientSite(site) : null;
  const canResearch = Boolean(project.website) || project.competitors.some((item) => item.website.trim());
  const storedPages = [
    ...(site?.pages.map((page) => page.label) ?? []),
    ...project.competitors.flatMap((item) => (project.competitorResearch?.[item.id]?.site?.pages ?? []).map((page) => `${item.name} · ${page.label}`)),
  ];
  const published = evidence.filter((item) => item.claimScope === "published_copy").length;
  const researchOpportunities = opportunities.filter((item) => item.id === "opp-making" || item.id === "opp-longevity" || (item.marketEvidence?.length ?? 0) > 0).length;
  return (
    <section className="studio-panel">
      {category ? (
        <div className="studio-cards">
          <p className="studio-kicker">The market · {category.basis === "research" ? "retrieved pages" : "notes only"}</p>
          <p>{category.observation}</p>
          {PATTERN_GROUPS.map((group) => {
            const items = category.patterns.filter((pattern) => group.types.includes(pattern.patternType ?? "") || group.titles.includes(pattern.title));
            if (items.length === 0) return null;
            return (
              <div key={group.title}>
                <h3>{group.title}</h3>
                {items.map((pattern) => (
                  <PatternCard key={pattern.id} pattern={pattern} evidence={evidence} open={openId === pattern.id} onToggle={() => setOpenId(openId === pattern.id ? null : pattern.id)} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p>No competitor notes yet.</p>
      )}
      <article className="studio-card">
        <p className="studio-kicker">{run?.status === "reading" ? "Reading the market" : run?.status === "complete" ? "Something is taking shape" : storedPages.length > 0 ? "Research on record" : "Research"}</p>
        {run?.status === "reading" && run.label ? <p>{run.label}</p> : null}
        <ul className="studio-evidence">
          {(run ? run.pages : storedPages).map((page) => <li key={page}>✓ {page}</li>)}
        </ul>
        {run?.status === "complete" || (!run && storedPages.length > 0) ? (
          <p className="studio-meta">
            {(run?.status === "complete" ? run.pages.length : storedPages.length)} pages read
            {" · "}{(run?.status === "complete" ? run.competitorsResearched : profiles.filter((item) => item.basis === "research").length)} competitors researched
            {" · "}{published} evidence items
            {" · "}{category?.patterns.length ?? 0} category patterns
            {" · "}{researchOpportunities} opportunities
          </p>
        ) : null}
        <ActionGroup>
          <button type="button" className="studio-button" disabled={!canResearch || run?.status === "reading"} onClick={() => void onResearch()}>Research</button>
        </ActionGroup>
      </article>
      <article className="studio-card">
        <p className="studio-kicker">Client website</p>
        {site && reading ? (
          <>
            <h3>{site.positioning || "No headline"}</h3>
            <p>{reading.says}</p>
            {site.offers.length > 0 ? <p>Offer · {site.offers.join(", ")}</p> : null}
            {site.audienceSignals.length > 0 ? <p>Audience on the page · {site.audienceSignals.join(", ")}</p> : <p className="studio-meta">Audience was not named. Brief left it blank.</p>}
            {site.claims.length > 0 ? <p>Claims · {site.claims.join("; ")}</p> : null}
            {site.callsToAction.length > 0 ? <p>Primary ask · {site.callsToAction[0]}</p> : null}
            {site.proof.length > 0 ? <p>Proof · {site.proof.join(" ")}</p> : <p className="studio-meta">No concrete proof line on the pages read.</p>}
            {reading.emphasises.length > 0 ? <p>Emphasises · {reading.emphasises.join(", ")}</p> : null}
            {site.unansweredQuestions.map((line) => <p key={line} className="studio-meta">{line}</p>)}
            {site.researchLimitations.map((line) => <p key={line} className="studio-meta">{line}</p>)}
          </>
        ) : (
          <p>{project.websiteResearch?.unavailableReason || "Not read yet. A URL is not a fact about the business."}</p>
        )}
      </article>
      {tensions.length > 0 ? (
        <div className="studio-cards">
          <h3>Tensions with this client</h3>
          {tensions.map((item) => (
            <article key={item.id} className="studio-card">
              <p className="studio-kicker">{item.kind.replaceAll("_", " ")} · hypothesis</p>
              <h3>{item.title}</h3>
              <p>{item.statement}</p>
              <EvidenceToggle
                id={item.id}
                title={item.title}
                quotes={item.quotes}
                evidenceIds={item.evidenceIds}
                evidence={evidence}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            </article>
          ))}
        </div>
      ) : null}
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() && !website.trim()) return;
          onAdd({ id: crypto.randomUUID(), name, website, notes });
          setName("");
          setWebsite("");
          setNotes("");
        }}
      >
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Website<input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></label>
        <label>What you've actually seen<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Only what you can stand behind." /></label>
        <button type="submit" className="studio-button" disabled={project.competitors.length >= 10}>Add competitor</button>
      </form>
      <div className="studio-cards">
        <h3>Research</h3>
        {profiles.map((profile) => {
          const researched = project.competitorResearch?.[profile.id]?.site;
          return (
            <article key={profile.id} className="studio-card" data-basis={profile.basis}>
              <p className="studio-kicker">{profile.basis === "unavailable" ? "Research unavailable" : profile.basis === "research" ? "Retrieved pages" : "From your notes"}</p>
              <h3>{profile.name}</h3>
              {profile.website ? <p>{profile.website}</p> : null}
              {researched ? <p className="studio-meta">{researched.pages.length} pages read · {researched.researchedAt.slice(0, 10)}</p> : null}
              {profile.basis === "unavailable" ? <p>{profile.unavailableReason}</p> : null}
              {profile.headline ? <p>{profile.headline}</p> : null}
              {profile.basis !== "unavailable" && profile.apparentPositioning ? <p>{profile.apparentPositioning}</p> : null}
              {profile.offer ? <p>Offer · {profile.offer}</p> : null}
              {profile.audience ? <p>Audience · {profile.audience}</p> : null}
              {profile.basis === "research" && !profile.audience ? <p className="studio-meta">Audience was not on the pages read. Brief left it blank.</p> : null}
              {profile.proof ? <p>Proof · {profile.proof}</p> : null}
              {profile.callsToAction ? <p>Ask · {profile.callsToAction}</p> : null}
              {profile.tone ? <p>{profile.tone}</p> : null}
              {profile.contentThemes ? <p>{profile.contentThemes}</p> : null}
              {profile.basis === "research" ? <p className="studio-meta">Visual research is limited. The pictures were not read.</p> : null}
              <ActionGroup className="card-actions">
                <button type="button" className="studio-text-button" onClick={() => onRemove(profile.id)}>Remove</button>
              </ActionGroup>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const PATTERN_GROUPS: Array<{ title: string; types: string[]; titles: string[] }> = [
  { title: "What everyone does", types: ["common_claim", "common_offer", "audience_pattern", "content_pattern", "cta_pattern"], titles: ["Category pattern", "Visual pattern"] },
  { title: "Where they differ", types: ["differentiation_signal"], titles: [] },
  { title: "Category language", types: ["category_cliche", "common_language"], titles: ["Language pattern"] },
  { title: "Proof", types: ["proof_pattern"], titles: [] },
  { title: "White space", types: ["whitespace_hypothesis", "underused_theme"], titles: ["White space"] },
];

function PatternCard({
  pattern,
  evidence,
  open,
  onToggle,
}: {
  pattern: CategoryPattern;
  evidence: ProjectIntelligence["evidence"];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="studio-card">
      <p className="studio-kicker">{pattern.patternType?.replaceAll("_", " ") ?? pattern.title} · {pattern.epistemicStatus} · {pattern.prevalence ?? `${pattern.count} of ${pattern.total}`}</p>
      <h3>{pattern.title}</h3>
      <p>{pattern.statement}</p>
      {pattern.implication ? <p className="studio-meta">{pattern.implication}</p> : null}
      <EvidenceToggle id={pattern.id} title={pattern.title} quotes={pattern.quotes ?? []} evidenceIds={pattern.evidenceIds} evidence={evidence} open={open} onToggle={onToggle} />
    </article>
  );
}

function EvidenceToggle({
  title,
  quotes,
  evidenceIds,
  evidence,
  open,
  onToggle,
}: {
  id: string;
  title: string;
  quotes: SourceQuote[];
  evidenceIds: string[];
  evidence: ProjectIntelligence["evidence"];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <ActionGroup>
        <button type="button" className="studio-text-button" onClick={onToggle}>{open ? "Hide evidence" : "View evidence"}</button>
      </ActionGroup>
      {open ? (
        <div className="studio-evidence">
          <p className="studio-kicker">{title}</p>
          <p>Supported by</p>
          {quotes.map((quote) => (
            <blockquote key={`${quote.who}-${quote.page}-${quote.text}`}>
              <p className="studio-kicker">{quote.who}</p>
              <p>{quote.page}</p>
              <p>“{quote.text}”</p>
              {quote.url ? <p className="studio-meta">{quote.url}</p> : null}
            </blockquote>
          ))}
          {quotes.length === 0 ? evidenceIds.map((id) => {
            const record = evidence.find((item) => item.id === id);
            return <p key={id}><span>{record?.claimScope === "published_copy" ? "published copy" : record?.epistemicStatus ?? "source"}</span> {record?.text ?? id}</p>;
          }) : null}
        </div>
      ) : null}
    </>
  );
}

function Assets({
  items,
  library,
  onCycle,
  onAddLibrary,
}: {
  items: AssetItem[];
  library: ProjectIntelligence["library"];
  onCycle: (asset: AssetItem) => void;
  onAddLibrary: (asset: ProjectIntelligence["library"][number]) => void;
}) {
  const [name, setName] = useState("");
  const [fileRef, setFileRef] = useState("");
  const [category, setCategory] = useState<AssetCategory>("photo_video");
  return (
    <section className="studio-panel" data-screen="assets">
      <h2>What we have</h2>
      {library.length === 0 ? <p>Nothing on file.</p> : (
        <ul className="studio-files">
          {library.map((asset) => (
            <li key={asset.id}>
              <span>{asset.fileRef && asset.fileRef !== asset.name ? `${asset.name} · ${asset.fileRef}` : asset.name}</span>
              <em>{asset.category === "photo_video" ? "Photo" : asset.category}</em>
            </li>
          ))}
        </ul>
      )}
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const now = new Date().toISOString();
          onAddLibrary({
            id: crypto.randomUUID(),
            name: name.trim(),
            category,
            description: "",
            fileRef: fileRef.trim(),
            tags: [],
            notes: "",
            createdAt: now,
            updatedAt: now,
            approval: "unreviewed",
            relatedOpportunityId: null,
          });
          setName("");
          setFileRef("");
        }}
      >
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="founder interview transcript" /></label>
        <label>File or reference<input value={fileRef} onChange={(event) => setFileRef(event.target.value)} placeholder="workshop-joint-01.jpg" /></label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>
            <option value="photo_video">Photo or video</option>
            <option value="brand">Brand</option>
            <option value="web">Web</option>
            <option value="content">Content</option>
            <option value="proof">Proof</option>
          </select>
        </label>
        <button type="submit" className="studio-button">Add</button>
      </form>
      <h2>What we need</h2>
      <ol className="studio-assets">
        {(["now", "soon", "later"] as const).map((priority) => (
          items.filter((asset) => asset.priority === priority).map((asset) => (
            <li key={asset.id}>
              <div>
                <p className="studio-kicker">{priority} · {asset.category === "photo_video" ? "photo" : asset.category}</p>
                <h3>{asset.name}</h3>
                <p>{asset.reason}</p>
              </div>
              <button type="button" className="studio-button" onClick={() => onCycle(asset)}>{asset.status.replace("_", " ")}</button>
            </li>
          ))
        ))}
      </ol>
    </section>
  );
}

function ClientSettings({
  project,
  onOpenOnboarding,
  onDetails,
  onSocials,
}: {
  project: BriefProject;
  onOpenOnboarding: () => void;
  onDetails: (details: { clientName: string; businessName: string; website: string; category: string }) => void;
  onSocials: (socials: import("../../types/project").ClientSocial[]) => void;
}) {
  const [draft, setDraft] = useState({
    clientName: project.clientName,
    businessName: project.businessName,
    website: project.website,
    category: project.category,
    instagram: project.socials?.find((item) => item.platform === "instagram")?.handle ?? "",
    tiktok: project.socials?.find((item) => item.platform === "tiktok")?.handle ?? "",
  });
  return (
    <section className="studio-panel" data-screen="client-settings">
      <h2>Client settings</h2>
      <p className="studio-meta">{onboardingStatusLabel(project.discoveryStatus)}</p>
      <button type="button" className="studio-text-button" onClick={onOpenOnboarding}>Onboarding</button>
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          onDetails({ clientName: draft.clientName, businessName: draft.businessName, website: draft.website, category: draft.category });
          onSocials([
            ...(project.socials ?? []).filter((item) => item.platform !== "instagram" && item.platform !== "tiktok"),
            { platform: "instagram", handle: draft.instagram },
            { platform: "tiktok", handle: draft.tiktok },
          ]);
        }}
      >
        <label>Client name<input value={draft.clientName} onChange={(event) => setDraft({ ...draft, clientName: event.target.value })} /></label>
        <label>Business<input value={draft.businessName} onChange={(event) => setDraft({ ...draft, businessName: event.target.value })} /></label>
        <label>Website<input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} /></label>
        <label>Instagram<input value={draft.instagram} onChange={(event) => setDraft({ ...draft, instagram: event.target.value })} /></label>
        <label>TikTok<input value={draft.tiktok} onChange={(event) => setDraft({ ...draft, tiktok: event.target.value })} /></label>
        <label>Category<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
        <button type="submit" className="studio-button">Save</button>
      </form>
    </section>
  );
}

function AgentPackPanel({
  files,
  master,
  onCopy,
}: {
  files: AgentFile[];
  master: AgentFile;
  onCopy: (text: string, label: string) => void;
}) {
  const named = (name: string) => files.find((file) => file.name === name);
  return (
    <section className="studio-panel" data-screen="agent-pack">
      <h2>Use this client in AI</h2>
      <ActionGroup>
        <button type="button" className="studio-button" onClick={() => onCopy(master.markdown, "Client context copied.")}>Copy client context</button>
        <CopyChip label="Copy brand voice" file={named("04_voice.md")} onCopy={onCopy} />
        <CopyChip label="Copy audience" file={named("02_audience.md")} onCopy={onCopy} />
        <button type="button" className="studio-button" onClick={() => downloadFile("agent-pack.md", [master, ...files].map((file) => `# ${file.name}\n\n${file.markdown}`).join("\n\n---\n\n"))}>Download agent pack</button>
      </ActionGroup>
    </section>
  );
}

function CopyChip({
  label,
  file,
  onCopy,
}: {
  label: string;
  file: AgentFile | undefined;
  onCopy: (text: string, label: string) => void;
}) {
  if (!file) return null;
  return (
    <button type="button" className="studio-button" onClick={() => onCopy(file.markdown, `${label} copied.`)}>
      {label}
    </button>
  );
}

function downloadFile(name: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
