import { correctTheme } from "../domain/agency/theme";
import { useAgency } from "../state/AgencyContext";
import { useClientProject } from "../state/ProjectContext";
import type { WorkspaceBrand } from "../types/agency";

/** The practice that sent this discovery. Null on the manager's own screens and the unbranded demo. */
export function useAgencyBrand(): WorkspaceBrand | null {
  const project = useClientProject();
  const agency = useAgency();
  if (!project) return null;
  const brand = agency.brandFor(project.workspaceId);
  if (!brand) return null;
  return { ...brand, theme: { ...brand.theme, ...correctTheme(brand.theme), logo: brand.theme.logo, mark: brand.theme.mark, headingFont: brand.theme.headingFont, bodyFont: brand.theme.bodyFont } };
}
