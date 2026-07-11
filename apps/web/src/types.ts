/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ProjectTab {
  OVERVIEW = "overview",
  REQUIREMENT = "requirement", // 需求管理看板
  DEFECT = "defect", // 缺陷追踪看板
  TESTCASE = "testcase", // Test cases workspace
  CODE_CHANGES = "code_changes", // 代码变更/CI与代码追踪
  METRICS = "metrics", // Quality Metrics
  CONFIG = "config", // System administration
}

export enum IssueType {
  REQUIREMENT = "requirement",
  TASK = "task",
  DEFECT = "defect",
}

// Requirement Priority
export enum RequirementPriority {
  EP = "紧急-P0",
  HP1 = "高-P1",
  MP2 = "中-P2",
  LP3 = "低-P3",
}

// Requirement Status
export enum RequirementStatus {
  DRAFT = "草稿",
  UNDER_REVIEW = "待评审",
  DEVELOPING = "开发中",
  TESTING = "测试中",
  ACCEPTING = "待验收",
  COMPLETED = "已完成",
  CANCELLED = "已取消",
}

// Defect Severity
export enum DefectSeverity {
  FATAL = "致命",
  SERIOUS = "严重",
  NORMAL = "一般",
  PROMPT = "提示",
}

// Defect Status
export enum DefectStatus {
  NEW = "新建",
  CONFIRMED = "已确认",
  PROCESSING = "处理中",
  RESOLVED = "已解决",
  VERIFIED = "已验证",
  REOPEN = "重新打开",
  REJECTED = "已拒绝",
  CLOSED = "已关闭",
}

// Test Case Grade
export enum TestCaseGrade {
  P0 = "最高-P0",
  P1 = "高-P1",
  P2 = "中-P2",
  P3 = "低-P3",
}

// Test Case Status
export enum TestCaseStatus {
  UNTESTED = "未测试",
  PASS = "通过",
  FAIL = "失败",
  BLOCKED = "阻塞",
}

export interface Project {
  id: string;
  name: string;
  description: string;
  repoType: "github" | "gitlab" | "none";
  repoUrl: string;
  createdAt: string;
  serviceProvider?: string; // 服务供应商
}

export interface User {
  id: string;
  username: string;
  nickname: string;
  email?: string; // 邮箱字段
  feishuUserId?: string; // 飞书 OpenID (user_id) 字段
  wechatUserId?: string; // 企业微信 ID
  dingtalkUserId?: string; // 钉钉 ID
  group: string; // Group name or id
  status: "active" | "disabled";
  role?: "admin" | "member"; // 系统角色: 管理员 / 普通成员
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  permittedTabs?: ProjectTab[]; // 允许查看和操作的系统菜单/功能看板
  permittedActions?: Record<string, string[]>; // 按菜单看板隔离：增(create)、删(delete)、改(edit) 的细粒度权限控制
}

export interface HistoryLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface DefectReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  replyToUserName?: string;
}

export interface DefectComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  replies?: DefectReply[];
}

export interface Folder {
  id: string;
  projectId: string;
  name: string;
  parentId?: string; // For multi-level hierarchy
  createdAt: string;
}

export interface Issue {
  id: string;
  displayNo?: string;
  version?: number;
  projectId: string;
  type: IssueType;
  title: string;
  content: string; // Markdown format content
  acceptanceCriteria?: string;
  storyPoints?: number;
  labels?: string[];
  priority?: RequirementPriority; // for Requirement & Task
  requirementStatus?: RequirementStatus; // for Requirement
  severity?: DefectSeverity; // for Defect
  defectStatus?: DefectStatus; // for Defect
  linkToRequirements?: string[]; // IDs
  linkToTestCases?: string[]; // IDs
  linkToDefects?: string[]; // IDs
  assigneeId?: string; // User ID
  creatorId?: string; // Creator/Reporter User ID
  estimatedStartTime?: string; // 预估开始时间
  estimatedEndTime?: string; // 预估结束时间
  attachmentUrls?: string[];
  imageUrl?: string;
  websiteUrl?: string;
  feishuMentionUsers?: string[]; // User IDs to mention inside Feishu template
  historyLogs?: HistoryLog[];
  createdAt: string;
  updatedAt: string;

  // Defect specific fields
  precondition?: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  resolution?: string;
  detectedVersion?: string;
  fixedVersion?: string;
  comments?: DefectComment[];
}

export interface TestCase {
  id: string;
  displayNo?: string;
  revision?: number;
  projectId: string;
  name: string;
  grade: TestCaseGrade;
  precondition: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status: TestCaseStatus;
  linkedRequirementId?: string;
  linkedDefectId?: string;
  creatorId?: string;
  assigneeId?: string; // User ID
  version?: string; // 版本号
  tags?: string; // 标签，逗号或空格分隔
  feishuMentionUsers?: string[];
  historyLogs?: HistoryLog[];
  createdAt: string;
  updatedAt: string;
  isMindmapMode?: boolean;
  module?: string;
  folderId?: string; // Multi-level folder association
  stepResults?: Record<number, "pass" | "fail" | "blocked" | "untested">;
  stepNotes?: Record<number, string>;
}

// Model & System Configuration types
export interface ConnectionConfig {
  webhookUrl: string;
  secret?: string;
  enabled: boolean;
  notifyOnCreate?: boolean; // 新建时发送通知
  notifyOnStatusChange?: boolean; // 状态变更时发送通知
  notifyOnReqCreate?: boolean; // 新建需求时通知
  notifyOnReqChange?: boolean; // 需求状态/属性变更时通知
  notifyOnCaseCreate?: boolean; // 新建测试用例时通知
  notifyOnCaseChange?: boolean; // 测试用例状态(执行结果)变更时通知
  notifyOnDefectCreate?: boolean; // 新建缺陷时通知
  notifyOnDefectChange?: boolean; // 缺陷状态与责任人变更时通知
  notifyOnCommentMention?: boolean; // 评论 @ 提及成员时发送通知
}

export interface SystemConfig {
  activeModelProvider: string; // "gemini" | "custom-deepseek" | "custom-qwen" | "custom-openai"
  modelConfigs: {
    [provider: string]: {
      name: string;
      endpoint: string;
      apiKey: string;
      modelSlug: string;
    };
  };
  feishuConfig: ConnectionConfig;
  dingtalkConfig: ConnectionConfig;
  wechatConfig: ConnectionConfig;
  aiPromptTemplate?: string; // AI 生成防线用例提示词模版
  requirementPromptTemplate?: string; // 需求分析提示词模版
  defectPromptTemplate?: string; // 缺陷根因研判提示词模版
  reportPromptTemplate?: string; // 测试报告总结提示词模版
  enableAutoNotifyConfirm?: boolean; // 消息自动发送二次确认智能开关
  visibleMenus?: string[]; // 允许管理员配置哪些菜单展示 or 不展示
  projectName?: string; // 项目名称
  projectDesc?: string; // 项目描述
  feishuLoginEnabled?: boolean;
  dingtalkLoginEnabled?: boolean;
  wechatLoginEnabled?: boolean;
  feishuLoginAppId?: string;
  feishuLoginAppSecret?: string;
  dingtalkLoginAppKey?: string;
  dingtalkLoginAppSecret?: string;
  wechatLoginCorpId?: string;
  wechatLoginAgentId?: string;
  wechatLoginSecret?: string;
}
