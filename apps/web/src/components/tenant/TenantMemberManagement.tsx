import { useMembers } from "../../features/members/api/useMembers";
import { User } from "../../types";
import SystemUserRegistry from "../SystemUserRegistry";
export default function TenantMemberManagement({ organizationId, currentUser }: { organizationId: string; currentUser: User }) {
  const remote = useMembers({ organizationId });
  return <div className="[&_section]:border-0 [&_header]:border-0 [&_footer]:border-0 [&_form]:border-0 [&_input]:border-0 [&_input]:bg-slate-50 [&_select]:border-0 [&_select]:bg-slate-50"><SystemUserRegistry organizationId={organizationId} currentUserId={currentUser.id} roles={remote.roles}/></div>;
}
