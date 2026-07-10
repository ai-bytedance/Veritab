/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Robustly parses a JSON string or outputs contained within conversational text.
 * Especially handles LLM wrapping like ```json [...] ``` or prefix descriptions.
 */
export function robustJsonParse<T>(text: string, defaultValue: T): T {
  if (!text) return defaultValue;

  let cleaned = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Ignore and proceed to extraction
  }

  // 1. Try extracting an array: [ ... ]
  try {
    const arrayRegex = /\[\s*\{[\s\S]*\}\s*\]/;
    const arrayMatch = cleaned.match(arrayRegex);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]) as T;
    }
  } catch {
    // Ignore
  }

  // 2. Try extracting an object: { ... }
  try {
    const objectRegex = /\{[\s\S]*\}/;
    const objectMatch = cleaned.match(objectRegex);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]) as T;
    }
  } catch {
    // Ignore
  }

  // 3. Last ditch cleanup: strip ```json and ``` wraps
  try {
    let fallback = cleaned
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(fallback) as T;
  } catch (err: any) {
    console.error("[Robust JSON Parse Error] Failed all parsing strategies:", err, "Raw Input:", text);
    throw new Error(`AI 返回的内容可能未遵循标准 JSON 格式：${err.message || err}`);
  }
}

/**
 * Safely normalizes and maps arbitrary fields returned by LLMs into unified Test Case properties.
 * Protects against translation, capitalization, and naming mismatches in strategic prompts.
 */
export function mapAITestCase(item: any): {
  name: string;
  grade: string;
  precondition: string;
  steps: string;
  expectedResult: string;
} {
  if (!item) {
    return {
      name: "未命名测试用例",
      grade: "中-P2",
      precondition: "暂无前置约束条件",
      steps: "1. 运行系统\n2. 验证主要业务路径",
      expectedResult: "系统无干预，结果符合预期",
    };
  }

  // Retrieve name/title with versatile potential aliases
  const rawName =
    item.name ??
    item.title ??
    item.caseName ??
    item.testName ??
    item.scenario ??
    item.用例名称 ??
    item.标题 ??
    item.用例标题 ??
    "AI自动推理用例";

  // Normalize grades (mapping different formats like P0, P1, P2, P3, 最高, 高, 中, 低)
  const rawGrade =
    item.grade ??
    item.priority ??
    item.level ??
    item.severity ??
    item.等级 ??
    item.优先级 ??
    "中-P2";

  let finalGrade = "中-P2";
  const strGrade = String(rawGrade).toUpperCase();
  if (strGrade.includes("P0") || strGrade.includes("最高") || strGrade.includes("0")) {
    finalGrade = "最高-P0";
  } else if (strGrade.includes("P1") || strGrade.includes("重要") || strGrade.includes("高") || strGrade.includes("1")) {
    finalGrade = "高-P1";
  } else if (strGrade.includes("P3") || strGrade.includes("低") || strGrade.includes("3") || strGrade.includes("MIN")) {
    finalGrade = "低-P3";
  } else {
    finalGrade = "中-P2"; // Default fallback
  }

  // Normalize preconditions
  const rawPrecondition =
    item.precondition ??
    item.condition ??
    item.prev ??
    item.preconditions ??
    item.前置条件 ??
    item.前提条件 ??
    item.依赖项 ??
    "暂无前置约束";

  // Normalize steps - can be string or array
  let finalSteps = "1. 默认无干扰演练";
  const rawSteps =
    item.steps ??
    item.step ??
    item.testSteps ??
    item.actions ??
    item.执行步骤 ??
    item.步骤 ??
    item.操作步骤;

  if (rawSteps) {
    if (Array.isArray(rawSteps)) {
      finalSteps = rawSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    } else {
      finalSteps = String(rawSteps);
    }
  }

  // Normalize expected Results
  const rawExpected =
    item.expectedResult ??
    item.expected ??
    item.expected_result ??
    item.expect ??
    item.expectedResults ??
    item.预期结果 ??
    item.期望结果 ??
    "符合产品预期表现";

  return {
    name: String(rawName).trim(),
    grade: finalGrade,
    precondition: String(rawPrecondition).trim(),
    steps: String(finalSteps).trim(),
    expectedResult: String(rawExpected).trim(),
  };
}

/**
 * Safely maps arbitrary fields returned by LLMs into unified Defect/Issue properties.
 */
export function mapAIDefect(item: any): {
  title: string;
  content: string;
  severity: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  actualResult: string;
} {
  if (!item) {
    return {
      title: "未命名故障",
      content: "### 故障发生\n偏离预期设计",
      severity: "严重",
      precondition: "无",
      steps: "1. 重现故障动作",
      expectedResult: "未出现阻断",
      actualResult: "实际出现崩溃拦截",
    };
  }

  const rawTitle =
    item.title ??
    item.name ??
    item.subject ??
    item.defectName ??
    item.缺陷名称 ??
    item.标题 ??
    "AI自动检测缺陷说明书";

  const rawContent =
    item.content ??
    item.desc ??
    item.description ??
    item.detail ??
    item.详情 ??
    item.描述 ??
    "";

  // Severity prioritization mapping
  const rawSeverity =
    item.severity ??
    item.priority ??
    item.grade ??
    item.级别 ??
    item.严重程度 ??
    "严重";

  let finalSeverity = "严重";
  const strSeverity = String(rawSeverity).toUpperCase();
  if (strSeverity.includes("致命") || strSeverity.includes("BLOCKER") || strSeverity.includes("CRITICAL")) {
    finalSeverity = "致命";
  } else if (strSeverity.includes("严重") || strSeverity.includes("MAJOR") || strSeverity.includes("SERIOUS")) {
    finalSeverity = "严重";
  } else if (strSeverity.includes("轻微") || strSeverity.includes("MINOR") || strSeverity.includes("LOW") || strSeverity.includes("Trivial")) {
    finalSeverity = "轻微";
  } else {
    finalSeverity = "一般";
  }

  const rawPrecondition =
    item.precondition ??
    item.condition ??
    item.prev ??
    item.前置环境 ??
    "无前置配置依赖";

  let finalSteps = "1. 重现复现路径操作";
  const rawSteps =
    item.steps ??
    item.step ??
    item.testSteps ??
    item.复现步骤 ??
    item.步骤;

  if (rawSteps) {
    if (Array.isArray(rawSteps)) {
      finalSteps = rawSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    } else {
      finalSteps = String(rawSteps);
    }
  }

  const rawExpected =
    item.expectedResult ??
    item.expected ??
    item.expect ??
    item.预期结果 ??
    "应该能顺畅返回";

  const rawActual =
    item.actualResult ??
    item.actual ??
    item.actual_result ??
    item.实际结果 ??
    "偏离预期发生错误";

  // Build high fidelity description document if rawContent is blank
  let finalContent = String(rawContent);
  if (!finalContent || finalContent.trim() === "") {
    finalContent = `### 🚨 缺陷复现全链路报告 (AI生成)

**🔬 发生偏离阻断的环境与状态：**
${rawPrecondition}

**📋 核心复现步骤列表：**
${finalSteps}

**🎯 理论正常预期标准：**
${rawExpected}

**❌ 运行时真实偏差拦截：**
${rawActual}`;
  }

  return {
    title: String(rawTitle).trim(),
    content: finalContent.trim(),
    severity: finalSeverity,
    precondition: String(rawPrecondition).trim(),
    steps: String(finalSteps).trim(),
    expectedResult: String(rawExpected).trim(),
    actualResult: String(rawActual).trim(),
  };
}
