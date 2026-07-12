import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  FileText,
  Edit3,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList
} from "lucide-react";
import {
  TestCase,
  TestCaseGrade,
  TestCaseStatus,
  Issue,
  IssueType,
  User as SystemUser,
  DefectSeverity,
  DefectStatus,
  Folder as FolderType,
  ProjectTab,
  UserGroup
} from "../types";
import { checkPermission } from "../lib/permission";
import HistoryLogTimeline from "./HistoryLogTimeline";
import TestCaseDirectoryOverview from "./TestCaseDirectoryOverview";
import TestCaseExecutionWorkspace from "./TestCaseExecutionWorkspace";
import RegressionHistoryTab from "./RegressionHistoryTab";
import TestCaseHeaderView from "./TestCaseHeaderView";
import { generateDefectId } from "../lib/idUtils";
import { TestCaseApiScope } from "../features/test-cases/api/types";
import { useResourceHistory } from "../features/history/useResourceHistory";
import { useQuery } from "@tanstack/react-query";
import { testCasesApi } from "../features/test-cases/api/testCasesApi";

interface TestCaseDetailPanelProps {
  projectId: string;
  activeCase: TestCase | undefined;
  requirements: Issue[];
  folders: FolderType[];
  issues: Issue[];
  activeUsers: SystemUser[];
  currentUser?: SystemUser;
  editMode: "form" | "markdown" | "xmind";
  onUpdateTestCase: (tc: TestCase) => void;
  onAddIssue: (issue: Issue) => void;
  onInvokeAI: (prompt: string) => Promise<string>;
  onTriggerWebhook: (provider: string, payload: any) => void;
  onCreateFeishuGroup?: (payload: any) => Promise<any>;
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusIssue?: (id: string | null) => void;
  activeFolderId?: string | null;
  activeRequirementId?: string | null;
  testCases?: TestCase[];
  onSelectTestCase?: (id: string) => void;
  onSelectFolder?: (id: string) => void;
  onSelectReqFolder?: (id: string) => void;
  onAddTestCase?: (tc: TestCase) => void;
  onDeleteTestCase?: (id: string) => void;
  onUpdateFolders?: (folders: FolderType[]) => void;
  userGroups?: UserGroup[];
  apiScope: TestCaseApiScope;
}

export default function TestCaseDetailPanel({
  projectId,
  apiScope,
  activeCase,
  requirements,
  folders,
  issues,
  activeUsers,
  currentUser: propCurrentUser,
  editMode,
  onUpdateTestCase,
  onAddIssue,
  onInvokeAI,
  onTriggerWebhook,
  onCreateFeishuGroup,
  onNavigateToTab,
  onFocusIssue,
  activeFolderId = null,
  activeRequirementId = null,
  testCases = [],
  onSelectTestCase,
  onSelectFolder,
  onSelectReqFolder,
  onAddTestCase,
  onDeleteTestCase,
  onUpdateFolders,
  userGroups = []
}: TestCaseDetailPanelProps) {
  const historyLogs = useResourceHistory("test-cases", apiScope, activeCase?.id).data;
  const executionQuery = useQuery({
    queryKey: ["test-case-executions", apiScope.organizationId, apiScope.projectSpaceId, activeCase?.id],
    enabled: Boolean(activeCase?.id),
    queryFn: () => testCasesApi.get(apiScope, activeCase!.id),
  });
  const executions = executionQuery.data?.executions || [];
  const checkActionPermission = (action: string) => {
    return checkPermission(propCurrentUser || null, userGroups || [], ProjectTab.TESTCASE, action);
  };

  const executorUser = propCurrentUser || activeUsers[0] || { id: "u-sys", nickname: "管理员" };
  const [aiGeneratingDefect, setAiGeneratingDefect] = useState<string | null>(null);

  // Inner tabs for "form" mode
  const [innerTab, setInnerTab] = useState<"execute" | "history">("execute");

  // Interactive Step Checklist states
  const [stepResults, setStepResults] = useState<Record<number, "pass" | "fail" | "blocked" | "untested">>({});
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({});

  // Accordion toggle states for space efficiency
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  // In-app notifications & reset confirmations
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showNotifySubmitModal, setShowNotifySubmitModal] = useState<boolean>(false);
  const [pendingResults, setPendingResults] = useState<{
    nextOverallStatus: TestCaseStatus;
    nextActualResult: string;
    detailsText: string;
    runSnapshot: any;
  } | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["feishu"]);
  const [notifyContent, setNotifyContent] = useState("");

  const triggerToast = (msg: string, type: "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync state with activeCase
  React.useEffect(() => {
    if (activeCase) {
      const stepsList = activeCase.steps ? activeCase.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      let initResults: Record<number, "pass" | "fail" | "blocked" | "untested"> = {};
      let initNotes: Record<number, string> = {};

      if (activeCase.stepResults && Object.keys(activeCase.stepResults).length > 0) {
        initResults = { ...activeCase.stepResults };
        initNotes = activeCase.stepNotes ? { ...activeCase.stepNotes } : {};
        stepsList.forEach((_, idx) => {
          if (!initResults[idx]) initResults[idx] = "untested";
        });
      } else {
        stepsList.forEach((_, idx) => {
          initResults[idx] = activeCase.status === TestCaseStatus.PASS ? "pass" : "untested";
        });

        if (activeCase.actualResult) {
          stepsList.forEach((_, idx) => {
            const failMatch = new RegExp(`步骤 #${idx + 1} 异常值: (.*)`);
            const foundFail = activeCase.actualResult?.match(failMatch);
            if (foundFail && foundFail[1]) {
              initNotes[idx] = foundFail[1];
              initResults[idx] = "fail";
              return;
            }

            const blockMatch = new RegExp(`步骤 #${idx + 1} 阻断原因: (.*)`);
            const foundBlock = activeCase.actualResult?.match(blockMatch);
            if (foundBlock && foundBlock[1]) {
              initNotes[idx] = foundBlock[1];
              initResults[idx] = "blocked";
            }
          });
        }
      }

      setStepResults(initResults);
      setStepNotes(initNotes);
    }
  }, [activeCase?.id, activeCase?.updatedAt, activeCase?.status, activeCase?.actualResult, JSON.stringify(activeCase?.stepResults), JSON.stringify(activeCase?.stepNotes)]);

  // Folder overview & statistics route
  if (!activeCase && (activeFolderId || activeRequirementId)) {
    return (
      <TestCaseDirectoryOverview
        projectId={projectId}
        activeFolderId={activeFolderId}
        activeRequirementId={activeRequirementId}
        folders={folders}
        requirements={requirements}
        testCases={testCases}
        activeUsers={activeUsers}
        editMode={editMode}
        onUpdateTestCase={onUpdateTestCase}
      />
    );
  }

  if (!activeCase) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400 font-sans shadow-3xs animate-fade-in flex flex-col items-center justify-center">
        <HelpCircle className="mx-auto h-10 w-10 text-slate-305 text-slate-300 mb-3 animate-pulse" />
        <h4 className="text-xs font-black text-slate-700">未选择任何测试用例</h4>
        <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed select-none">
          请在左侧的层级目录树或按需求中点击对应节点，或者通过右上角按钮快速添加全新验证资产。
        </p>
      </div>
    );
  }

  const parsedSteps = activeCase.steps
    ? activeCase.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0)
    : [];

  const updateCaseField = (key: keyof TestCase, val: any) => {
    let logs = activeCase.historyLogs || [];

    const oldValueStr = activeCase[key];
    const newValueStr = val;

    const isDifferent = Array.isArray(oldValueStr)
      ? JSON.stringify(oldValueStr) !== JSON.stringify(newValueStr)
      : oldValueStr !== newValueStr;

    if (isDifferent) {
      let actionLabel = "修改了用例属性";
      let logOldValue = String(oldValueStr || "");
      let logNewValue = String(newValueStr || "");
      const currentUser = executorUser;

      switch (key) {
        case "name":
          actionLabel = "修改了用例名称";
          break;
        case "status":
          actionLabel = "更新执行状态";
          break;
        case "grade":
          actionLabel = "变更了用例级别";
          break;
        case "assigneeId":
          actionLabel = "更正了指派人";
          const oldAssignee = activeUsers.find(u => u.id === oldValueStr);
          const newAssignee = activeUsers.find(u => u.id === newValueStr);
          logOldValue = oldAssignee ? oldAssignee.nickname : String(oldValueStr || "无");
          logNewValue = newAssignee ? newAssignee.nickname : String(newValueStr || "无");
          break;
        case "linkedRequirementId":
          actionLabel = "修改了关联需求";
          break;
        case "linkedDefectId":
          actionLabel = "关联了对应缺陷";
          break;
        default:
          actionLabel = `更新了 ${String(key)} 字段`;
      }

      logs = [{
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: actionLabel,
        oldValue: logOldValue,
        newValue: logNewValue,
        createdAt: new Date().toISOString()
      }, ...logs];
    }

    onUpdateTestCase({
      ...activeCase,
      [key]: val,
      historyLogs: logs,
      updatedAt: new Date().toISOString(),
    });

    if (key === "status" && activeCase.status !== val) {
       const payload = {
          title: `📊 用例执行通知: ${activeCase.name}`,
          type: "TestCaseStatusChange",
          content: `用例执行结论已更新为：[${val}]`,
          assignee: activeUsers.find(u => u.id === activeCase.assigneeId)?.nickname || "未知",
          link: window.location.href,
          isAutoTrigger: true
       };
       onTriggerWebhook("feishu", payload);
    }
  };

  const syncActualResult = (
    nextResults: Record<number, "pass" | "fail" | "blocked" | "untested">,
    nextNotes: Record<number, string>
  ) => {
    const activeDeviations = Object.entries(nextResults)
      .filter(([_, status]) => status === "fail" || status === "blocked")
      .map(([idx]) => {
        const indexNum = Number(idx);
        const note = (nextNotes[indexNum] || "").trim();
        const label = nextResults[indexNum] === "blocked" ? "阻断原因" : "异常值";
        return `步骤 #${indexNum + 1} ${label}: ${note || "未填写记录详情"}`;
      });

    const isAnyFail = Object.values(nextResults).some(s => s === "fail");
    const isAnyBlocked = Object.values(nextResults).some(s => s === "blocked");

    let defaultText = "";
    if (isAnyFail) {
      defaultText = "步骤运行与预期偏离";
    } else if (isAnyBlocked) {
      defaultText = "步骤回归遭遇阻断";
    }

    return activeDeviations.length > 0 ? activeDeviations.join("\n") : defaultText;
  };

  const commitExecutionHistory = () => {
    if (!checkActionPermission("execute")) {
      setToast({
        message: "⚠️ 您所属的工作群组无权进行“提交测试用例执行结果”操作！",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!activeCase) return;

    const details = parsedSteps.map((stepText, idx) => {
      const res = stepResults[idx] || "untested";
      let resLabel = "⚪ 未测试";
      if (res === "pass") resLabel = "🟢 通过";
      if (res === "fail") resLabel = "🔴 失败";
      if (res === "blocked") resLabel = "🟡 阻断";

      const note = stepNotes[idx] ? ` (异常原因: ${stepNotes[idx].trim()})` : "";
      return `步骤 #${idx + 1}: ${stepText}\n   ➔ 执行结论: ${resLabel}${note}`;
    });

    let nextOverallStatus = TestCaseStatus.UNTESTED;
    const stepStatuses = parsedSteps.map((_, i) => stepResults[i] || "untested");

    if (stepStatuses.some(v => v === "fail")) {
      nextOverallStatus = TestCaseStatus.FAIL;
    } else if (stepStatuses.some(v => v === "blocked")) {
      nextOverallStatus = TestCaseStatus.BLOCKED;
    } else if (stepStatuses.every(v => v === "pass")) {
      nextOverallStatus = TestCaseStatus.PASS;
    } else {
      nextOverallStatus = TestCaseStatus.UNTESTED;
    }

    const nextActualResult = syncActualResult(stepResults, stepNotes);
    const currentUser = executorUser;

    const runSnapshot = {
      results: stepResults,
      notes: stepNotes,
      overallStatus: nextOverallStatus,
      description: details.join("\n"),
      timestamp: new Date().toISOString()
    };

    // Prepare default notification text
    const passedCount = stepStatuses.filter(s => s === "pass").length;
    const failedCount = stepStatuses.filter(s => s === "fail").length;
    const blockedCount = stepStatuses.filter(s => s === "blocked").length;

    let emoji = "🟢";
    if (nextOverallStatus === TestCaseStatus.FAIL) emoji = "🔴";
    if (nextOverallStatus === TestCaseStatus.BLOCKED) emoji = "🟡";

    const defaultMsg = `📢【测试用例分步执行结果】
用例名称: ${activeCase.name}
测试人员: ${currentUser.nickname}
回归结论: ${emoji} [${nextOverallStatus}]
完成进度: 共 ${parsedSteps.length} 个步骤 (${passedCount} 通过, ${failedCount} 失败, ${blockedCount} 阻断)

🎯 预期结果:
${activeCase.expectedResult || "未定义"}

📋 执行步骤及结论清单:
${details.join("\n")}`;

    setPendingResults({
      nextOverallStatus,
      nextActualResult,
      detailsText: details.join("\n"),
      runSnapshot
    });
    setNotifyContent(defaultMsg);
    setShowNotifySubmitModal(true);
  };

  const executeActualSubmit = (sendNotification: boolean) => {
    if (!activeCase || !pendingResults) return;
    if (sendNotification && !checkActionPermission("notify")) {
      setToast({
        message: "⚠️ 您所属的工作群组无权进行“推送飞书消息状态通知”操作！",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const { nextOverallStatus, nextActualResult } = pendingResults;
    const currentUser = executorUser;

    onUpdateTestCase({
      ...activeCase,
      status: nextOverallStatus,
      actualResult: nextActualResult,
      stepResults,
      stepNotes,
      updatedAt: new Date().toISOString()
    });

    if (sendNotification && selectedChannels.length > 0) {
      selectedChannels.forEach(channel => {
        const payload = {
          title: `📊 用例回归完毕通知: ${activeCase.name}`,
          type: "TestCaseStatusChange",
          content: notifyContent,
          assignee: activeUsers.find(u => u.id === activeCase.assigneeId)?.nickname || currentUser.nickname,
          link: window.location.href,
          isAutoTrigger: false
        };
        onTriggerWebhook(channel, payload);
      });
      const channelNames: Record<string, string> = { feishu: "飞书", wechat: "企业微信", dingtalk: "钉钉" };
      triggerToast(`🎉 结果已成功归档，并同步向 [${selectedChannels.map((channel) => channelNames[channel]).join(", ")}] 发送通知提示！`, "success");
    } else {
      triggerToast(`🎉 回归测试结果已成功归档并锁入历史记录！`, "success");
    }

    setShowNotifySubmitModal(false);
    setPendingResults(null);

  };

  const handleStepStatusChange = (index: number, status: "pass" | "fail" | "blocked") => {
    const nextResults = { ...stepResults, [index]: status };
    setStepResults(nextResults);
  };

  const updateStepNote = (index: number, note: string) => {
    const nextNotes = { ...stepNotes, [index]: note };
    setStepNotes(nextNotes);
  };

  const handleAIGenerateDefect = async () => {
    if (!checkActionPermission("ai_generate")) {
      setToast({
        message: "⚠️ 您所属的工作群组无权进行“AI 智能推导用例与研判分析”操作！",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setAiGeneratingDefect(activeCase.id);
    try {
      const prompt = `你是一位高水平的敏捷质控AI专家。
请根据以下测试用例执行失败的状态、前置条件和执行情况，客观、科学地评估并生成一份缺陷描述。

【输入背景】
用例名称: ${activeCase.name}
当前执行状态: ${activeCase.status}
用例级别/重要度: ${activeCase.grade} (如果是最高-P0，往往失败会升级为致命或严重缺陷)
前置条件: ${activeCase.precondition}
分步执行动作: ${activeCase.steps}
预期正确结果: ${activeCase.expectedResult}
实际偏离现象: ${activeCase.actualResult || "步骤执行失败且中途被阻断"}

【缺陷严重程度 (severity) 评级规则】
请务必根据实际偏离和用例等级，极其精准地做出研判，不要低估也不要夸大：
- "致命": 核心交易/运行链路崩溃、系统完全无法响应或白屏、或阻断了后续全部测试（一般是用例级别为"最高-P0"且失败，或实际偏离造成了死锁阻断）。
- "严重": 核心业务功能检验不通过、主要功能偏离（如重要的数据未按标准输出），不至于整个系统崩溃，但用户核心诉求无法达成。
- "一般": 支线功能、非核心参数未正确渲染、次要交互存在阻碍、非高频流执行失败。
- "提示": 轻微样式不完美、文案翻译拼写差异、纯粹的交互体验建议。

【返回格式】
请返回一个包含缺陷信息的合法 JSON 字典（请绝对不要带有任何 \`\`\`json 等 Markdown 包裹符号，只返回单行或多行纯 JSON 字符串）：
{
  "title": "[AI生成缺陷] 简明扼要的一句话概括问题",
  "content": "### 🚨 缺陷发生偏差日志\\n**环境说明**：${activeCase.precondition}\\n**复现动作**：\\n${activeCase.steps.replace(/\n/g, '\\n')}\\n\\n**AI研判分析**：对此次失败现象的详细原因、影响面做出一句话智能推导与剖析。",
  "severity": "致命" | "严重" | "一般" | "提示",
  "precondition": "缺陷前置条件",
  "steps": "缺陷复现步骤",
  "expectedResult": "预期结果",
  "actualResult": "实际偏离结果"
}`;

      let obj: any;
      try {
        const response = await onInvokeAI(prompt);
        let cleaned = response.replace(/`{3}(json)?/g, "").trim();
        const startIdx = cleaned.indexOf('{');
        const endIdx = cleaned.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
        obj = JSON.parse(cleaned);
      } catch (aiError: any) {
        console.warn("AI defect generation failed, falling back to local engine:", aiError);
        let localSeverity = DefectSeverity.SERIOUS;
        if (activeCase.grade?.includes("P0")) {
          localSeverity = DefectSeverity.FATAL;
        } else if (activeCase.grade?.includes("P1")) {
          localSeverity = DefectSeverity.SERIOUS;
        } else if (activeCase.grade?.includes("P2")) {
          localSeverity = DefectSeverity.NORMAL;
        } else {
          localSeverity = DefectSeverity.PROMPT;
        }
        obj = {
          title: `[缺陷][用例失败自动推荐] ${activeCase.name}`,
          content: `### 🚨 缺陷发生偏差日志\n测试执行过程中发偏差，详情见以下：\n- **前置环境**：${activeCase.precondition || "暂无"}\n- **复现步骤**：\n${activeCase.steps || "暂无"}\n- **预期结果**：${activeCase.expectedResult || "预期执行成功"}\n- **实际结果**：${activeCase.actualResult || "执行中途发生偏离或阻断"}\n\n*（注：由于AI服务器暂不可达，系统已自动启用本地极速智防引擎，为您秒级推导生成了高精度的缺陷结构表单。）*`,
          precondition: activeCase.precondition,
          steps: activeCase.steps,
          expectedResult: activeCase.expectedResult,
          actualResult: activeCase.actualResult || "偏离",
          severity: localSeverity
        };
      }

      let determinedSeverity = DefectSeverity.SERIOUS;
      if (obj && obj.severity) {
        const s = String(obj.severity).trim();
        if (s === "致命" || s.toLowerCase().includes("fatal") || s.toLowerCase().includes("deadly")) {
          determinedSeverity = DefectSeverity.FATAL;
        } else if (s === "严重" || s.toLowerCase().includes("serious") || s.toLowerCase().includes("critical")) {
          determinedSeverity = DefectSeverity.SERIOUS;
        } else if (s === "一般" || s.toLowerCase().includes("normal") || s.toLowerCase().includes("minor") || s.toLowerCase().includes("medium")) {
          determinedSeverity = DefectSeverity.NORMAL;
        } else if (s === "提示" || s.toLowerCase().includes("prompt") || s.toLowerCase().includes("trivial") || s.toLowerCase().includes("info")) {
          determinedSeverity = DefectSeverity.PROMPT;
        }
      } else {
        if (activeCase.grade?.includes("P0")) {
          determinedSeverity = DefectSeverity.FATAL;
        } else if (activeCase.grade?.includes("P1")) {
          determinedSeverity = DefectSeverity.SERIOUS;
        } else {
          determinedSeverity = DefectSeverity.NORMAL;
        }
      }

      const creatorUser = executorUser;

      const defect: Issue = {
        id: generateDefectId(),
        projectId,
        type: IssueType.DEFECT,
        title: obj.title || `[缺陷][AI自动推荐] ${activeCase.name}`,
        content: obj.content || `### 缺陷发生\n用例：${activeCase.name} 执行失败`,
        severity: determinedSeverity,
        defectStatus: DefectStatus.NEW,
        precondition: obj.precondition || activeCase.precondition,
        steps: obj.steps || activeCase.steps,
        expectedResult: obj.expectedResult || activeCase.expectedResult,
        actualResult: obj.actualResult || activeCase.actualResult || "系统返回异常",
        linkToRequirements: activeCase.linkedRequirementId ? [activeCase.linkedRequirementId] : [],
        linkToTestCases: [activeCase.id],
        creatorId: creatorUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAddIssue(defect);

      const newCaseLog = {
        id: `log-defect-${Date.now()}`,
        userId: creatorUser.id,
        userName: creatorUser.nickname,
        action: "AI一键捕获并关联缺陷",
        oldValue: "未关联",
        newValue: `${defect.title} [缺陷状态: 新建]`,
        createdAt: new Date().toISOString()
      };

      onUpdateTestCase({
        ...activeCase,
        linkedDefectId: defect.id,
        historyLogs: [newCaseLog, ...(activeCase.historyLogs || [])],
        updatedAt: new Date().toISOString(),
      });
      triggerToast(`已成功自动生成对应缺陷并建立深度追踪关联！`, "success");
    } catch (e: any) {
      triggerToast(`AI 生成缺陷过程遇到异常: ${e.message}`, "warning");
    } finally {
      setAiGeneratingDefect(null);
    }
  };

  return (
    <div className="space-y-4 max-h-[850px] overflow-y-auto pr-1 font-sans">

      <div className="rounded-xl border border-slate-100 bg-white p-4.5 shadow-3xs space-y-4 animate-fade-in text-left">

        <TestCaseHeaderView
          activeCase={activeCase}
          activeUsers={activeUsers}
            folders={folders}
            requirements={requirements}
          />

          {/* Sub-tabs selection bar */}
          <div className="flex border-b border-slate-100 pb-px select-none">
            {[
              { id: "execute", label: "分步交互回归", badge: `${Object.values(stepResults).filter(v => v !== "untested").length}/${parsedSteps.length}` },
              { id: "history", label: "历史回归记录", badge: historyLogs?.length || null }
            ].map((tab) => {
              const active = innerTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInnerTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4.5 py-2.5 border-b-2 font-sans text-xs font-black transition-all cursor-pointer -mb-px ${
                    active
                      ? "border-indigo-600 text-indigo-700 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== null && (
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      active ? "bg-indigo-100 text-indigo-700" : "bg-slate-150 text-slate-500"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab contents */}
          {innerTab === "execute" && (
            <TestCaseExecutionWorkspace
              activeCase={activeCase}
              parsedSteps={parsedSteps}
              stepResults={stepResults}
              stepNotes={stepNotes}
              aiGeneratingDefect={aiGeneratingDefect === activeCase.id}
              onStepStatusChange={handleStepStatusChange}
              onStepNoteChange={updateStepNote}
              onAIGenerateDefect={handleAIGenerateDefect}
              onResetExecutionDraft={() => {
                if (!checkActionPermission("reset_progress")) {
                  setToast({
                    message: "⚠️ 您所属的工作群组无权进行“重置测试用例执行进度”操作！",
                    type: "warning"
                  });
                  setTimeout(() => setToast(null), 3000);
                  return;
                }
                setShowResetConfirm(true);
              }}
              onCommitExecutionHistory={() => {
                if (!checkActionPermission("execute")) {
                  setToast({
                    message: "⚠️ 您所属的工作群组无权进行“提交测试用例执行结果”操作！",
                    type: "warning"
                  });
                  setTimeout(() => setToast(null), 3000);
                  return;
                }
                commitExecutionHistory();
              }}
              activeUsers={activeUsers}
              onAssigneeChange={(userId) => updateCaseField("assigneeId", userId)}
            />
          )}

          {innerTab === "history" && (
            <div className="animate-fade-in text-left space-y-4">
              <RegressionHistoryTab activeCase={activeCase} executions={executions} />

              {/* Unified Change History Log Tab Panel to match Requirement/Defect pages */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mt-6 select-none font-sans">
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-50 text-indigo-600 shadow-3xs cursor-default animate-fade-in"
                >
                  <span>变更记录</span>
                  {historyLogs && historyLogs.length > 0 && (
                    <span className="ml-1.5 text-[9.5px] px-1.5 py-0.2 rounded-full bg-indigo-200/60 text-indigo-700 font-black">
                      {historyLogs.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-3 animate-fade-in font-sans">
                <div className="bg-slate-50/25 rounded-2xl border border-slate-100 p-4 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">变更记录</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">记录用例属性修改与执行状态变更历史</p>
                    </div>
                  </div>
                  <HistoryLogTimeline logs={historyLogs} />
                </div>
              </div>
            </div>
          )}

      </div>

      {/* Toast and Confirmation Overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-3 px-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg animate-fade-in text-xs font-bold leading-none select-none">
          <span className={`w-1.5 h-1.5 rounded-full ${toast.type === "success" ? "bg-emerald-400 animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span>{toast.message}</span>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-slate-150 p-5 max-w-sm w-full space-y-4 shadow-2xl text-left select-none">
            <h4 className="text-xs font-black text-slate-800">
              {activeCase.status !== TestCaseStatus.UNTESTED ? "🔄 确定开启新一轮闭环回归验证吗？" : "🧹 确定重置当前的回归草稿进度吗？"}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              {activeCase.status !== TestCaseStatus.UNTESTED
                ? "开启新一轮将清空当前步骤执行勾选，并将结论重置为「未测试」。此前的执行结论及关联缺陷已锁入历史归档中，不会丢失。您可以在新一轮中重新测试并生成新缺陷。"
                : "重置将清空当前各步骤的通过/失败/阻断回归选择成果，并将状态归回初始未测试。此动作锁回主事务且不可逆。"}
            </p>
            <div className="flex justify-end gap-2 pt-1 font-bold text-xs">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!checkActionPermission("reset_progress")) {
                    setToast({
                      message: "⚠️ 您所属的工作群组无权进行“重置测试用例执行进度”操作！",
                      type: "warning"
                    });
                    setTimeout(() => setToast(null), 3000);
                    return;
                  }
                  setShowResetConfirm(false);
                  const initResults: Record<number, "pass" | "fail" | "blocked" | "untested"> = {};
                  const initNotes: Record<number, string> = {};
                  parsedSteps.forEach((_, idx) => {
                    initResults[idx] = "untested";
                  });
                  setStepResults(initResults);
                  setStepNotes(initNotes);

                  const currentUser = executorUser;
                  const resetLog = {
                    id: `log-reset-${Date.now()}`,
                    userId: currentUser.id,
                    userName: currentUser.nickname,
                    action: "重置回归执行进度",
                    oldValue: String(activeCase.status || ""),
                    newValue: "已将执行勾选和异常原因清零重置",
                    createdAt: new Date().toISOString()
                  };

                  onUpdateTestCase({
                    ...activeCase,
                    status: TestCaseStatus.UNTESTED,
                    actualResult: "",
                    stepResults: initResults,
                    stepNotes: initNotes,
                    linkedDefectId: "", // Clear current run defect pointer to enable new defect generation
                    historyLogs: [resetLog, ...(activeCase.historyLogs || [])],
                    updatedAt: new Date().toISOString()
                  });
                  triggerToast("回归草稿进度已重置归零！", "warning");
                }}
                className="px-3.5 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifySubmitModal && pendingResults && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 max-w-xl w-full space-y-5 shadow-2xl text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <span>🔔 发送执行结果通知并归档</span>
              </h4>
              <button
                onClick={() => {
                  setShowNotifySubmitModal(false);
                  setPendingResults(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Outcome summary preview */}
              <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block select-none">
                  📊 回归分析概要
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">用例结论:</span>
                    <span className={`ml-1.5 font-black ${
                      pendingResults.nextOverallStatus === TestCaseStatus.PASS
                        ? "text-emerald-600"
                        : pendingResults.nextOverallStatus === TestCaseStatus.FAIL
                        ? "text-rose-600 animate-pulse"
                        : "text-amber-600"
                    }`}>
                      {pendingResults.nextOverallStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">执行人员:</span>
                    <span className="ml-1.5 font-bold text-slate-700">{executorUser.nickname || "管理员"}</span>
                  </div>
                </div>
              </div>

              {/* Notification channels */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block select-none">
                  推送通知渠道配置
                </span>
                <div className="flex flex-wrap items-center gap-3 select-none">
                  {[
                    { id: "feishu", label: "💬 飞书协作机器人", color: "text-blue-600" },
                    { id: "wechat", label: "💬 企业微信机器人", color: "text-emerald-600" },
                    { id: "dingtalk", label: "💬 钉钉协作机器人", color: "text-indigo-600" }
                  ].map(channel => {
                    const checked = selectedChannels.includes(channel.id);
                    return (
                      <label
                        key={channel.id}
                        className={`flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                          checked
                            ? "bg-slate-50 border-slate-300 text-slate-800 shadow-3xs"
                            : "bg-white border-slate-150 text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChannels([...selectedChannels, channel.id]);
                            } else {
                              setSelectedChannels(selectedChannels.filter(c => c !== channel.id));
                            }
                          }}
                          className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className={channel.color}>{channel.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Editable notification body */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
                  编辑通知消息文本
                </label>
                <textarea
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-300 font-medium h-44 resize-none leading-relaxed text-slate-750 focus:ring-2 focus:ring-indigo-50"
                  value={notifyContent}
                  onChange={(e) => setNotifyContent(e.target.value)}
                  placeholder="请输入通知文本内容..."
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-between items-center pt-3 font-bold text-xs select-none border-t border-slate-100">
              <button
                onClick={() => executeActualSubmit(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                仅归档不发送
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNotifySubmitModal(false);
                    setPendingResults(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => executeActualSubmit(true)}
                  disabled={selectedChannels.length === 0}
                  className={`px-4.5 py-2 rounded-xl text-white font-black transition-all cursor-pointer shadow-md shadow-indigo-100 active:scale-95 ${
                    selectedChannels.length === 0
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  🚀 确认并发送通知
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
