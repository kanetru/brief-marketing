import { Link } from "react-router-dom";
import { useSectionPath } from "../state/routeBase";
import { useSession } from "../state/SessionContext";

export function AgencyMark() {
  const { activate } = useSession();
  const sectionPath = useSectionPath();

  return (
    <Link to={sectionPath("welcome")} className="mark" onClick={() => activate("welcome")}>
      <span className="mark-name">Lover Lover</span>
      <span className="mark-kicker">Discovery</span>
    </Link>
  );
}
