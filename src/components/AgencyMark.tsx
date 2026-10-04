import { Link } from "react-router-dom";
import { LoverLoverLogo } from "./LoverLoverLogo";
import { useAgencyBrand } from "./useAgencyBrand";
import { useSectionPath } from "../state/routeBase";
import { useSession } from "../state/SessionContext";

export function AgencyMark() {
  const { activate } = useSession();
  const sectionPath = useSectionPath();
  const brand = useAgencyBrand();
  const logo = brand?.theme.logo || brand?.theme.mark || "";

  if (brand) {
    return (
      <Link to={sectionPath("welcome")} className="mark" onClick={() => activate("welcome")}>
        {logo ? <img src={logo} alt="" className="mark-logo" /> : null}
        <span className="mark-kicker">{brand.name}</span>
      </Link>
    );
  }

  return (
    <Link to={sectionPath("welcome")} className="mark" onClick={() => activate("welcome")}>
      <LoverLoverLogo kind="secondary" color="choc" className="mark-logo logo-on-light" alt="Lover Lover" />
      <LoverLoverLogo kind="secondary" color="pearl" className="mark-logo logo-on-dark" alt="" />
      <span className="mark-kicker">Brief</span>
    </Link>
  );
}
