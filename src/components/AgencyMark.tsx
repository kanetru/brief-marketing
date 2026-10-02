import { Link } from "react-router-dom";
import { useSectionPath } from "../state/routeBase";
import { useSession } from "../state/SessionContext";

export function AgencyMark() {
  const { activate } = useSession();
  const sectionPath = useSectionPath();

  return (
    <Link to={sectionPath("welcome")} className="mark" onClick={() => activate("welcome")}>
      <img className="mark-logo" src="/brand/lover-lover-wordmark.png" alt="Lover Lover" />
      <span className="mark-kicker">Brief</span>
    </Link>
  );
}
