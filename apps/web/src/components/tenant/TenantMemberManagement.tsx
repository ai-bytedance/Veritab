import { User } from "../../types";
import SystemUserRegistry from "../SystemUserRegistry";
export default function TenantMemberManagement({ currentUser }: { organizationId: string; currentUser: User }) {
  return <SystemUserRegistry currentUserId={currentUser.id}/>;
}
