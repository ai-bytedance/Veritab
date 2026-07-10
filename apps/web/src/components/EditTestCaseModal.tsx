/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X } from "lucide-react";
import { TestCase, Issue, Folder as FolderType, User as SystemUser } from "../types";
import TestCaseFormEditor from "./TestCaseFormEditor";

interface EditTestCaseModalProps {
  activeCase: TestCase;
  requirements: Issue[];
  folders: FolderType[];
  activeUsers: SystemUser[];
  onClose: () => void;
  onSave: (tc: TestCase) => void;
  projectId: string;
  allVersions?: string[];
}

export default function EditTestCaseModal({
  activeCase,
  requirements,
  folders,
  activeUsers,
  onClose,
  onSave,
  projectId,
  allVersions = [],
}: EditTestCaseModalProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in animate-duration-200" id="edit-test-case-modal-overlay">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] text-left relative animate-scale-up">
        <div className="flex-1 overflow-hidden flex flex-col">
          <TestCaseFormEditor
            projectId={projectId}
            activeCase={activeCase}
            requirements={requirements}
            folders={folders}
            activeUsers={activeUsers}
            allVersions={allVersions}
            onSave={(updatedCase) => {
              onSave(updatedCase);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
