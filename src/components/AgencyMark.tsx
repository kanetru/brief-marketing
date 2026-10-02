import { Link } from "react-router-dom";
import { LoverLoverLogo } from "./LoverLoverLogo";
import { useSectionPath } from "../state/routeBase";
import { useSession } from "../state/SessionContext";

export function AgencyMark() {
  const { activate } = useSession();
  const sectionPath = useSectionPath();

  return (
    <Link to={sectionPath("welcome")} className="mark" onClick={() => activate("welcome")}>
      <LoverLoverLogo kind="secondary" color="choc" className="mark-logo logo-on-light" alt="Lover Lover" />
      <LoverLoverLogo kind="secondary" color="pearl" className="mark-logo logo-on-dark" alt="" />
      <span className="mark-kicker">Brief</span>
    </Link>
  );
}
