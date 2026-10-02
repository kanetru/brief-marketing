export type LoverColor = "black" | "white" | "cherry" | "choc" | "orange" | "pearl" | "blue";
export type LoverKind = "primary" | "secondary" | "mark" | "icon";

/** Files that exist as SVG. White and black are missing for a few lockups. */
const FILES: Record<LoverKind, Partial<Record<LoverColor, string>>> = {
  primary: {
    black: "LOVER-PRIMARY-LOGO-BLACK.svg",
    white: "LOVER-PRIMARY-LOGO-WHITE.svg",
    cherry: "LOVER-PRIMARY-LOGO-CHERRY.svg",
    choc: "LOVER-PRIMARY-LOGO-CHOC.svg",
    orange: "LOVER-PRIMARY-LOGO-ORANGE.svg",
    pearl: "LOVER-PRIMARY-LOGO-PEARL.svg",
  },
  secondary: {
    cherry: "LOVER-SECONDARY-LOGO-CHERRY.svg",
    choc: "LOVER-SECONDARY-LOGO-CHOC.svg",
    orange: "LOVER-SECONDARY-LOGO-ORANGE.svg",
    pearl: "LOVER-SECONDARY-LOGO-PEARL.svg",
    blue: "LOVER-SECONDARY-LOGO-BLUE.svg",
  },
  mark: {
    black: "LOVER-BRAND-MARK-BLACK.svg",
    white: "LOVER-BRAND-MARK-WHITE.svg",
    cherry: "LOVER-BRAND-MARK-CHERRY.svg",
    choc: "LOVER-BRAND-MARK-CHOC.svg",
    orange: "LOVER-BRAND-MARK-ORANGE.svg",
    pearl: "LOVER-BRAND-MARK-PEARL.svg",
    blue: "LOVER-BRAND-MARK-BABY-BLUE.svg",
  },
  icon: {
    black: "LOVER-ICON-BLACK.svg",
    cherry: "LOVER-ICON-CHERRY.svg",
    choc: "LOVER-ICON-CHOC.svg",
    orange: "LOVER-ICON-ORANGE.svg",
    pearl: "LOVER-ICON-PEARL.svg",
    blue: "LOVER-ICON-BABY-BLUE.svg",
  },
};

const FALLBACK: Record<LoverKind, Partial<Record<LoverColor, LoverColor>>> = {
  primary: {},
  secondary: { white: "pearl", black: "choc" },
  mark: {},
  icon: { white: "pearl" },
};

function fileFor(kind: LoverKind, color: LoverColor): string {
  const direct = FILES[kind][color];
  if (direct) return direct;
  const next = FALLBACK[kind][color];
  const fallback = next ? FILES[kind][next] : undefined;
  if (!fallback) throw new Error(`No Lover Lover ${kind} in ${color}`);
  return fallback;
}

export function loverAsset(kind: LoverKind, color: LoverColor): string {
  const file = fileFor(kind, color);
  return `/${["Lover Lover Brand Assets", "Logo Suite", "SVG", file].map(encodeURIComponent).join("/")}`;
}
