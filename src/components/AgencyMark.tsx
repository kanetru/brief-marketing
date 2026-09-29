import { Link } from "react-router-dom";
import { useSession } from "../state/SessionContext";

export function AgencyMark() {
  const { activate } = useSession();

  return (
    <Link to="/demo/start" className="mark" onClick={() => activate("welcome")}>
      <span className="mark-name">Lover Lover</span>
      <span className="mark-kicker">Discovery</span>
    </Link>
  );
}
