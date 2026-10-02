import type { AwarenessState, ChannelId, ChannelPriority, ChannelRecommendation } from "../../../types/strategy";
import type { PlatformIntelligenceProvider } from "./platform";
import { claimsStaleDemographics, keepSpecific } from "./quality";
import { canMake, canShow, capacityTight, growthOffer, spoken, wants, type StrategySource, type Trade } from "./read";

const ORDER: ChannelPriority[] = ["primary", "secondary", "test", "maintain", "deprioritise", "not_now"];

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  email: "Email",
  search: "Search",
  website: "Website",
  events: "Events",
  partnerships: "Partnerships",
};

export function deriveChannels(
  source: StrategySource,
  trade: Trade,
  platforms: PlatformIntelligenceProvider,
): ChannelRecommendation[] {
  const tight = capacityTight(source);
  const made = trade === "hospitality" ? hospitality(source) : trade === "practice" ? practice(source) : making(source, tight);
  if (source.inputs.active.includes("facebook") && source.inputs.working.includes("enquiries")) {
    made.push(rec(source, "facebook", "maintain", {
      role: "Keep the place that already produces enquiries.",
      why: `Facebook already brings enquiries. Maintain it. Do not rebuild the plan around a channel that merely happens to work.`,
      strength: "It is already producing enquiries for this business.",
      limitation: "That is not evidence Facebook is right for a business that has never used it.",
      success: "Those enquiries continue without new theatre.",
      needs: ["Whatever they already do there"],
    }));
  }
  return made
    .map((item) => attachLiveNote(item, platforms))
    .filter((item, index, all) => all.findIndex((other) => other.channel === item.channel) === index)
    .sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));
}

function hospitality(source: StrategySource): ChannelRecommendation[] {
  const late = lateAwareness(source.inputs.awareness);
  const show = canShow(source);
  return [
    rec(source, "search", late ? "primary" : "secondary", {
      role: "Catch people at the moment they choose where to go.",
      why: `${who(source)} already know they want a table. Search is that moment. A feed can make them want the room; it does not take the booking.`,
      strength: source.inputs.active.includes("search") ? "Search is already a place they appear." : "The decision happens before anyone follows them.",
      limitation: "A listing with no point of view looks like every other room.",
      success: "People who already want to go out choose this room.",
      needs: ["A clear reason to book", "Hours, menu, and place as they are now"],
    }),
    rec(source, "instagram", show ? (late ? "secondary" : "primary") : "not_now", {
      role: show ? "Make a specific dish or night desirable before someone searches." : "No role until the food can be shown.",
      why: show
        ? `${name(source)} can photograph or film the food. That is the argument for coming, for ${who(source)}.`
        : `No photography or short video is on record. A visual feed for ${name(source)} would be a costume.`,
      strength: "The product can be seen.",
      limitation: chore(source) || "Plates with nothing to say become wallpaper.",
      success: "Someone books a specific dish or night, not 'somewhere for dinner'.",
      needs: show ? ["A photograph of the actual plate", "One sentence on why it is on"] : ["Someone who can photograph the food"],
    }),
    rec(source, "email", wants(source, "more_repeat") || canMake(source, "email") ? "secondary" : "not_now", {
      role: "Give people who have already been a reason to return.",
      why: wants(source, "more_repeat")
        ? `Repeat business is the commercial priority. Email reaches guests who already trust the room.`
        : `Repeat is not the priority they named, so a list is not the next system.`,
      strength: "It speaks to people who have already sat down.",
      limitation: "An empty letter is worse than silence.",
      success: "A known guest books again without a discount.",
      needs: ["A reason this week", "People who have already been"],
    }),
    rec(source, "linkedin", "not_now", {
      role: "No role for this room.",
      why: `${who(source)} are not choosing a restaurant on LinkedIn. The time belongs on the booking moment.`,
      strength: "None for this audience.",
      limitation: "It looks like a business talking to nobody.",
      success: "Left unused.",
      needs: [],
    }),
    rec(source, "tiktok", canMake(source, "short_video") ? "test" : "not_now", {
      role: "A test of short film, not the system that fills the room.",
      why: canMake(source, "short_video")
        ? `Short video is possible. Test whether a dish is recognised. Do not make it the booking strategy.`
        : `There is no short-video capability on record.`,
      strength: "A dish can travel quickly if they can film it.",
      limitation: "A trend with no dish behind it does not become a booking.",
      success: "A specific dish is recognised, then booked.",
      needs: ["Short video of the actual food"],
    }),
  ];
}

function practice(source: StrategySource): ChannelRecommendation[] {
  const show = canShow(source) && !source.inputs.constraints.includes("limited_photo");
  const slow = source.inputs.constraints.includes("long_cycle") || /month/.test(spoken(source));
  return [
    rec(source, "linkedin", "primary", {
      role: "Be where the next client is already comparing practices.",
      why: `${who(source)} appoint a practice after a long look. LinkedIn is where that professional attention sits. It is not a gallery of finished buildings.`,
      strength: "The buyer is an organisation, not a household.",
      limitation: "Award captions with no decision behind them are skipped.",
      success: "The right client starts a conversation already understanding how the practice decides.",
      needs: ["A point of view on a real constraint", "Someone who can write it"],
    }),
    rec(source, "search", "secondary", {
      role: "Be findable while a client is comparing.",
      why: `They arrive late and the sale is slow. Search is how ${who(source)} check ${name(source)} before a call.`,
      strength: "The intent already exists.",
      limitation: "A portfolio with no argument loses to the practice that explains itself.",
      success: "A comparing client can find the work and the reason.",
      needs: ["A page that explains a decision"],
    }),
    rec(source, "website", "secondary", {
      role: "Hold the proof a caption cannot.",
      why: `After someone hears of ${name(source)}, the site has to answer what they need to believe before they say yes.`,
      strength: "A case can live here.",
      limitation: "If the proof is not on file, the page will be vague.",
      success: "A visitor can repeat how the practice works.",
      needs: ["One case they are allowed to show"],
    }),
    rec(source, "email", slow ? "secondary" : "test", {
      role: "Stay present across the months before an appointment.",
      why: `People hear about a practice long before they call. Email is that gap, for ${who(source)}.`,
      strength: "It does not depend on being seen that week.",
      limitation: canMake(source, "articles") ? "It still needs something worth sending." : "Nobody is set up to write it yet.",
      success: "The point of view is still there when the project becomes real.",
      needs: ["A short note from the work"],
    }),
    rec(source, "instagram", show ? "secondary" : "not_now", {
      role: show ? "Show built work to people who already know the practice." : "Not a channel while photography is thin.",
      why: show
        ? `Use photographs for people who already care. Do not expect a developer to discover ${name(source)} here.`
        : `Photography is limited or missing. An image feed would fake a visual practice they cannot sustain.`,
      strength: "Built work, when they can show it.",
      limitation: "It will not carry a considered appointment.",
      success: "Recognition of the work, not a new audience from scratch.",
      needs: ["Photographs they have the right to use"],
    }),
    rec(source, "tiktok", "not_now", {
      role: "No role in this sale.",
      why: `A short-video feed does not help ${who(source)} appoint ${name(source)}.`,
      strength: "None for this decision.",
      limitation: "It pulls the practice toward performance.",
      success: "Left unused.",
      needs: [],
    }),
  ];
}

function making(source: StrategySource, tight: boolean): ChannelRecommendation[] {
  const show = canShow(source);
  const professional = /architect|commercial|developer|specifier/.test(spoken(source));
  const focus = growthOffer(source) || source.offer || "the work they want more of";
  if (tight) {
    return [
      rec(source, "website", "primary", {
        role: "Make the desired work obvious, so the wrong enquiry does not arrive.",
        why: `${name(source)} cannot take more volume. ${who(source)} need to recognise ${focus} before they enquire. A louder feed would ask the bench for work it cannot do.`,
        strength: "A page can refuse the wrong job without being rude.",
        limitation: "It only works if proof of that work exists.",
        success: "Enquiries are for the work they want, not for anything in the workshop.",
        needs: ["Pictures or notes of that work", "A first line that names it"],
      }),
      rec(source, "instagram", show ? "secondary" : "not_now", {
        role: show ? "Show the desired work to people already nearby. Not a wider net." : "Not until the making can be shown.",
        why: show
          ? `Show ${focus} so the right person recognises it. Do not use the feed to increase volume while the bench is full.`
          : `Nothing on record can show the work, and capacity is tight. A feed would be generic finished pieces.`,
        strength: "Process is the difference they described.",
        limitation: "Finished-product grids attract the jobs they are trying not to grow.",
        success: "People who enquire already know which job this is.",
        needs: ["Process photography of the desired work"],
      }),
      rec(source, "search", "deprioritise", {
        role: "Do not buy demand the bench cannot take.",
        why: `Search would bring more people looking for ${name(source)}. They asked for better work, and they cannot fulfil more volume.`,
        strength: "It finds people who are already looking.",
        limitation: "Those people may want the work they are trying to do less of.",
        success: "Left quiet until the offer is clearer.",
        needs: [],
      }),
      rec(source, "partnerships", "secondary", {
        role: "Let the right job arrive through someone who already specifies it.",
        why: textOfNeighbours(source)
          ? `They named who should stand beside them: ${textOfNeighbours(source)}. That route serves the year better than more strangers.`
          : `The right job is specified by other people, not by a larger public. Partnerships reach ${who(source)} without asking for more volume.`,
        strength: "One relationship can be worth a month of posts.",
        limitation: "It is slow, and it needs a real neighbour.",
        success: "A named collaborator sends a job that fits.",
        needs: ["People who would make sense beside the work"],
      }),
      rec(source, "linkedin", professional ? "secondary" : "not_now", {
        role: professional ? "Speak to the people who specify the job." : "No role for a household audience.",
        why: professional
          ? `Architects or commercial buyers are in the picture. LinkedIn is for that relationship, not a second consumer feed.`
          : `${who(source)} are not choosing this work on LinkedIn.`,
        strength: "A direct professional conversation.",
        limitation: "It fails if it imitates the workshop's public feed.",
        success: "A specifier asks about the specific job.",
        needs: ["A named professional audience"],
      }),
      rec(source, "tiktok", "not_now", {
        role: "Not while capacity is the constraint.",
        why: source.inputs.constraints.includes("no_face")
          ? `They will not be on camera, and the bench is full. TikTok is refused.`
          : `More attention is the wrong problem while ${name(source)} cannot take more work.`,
        strength: "None until there is room.",
        limitation: "Reach would fight the constraint.",
        success: "Left unused.",
        needs: [],
      }),
      rec(source, "email", wants(source, "more_repeat") ? "secondary" : "not_now", {
        role: "Stay with people who already commissioned the right job.",
        why: wants(source, "more_repeat")
          ? `Repeat is what they want more of. Email keeps ${name(source)} with those clients.`
          : `Repeat was not the priority, so a list is not the next build.`,
        strength: "Existing trust.",
        limitation: "Nothing to send if the work is not documented.",
        success: "A past client returns or refers a fitting job.",
        needs: ["A note when a relevant piece is made"],
      }),
    ];
  }
  return [
    rec(source, "instagram", show ? "primary" : "not_now", {
      role: show ? "Let people see how the work is made before they enquire." : "Not a primary channel until the work can be shown.",
      why: show
        ? `${name(source)} makes a physical thing and can show the making. ${who(source)} decide partly by seeing that.`
        : `The work is visual, but nobody can yet photograph or film it. A feed now would be an instruction to post with nothing to post.`,
      strength: "The process is the proof.",
      limitation: "Finished pieces with no explanation look like every other workshop.",
      success: "A person arrives understanding why the piece is made this way.",
      needs: ["Process photography or short footage"],
    }),
    rec(source, "website", show ? "secondary" : "primary", {
      role: "Hold the explanation a caption cannot.",
      why: `${who(source)} need more than a picture before they commission ${name(source)}. The site is where the offer and one proof can sit together.`,
      strength: "It can be specific.",
      limitation: "A thin page sends people back to guessing.",
      success: "The first line says what is actually for sale.",
      needs: ["The offer in their words", "One proof"],
    }),
    rec(source, "search", wants(source, "more_volume") ? "secondary" : "not_now", {
      role: "Meet people already looking for this kind of work.",
      why: wants(source, "more_volume")
        ? `They want more customers and there is room. Search meets ${who(source)} at the moment of looking.`
        : `More search demand is not the priority they described.`,
      strength: "Intent.",
      limitation: "Category words are crowded. The page has to name the specific job.",
      success: "Enquiries use their words for the work.",
      needs: ["Language customers actually use"],
    }),
    rec(source, "linkedin", professional ? "secondary" : "not_now", {
      role: professional ? "Talk to specifiers." : "No role for this audience.",
      why: professional
        ? `The neighbour or buyer is professional. LinkedIn is that conversation.`
        : `${who(source)} are not hiring this workshop on LinkedIn.`,
      strength: "A named professional relationship.",
      limitation: "A consumer grid in a professional feed helps no one.",
      success: "A specifier asks about the job.",
      needs: ["A professional the work actually sits beside"],
    }),
    rec(source, "tiktok", canMake(source, "short_video") && !source.inputs.constraints.includes("no_face") ? "test" : "not_now", {
      role: "A test of process film, not a personality channel.",
      why: source.inputs.constraints.includes("no_face")
        ? `They will not be on camera. A face-led feed is refused.`
        : canMake(source, "short_video")
          ? `Short video is possible. Test it on the making, and stop if it becomes performance.`
          : `No short video is possible yet.`,
      strength: "Process can be shown quickly.",
      limitation: "Performance with nothing explained attracts the wrong attention.",
      success: "A viewer can say what is different about the making.",
      needs: ["Footage of the process, not a presenter"],
    }),
    rec(source, "email", wants(source, "more_repeat") ? "secondary" : "not_now", {
      role: "Keep clients who have already commissioned.",
      why: wants(source, "more_repeat")
        ? `They want people to come back. Email is how that happens.`
        : `They did not ask for more repeat business.`,
      strength: "Trust that already exists.",
      limitation: "A list with nothing to report goes quiet.",
      success: "A past client returns or refers the right job.",
      needs: ["News only when a relevant piece exists"],
    }),
    rec(source, "partnerships", textOfNeighbours(source) ? "secondary" : "test", {
      role: "Stand next to the people they already named.",
      why: textOfNeighbours(source)
        ? `They said who belongs beside the work: ${textOfNeighbours(source)}.`
        : `No neighbour has been named, so this stays a test rather than a plan.`,
      strength: "Cultural fit, if the neighbour is real.",
      limitation: "A logo wall is not a collaboration.",
      success: "One relationship sends the right person.",
      needs: ["A name, not a category"],
    }),
  ];
}

function rec(
  source: StrategySource,
  channel: ChannelId,
  priority: ChannelPriority,
  copy: Omit<ChannelRecommendation, "channel" | "priority" | "forWhom" | "goal" | "evidenceIds">,
): ChannelRecommendation {
  return {
    channel,
    priority,
    forWhom: who(source),
    goal: source.horizon || "the year they described",
    evidenceIds: ["goals.horizon", "audience.current"],
    ...copy,
  };
}

function attachLiveNote(item: ChannelRecommendation, platforms: PlatformIntelligenceProvider): ChannelRecommendation {
  const note = platforms.lookup(item.channel);
  if (!note || claimsStaleDemographics(note.statement)) return item;
  const why = keepSpecific(`${item.why} Sourced note (${note.source}, ${note.retrievedAt}): ${note.statement}`);
  return why ? { ...item, why } : item;
}

function name(source: StrategySource): string {
  return source.businessName || "The business";
}

function who(source: StrategySource): string {
  return source.audience || "the people they named";
}

function lateAwareness(state: AwarenessState | null): boolean {
  return state === "solution_aware" || state === "provider_aware" || state === "comparing" || state === "ready";
}

function chore(source: StrategySource): string {
  const text = source.inputs.chore.state === "evidence" ? source.inputs.chore.evidence.raw.trim() : "";
  return text ? `They already called this a chore: ${text}` : "";
}

function textOfNeighbours(source: StrategySource): string {
  return source.inputs.neighbours.state === "evidence" ? source.inputs.neighbours.evidence.raw.trim() : "";
}
