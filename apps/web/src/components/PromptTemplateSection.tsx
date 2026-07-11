import React, { useState } from "react";
import { Save, Info, Sparkles, BookOpen, ShieldAlert, FileSpreadsheet, Lock } from "lucide-react";
import { SystemConfig } from "../types";

interface PromptTemplateSectionProps {
  systemConfig: SystemConfig;
  onUpdateConfig: (cfg: SystemConfig) => Promise<void>;
  isAdmin: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
}

type TemplateType = "testcase" | "requirement" | "defect" | "report";

export default function PromptTemplateSection({
  systemConfig,
  onUpdateConfig,
  isAdmin,
  showToast,
}: PromptTemplateSectionProps) {
  const [activeTab, setActiveTab] = useState<TemplateType>("testcase");

  // Local state for all templates to make interaction smooth
  const [testcasePrompt, setTestcasePrompt] = useState(
    systemConfig.aiPromptTemplate || ""
  );
  const [requirementPrompt, setRequirementPrompt] = useState(
    systemConfig.requirementPromptTemplate || ""
  );
  const [defectPrompt, setDefectPrompt] = useState(
    systemConfig.defectPromptTemplate || ""
  );
  const [reportPrompt, setReportPrompt] = useState(
    systemConfig.reportPromptTemplate || ""
  );

  React.useEffect(() => {
    setTestcasePrompt(systemConfig.aiPromptTemplate || "");
    setRequirementPrompt(systemConfig.requirementPromptTemplate || "");
    setDefectPrompt(systemConfig.defectPromptTemplate || "");
    setReportPrompt(systemConfig.reportPromptTemplate || "");
  }, [systemConfig]);

  const handleSave = async (type: TemplateType) => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能微调全局 Prompt 策略模板！", "error");
      return;
    }

    const updatedConfig = { ...systemConfig };
    if (type === "testcase") {
      updatedConfig.aiPromptTemplate = testcasePrompt;
    } else if (type === "requirement") {
      updatedConfig.requirementPromptTemplate = requirementPrompt;
    } else if (type === "defect") {
      updatedConfig.defectPromptTemplate = defectPrompt;
    } else if (type === "report") {
      updatedConfig.reportPromptTemplate = reportPrompt;
    }

    try {
      await onUpdateConfig(updatedConfig);
      showToast("🟢 AI 指令模板已保存。", "success");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "指令模板保存失败。", "error");
    }
  };

  const handleResetToDefault = (type: TemplateType) => {
    if (!isAdmin) {
      showToast("⚠️ 只有管理员才能重置模板！", "error");
      return;
    }

    if (type === "testcase") {
      const defaultVal = "你是一位顶尖的敏捷软件质控专家与资深测试架构师。针对以下提供的业务需求说明，进行高覆盖度的业务流演进与异常边界探索，并派生出一组标准回归用例。\n\n【测试设计核心指导原则】\n1. 核心流程覆盖（最高-P0）：覆盖标准交付链路的主干 happy path 验证逻辑。\n2. 逆向与异常输入防线（高-P1）：包括非法参数、空值输入、逻辑拦截并触发报错行为。\n3. 边界值挖掘（中-P2）：测试临界点、上限区间值、多状态交叉流转限制。\n4. 交互或非功能性约束（低-P3）：环境、基础状态交互或依赖硬件/底层传感器配置。\n\n【输出标准 JSON 格式契约】\n必须严格输出格式为原生的 JSON 数组格式，禁止包裹任何 ```json 标记，确保可通过 JSON.parse 解析：\n[\n  {\n    \"name\": \"用例标题描述(说明所覆盖场景及验证行为)\",\n    \"grade\": \"最高-P0 或 高-P1 或 中-P2 或 低-P3\",\n    \"precondition\": \"执行该测试前的核心依赖环境/初始状态/前置配置\",\n    \"steps\": \"具体核心执行步骤以 1. 2. 3. 换行编写\",\n    \"expectedResult\": \"对系统拦截或正常返回的具体可度量期望\"\n  }\n]";
      setTestcasePrompt(defaultVal);
    } else if (type === "requirement") {
      const defaultVal = "你是一位敏捷系统分析师，负责深入拆解业务需求：\n1. 请将大型需求自动提取出相互独立的「原子功能点」；\n2. 评估该需求的潜在风险，指出最容易发生漏测的边界场景；\n3. 梳理业务实体状态变化机理，确定其生命周期链路。";
      setRequirementPrompt(defaultVal);
    } else if (type === "defect") {
      const defaultVal = "你是一位卓越的软件调试专家与底层架构顾问。针对给出的软件缺陷报告：\n1. 深度分析可能导致该缺陷的潜在代码根因（Backend/Frontend）；\n2. 推导重现步骤的有效性与漏洞点；\n3. 提供针对性的、符合代码规范的一键式修复设计草案。";
      setDefectPrompt(defaultVal);
    } else if (type === "report") {
      const defaultVal = "你是一位资深技术专家与研发效能总监。请针对本次产品发布的所有测试指标数据：\n1. 提炼整体质量大盘的核心总结，包括通过率走势与主要瓶颈；\n2. 重点列出具有中高演进风险的缺陷和质量盲区；\n3. 给出后续迭代的具体的质量改进建议。";
      setReportPrompt(defaultVal);
    }
    showToast("🟢 模板已恢复为系统预设，请记得点击保存哦！", "success");
  };

  const templates = [
    {
      id: "testcase" as TemplateType,
      title: "用例自动发散生成",
      desc: "控制 AI 自动分析需求并生成系统级和场景级测试用例的驱动指令",
      icon: Sparkles,
      value: testcasePrompt,
      setValue: setTestcasePrompt,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      activeTabColor: "border-indigo-500 text-indigo-700 bg-indigo-50/50",
      variables: [
        { name: "{requirement_title}", desc: "动态注入的需求标题" },
        { name: "{requirement_desc}", desc: "动态注入的需求描述" },
      ],
    },
    {
      id: "requirement" as TemplateType,
      title: "需求原子拆解分析",
      desc: "控制 AI 在导入或分析需求时原子化提取与缺陷风险研判的指令",
      icon: BookOpen,
      value: requirementPrompt,
      setValue: setRequirementPrompt,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      activeTabColor: "border-emerald-500 text-emerald-700 bg-emerald-50/50",
      variables: [
        { name: "{requirement_title}", desc: "需求标题" },
        { name: "{requirement_desc}", desc: "需求的详细规格描述" },
      ],
    },
    {
      id: "defect" as TemplateType,
      title: "缺陷根因诊断研判",
      desc: "控制 AI 智能诊断缺陷、判断修复范围与代码生成的底层系统提示词",
      icon: ShieldAlert,
      value: defectPrompt,
      setValue: setDefectPrompt,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      activeTabColor: "border-rose-500 text-rose-700 bg-rose-50/50",
      variables: [
        { name: "{defect_title}", desc: "缺陷标题" },
        { name: "{defect_desc}", desc: "缺陷表现描述与重现步骤" },
        { name: "{related_code}", desc: "关联的代码片段或差异" },
      ],
    },
    {
      id: "report" as TemplateType,
      title: "测试报告质量总结",
      desc: "控制 AI 汇总度量大盘并自动输出研发交付与效能改进总结的模板",
      icon: FileSpreadsheet,
      value: reportPrompt,
      setValue: setReportPrompt,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      activeTabColor: "border-amber-500 text-amber-700 bg-amber-50/50",
      variables: [
        { name: "{metrics_summary}", desc: "通过率、缺陷密度等指标 summary" },
        { name: "{defect_list}", desc: "遗留与新增缺陷的多维分布快照" },
      ],
    },
  ];

  const currentTpl = templates.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in" id="prompt-template-section">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-6">
        {/* Title */}
        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-4">
          <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              AI 智能指令模板引擎
            </h3>
            <p className="text-[11px] text-slate-400">
              配置驱动全站 AI 智能中转的核心 Prompt 策略，支持按业务场景深度调优参数变量。
            </p>
          </div>
        </div>

        {/* Sidebar + Editor layout */}
        <div className="grid gap-6 md:grid-cols-4 items-start">
          {/* Sub-tabs Sidebar on desktop, grid on mobile */}
          <div className="md:col-span-1 flex flex-col gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1.5 mb-1 block">
              指令场景分类
            </span>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              {templates.map((tpl) => {
                const isSelected = activeTab === tpl.id;
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setActiveTab(tpl.id)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col md:flex-row items-start md:items-center gap-2 cursor-pointer ${
                      isSelected
                        ? tpl.activeTabColor + " shadow-3xs"
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/30 text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 md:mt-0" />
                    <span className="text-xs font-bold leading-none">{tpl.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active prompt template editor */}
          <div className="md:col-span-3 space-y-4 animate-fade-in">
            <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <span className={`p-1 rounded-md ${currentTpl.color}`}>
                      <currentTpl.icon className="h-3.5 w-3.5" />
                    </span>
                    {currentTpl.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {currentTpl.desc}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleResetToDefault(currentTpl.id)}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-850 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  恢复预设
                </button>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5 pt-1.5">
                <textarea
                  disabled={!isAdmin}
                  className="w-full h-56 font-mono rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 leading-relaxed shadow-3xs"
                  value={currentTpl.value}
                  onChange={(e) => currentTpl.setValue(e.target.value)}
                  placeholder="请输入您的自定义 Prompt 指令策略..."
                />
              </div>

              {/* Variable slots instruction */}
              <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50 space-y-1.5 text-[10px] text-indigo-950 leading-relaxed">
                <div className="font-extrabold flex items-center gap-1">
                  参数插槽绑定变量说明：
                </div>
                <div className="space-y-1">
                  {currentTpl.variables.map((v) => (
                    <div key={v.name} className="flex items-center gap-2">
                      <code className="font-mono bg-indigo-100 text-indigo-800 px-1 rounded text-[9.5px]">
                        {v.name}
                      </code>
                      <span className="text-slate-500 font-medium">{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <span className="text-[10px] text-slate-400 font-medium">
                {isAdmin
                  ? "提示：保存后后续相关 AI 功能将实时采用本预置指令策略。"
                  : "只读模式：无权配置 AI 场景指令策略。"}
              </span>
              <button
                onClick={() => handleSave(currentTpl.id)}
                disabled={!isAdmin}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>保存该指令模板</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
