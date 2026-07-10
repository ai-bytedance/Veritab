import { ConnectionConfig, SystemConfig } from "../types";

const disabledConnection = (): ConnectionConfig => ({
  webhookUrl: "",
  enabled: false,
  notifyOnCreate: false,
  notifyOnStatusChange: false,
  notifyOnReqCreate: false,
  notifyOnReqChange: false,
  notifyOnCaseCreate: false,
  notifyOnCaseChange: false,
  notifyOnDefectCreate: false,
  notifyOnDefectChange: false,
});

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  activeModelProvider: "unconfigured",
  modelConfigs: {
    unconfigured: { name: "未配置 AI 服务", endpoint: "", apiKey: "", modelSlug: "" },
  },
  feishuConfig: disabledConnection(),
  dingtalkConfig: disabledConnection(),
  wechatConfig: disabledConnection(),
  aiPromptTemplate: "",
  requirementPromptTemplate: "",
  defectPromptTemplate: "",
  reportPromptTemplate: "",
  enableAutoNotifyConfirm: true,
  visibleMenus: ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"],
  projectName: "Veritab",
  projectDesc: "敏捷研发管理平台",
  feishuLoginEnabled: false,
  dingtalkLoginEnabled: false,
  wechatLoginEnabled: false,
  feishuLoginAppId: "",
  feishuLoginAppSecret: "",
  dingtalkLoginAppKey: "",
  dingtalkLoginAppSecret: "",
  wechatLoginCorpId: "",
  wechatLoginAgentId: "",
  wechatLoginSecret: "",
};
