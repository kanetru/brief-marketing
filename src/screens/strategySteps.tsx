import { useState } from "react";
import { ChoiceCard } from "../components/ChoiceCard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { MultiEntry } from "../components/MultiEntry";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TextResponse } from "../components/TextResponse";
import { parseEntries } from "../domain/multiEntry";
import { normaliseHandle } from "../domain/socialHandle";
import type { OfferInput, PriceModel, StrategyInputs, StrategyListField, StrategyTextField } from "../types/strategy";
import { textValue } from "../state/textEvidence";
import { useSession } from "../state/SessionContext";

const PRICE_MODELS: Array<[PriceModel, string]> = [
  ["fixed", "Fixed price"],
  ["from", "From a price"],
  ["range", "A range"],
  ["subscription", "Subscription"],
  ["quote", "Quote / custom"],
  ["free", "Free"],
  ["unknown", "Not sure"],
];

const AWARE: Array<[NonNullable<StrategyInputs["awareness"]>, string, string]> = [
  ["unaware", "Unaware", "They don't know there's a problem yet."],
  ["problem_aware", "Problem aware", "They feel the problem. Not the options."],
  ["solution_aware", "Solution aware", "They know this kind of thing exists."],
  ["provider_aware", "Provider aware", "They know you, or someone like you."],
  ["comparing", "Comparing", "They are choosing between people."],
  ["ready", "Ready to act", "They are close to saying yes."],
];

const CHANNELS: Array<[StrategyInputs["active"][number], string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["pinterest", "Pinterest"],
  ["email", "Email"],
  ["search", "Search"],
  ["website", "Website"],
  ["events", "Events"],
  ["partnerships", "Partnerships"],
];

const WORKING: Array<[StrategyInputs["working"][number], string]> = [
  ["enquiries", "Enquiries"],
  ["referrals", "Referrals"],
  ["reach", "Reach"],
  ["engagement", "Engagement"],
  ["repeat", "Repeat customers"],
  ["nothing", "Nothing obvious"],
  ["unknown", "Unknown"],
];

const MAKE: Array<[StrategyInputs["canMake"][number], string]> = [
  ["photography", "Photography"],
  ["short_video", "Short video"],
  ["talking_head", "Someone on camera"],
  ["articles", "Written articles"],
  ["education", "Educational posts"],
  ["customer_stories", "Customer stories"],
  ["case_studies", "Case studies"],
  ["process_footage", "Process footage"],
  ["audio", "Audio"],
  ["graphics", "Design graphics"],
  ["email", "Email"],
];

const TIME: Array<[NonNullable<StrategyInputs["time"]>, string]> = [
  ["under_2h", "Under two hours"],
  ["half_day", "About half a day"],
  ["a_day", "About a day"],
  ["more", "More than that"],
  ["unknown", "Not sure"],
];

const LIMITS: Array<[StrategyInputs["constraints"][number], string]> = [
  ["no_face", "No face on camera"],
  ["limited_photo", "Limited photography"],
  ["compliance", "Compliance limits"],
  ["privacy", "Client privacy"],
  ["seasonal", "Seasonal"],
  ["long_cycle", "A long sale"],
  ["tiny_team", "A tiny team"],
  ["approvals", "Slow approvals"],
  ["capacity", "Can't take more work"],
];

const PROOF: Array<[StrategyInputs["proofKinds"][number], string]> = [
  ["testimonials", "Testimonials"],
  ["case_studies", "Case studies"],
  ["years", "Years of work"],
  ["results", "Results"],
  ["expertise", "Technical expertise"],
  ["qualifications", "Qualifications"],
  ["awards", "Awards"],
  ["methodology", "A method"],
  ["repeat_customers", "Repeat customers"],
  ["partnerships", "Partnerships"],
  ["guarantees", "A guarantee"],
  ["material", "The material itself"],
  ["process", "The process"],
  ["founder", "The founder's record"],
];

function useStrategy() {
  const api = useSession();
  return { inputs: api.session.strategyInputs, ...api };
}

function Cards<T extends string>({
  field,
  options,
  selected,
}: {
  field: StrategyListField;
  options: Array<[T, string]>;
  selected: readonly string[];
}) {
  const { toggleStrategy } = useSession();
  return (
    <ChoiceGrid columns={2} labelledBy="question-title">
      {options.map(([id, label]) => (
        <ChoiceCard key={id} label={label} pressed={selected.includes(id)} onClick={() => toggleStrategy(field, id)} />
      ))}
    </ChoiceGrid>
  );
}

export function OffersStep() {
  const { inputs, saveOffer, removeOffer } = useStrategy();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [priceModel, setPriceModel] = useState<PriceModel>("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const offer: OfferInput = {
      id: crypto.randomUUID(),
      name: trimmed,
      role: "core",
      importance: "primary",
      priceBand: "",
      buyer: "",
      context: "",
      description: description.trim(),
      priceLabel: priceLabel.trim(),
      priceModel,
    };
    saveOffer(offer);
    setName("");
    setDescription("");
    setPriceLabel("");
    setPriceModel("");
  }

  return (
    <QuestionScreen
      kicker="Business"
      title="What do you sell?"
      supporting="One offer at a time is fine. Price is optional, and it can be a range, a subscription, or a quote."
    >
      <ul className="offer-list">
        {inputs.offers.map((offer) => (
          <li key={offer.id}>
            <span>{offer.name}</span>
            <span className="meta">{[offer.description, offer.priceLabel, priceModelLabel(offer.priceModel)].filter(Boolean).join(" · ")}</span>
            <button type="button" className="text-button" onClick={() => removeOffer(offer.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <TextResponse labelledBy="question-title" length="short" placeholder="Name of the offer" value={name} onChange={setName} />
      <TextResponse labelledBy="question-title" length="short" placeholder="A short description, if you want" value={description} onChange={setDescription} />
      <TextResponse labelledBy="question-title" length="short" placeholder="Price, if you have one — $49/month, from $1,500" value={priceLabel} onChange={setPriceLabel} />
      <div className="quiet-row">
        {PRICE_MODELS.map(([id, label]) => (
          <QuietChoice key={id} label={label} pressed={priceModel === id} onClick={() => setPriceModel(priceModel === id ? "" : id)} />
        ))}
      </div>
      <button type="button" className="text-button" onClick={add}>Add this offer</button>
    </QuestionScreen>
  );
}

function priceModelLabel(model: PriceModel | undefined): string {
  return PRICE_MODELS.find(([id]) => id === model)?.[1] ?? "";
}

export function WantStep() {
  const { inputs, setStrategyText } = useStrategy();
  return (
    <QuestionScreen kicker="Business" title="What do you want more of?" supporting="The work, not a channel. Say it in your own words. You can skip it.">
      <TextResponse labelledBy="question-title" length="long" placeholder="The part of the business you want more of" value={textValue(inputs.wantNote)} onChange={(value) => setStrategyText("wantNote", value)} />
    </QuestionScreen>
  );
}

export function PurposeStep() {
  const { inputs, setStrategyText, setWhyUncertain } = useStrategy();
  return (
    <QuestionScreen kicker="Business" title="Why did this business need to exist?" supporting="Not a mission statement. The gap you saw. You can skip it.">
      <TextResponse labelledBy="question-title" length="long" placeholder="What was missing" value={inputs.whyExist.state === "evidence" ? inputs.whyExist.evidence.raw : ""} onChange={(value) => setStrategyText("whyExist", value)} />
      <div className="quiet-row">
        <QuietChoice label="I'm not sure" pressed={inputs.whyExist.state === "uncertain"} onClick={setWhyUncertain} />
      </div>
      <p className="field-label">What was wrong with the alternative?</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.whatWasMissing)} onChange={(value) => setStrategyText("whatWasMissing", value)} />
      <p className="field-label">If this succeeds, what gets better for the people you serve?</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.whatGetsBetter)} onChange={(value) => setStrategyText("whatGetsBetter", value)} />
    </QuestionScreen>
  );
}

export function ValuesStep({ rest = false }: { rest?: boolean }) {
  const { inputs, setStrategyText } = useStrategy();
  if (rest) {
    return (
      <QuestionScreen kicker="Business" title="What would embarrass you to put your name on?" supporting="Optional. Behaviour, not a values poster.">
        <TextResponse labelledBy="question-title" length="long" placeholder="Optional" value={textValue(inputs.embarrassed)} onChange={(value) => setStrategyText("embarrassed", value)} />
        <p className="field-label">What do you do differently because you care?</p>
        <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.differently)} onChange={(value) => setStrategyText("differently", value)} />
      </QuestionScreen>
    );
  }
  return (
    <QuestionScreen kicker="Business" title="What would you refuse to compromise on, even if it cost you money?" supporting="Behaviour, not a values poster. You can skip it.">
      <TextResponse labelledBy="question-title" length="long" placeholder="The thing you would not drop" value={textValue(inputs.refuse)} onChange={(value) => setStrategyText("refuse", value)} />
    </QuestionScreen>
  );
}

export function SituationStep() {
  const { inputs, setStrategyText } = useStrategy();
  return (
    <QuestionScreen kicker="Audience" title="What is happening when someone starts looking for what you offer?" supporting="The moment. Not a persona.">
      <TextResponse labelledBy="question-title" length="long" placeholder="The situation" value={textValue(inputs.situation)} onChange={(value) => setStrategyText("situation", value)} />
      <p className="field-label">What do they want to be different afterwards?</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.afterwards)} onChange={(value) => setStrategyText("afterwards", value)} />
    </QuestionScreen>
  );
}

export function HesitateStep() {
  const { inputs, setStrategyText } = useStrategy();
  return (
    <QuestionScreen kicker="Audience" title="What tends to make them hesitate?" supporting="And, if you know it, what they dislike about the alternatives.">
      <TextResponse labelledBy="question-title" length="long" placeholder="The hesitation" value={textValue(inputs.hesitate)} onChange={(value) => setStrategyText("hesitate", value)} />
      <p className="field-label">What do they hate about the alternatives?</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.hateAlternatives)} onChange={(value) => setStrategyText("hateAlternatives", value)} />
    </QuestionScreen>
  );
}

export function AwarenessStep() {
  const { inputs, setStrategyValue } = useStrategy();
  return (
    <QuestionScreen kicker="Audience" title="When most people first find you, where are they?" supporting="A guess is allowed. Not sure is allowed.">
      <ChoiceGrid columns={2} labelledBy="question-title">
        {AWARE.map(([id, label, hint]) => (
          <ChoiceCard key={id} label={label} hint={hint} pressed={inputs.awareness === id} onClick={() => setStrategyValue("awareness", inputs.awareness === id ? null : id)} />
        ))}
      </ChoiceGrid>
    </QuestionScreen>
  );
}

export function FollowUpStep() {
  const { session, setStrategyText, setStrategyValue } = useSession();
  const inputs = session.strategyInputs;
  const want = inputs.want;
  const title = want.includes("higher_value")
    ? "What does a typical job look like now, and what would an ideal one look like?"
    : want.includes("more_volume") || session.goals.outcomes.selected.includes("generate_enquiries")
      ? "Where are you now, and is there room for more?"
      : want.includes("more_repeat")
        ? "What brings someone back, when it works?"
        : session.goals.outcomes.selected.includes("launch_something") || want.includes("particular_offer")
          ? "What is launching, and who needs to care?"
          : want.includes("new_audience") || session.goals.outcomes.selected.includes("build_awareness")
            ? "Who, specifically, needs to know you?"
            : "What would get in the way of the year you just described?";
  return (
    <QuestionScreen kicker="Goals" title={title} supporting="Numbers only if you have them. Skip anything that doesn't apply.">
      <TextResponse labelledBy="question-title" length="long" placeholder="As specific as you can be" value={textValue(inputs.goalFollowUp)} onChange={(value) => setStrategyText("goalFollowUp", value)} />
      <p className="field-label">Could the business take substantially more work?</p>
      <div className="quiet-row">
        {(["room", "tight", "full", "unknown"] as const).map((id) => (
          <QuietChoice key={id} label={id === "room" ? "Yes, there's room" : id === "tight" ? "It's tight" : id === "full" ? "We're full" : "Not sure"} pressed={inputs.capacity === id} onClick={() => setStrategyValue("capacity", inputs.capacity === id ? null : id)} />
        ))}
      </div>
    </QuestionScreen>
  );
}

export function ActiveStep() {
  const { inputs } = useStrategy();
  return (
    <QuestionScreen kicker="Conditions" title="Where are you active now?" supporting="Only the places that actually exist. Not the ones you feel you should use.">
      <Cards field="active" options={CHANNELS} selected={inputs.active} />
    </QuestionScreen>
  );
}

export function WorkingStep() {
  const { inputs, setStrategyText } = useStrategy();
  return (
    <QuestionScreen kicker="Conditions" title="What is actually working?" supporting="And what feels like a chore.">
      <Cards field="working" options={WORKING} selected={inputs.working} />
      <p className="field-label">What feels like a chore, or isn't working?</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.chore)} onChange={(value) => setStrategyText("chore", value)} />
    </QuestionScreen>
  );
}

export function CapabilityStep() {
  const { inputs, setStrategyText, setStrategyValue } = useStrategy();
  return (
    <QuestionScreen kicker="Conditions" title="What can this business realistically make, regularly?" supporting="The constraint is part of the strategy.">
      <Cards field="canMake" options={MAKE} selected={inputs.canMake} />
      <p className="field-label">Who can actually make it?</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="A person, not a department" value={textValue(inputs.whoCreates)} onChange={(value) => setStrategyText("whoCreates", value)} />
      <p className="field-label">How much time is realistic in a week?</p>
      <ChoiceGrid columns={2}>
        {TIME.map(([id, label]) => (
          <ChoiceCard key={id} label={label} pressed={inputs.time === id} onClick={() => setStrategyValue("time", inputs.time === id ? null : id)} />
        ))}
      </ChoiceGrid>
      <p className="field-label">What gets in the way?</p>
      <Cards field="constraints" options={LIMITS} selected={inputs.constraints} />
    </QuestionScreen>
  );
}

export function JourneyStep() {
  const { inputs, setStrategyText } = useStrategy();
  const fields: Array<[StrategyTextField, string]> = [
    ["hear", "How do people usually first hear about you?"],
    ["beforeContact", "What happens before they contact you?"],
    ["mustBelieve", "What do they need to believe before they say yes?"],
    ["stopsThem", "What tends to stop them?"],
    ["afterBuy", "What happens after they buy?"],
    ["comeBack", "What makes them come back, or refer someone?"],
  ];
  return (
    <QuestionScreen kicker="Conditions" title="How does someone actually become a customer?" supporting="Leave a line blank if you don't know. That is a better answer than a guess.">
      {fields.map(([field, label]) => (
        <div key={field}>
          <p className="field-label">{label}</p>
          <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs[field])} onChange={(value) => setStrategyText(field, value)} />
        </div>
      ))}
    </QuestionScreen>
  );
}

export function ProofStep() {
  const { inputs, setStrategyText } = useStrategy();
  return (
    <QuestionScreen kicker="Conditions" title="Why should someone believe you?" supporting="Then: which of that can you actually show?">
      <Cards field="proofKinds" options={PROOF} selected={inputs.proofKinds} />
      <p className="field-label">What proof do you actually have available?</p>
      <TextResponse labelledBy="question-title" length="long" placeholder="Name it, or say you don't have it yet" value={textValue(inputs.proofAvailable)} onChange={(value) => setStrategyText("proofAvailable", value)} />
    </QuestionScreen>
  );
}

export function NeighbourStep() {
  const { inputs, setStrategyText } = useStrategy();
  const names = parseEntries(textValue(inputs.neighbours));
  return (
    <QuestionScreen kicker="Conditions" title="Who do you think you're compared with?" supporting="Add anyone that comes to mind. None is fine too — Brief can look for the others.">
      <MultiEntry
        labelledBy="question-title"
        placeholder="Farm names, studios, whoever comes to mind"
        values={names}
        onChange={(next) => setStrategyText("neighbours", next.join("\n"))}
      />
      <p className="field-label">Who would feel completely wrong? Optional.</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="Optional" value={textValue(inputs.wrongCompany)} onChange={(value) => setStrategyText("wrongCompany", value)} />
    </QuestionScreen>
  );
}

function HandleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = normaliseHandle(value);
  const show = value.trim().length > 0;
  return (
    <div className="handle-field">
      <p className="field-label">{label}</p>
      <div className="handle-row">
        <TextResponse labelledBy="question-title" length="short" placeholder="@handle, or a profile link" value={value} onChange={onChange} />
        {show && parsed.valid && parsed.handle ? <span className="handle-ok" aria-label="Looks fine">✓</span> : null}
      </div>
      {show && !parsed.valid ? <p className="gentle">That doesn't look like a handle yet. Try @name or the profile link.</p> : null}
    </div>
  );
}

export function PresenceStep() {
  const { inputs, setPresence } = useStrategy();
  const presence = inputs.presence ?? { instagram: "", tiktok: "", website: "", note: "" };
  return (
    <QuestionScreen
      kicker="Online"
      title="Where can we find you?"
      supporting="Add any accounts your business currently uses. Skip anything that doesn't apply."
    >
      <p className="field-label">Website</p>
      <TextResponse labelledBy="question-title" length="short" placeholder="yoursite.com" value={presence.website} onChange={(value) => setPresence("website", value)} />
      <HandleField label="Instagram" value={presence.instagram} onChange={(value) => setPresence("instagram", value)} />
      <HandleField label="TikTok" value={presence.tiktok} onChange={(value) => setPresence("tiktok", value)} />
    </QuestionScreen>
  );
}

export function AnythingElseStep() {
  const { inputs, setPresence } = useStrategy();
  const presence = inputs.presence ?? { instagram: "", tiktok: "", website: "", note: "" };
  return (
    <QuestionScreen
      kicker="Online"
      title="What should Brief know that it hasn't asked?"
      supporting="Skip it if nothing comes to mind."
    >
      <TextResponse labelledBy="question-title" length="long" placeholder="Anything useful" value={presence.note} onChange={(value) => setPresence("note", value)} />
    </QuestionScreen>
  );
}
