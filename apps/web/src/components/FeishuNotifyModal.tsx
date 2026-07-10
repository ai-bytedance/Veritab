/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  X,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Cpu,
  Bookmark,
  Users,
  UserCheck,
  MessageSquare,
  QrCode
} from "lucide-react";

interface FeishuNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    sentToUrl?: string;
    realSent?: boolean;
    realError?: string;
    timestamp?: string;
    message?: string;
    isGroupCreate?: boolean;
    groupName?: string;
    joinLink?: string;
    groupId?: string;
    membersPulled?: any[];
  } | null;
  payload: {
    title: string;
    type: string;
    content: string;
    priority?: string;
    link?: string;
    mentions?: string[];
    mentionsWithId?: Array<{ nickname: string; feishuUserId?: string }>;
  } | null;
}

export default function FeishuNotifyModal({
  isOpen,
  onClose,
  result,
  payload,
}: FeishuNotifyModalProps) {
  if (!isOpen || !payload) return null;

  const isRealUrl = result?.sentToUrl &&
    (result.sentToUrl.startsWith("http://") || result.sentToUrl.startsWith("https://")) &&
    !result.sentToUrl.includes("mock-veritab-uuid");

  const isGroup = result?.isGroupCreate;

  // Determine style colors matching server card template mappings
  let headerBgClass = "bg-sky-600";
  let badgeText = "📌 需求推进";
  let footerBtnColor = "bg-sky-600 hover:bg-sky-700 text-white";
  let cardTemplate = "blue";

  const pType = payload.type || "";
  if (pType.toLowerCase().includes("defect") || payload.title.includes("缺陷") || payload.title.includes("故障")) {
    headerBgClass = "bg-rose-600";
    badgeText = isGroup ? "🚨 故障群组" : "🚨 缺陷跟进";
    footerBtnColor = "bg-rose-600 hover:bg-rose-700 text-white";
    cardTemplate = "red";
  } else if (pType.toLowerCase().includes("requirement") || payload.title.includes("需求")) {
    headerBgClass = "bg-indigo-600";
    badgeText = isGroup ? "📌 需求群组" : "📌 需求规划";
    footerBtnColor = "bg-indigo-605 hover:bg-indigo-700 text-white";
    cardTemplate = "indigo";
  } else if (pType.toLowerCase().includes("test") || payload.title.includes("测试") || payload.title.includes("用例")) {
    headerBgClass = "bg-emerald-600";
    badgeText = isGroup ? "🧪 测试群组" : "🧪 测试回归";
    footerBtnColor = "bg-emerald-600 hover:bg-emerald-700 text-white";
    cardTemplate = "turquoise";
  }

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Ribbon Header */}
        <div className="h-2 w-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400" />

        {/* Title area */}
        <div className="p-5 border-b border-rose-50/50 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Cpu className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                {isGroup ? "飞书敏捷战群组建协同中心" : "智能即时协同诊断中心"}
              </h3>
              <p className="text-[10px] text-slate-500">
                {isGroup ? "通过飞书高阶 Applink/API 构建端到端战群通道" : "飞书高精消息卡片协议一键推送与解析闭环"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Dispatch Telemetry Status */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shrink-0">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    {isGroup
                      ? "飞书专属协同群交付情况: 战群已拉建上线"
                      : `推送流交付情况: ${result?.success ? "推送成功" : "推送失败"}`}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 font-normal">
                    {result?.timestamp ? new Date(result.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isGroup
                    ? `系统已实时为您构建专属协作群 「${result?.groupName}」。项目组相关责任人与协作成员已通过后台接口一键拉入群组，手机端与电脑端均已自动唤起群聊邀约。`
                    : isRealUrl
                    ? `已成功直连真实飞书群聊 Webhook 地址，群聊内用户手机或客户端将即时收到强提醒。`
                    : `演示沙箱环境已拦截发送，并为您模拟了完美的飞书卡片效果！请在下方查看 1:1 精致卡片预览。`}
                </p>

                {/* Network Address details */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9.5px] font-mono bg-white/70 border border-indigo-100/40 px-2.5 py-1.5 rounded-lg text-slate-500">
                  <span className="font-bold text-indigo-600">
                    {isGroup ? "🔗 飞书拉群 Applink 端点:" : "📌 推送端点:"}
                  </span>
                  <span className="select-all block max-w-md truncate" title={isGroup ? result?.joinLink : result?.sentToUrl}>
                    {isGroup ? result?.joinLink : (result?.sentToUrl || "未知配置地址")}
                  </span>
                  {!isRealUrl && (
                    <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-bold">
                      [演示沙箱]
                    </span>
                  )}
                </div>

                {result?.realError && (
                  <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100/50 text-[10px] text-rose-600 font-mono">
                    <strong>⚠️ 真实发送报错反馈:</strong> {result.realError}
                    <div className="mt-1 text-slate-500 font-sans">提示: 请检查该飞书 Webhook 的访问权限、或该 Webhook 是否来源于合法的群机器人组件。</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1:1 High Fidelity Card / Group Chat Invitation Preview */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  {isGroup ? "飞书客户端群成员邀约与入群预览" : "飞书客户端中真实的收到卡片原貌预览 (1:1 还原)"}
                </span>
              </span>
              <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">
                {isGroup ? "飞书高级 Applink 协议" : "飞书富文本卡片协议"}
              </span>
            </div>

            {/* Simulated Lark Client Frame */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <div className="flex items-start gap-2.5">
                {/* Simulated Robot/User Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs select-none shrink-0 shadow-sm font-sans">
                  {isGroup ? "专" : "机"}
                </div>

                {/* Chat Bubble containing Interactive Card */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      {isGroup ? "群内敏捷保障机器人" : "智能测试保障助手"}
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded select-none scale-90">机器人</span>
                  </div>

                  {/* The interactive Card Body */}
                  <div className="w-full max-w-[430px] bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden font-sans">

                    {/* Card Header */}
                    <div className={`${headerBgClass} px-4 py-3 text-white flex items-center justify-between`}>
                      <span className="text-xs font-bold whitespace-nowrap tracking-wide">
                        {isGroup ? result?.groupName : payload.title}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {badgeText}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3 text-slate-700 text-xs">
                      {isGroup ? (
                        <>
                          <div className="flex items-start gap-1">
                            <span className="text-indigo-600 font-bold whitespace-nowrap">💬 会话主题:</span>
                            <span className="text-slate-800 font-bold">敏捷研发即时推进保障群</span>
                          </div>

                          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 space-y-1">
                            <div className="font-extrabold text-[11px] flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>首批已被接口自动拉入该战群的协作人员:</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result?.membersPulled && result.membersPulled.length > 0 ? (
                                result.membersPulled.map((m: any, idx: number) => (
                                  <span key={idx} className="bg-white/80 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    @{m.nickname}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">所有活跃项目成员</span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 leading-relaxed font-sans">
                            🚨 <strong>协同群工作规约：</strong> 已为此专项拉建了 <strong>[24小时快速闭环保障群]</strong>。一旦工作项状态流转、评审决策或触发任何测试不通过告警，均会通过此群机器人进行即时@强提醒触达！
                          </div>
                        </>
                      ) : (
                        <>
                          {payload.priority && (
                            <div className="flex items-start gap-1">
                              <span className="text-indigo-600 font-bold whitespace-nowrap">⚡️ 特征等级:</span>
                              <span className="text-slate-800 font-medium">{payload.priority}</span>
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="text-slate-400 font-bold text-[11px]">📋 变更概要:</div>
                            <div className="p-2.5 rounded-lg bg-slate-50 text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap select-text font-mono border border-slate-100">
                              {payload.content}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-400 font-bold text-[10px] mb-1.5">👥 协作提及 (自动触发飞书提醒):</div>
                            <div className="flex flex-wrap gap-1.5">
                              {payload.mentionsWithId && payload.mentionsWithId.some((m) => m.feishuUserId) ? (
                                payload.mentionsWithId.map((m, idx) => {
                                  if (m.feishuUserId) {
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 text-[11px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-bold select-all border border-sky-100/50"
                                        title={`系统后台已将此按钮解析为: <at id="${m.feishuUserId.trim()}"></at>`}
                                      >
                                        @ {m.nickname} ({m.feishuUserId})
                                      </span>
                                    );
                                  }
                                  return (
                                    <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full select-all font-medium border border-slate-200/50">
                                      @ {m.nickname} (未绑ID)
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">尚未配置提及用户</span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Card Button / InvLink */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center flex flex-col items-center justify-center gap-2">
                      <a
                        href={isGroup ? result?.joinLink : (payload.link || "#")}
                        target="_blank"
                        rel="noreferrer"
                        className={`${footerBtnColor} inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer`}
                      >
                        <span>
                          {isGroup ? "📞 立即加入协同飞书群" : "🔍 立即前往敏捷工作台查看详情"}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      {isGroup && (
                        <div className="flex items-center gap-1 text-slate-400 mt-1">
                          <QrCode className="h-3.5 w-3.5" />
                          <span className="text-[9.5px]">手机扫一扫 或 点击上方按钮进入会话</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Sandbox Simulation debug info */}
          <div className="rounded-xl bg-slate-900 text-slate-400 p-3.5 border border-slate-800 flex items-start gap-2">
            <Terminal className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-bold text-slate-300 font-mono block">
                {isGroup ? "飞书拉群 Applink 链路调用协议" : "飞书卡片集成验证协议"}
              </span>
              <p className="text-[9.5px] text-slate-400 leading-relaxed select-text font-mono truncate">
                {isGroup
                  ? `lark://applink.feishu.cn/client/chat/ch_join?group_id=${result?.groupId}`
                  : `{"msg_type":"interactive","card":{"header":{"template":"${cardTemplate}"}}}`}
              </p>
            </div>
          </div>

        </div>

        {/* Modal footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer shadow-sm"
          >
            关闭协同窗口
          </button>
        </div>

      </div>
    </div>
  );
}
