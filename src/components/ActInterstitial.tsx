import type { ActLine } from "../design/acts";
import { LoverLoverLogo } from "./LoverLoverLogo";

export function ActInterstitial({ act, onContinue }: { act: ActLine; onContinue: () => void }) {
  return (
    <div className="act" role="dialog" aria-labelledby="act-title">
      <LoverLoverLogo kind="icon" color="orange" className="brand-star" alt="" />
      <p className="kicker">{act.kicker}</p>
      <h1 id="act-title" className="display">{act.title}</h1>
      <p className="supporting">{act.line}</p>
      <button type="button" className="primary-button" onClick={onContinue}>Show me</button>
    </div>
  );
}
