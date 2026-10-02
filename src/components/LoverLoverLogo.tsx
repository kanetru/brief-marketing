import { loverAsset, type LoverColor, type LoverKind } from "../design/brandAssets";

interface LoverLoverLogoProps {
  kind?: LoverKind;
  color?: LoverColor;
  className?: string;
  alt?: string;
}

/** One entry point for the logo suite. Filenames stay in brandAssets.ts. */
export function LoverLoverLogo({ kind = "secondary", color = "choc", className, alt = "" }: LoverLoverLogoProps) {
  return <img className={className} src={loverAsset(kind, color)} alt={alt} />;
}
