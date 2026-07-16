/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Company, User } from "../types";
import { apiGet, apiPost, apiDelete } from "../api";
import { Send, User as UserIcon, Zap, HelpCircle, X, Plus, History, Trash2, MessageCircle } from "lucide-react";
import BotMascot from "./BotMascot";

interface AiAssistantProps {
  company: Company | null | undefined;
  currentUser: User;
  onClose?: () => void;
  isFloating?: boolean;
}

interface Message {
  id: string;
  sender: "USER" | "AI";
  message: string;
  timestamp: string;
}

interface SessionSummary {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

const LOADING_PHRASES = [
  "AIBISPRO is dancing, please wait...",
  "Bear & Bunny are crunching the numbers...",
  "Whisking up some fresh insights...",
  "Hop hop... calculating...",
  "Brewing your answer like a fresh espresso...",
  "Sniffing out the numbers...",
];

export default function AiAssistant({ company, currentUser, onClose, isFloating }: AiAssistantProps) {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const companyName = company ? company.name : "Your Portfolio";
  const companyQuery = company ? `?companyId=${company.id}` : "";

  const loadSessions = () => {
    apiGet(`/chat/sessions${companyQuery}`)
      .then((rows: any[]) => {
        const mapped: SessionSummary[] = rows.map((r) => ({
          id: r.id,
          title: r.title || "New conversation",
          messageCount: r._count?.chatbot_logs ?? 0,
          updatedAt: r.updated_at,
        }));
        setSessions(mapped);
        return mapped;
      })
      .catch((e) => {
        console.error("Failed to load chat sessions:", e);
        return [];
      });
  };

  const loadMessages = (sessionId: string) => {
    setIsLoadingMessages(true);
    apiGet(`/chat/history?sessionId=${sessionId}`)
      .then((rows: any[]) => {
        const mapped: Message[] = rows.flatMap((l) => [
          { id: `u_${l.id}`, sender: "USER" as const, message: l.question, timestamp: l.created_at },
          { id: `a_${l.id}`, sender: "AI" as const, message: l.answer, timestamp: l.created_at },
        ]);
        setMessages(mapped);
      })
      .catch((e) => console.error("Failed to load chat history:", e))
      .finally(() => setIsLoadingMessages(false));
  };

  // On mount / company change: load past sessions for this scope and resume the most recent one.
  useEffect(() => {
    setMessages([]);
    setActiveSessionId(null);
    setShowHistory(false);
    apiGet(`/chat/sessions${companyQuery}`)
      .then((rows: any[]) => {
        const mapped: SessionSummary[] = rows.map((r) => ({
          id: r.id,
          title: r.title || "New conversation",
          messageCount: r._count?.chatbot_logs ?? 0,
          updatedAt: r.updated_at,
        }));
        setSessions(mapped);
        if (mapped.length > 0) {
          setActiveSessionId(mapped[0].id);
          loadMessages(mapped[0].id);
        }
      })
      .catch((e) => console.error("Failed to load chat sessions:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    loadMessages(id);
    setShowHistory(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiDelete(`/chat/sessions/${id}`);
      if (id === activeSessionId) handleNewChat();
      loadSessions();
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

    const userMsg: Message = { id: `local_u_${Date.now()}`, sender: "USER", message: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await apiPost("/chat", {
        message: text,
        companyId: company ? Number(company.id) : undefined,
        sessionId: activeSessionId ?? undefined,
      });

      const aiMsg: Message = { id: `local_a_${Date.now()}`, sender: "AI", message: res.answer || "I was unable to retrieve a response. Please try again.", timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);

      if (!activeSessionId && res.sessionId) {
        setActiveSessionId(res.sessionId);
      }
      loadSessions();
    } catch (err) {
      console.error("AI Assistant network error:", err);
      const errMsg: Message = {
        id: `local_err_${Date.now()}`,
        sender: "AI",
        message: "⚠️ **Operational Link Interrupted**\n\nI was unable to connect to the AIBISPRO secure server node. Please verify your connection or try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSending) return;
    sendMessage(userInput.trim());
    setUserInput("");
  };

  const handleChipClick = (query: string) => {
    if (isSending) return;
    sendMessage(query);
  };

  const suggestionChips = [
    { label: "Compare this month's revenue", query: "Compare this month to last month's revenue." },
    { label: "What is our current profit margin?", query: "What is our current profit margin and how can we improve it?" },
    { label: "Which products need restocking?", query: "Which products need restocking immediately?" },
    { label: "How can we increase revenue?", query: "How can we increase revenue or improve margins next month?" },
    { label: "Forecast next month's revenue", query: "Forecast next month's revenue and what will be our best selling category." },
  ];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${
      isFloating ? "h-full border-none rounded-none" : "h-[calc(100vh-140px)]"
    }`}>
      {/* Consultant Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <BotMascot size="md" />
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-800 font-display flex items-center gap-1.5">
              <span>AIBISPRO AI Advisor</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-mono font-bold rounded-lg tracking-wider">ONLINE</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[130px] sm:max-w-xs">
              Advising: <span className="text-[#E14434] font-black">{companyName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isFloating && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mr-1">
              <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline font-bold uppercase">Dynamic Context Engaged</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleNewChat}
            title="New chat"
            className="p-1.5 text-slate-400 hover:text-[#261CC1] hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            title="Chat history"
            className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              showHistory ? "text-[#261CC1] bg-indigo-50" : "text-slate-400 hover:text-[#261CC1] hover:bg-slate-100"
            }`}
          >
            <History className="w-4.5 h-4.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showHistory ? (
        /* History Panel: separate tab so different topics never mix in one stream */
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-[#261CC1]/40 text-[#261CC1] hover:bg-indigo-50/50 transition-all cursor-pointer text-xs font-bold mb-2"
          >
            <Plus className="w-4 h-4" /> Start a new chat
          </button>
          {sessions.length === 0 ? (
            <p className="text-center text-xs text-slate-400 font-bold py-8">No past conversations yet.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                  s.id === activeSessionId ? "border-[#261CC1] bg-indigo-50/40" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{s.messageCount} messages &bull; {new Date(s.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
                <span
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  role="button"
                  title="Delete conversation"
                  className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Suggestion Chips */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto flex items-center gap-2 scrollbar-none shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              Query Guide:
            </span>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip.query)}
                disabled={isSending}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#261CC1] hover:bg-slate-50 text-slate-600 hover:text-[#261CC1] rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:pointer-events-none"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingMessages ? (
              <div className="text-center text-xs font-bold text-slate-400 py-12">Loading conversation...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs font-bold text-slate-400 py-12 space-y-2">
                <BotMascot size="lg" className="mx-auto opacity-60" />
                <p>Start a new conversation with your AI Advisor.</p>
              </div>
            ) : (
              messages.map((log) => {
                const isAi = log.sender === "AI";
                return (
                  <div key={log.id} className={`flex ${isAi ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-350`}>
                    <div className={`flex gap-3 max-w-[85%] ${isAi ? "flex-row" : "flex-row-reverse"}`}>
                      {isAi ? (
                        <BotMascot size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#E14434] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border border-white">
                          <UserIcon className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className={`p-4 rounded-2xl text-slate-800 text-xs shadow-sm leading-relaxed border ${
                        isAi
                          ? "bg-slate-50 border-slate-100 rounded-tl-none font-sans"
                          : "bg-[#5EABD6]/10 text-slate-900 border-[#5EABD6]/20 rounded-tr-none font-medium"
                      }`}>
                        <div className="space-y-2 whitespace-pre-wrap">
                          {(log?.message || "").split("\n").map((line, lIdx) => {
                            if (line.startsWith("### ")) {
                              return <h4 key={lIdx} className="font-display font-black text-sm text-[#E14434] mt-3 border-b pb-1 border-slate-100">{line.replace("### ", "")}</h4>;
                            }
                            if (line.startsWith("- ") || line.startsWith("* ")) {
                              return (
                                <div key={lIdx} className="flex items-start gap-1.5 ml-1 my-1">
                                  <span className="text-[#E14434] mt-1 shrink-0">&bull;</span>
                                  <span>{line.substring(2)}</span>
                                </div>
                              );
                            }
                            if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ")) {
                              return (
                                <div key={lIdx} className="flex items-start gap-1.5 ml-1 my-1">
                                  <span className="font-bold text-[#E14434] shrink-0">{(line || "").split(".")[0]}.</span>
                                  <span>{line.substring(3)}</span>
                                </div>
                              );
                            }
                            return <p key={lIdx}>{line}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* AI Loading bubble */}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%] flex-row">
                  <div className="animate-bounce">
                    <BotMascot size="sm" />
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none text-slate-400 text-xs shadow-sm flex items-center gap-2">
                    <div className="flex space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-[#5EABD6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 bg-[#E14434] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 bg-[#FFB4B4] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                    <span className="font-semibold font-mono text-[9px] text-slate-500 uppercase tracking-wider">{loadingPhrase}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Footer Input form */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isSending}
                placeholder={`Ask about ${companyName}'s revenue, restock needs, promotions, margins or strategy...`}
                id="ai-chat-input-field"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5EABD6] focus:border-[#5EABD6] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isSending}
                id="ai-chat-submit-btn"
                className="bg-[#E14434] hover:bg-[#c23325] text-white p-3 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4.5 h-4.5 text-white" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 font-semibold text-center mt-2 uppercase tracking-wide">
              AIBISPRO Virtual Consultant uses real-time context. All chats are archived.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
