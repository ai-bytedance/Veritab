/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserGroup, ProjectTab } from "../types";

/**
 * Check if the user has a specific granular action permission for a specific system tab/menu.
 * Returns true if allowed, false otherwise.
 */
export function checkPermission(
  user: User | null,
  groups: UserGroup[],
  tab: ProjectTab,
  action: string
): boolean {
  if (!user) return false;

  // Super admin has all permissions and bypasses checks
  if (user.role === "admin") return true;

  // Find user's group
  const userGroup = groups.find(g => g.id === user.group);
  if (!userGroup) {
    // If user has no group assigned, default to true to maintain backward compatibility
    return true;
  }

  // Check if the tab itself is permitted
  const permittedTabs = userGroup.permittedTabs;
  if (permittedTabs && !permittedTabs.includes(tab)) {
    return false; // Menu is not even accessible
  }

  // Check if specific action is permitted
  // If permittedActions or the tab's action list is not defined, we default to standard ["create", "edit", "delete"] to match the UI's default state
  const permittedActions = userGroup.permittedActions || {};
  const tabActions = permittedActions[tab] ?? ["create", "edit", "delete"];

  if (tabActions.includes(action)) {
    return true;
  }

  return false;
}
