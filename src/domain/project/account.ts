import { DEMO_MANAGER_ID } from "./access";
import type { ProfessionalRole } from "../../types/project";

/**
 * The Brief customer is a professional. Clients are not users.
 * One workspace, one manager, for this demo. Members are the seam for a later team.
 */
export interface ManagerAccount {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  role: ProfessionalRole;
}

export const DEMO_ACCOUNT: ManagerAccount = {
  id: DEMO_MANAGER_ID,
  name: "Jane Smith",
  workspaceId: "jane-smith-marketing",
  workspaceName: "Jane Smith Marketing",
};

export const DEMO_MEMBERS: WorkspaceMember[] = [
  { userId: DEMO_ACCOUNT.id, name: DEMO_ACCOUNT.name, role: "owner" },
];
