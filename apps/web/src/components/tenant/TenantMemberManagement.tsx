import { useMembers } from "../../features/members/api/useMembers";
import { User } from "../../types";
import SystemUserRegistry from "../SystemUserRegistry";
export default function TenantMemberManagement({ organizationId, currentUser }: { organizationId: string; currentUser: User }) {
  const remote = useMembers({ organizationId });
  return <SystemUserRegistry organizationId={organizationId} currentUserId={currentUser.id} roles={remote.roles}/>;
}
