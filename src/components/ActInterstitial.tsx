import type { ActLine } from "../design/acts";

export function ActInterstitial({ act, onContinue }: { act: ActLine; onContinue: () => void }) {
  return (
    <div className="act" role="dialog" aria-labelledby="act-title">
      <p className="kicker">{act.kicker}</p>
      <h1 id="act-title" className="display">{act.title}</h1>
      <p className="supporting">{act.line}</p>
      <button type="button" className="primary-button" onClick={onContinue}>Show me</button>
    </div>
  );
}
