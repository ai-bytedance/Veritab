import { ConnectionConfig, SystemConfig } from "../types";

const disabledConnection = (): ConnectionConfig => ({
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
  version: 0,
  activeModelProvider: "unconfigured",
  modelConfigs: {
    unconfigured: { name: "服务端 AI Gateway", modelSlug: "server-managed" },
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
