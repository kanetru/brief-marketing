import type { ImageAssetRole, ImageTreatment } from "../types/brandIntelligence";

export interface ImagePromptInput {
  businessName: string;
  description: string;
  paletteName: string;
  colourWords: string[];
  treatment: ImageTreatment;
  notes: string[];
  avoids: string[];
}

export interface ImagePrompt {
  role: ImageAssetRole;
  prompt: string;
}

const ROLES: ImageAssetRole[] = ["hero", "detail", "context", "texture"];

/**
 * Structured prompts for individual photographs.
 * The UI renders type, colour, and layout. These prompts never ask for a finished brand board.
 */
export function imagePromptsFor(input: ImagePromptInput): ImagePrompt[] {
  const subject = subjectLine(input.businessName, input.description);
  const colour = colourLine(input.paletteName, input.colourWords);
  const light = lightLine(input.treatment);
  const polish = polishLine(input.treatment);
  const texture = textureLine(input.treatment, input.notes);
  const human = humanLine(input.treatment);
  const avoid = avoidLine(input.avoids);
  const treatment = treatmentLead(input.treatment);

  const bodies: Record<ImageAssetRole, string> = {
    hero: `${treatment} of ${subject}. Show the work where it actually happens, in a medium-wide frame with the environment still readable. ${light}. ${texture}. ${colour}. ${human}. ${polish}. ${avoid}.`,
    detail: `Close photograph of hands, tools, or material from ${subject}. Fill the frame with process and surface, cropped too tight to work as a poster. ${light}. Visible grain where the material has it. ${colour}. Observational rather than posed, slightly imperfect. ${polish}. ${avoid}.`,
    context: `Photograph of a person connected to ${subject}, in the real room or site, not arranged for a campaign. ${human}. ${light}. Leave the environment specific. ${colour}. ${polish}. ${avoid}.`,
    texture: `Photograph of a surface, tool, or corner of the room belonging to ${subject}. No face, no logo, no type. ${texture}. ${light}. ${colour}. ${polish}. ${avoid}.`,
  };

  return ROLES.map((role) => ({ role, prompt: bodies[role] }));
}

function subjectLine(name: string, description: string): string {
  const who = name.trim() || "this business";
  const what = description.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (!what) return who;
  return `${who}, ${what.charAt(0).toLowerCase()}${what.slice(1)}`;
}

function colourLine(paletteName: string, colourWords: string[]): string {
  const words = [...new Set(colourWords.filter(Boolean))].slice(0, 4);
  const named = words.length > 0 ? `, held to ${words.join(", ").toLowerCase()}` : "";
  return `Colour treatment stays inside the ${paletteName.toLowerCase()} range${named}`;
}

function treatmentLead(treatment: ImageTreatment): string {
  if (treatment === "documentary") return "Documentary photograph";
  if (treatment === "raw") return "Unpolished available-light photograph";
  if (treatment === "precise") return "Controlled, art-directed photograph";
  if (treatment === "graphic") return "Graphic, hard-cropped photograph";
  if (treatment === "formal") return "Still, formal photograph";
  return "Clear, straightforward photograph";
}

function lightLine(treatment: ImageTreatment): string {
  if (treatment === "precise") return "Even, controlled light, with no dramatic falloff";
  if (treatment === "formal") return "Still light, little colour grading";
  if (treatment === "graphic") return "Plain light, so colour comes from the subject rather than a gel";
  if (treatment === "raw") return "Warm available daylight, no flash, no beauty lighting";
  if (treatment === "documentary") return "Warm daylight, soft and directional, no flash";
  return "Soft natural light";
}

function polishLine(treatment: ImageTreatment): string {
  if (treatment === "precise") return "Level of polish is high and deliberate: clean edges, considered negative space, no casual snapshot";
  if (treatment === "formal") return "Level of polish is quiet and formal, nothing trying to be liked";
  if (treatment === "raw") return "Level of polish is low on purpose: grain, dust, and the useful mess stay in frame";
  if (treatment === "graphic") return "Level of polish is graphic rather than photographic: hard crop, few props, strong shape";
  if (treatment === "documentary") return "Level of polish is restrained and editorial, slightly imperfect, never glossy";
  return "Level of polish is plain and believable";
}

function textureLine(treatment: ImageTreatment, notes: string[]): string {
  const noted = notes.find((note) => /texture|grain|material|surface/i.test(note));
  if (treatment === "precise") return "Surfaces stay clean. Texture is the object's own, not a filter";
  if (treatment === "raw") return noted ? `${noted}, left visible` : "Visible grain, dust, and material";
  if (treatment === "documentary") return "Visible surface texture, restrained post-processing";
  if (treatment === "formal") return "Materials and rooms described plainly, little atmosphere for its own sake";
  return "Surface detail kept specific to the work";
}

function humanLine(treatment: ImageTreatment): string {
  if (treatment === "precise" || treatment === "formal") {
    return "Human presence is secondary. If a person appears, they are incidental and not performing";
  }
  if (treatment === "graphic") return "A person only if they are part of the action, and cropped hard";
  return "A real person may be in frame, observed rather than directed, never a staged smiling portrait";
}

function avoidLine(avoids: string[]): string {
  const cleaned = [
    ...new Set(
      avoids
        .map((item) =>
          item
            .replace(/\.$/, "")
            .replace(/^Avoided personality:\s*/i, "")
            .replace(/^Avoided palette:\s*/i, "")
            .replace(/^Avoided imagery:\s*/i, "")
            .trim(),
        )
        .filter(Boolean),
    ),
  ];
  const list = cleaned.length > 0 ? cleaned.slice(0, 4).join("; ") : "glossy commercial lighting, staged smiling portraits, and luxury styling";
  return `Avoid ${list}`;
}
