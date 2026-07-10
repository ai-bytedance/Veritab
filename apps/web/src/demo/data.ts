/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Project,
  User,
  UserGroup,
  Issue,
  IssueType,
  RequirementPriority,
  RequirementStatus,
  DefectSeverity,
  DefectStatus,
  TestCase,
  TestCaseGrade,
  TestCaseStatus,
  SystemConfig,
  ProjectTab,
} from "../types";

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "AI 智能驾驶仿真平台 (Veritab Sim)",
    description: "下一代高保真三维智能驾驶仿真云引擎，结合大模型生成真实路况与边缘测试用例。",
    repoType: "github",
    repoUrl: "https://github.com/veritab/autonomous-sim",
    createdAt: "2026-05-01T08:00:00Z",
    serviceProvider: "阿里云",
  },
  {
    id: "proj-2",
    name: "智能看板后台服务 (Veritab Core)",
    description: "Veritab 核心协作与实时度量统计服务，集成主流模型微调与多群消息机器人同步。",
    repoType: "gitlab",
    repoUrl: "https://gitlab.com/veritab/core-service",
    createdAt: "2026-05-15T10:30:00Z",
    serviceProvider: "腾讯云",
  },
];

export const INITIAL_USER_GROUPS: UserGroup[] = [
  {
    id: "grp-po",
    name: "产品组 (PO/PM)",
    description: "负责业务流程规划、交互设计及飞书需求卡片下发",
    permittedTabs: [
      ProjectTab.OVERVIEW,
      ProjectTab.REQUIREMENT,
      ProjectTab.DEFECT,
      ProjectTab.METRICS
    ],
    permittedActions: {
      [ProjectTab.OVERVIEW]: ["create"],
      [ProjectTab.REQUIREMENT]: ["create", "edit", "status_flow", "ai_analysis", "ai_generate", "notify", "group_chat"],
      [ProjectTab.DEFECT]: ["create", "comment", "notify", "group_chat"],
      [ProjectTab.TESTCASE]: [],
      [ProjectTab.CODE_CHANGES]: []
    }
  },
  {
    id: "grp-dev",
    name: "研发组 (Dev)",
    description: "后端与云原生技术攻坚、API聚合及多语编译器实现",
    permittedTabs: [
      ProjectTab.OVERVIEW,
      ProjectTab.REQUIREMENT,
      ProjectTab.DEFECT,
      ProjectTab.TESTCASE,
      ProjectTab.CODE_CHANGES,
      ProjectTab.METRICS
    ],
    permittedActions: {
      [ProjectTab.OVERVIEW]: [],
      [ProjectTab.REQUIREMENT]: [],
      [ProjectTab.DEFECT]: ["create", "edit", "status_flow", "comment", "notify", "group_chat"],
      [ProjectTab.TESTCASE]: [],
      [ProjectTab.CODE_CHANGES]: ["create", "edit", "delete"]
    }
  },
  {
    id: "grp-qa",
    name: "测试质量组 (QA)",
    description: "编制xmind用例脑图、负责复杂拓扑环境持续回归与缺陷流转",
    permittedTabs: [
      ProjectTab.OVERVIEW,
      ProjectTab.REQUIREMENT,
      ProjectTab.DEFECT,
      ProjectTab.TESTCASE,
      ProjectTab.CODE_CHANGES,
      ProjectTab.METRICS
    ],
    permittedActions: {
      [ProjectTab.OVERVIEW]: ["create", "edit"],
      [ProjectTab.REQUIREMENT]: ["create", "edit", "status_flow", "ai_analysis", "ai_generate", "notify", "group_chat", "delete"],
      [ProjectTab.DEFECT]: ["create", "edit", "status_flow", "comment", "ai_generate", "notify", "group_chat", "delete"],
      [ProjectTab.TESTCASE]: ["create", "edit", "execute", "reset_progress", "ai_generate", "mindmap", "notify", "group_chat", "delete"],
      [ProjectTab.CODE_CHANGES]: ["create", "edit", "delete"]
    }
  },
];

export const INITIAL_USERS: User[] = [
  { id: "usr-wang", username: "wangbing", nickname: "王兵 (系统管理员)", email: "wangbing@veritab.com", feishuUserId: "ou_wang123", wechatUserId: "wx_wang123", dingtalkUserId: "dt_wang123", group: "grp-qa", status: "active", role: "admin" },
  { id: "usr-1", username: "alex.po", nickname: "阿力 (PO负责人)", email: "alex.po@veritab.com", feishuUserId: "ou_alex123", wechatUserId: "wx_alex123", group: "grp-po", status: "active", role: "member" },
  { id: "usr-2", username: "bob.dev", nickname: "小波 (核心开发)", email: "bob.dev@veritab.com", feishuUserId: "ou_bob456", dingtalkUserId: "dt_bob456", group: "grp-dev", status: "active", role: "member" },
  { id: "usr-3", username: "clara.qa", nickname: "小克 (首席测试)", email: "clara.qa@veritab.com", feishuUserId: "ou_clara789", group: "grp-qa", status: "active", role: "member" },
  { id: "usr-4", username: "disabled.old", nickname: "老王 (已离职)", email: "wang.old@veritab.com", feishuUserId: "", group: "grp-dev", status: "disabled", role: "member" },
];

export const INITIAL_ISSUES: Issue[] = [
  {
    id: "issue-1",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "支持基于文本 Prompt 生成三维危险天气应急用例",
    content: "### 业务说明\n用户输入自然语言天气描述（如：'黄昏暴雨夹杂突发强侧风'），大模型将动态转换为仿真核心可执行的配置文件。\n\n### 输入参数\n- `prompt`: 描述性文本\n- `duration`: 仿真持续时间 (10s - 120s)\n\n### 验收标准\n1. 支持雨滴粒子密度和风阻系数的微秒级平滑过渡；\n2. AI 分析延迟需控制在 1.5 秒以内。",
    priority: RequirementPriority.EP,
    requirementStatus: RequirementStatus.DEVELOPING,
    assigneeId: "usr-1",
    attachmentUrls: ["https://example.com/spec/weather_generation_v1.pdf"],
    imageUrl: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=500&auto=format&fit=crop",
    websiteUrl: "https://ai.studio/weather-docs",
    linkToRequirements: [],
    linkToTestCases: ["case-1"],
    linkToDefects: [],
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-11T02:00:00Z",
  },
  {
    id: "issue-req-2",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "激光雷达多回波噪声滤波器阈值调节动态仿真",
    content: "### 业务说明\n在雨雪或沙尘天气仿真中，光束返回会产生高度杂散的多回波噪声。需通过动态参数注入，调节滤波窗口和强度，保证目标探测率在 95% 以上。\n\n### 输入参数\n- `echoFilterThreshold`: 浮点数延迟过滤窗口 (0.1 - 0.95)\n\n### 验收标准\n1. 噪声点云滤除率 > 99%；\n2. 滤波器参数更改在 10ms 内物理生效。",
    priority: RequirementPriority.HP1,
    requirementStatus: RequirementStatus.DRAFT,
    assigneeId: "usr-2",
    attachmentUrls: [],
    imageUrl: "",
    websiteUrl: "",
    linkToRequirements: [],
    linkToTestCases: [],
    linkToDefects: [],
    createdAt: "2026-06-02T10:00:00Z",
    updatedAt: "2026-06-11T02:00:00Z",
  },
  {
    id: "issue-req-3",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "高精度地图 (HD Map) 车道级高程异常仿真注入",
    content: "### 业务说明\n支持在既定 OpenDRIVE 高精地图图层中，按几何坐标动态抬高或降低特定车道的高程 (Grade)，用于拟合沉降、桥梁断裂区等硬核测试场景。\n\n### 输入参数\n- `elevationOffset`: 补偿偏差 (-2.5m - +2.5m)\n- `blendRange`: 平滑融合距离 (5m - 20m)",
    priority: RequirementPriority.MP2,
    requirementStatus: RequirementStatus.UNDER_REVIEW,
    assigneeId: "usr-3",
    attachmentUrls: [],
    imageUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&auto=format&fit=crop",
    websiteUrl: "",
    linkToRequirements: [],
    linkToTestCases: [],
    linkToDefects: [],
    createdAt: "2026-06-03T11:00:00Z",
    updatedAt: "2026-06-11T02:00:05Z",
  },
  {
    id: "issue-req-4",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "AEB 主动紧急制动多传感器前向融合冗余算法测试",
    content: "### 业务说明\n当毫米波雷达与前视摄像头提供的目标距离数据发生严重空间/时间不一致时，决策层需采用卡尔曼滤波方差权重进行融合冗余判定，在危险工况下触发一阶段减速。\n\n### 验收标准\n1. 当二者数据背离 > 1.5m 时，拒绝误制动，并抛出退化警告记录；\n2. 最终碰撞预警检测不漏报率 >= 99.9%。",
    priority: RequirementPriority.EP,
    requirementStatus: RequirementStatus.DEVELOPING,
    assigneeId: "usr-2",
    attachmentUrls: [],
    imageUrl: "",
    websiteUrl: "",
    linkToRequirements: [],
    linkToTestCases: [],
    linkToDefects: [],
    createdAt: "2026-06-04T12:00:00Z",
    updatedAt: "2026-06-11T02:00:10Z",
  },
  {
    id: "issue-req-5",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "极端雨雪暴风雨环境下的红外传感器感知退化动力学建模",
    content: "### 业务说明\n构建红外相机 (Thermal Camera) 在不同大雾水分子散射效应下的衰减系数物理曲线。支持按百分比衰减热成像对比度，并与大模型深度场景进行闭环一致性推演。",
    priority: RequirementPriority.LP3,
    requirementStatus: RequirementStatus.TESTING,
    assigneeId: "usr-3",
    attachmentUrls: [],
    imageUrl: "",
    websiteUrl: "",
    linkToRequirements: [],
    linkToTestCases: [],
    linkToDefects: [],
    createdAt: "2026-06-05T13:00:00Z",
    updatedAt: "2026-06-11T02:00:15Z",
  },
  {
    id: "issue-req-6",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "车载 CAN 总线偶发性抖动与高延迟故障注入控制仿真",
    content: "### 业务说明\n提供虚拟 CAN 总线接口层，仿真中可通过控制台动态设置发送突发信号的延迟 (Delay) 或丢包率。评测决策算法端在这类总线低配劣化硬件环境下的容错防御表现。\n\n### 输入参数\n- `jitterMs`: 周期抖动波动值 (0 - 50ms)",
    priority: RequirementPriority.HP1,
    requirementStatus: RequirementStatus.ACCEPTING,
    assigneeId: "usr-1",
    attachmentUrls: [],
    imageUrl: "",
    websiteUrl: "",
    linkToRequirements: [],
    linkToTestCases: [],
    linkToDefects: [],
    createdAt: "2026-06-06T14:00:05Z",
    updatedAt: "2026-06-11T02:00:20Z",
  },
  {
    id: "issue-req-7",
    projectId: "proj-1",
    type: IssueType.REQUIREMENT,
    title: "自动泊车系统 (APA) 狭窄车位障碍物几何点流式解算",
    content: "### 业务说明\n通过周视超声波雷达及环视相机解算极小空间的边界几何，建立距离约束矩阵，保证车辆切入时车轮外切边缘与障碍物之间的动态安全边际 > 5.5cm。\n\n### 接收参数\n- `parkingTargetId`: 被锁定的车位唯一索引",
    priority: RequirementPriority.MP2,
    requirementStatus: RequirementStatus.COMPLETED,
    assigneeId: "usr-2",
    attachmentUrls: [],
    imageUrl: "",
    websiteUrl: "",
    linkToRequirements: [],
    linkToTestCases: [],
    linkToDefects: [],
    createdAt: "2026-06-07T15:00:00Z",
    updatedAt: "2026-06-11T02:00:25Z",
  },
  {
    id: "issue-2",
    projectId: "proj-1",
    type: IssueType.DEFECT,
    title: "强风场景下车辆物理碰撞盒子形变系数计算溢出",
    content: "### 缺陷日志\n当侧风阵风风速大于 45m/s 时，物理算子中对胎压接触面位移的矩阵分量乘积可能为无穷大，导致动力学中断。\n\n### 复现步骤\n1. 启动 Sim 空间，配置车辆为重型货车；\n2. 注入 50m/s 的瞬时脉冲侧风；\n3. 车体翻倾时，控制台抛出 `FloatOverflowException`。",
    severity: DefectSeverity.FATAL,
    defectStatus: DefectStatus.NEW,
    assigneeId: "usr-2",
    precondition: "车辆物理悬挂硬度配置为软 (Soft)",
    steps: "1. 启动仿真\n2. 触发 50m/s 瞬时大风\n3. 观察底层物理线程日志",
    expectedResult: "悬挂连杆被判定折断，并在交互上展示物理破损碎片，系统不崩溃。",
    actualResult: "全屏出现白色像素块，多核CPU突增至100%后模拟器进程强制退出。",
    linkToRequirements: ["issue-1"],
    linkToTestCases: ["case-2"],
    createdAt: "2026-06-05T14:20:00Z",
    updatedAt: "2026-06-11T03:10:00Z",
    comments: [
      {
        id: "comment-mock-1",
        userId: "usr-2",
        userName: "小波",
        content: "🛠️ 已成功在集成沙盒复现了 FloatOverflowException 溢出异常。堆栈定位到动力学模型中的风阻碰撞矩阵乘积计算，当侧风阻力过大导致局部悬挂物理接触形变为负值时，浮点计算模块缺少防护机制。",
        createdAt: "2026-06-12T10:00:00Z",
        replies: [
          {
            id: "reply-mock-1",
            userId: "usr-3",
            userName: "小克",
            content: "收到！在 35m/s 以下低风速测试中一切表现正常，可以稳定展示破损碎片，期待下个迭代补丁。我会配合在 Sim5.8 进行专项回归。",
            createdAt: "2026-06-12T11:30:00Z",
            replyToUserName: "小波"
          }
        ]
      },
      {
        id: "comment-mock-2",
        userId: "usr-wang",
        userName: "王兵",
        content: "🔄 重新打开原因追踪：上一版合并的分量容差对重型平板挂车无效。建议加入底盘平衡悬挂的物理刚体上限限制，并在遇到浮点溢出时采取平稳降落的防退化保护，而不是使模拟器进程强制异常关闭退出。",
        createdAt: "2026-06-13T14:00:00Z",
        replies: []
      }
    ]
  },
];

export const INITIAL_TEST_CASES: TestCase[] = [
  {
    id: "case-1",
    projectId: "proj-1",
    name: "验证暴雨 Prompt 转换得到的降水量值是否合法",
    grade: TestCaseGrade.P1,
    precondition: "大模型推理服务器就绪，API 端点连通",
    steps: "1. 在用例卡片输入 Prompt: '超强热带气旋下的雨夜'；\n2. 点击一键解析生成；\n3. 检查解析得到的 JSON 字典中 `precipitation` 字段是否大于 150mm/h。",
    expectedResult: "系统解析参数无误，车辆传感器能够感应雨滴并开启大灯与相应雨刮，状态置为 RainMode = Ultimate",
    status: TestCaseStatus.PASS,
    linkedRequirementId: "issue-1",
    createdAt: "2026-06-02T10:00:00Z",
    updatedAt: "2026-06-02T11:30:00Z",
  },
  {
    id: "case-2",
    projectId: "proj-1",
    name: "验证在致命强侧风作用下货车防侧翻防抱死算法性能触发",
    grade: TestCaseGrade.P0,
    precondition: "车辆装配有最新的 VCU 安全微控制策略",
    steps: "1. 加载侧风模型参数；\n2. 调节底盘刚性为默认值；\n3. 读取侧倾阻尼阀门在碰撞瞬间的电流反馈值。",
    expectedResult: "反馈电流阈值在 4.5A 以内，电控车身平稳，胎压检测保持在 240~270kPa",
    status: TestCaseStatus.FAIL,
    linkedRequirementId: "issue-1",
    linkedDefectId: "issue-2",
    createdAt: "2026-06-06T15:00:00Z",
    updatedAt: "2026-06-11T03:00:00Z",
  },
];

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  activeModelProvider: "gemini",
  modelConfigs: {
    gemini: {
       name: "Gemini 3.5 Flash",
       endpoint: "",
       apiKey: "",
       modelSlug: "gemini-3.5-flash"
    },
    deepseek: {
       name: "DeepSeek R1 / V3",
       endpoint: "https://api.deepseek.com/v1",
       apiKey: "",
       modelSlug: "deepseek-chat"
    },
    qwen: {
       name: "阿里云通义千问 (Qwen)",
       endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
       apiKey: "",
       modelSlug: "qwen-turbo"
    },
    openai: {
       name: "OpenAI GPT-4o",
       endpoint: "https://api.openai.com/v1",
       apiKey: "",
       modelSlug: "gpt-4o"
    },
    grok: {
       name: "Grok",
       endpoint: "https://api.x.ai/v1",
       apiKey: "",
       modelSlug: "grok-2"
    },
    doubao: {
       name: "Doubao",
       endpoint: "https://ark.cn-beijing.volces.com/api/v3",
       apiKey: "",
       modelSlug: "doubao-pro-4k"
    },
    claude: {
       name: "Claude",
       endpoint: "https://api.anthropic.com/v1",
       apiKey: "",
       modelSlug: "claude-3-5-sonnet-latest"
    },
    zhipu: {
       name: "Zhipu",
       endpoint: "https://open.bigmodel.cn/api/paas/v4",
       apiKey: "",
       modelSlug: "glm-4-flash"
    },
    custom: {
       name: "自定义通用大语言模型 (Custom LLM)",
       endpoint: "https://api.openai-compatible.com/v1",
       apiKey: "",
       modelSlug: "custom-generic-model"
    }
  },
  aiPromptTemplate: "你是一位顶尖的敏捷软件质控专家与资深测试架构师。针对以下提供的业务需求说明，进行高覆盖度的业务流演进与异常边界探索，并派生出一组标准回归用例。\n\n【测试设计核心指导原则】\n1. 核心流程覆盖（最高-P0）：覆盖标准交付链路的主干 happy path 验证逻辑。\n2. 逆向与异常输入防线（高-P1）：包括非法参数、空值输入、逻辑拦截并触发报错行为。\n3. 边界值挖掘（中-P2）：测试临界点、上限区间值、多状态交叉流转限制。\n4. 交互或非功能性约束（低-P3）：环境、基础状态交互或依赖硬件/底层传感器配置。\n\n【输出标准 JSON 格式契约】\n必须严格输出格式为原生的 JSON 数组格式，禁止包裹任何 ```json 标记，确保可通过 JSON.parse 解析：\n[\n  {\n    \"name\": \"用例标题描述(说明所覆盖场景及验证行为)\",\n    \"grade\": \"最高-P0 或 高-P1 或 中-P2 或 低-P3\",\n    \"precondition\": \"执行该测试前的核心依赖环境/初始状态/前置配置\",\n    \"steps\": \"具体核心执行步骤以 1. 2. 3. 换行编写\",\n    \"expectedResult\": \"对系统拦截或正常返回的具体可度量期望\"\n  }\n]",
  requirementPromptTemplate: "你是一位敏捷系统分析师，负责深入拆解业务需求：\n1. 请将大型需求自动提取出相互独立的「原子功能点」；\n2. 评估该需求的潜在风险，指出最容易发生漏测的边界场景；\n3. 梳理业务实体状态变化机理，确定其生命周期链路。",
  defectPromptTemplate: "你是一位卓越的软件调试专家与底层架构顾问。针对给出的软件缺陷报告：\n1. 深度分析可能导致该缺陷的潜在代码根因（Backend/Frontend）；\n2. 推导重现步骤的有效性与漏洞点；\n3. 提供针对性的、符合代码规范的一键式修复设计草案。",
  reportPromptTemplate: "你是一位资深技术专家与研发效能总监。请针对本次产品发布的所有测试指标数据：\n1. 提炼整体质量大盘的核心总结，包括通过率走势与主要瓶颈；\n2. 重点列出具有中高演进风险的缺陷和质量盲区；\n3. 给出后续迭代的具体的质量改进建议。",
  feishuConfig: {
    webhookUrl: "https://open.feishu.cn/open-apis/bot/v2/hook/mock-veritab-uuid",
    enabled: true,
    notifyOnCreate: true,
    notifyOnStatusChange: true,
    notifyOnReqCreate: true,
    notifyOnReqChange: true,
    notifyOnCaseCreate: true,
    notifyOnCaseChange: true,
    notifyOnDefectCreate: true,
    notifyOnDefectChange: true
  },
  dingtalkConfig: {
    webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=mock-dingtalk-token",
    enabled: false,
    notifyOnCreate: true,
    notifyOnStatusChange: true,
    notifyOnReqCreate: true,
    notifyOnReqChange: true,
    notifyOnCaseCreate: true,
    notifyOnCaseChange: true,
    notifyOnDefectCreate: true,
    notifyOnDefectChange: true
  },
  wechatConfig: {
    webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=mock-wechat-key",
    enabled: false,
    notifyOnCreate: false,
    notifyOnStatusChange: false,
    notifyOnReqCreate: false,
    notifyOnReqChange: false,
    notifyOnCaseCreate: false,
    notifyOnCaseChange: false,
    notifyOnDefectCreate: false,
    notifyOnDefectChange: false
  },
  enableAutoNotifyConfirm: true,
  visibleMenus: ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"],
  projectName: "Veritab",
  projectDesc: "AI 协同质控大脑",
  feishuLoginEnabled: true,
  dingtalkLoginEnabled: true,
  wechatLoginEnabled: true,
  feishuLoginAppId: "cli_mock_feishu_appid_123",
  feishuLoginAppSecret: "mock_secret_feishu_456",
  dingtalkLoginAppKey: "ding_mock_appkey_789",
  dingtalkLoginAppSecret: "mock_secret_dingtalk_abc",
  wechatLoginCorpId: "ww_mock_corpid_def",
  wechatLoginAgentId: "1000002",
  wechatLoginSecret: "mock_secret_wechat_ghi",
};

// Local storage helpers
export function getStoredData<T>(key: string, initialValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(initialValue));
      return initialValue;
    }
    return JSON.parse(val);
  } catch (e) {
    return initialValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to store data for ${key}:`, e);
  }
}
