/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  MessageSquare,
  CornerDownRight,
  Send,
  Trash2,
  User,
  Smile,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from "lucide-react";
import {
  DefectComment,
  DefectReply,
  Issue,
  User as SystemUser
} from "../types";

interface DefectCommentsSectionProps {
  activeIssue: Issue;
  currentUser: SystemUser;
  onUpdateField: (key: keyof Issue, val: any) => void;
  users?: SystemUser[];
  systemConfig?: any;
  onTriggerWebhook?: (provider: string, payload: any) => void;
}

export default function DefectCommentsSection({
  activeIssue,
  currentUser,
  onUpdateField,
  users = [],
  systemConfig,
  onTriggerWebhook
}: DefectCommentsSectionProps) {
  // Collapse entire panel by default or allow toggling
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Mention states
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);
  const [isReplyInputActive, setIsReplyInputActive] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Pure React state-based inline confirm delete states to avoid blocked iframe window.confirm
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(null);
  const [pendingDeleteReplyId, setPendingDeleteReplyId] = useState<string | null>(null);

  const commentsList: DefectComment[] = activeIssue.comments || [];

  const activeMembers = users ? users.filter((u: any) => u.status === "active") : [];
  const filteredUsers = mentionSearch !== null
    ? activeMembers.filter(u =>
        u.nickname.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(mentionSearch.toLowerCase())
      )
    : [];

  const handleInputChange = (val: string, isReply: boolean = false) => {
    setIsReplyInputActive(isReply);
    if (isReply) {
      setReplyContent(val);
    } else {
      setCommentContent(val);
    }

    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === " " || val[lastAt - 1] === "\n")) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query);
        setMentionIndex(lastAt);
        setActiveSuggestionIndex(0);
        return;
      }
    }
    setMentionSearch(null);
    setMentionIndex(-1);
  };

  const handleSelectUser = (user: SystemUser, isReply: boolean = isReplyInputActive) => {
    if (mentionIndex === -1) return;
    if (isReply) {
      const beforeMention = replyContent.slice(0, mentionIndex);
      const afterMention = replyContent.slice(mentionIndex + (mentionSearch || "").length + 1);
      const newContent = `${beforeMention}@${user.nickname} ${afterMention}`;
      setReplyContent(newContent);
    } else {
      const beforeMention = commentContent.slice(0, mentionIndex);
      const afterMention = commentContent.slice(mentionIndex + (mentionSearch || "").length + 1);
      const newContent = `${beforeMention}@${user.nickname} ${afterMention}`;
      setCommentContent(newContent);
    }
    setMentionSearch(null);
    setMentionIndex(-1);

    setTimeout(() => {
      if (isReply) {
        replyInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 30);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>, isReply: boolean = false) => {
    if (mentionSearch !== null && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectUser(filteredUsers[activeSuggestionIndex], isReply);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionSearch(null);
        setMentionIndex(-1);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (isReply) {
        if (replyToCommentId) {
          handleAddReply(replyToCommentId);
        }
      } else {
        handleAddComment();
      }
    }
  };

  const handleAddComment = () => {
    if (!commentContent.trim()) return;

    const contentToSend = commentContent;

    const newComment: DefectComment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.nickname,
      content: contentToSend,
      createdAt: new Date().toISOString(),
      replies: []
    };

    const updatedComments = [...commentsList, newComment];
    onUpdateField("comments", updatedComments);
    setCommentContent("");
    setMentionSearch(null);
    setMentionIndex(-1);

    // Send notifications to mentioned users if configured
    const activeMembersList = users ? users.filter((u: any) => u.status === "active") : [];
    // Only notify other active members, excluding oneself
    const mentionedUsersList = activeMembersList.filter(u => contentToSend.includes(`@${u.nickname}`) && u.id !== currentUser.id);

    if (onTriggerWebhook && mentionedUsersList.length > 0) {
      if (systemConfig?.feishuConfig?.enabled && systemConfig?.feishuConfig?.notifyOnCommentMention !== false) {
        onTriggerWebhook("feishu", {
          title: `💬 评论 @ 提及通知: ${activeIssue.title}`,
          type: "CommentMention",
          isAutoTrigger: true,
          mentions: mentionedUsersList.map(u => u.nickname),
          mentionsWithId: mentionedUsersList.map(u => ({ nickname: u.nickname, feishuUserId: u.feishuUserId })),
          content: `【${currentUser.nickname}】在缺陷【${activeIssue.title}】的研讨评论中 @ 了你：\n\n"${contentToSend}"`,
          link: window.location.href
        });
      }
      if (systemConfig?.dingtalkConfig?.enabled && systemConfig?.dingtalkConfig?.notifyOnCommentMention !== false) {
        onTriggerWebhook("dingtalk", {
          title: `💬 评论 @ 提及通知: ${activeIssue.title}`,
          type: "CommentMention",
          isAutoTrigger: true,
          mentions: mentionedUsersList.map(u => u.nickname),
          content: `【${currentUser.nickname}】在缺陷【${activeIssue.title}】的研讨评论中 @ 了你：\n\n"${contentToSend}"`,
          link: window.location.href
        });
      }
      if (systemConfig?.wechatConfig?.enabled && systemConfig?.wechatConfig?.notifyOnCommentMention === true) {
        onTriggerWebhook("wechat", {
          title: `💬 评论 @ 提及通知: ${activeIssue.title}`,
          type: "CommentMention",
          isAutoTrigger: true,
          mentions: mentionedUsersList.map(u => u.nickname),
          content: `【${currentUser.nickname}】在缺陷【${activeIssue.title}】的研讨评论中 @ 了你：\n\n"${contentToSend}"`,
          link: window.location.href
        });
      }
    }
  };

  const executeDeleteComment = (commentId: string) => {
    const updatedComments = commentsList.filter(c => c.id !== commentId);
    onUpdateField("comments", updatedComments);
    setPendingDeleteCommentId(null);
  };

  const handleAddReply = (commentId: string) => {
    if (!replyContent.trim()) return;

    const parentComment = commentsList.find(c => c.id === commentId);
    if (!parentComment) return;

    const newReply: DefectReply = {
      id: `reply-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.nickname,
      content: replyContent,
      createdAt: new Date().toISOString(),
      replyToUserName: parentComment.userName
    };

    const updatedComments = commentsList.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    onUpdateField("comments", updatedComments);
    const contentToSend = replyContent;
    setReplyContent("");
    setReplyToCommentId(null);
    setMentionSearch(null);
    setMentionIndex(-1);

    // Close the loop on notifications: Notify both parent comment creator AND any @mentioned active users
    const activeMembersList = users ? users.filter((u: any) => u.status === "active") : [];
    const mentionedUsersList = activeMembersList.filter(u =>
      contentToSend.includes(`@${u.nickname}`) || u.id === parentComment.userId
    );
    const notifyUsers = mentionedUsersList.filter(u => u.id !== currentUser.id);

    if (onTriggerWebhook && notifyUsers.length > 0) {
      if (systemConfig?.feishuConfig?.enabled && systemConfig?.feishuConfig?.notifyOnCommentMention !== false) {
        onTriggerWebhook("feishu", {
          title: `💬 缺陷回复通知: ${activeIssue.title}`,
          type: "CommentMention",
          isAutoTrigger: true,
          mentions: notifyUsers.map(u => u.nickname),
          mentionsWithId: notifyUsers.map(u => ({ nickname: u.nickname, feishuUserId: u.feishuUserId })),
          content: `【${currentUser.nickname}】在缺陷【${activeIssue.title}】中回复了评论 / @ 了你：\n\n"${contentToSend}"`,
          link: window.location.href
        });
      }
      if (systemConfig?.dingtalkConfig?.enabled && systemConfig?.dingtalkConfig?.notifyOnCommentMention !== false) {
        onTriggerWebhook("dingtalk", {
          title: `💬 缺陷回复通知: ${activeIssue.title}`,
          type: "CommentMention",
          isAutoTrigger: true,
          mentions: notifyUsers.map(u => u.nickname),
          content: `【${currentUser.nickname}】在缺陷【${activeIssue.title}】中回复了评论 / @ 了你：\n\n"${contentToSend}"`,
          link: window.location.href
        });
      }
      if (systemConfig?.wechatConfig?.enabled && systemConfig?.wechatConfig?.notifyOnCommentMention === true) {
        onTriggerWebhook("wechat", {
          title: `💬 缺陷回复通知: ${activeIssue.title}`,
          type: "CommentMention",
          isAutoTrigger: true,
          mentions: notifyUsers.map(u => u.nickname),
          content: `【${currentUser.nickname}】在缺陷【${activeIssue.title}】中回复了评论 / @ 了你：\n\n"${contentToSend}"`,
          link: window.location.href
        });
      }
    }
  };

  const executeDeleteReply = (commentId: string, replyId: string) => {
    const updatedComments = commentsList.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: (c.replies || []).filter(r => r.id !== replyId)
        };
      }
      return c;
    });
    onUpdateField("comments", updatedComments);
    setPendingDeleteReplyId(null);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-3.5 shadow-2xs text-left" id="defect-comments-hub">
      {/* Section Header with Expand/Collapse Trigger */}
      <button
        type="button"
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        className="w-full flex items-center justify-between border-b border-indigo-50 pb-2 cursor-pointer hover:opacity-90 select-none text-left"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-bold text-slate-800">评论</h3>
              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-100/70 text-indigo-800 font-extrabold">
                {commentsList.length}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-sans mt-0.5">在线交流并对齐修复方案</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10.5px] text-indigo-600 font-extrabold hover:underline">
          <span>{isPanelExpanded ? "收起" : "展开"}</span>
          {isPanelExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isPanelExpanded && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Compact Comments List */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {commentsList.length === 0 ? (
              <div className="py-6 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                  <Smile className="h-3 w-3" /> 目前暂无研讨会话反馈
                </p>
              </div>
            ) : (
              commentsList.map(comment => {
                const canDeleteComment = currentUser.role === "admin" || comment.userId === currentUser.id;
                const isPendingDelete = pendingDeleteCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="bg-slate-50/30 hover:bg-slate-50/75 border border-slate-100 rounded-lg p-2.5 space-y-2 transition-all text-left"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5.5 w-5.5 rounded-full bg-slate-200/80 border border-slate-300/40 flex items-center justify-center shrink-0 text-[10px] text-slate-600 font-bold">
                          {comment.userName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] font-black text-slate-700">{comment.userName}</span>
                            {comment.userId === "usr-wang" && (
                              <span className="text-[8px] bg-slate-900 text-slate-100 px-1 rounded font-black transform scale-90">
                                管理
                              </span>
                            )}
                            <span className="text-[8px] text-slate-400 font-mono">
                              {new Date(comment.createdAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {canDeleteComment && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isPendingDelete ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-150 rounded px-1.5 py-0.5 animate-scale-up">
                              <span className="text-[8px] font-black text-rose-600">确认删除？</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  executeDeleteComment(comment.id);
                                }}
                                className="p-0.5 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                                title="确认删除"
                              >
                                <Check className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingDeleteCommentId(null);
                                }}
                                className="p-0.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                                title="取消"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDeleteCommentId(comment.id);
                                setPendingDeleteReplyId(null);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded transition-colors cursor-pointer"
                              title="删除研讨说明"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="text-[10px] leading-relaxed text-slate-600 pl-7 whitespace-pre-line">
                      {comment.content}
                    </div>

                    {/* Nested Replies List */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="pl-7 space-y-1.5 pt-0.5 border-l border-slate-200/60 ml-2.5">
                        {comment.replies.map(reply => {
                          const canDeleteReply = currentUser.role === "admin" || reply.userId === currentUser.id;
                          const isReplyPendingDelete = pendingDeleteReplyId === reply.id;

                          return (
                            <div
                              key={reply.id}
                              className="bg-white/80 border border-slate-100/80 rounded p-1.5 space-y-1 text-left relative"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  <CornerDownRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                  <span className="text-[9px] font-black text-slate-750">{reply.userName}</span>
                                  <span className="text-[8px] text-slate-400">@{reply.replyToUserName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-slate-400 font-mono scale-95 origin-right pr-1">
                                    {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>

                                  {canDeleteReply && (
                                    <div className="shrink-0 flex items-center">
                                      {isReplyPendingDelete ? (
                                        <div className="flex items-center gap-0.5 bg-rose-50 border border-rose-100 rounded px-1 text-[8.5px] scale-90 origin-right">
                                          <span className="text-[7.5px] font-black text-rose-500">删除?</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              executeDeleteReply(comment.id, reply.id);
                                            }}
                                            className="p-0.5 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                                          >
                                            <Check className="h-2 w-2" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPendingDeleteReplyId(null);
                                            }}
                                            className="p-0.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                                          >
                                            <X className="h-2 w-2" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingDeleteReplyId(reply.id);
                                            setPendingDeleteCommentId(null);
                                          }}
                                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                          title="删除回复"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-[9.5px] leading-snug text-slate-500 pl-3.5 whitespace-pre-line">
                                {reply.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Compact Inline reply triggers */}
                    <div className="pl-7 pt-1">
                      {replyToCommentId === comment.id ? (
                        <div className="w-full flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg animate-scale-up relative">
                          {/* Mention Dropdown list for Reply */}
                          {isReplyInputActive && mentionSearch !== null && filteredUsers.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-1 w-64 max-h-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto z-50 p-1 text-left animate-scale-up">
                              <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 tracking-wider border-b border-slate-50 uppercase mb-1">
                                💡 推荐提及成员
                              </div>
                              {filteredUsers.map((user, idx) => {
                                const isSelected = idx === activeSuggestionIndex;
                                return (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelectUser(user, true)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors text-[10.5px] font-medium cursor-pointer ${
                                      isSelected
                                        ? "bg-indigo-50 text-indigo-700 font-bold"
                                        : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-4.5 w-4.5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500 shrink-0 border border-slate-200/50">
                                        {user.nickname.slice(0, 1)}
                                      </div>
                                      <span>{user.nickname}</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400">@{user.username}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <input
                            ref={replyInputRef}
                            type="text"
                            placeholder={`回复 @${comment.userName}...`}
                            value={replyContent}
                            onChange={(e) => handleInputChange(e.target.value, true)}
                            className="flex-1 rounded border-0 bg-transparent px-1.5 py-0.5 text-[9.5px] outline-none placeholder-slate-350"
                            onKeyDown={(e) => handleKeyDownInput(e, true)}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleAddReply(comment.id)}
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[8.5px] font-bold shrink-0 cursor-pointer"
                          >
                            发送
                          </button>
                          <button
                            onClick={() => { setReplyToCommentId(null); setReplyContent(""); setMentionSearch(null); setMentionIndex(-1); }}
                            className="text-[8.5px] font-bold text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyToCommentId(comment.id);
                            handleInputChange(`@${comment.userName} `, true);
                          }}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer"
                        >
                          <CornerDownRight className="h-2.5 w-2.5" />
                          <span>快捷回复</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Main Add Comment input - Single row smart bar to save dramatic amounts of space */}
          <div className="relative">
            {/* Mention Dropdown list */}
            {!isReplyInputActive && mentionSearch !== null && filteredUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-64 max-h-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto z-50 p-1 text-left animate-scale-up">
                <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 tracking-wider border-b border-slate-50 uppercase mb-1">
                  💡 推荐提及成员
                </div>
                {filteredUsers.map((user, idx) => {
                  const isSelected = idx === activeSuggestionIndex;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors text-[10.5px] font-medium cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="h-4.5 w-4.5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500 shrink-0 border border-slate-200/50">
                          {user.nickname.slice(0, 1)}
                        </div>
                        <span>{user.nickname}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">@{user.username}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5">
              <input
                ref={inputRef}
                type="text"
                placeholder="探讨新对齐内容... 输入 @ 提及成员 (按 Enter 发送)"
                value={commentContent}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDownInput}
                className="flex-1 bg-transparent border-0 px-2 py-0.5 text-[10px] text-slate-700 outline-none placeholder-slate-450"
              />
              <button
                type="button"
                onClick={handleAddComment}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-1 transition-all shadow-3xs cursor-pointer active:scale-95 shrink-0"
              >
                <Send className="h-3 w-3" />
                <span className="text-[9.5px] font-black uppercase">发送</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
