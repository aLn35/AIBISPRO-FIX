/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Company, InboxMessage, Role, User } from "../types";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api";
import { Mail, Send, Sparkles, Bot, Pencil, Trash2, Check, X } from "lucide-react";

interface InboxThreadProps {
  company: Company;
  currentUser: User;
  onUnreadChange?: () => void;
}

const ROLE_STYLE: Record<Role, { bg: string; text: string; label: string }> = {
  MAINTAINANCE: { bg: "bg-[#261CC1]/10", text: "text-[#261CC1]", label: "Consultant" },
  OWNER: { bg: "bg-[#5EABD6]/10", text: "text-[#5EABD6]", label: "Owner" },
  MANAGER: { bg: "bg-[#E14434]/10", text: "text-[#E14434]", label: "Manager" },
  CUSTOMER: { bg: "bg-slate-100", text: "text-slate-500", label: "Customer" },
};

export default function InboxThread({ company, currentUser, onUnreadChange }: InboxThreadProps) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setIsLoading(true);
    apiGet(`/inbox?companyId=${company.id}`)
      .then((rows: any[]) => {
        setMessages(
          rows.map((r) => ({
            id: String(r.id),
            companyId: String(r.company_id),
            authorId: r.author_id,
            authorName: r.users_inbox_messages_author_idTousers?.name ?? "User",
            authorRole: r.users_inbox_messages_author_idTousers?.role ?? "OWNER",
            message: r.message,
            aiGenerated: r.ai_generated,
            isRead: r.is_read,
            isEdited: r.is_edited,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          })),
        );
      })
      .catch((e) => console.error("Failed to load inbox thread:", e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    apiPatch(`/inbox/read?companyId=${company.id}`)
      .then(() => onUnreadChange?.())
      .catch((e) => console.error("Failed to mark inbox read:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDraftWithAi = async () => {
    setIsDrafting(true);
    setError("");
    try {
      const res = await apiPost("/chat", {
        message: `Based on this company's current real data, draft a short, concrete message (2-4 sentences) I can post directly into our shared team inbox for the Owner/Manager/Consultant to read. Focus on the single highest-impact point right now (revenue, restocking, pricing, or promotions).`,
        companyId: Number(company.id),
      });
      setComposerText(res.answer ?? "");
      setAiDrafted(true);
    } catch (e) {
      setError("Failed to draft with AI.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!composerText.trim()) return;
    setIsSending(true);
    setError("");
    try {
      await apiPost("/inbox", {
        companyId: Number(company.id),
        message: composerText.trim(),
        aiGenerated: aiDrafted,
      });
      setComposerText("");
      setAiDrafted(false);
      load();
    } catch (e) {
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const startEdit = (msg: InboxMessage) => {
    setEditingId(msg.id);
    setEditingText(msg.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      await apiPatch(`/inbox/${id}`, { message: editingText.trim() });
      setEditingId(null);
      load();
    } catch (e) {
      console.error("Failed to edit message:", e);
    }
  };

  const handleUnsend = async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await apiDelete(`/inbox/${id}`);
    } catch (e) {
      console.error("Failed to unsend message:", e);
      load();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-180px)] min-h-[500px] overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#261CC1] flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-slate-900 text-base">Team Inbox &bull; {company.name}</h2>
          <p className="text-[11px] text-slate-500">Shared thread between the Consultant, Owner, and Manager for this company.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          <div className="text-center text-xs font-bold text-slate-400 py-12">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Mail className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-400">No messages yet. Start the conversation below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.authorId === currentUser.id;
            const style = ROLE_STYLE[msg.authorRole] ?? ROLE_STYLE.OWNER;
            const isEditing = editingId === msg.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                <div className={`flex gap-2.5 max-w-[80%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-full ${style.bg} ${style.text} flex items-center justify-center text-[10px] font-black shrink-0 mt-1`}>
                    {msg.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className={`flex items-center gap-1.5 mb-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-[10px] font-bold text-slate-600">{msg.authorName}</span>
                      <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>{style.label}</span>
                      {msg.aiGenerated && (
                        <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="w-full text-xs p-2.5 border border-[#261CC1] rounded-xl focus:outline-none resize-none"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          <button onClick={() => saveEdit(msg.id)} className="p-1.5 bg-[#261CC1] text-white rounded-lg cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className={`relative p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isMine ? "bg-[#261CC1] text-white rounded-tr-none" : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
                      }`}>
                        {msg.message}
                      </div>
                    )}

                    <div className={`flex items-center gap-2 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(msg.createdAt).toLocaleString()}{msg.isEdited ? " (edited)" : ""}
                      </span>
                      {isMine && !isEditing && (
                        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(msg)} title="Edit" className="text-slate-400 hover:text-[#261CC1] cursor-pointer"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => handleUnsend(msg.id)} title="Unsend" className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 space-y-2">
        {error && <p className="text-[10px] text-rose-600 font-bold">{error}</p>}
        {aiDrafted && (
          <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1"><Bot className="w-3 h-3" /> AI-drafted - review before sending.</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={composerText}
            onChange={(e) => { setComposerText(e.target.value); setAiDrafted(false); }}
            placeholder={`Message the team about ${company.name}...`}
            rows={2}
            className="flex-1 text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] focus:border-[#261CC1] resize-none bg-white"
          />
          <button
            type="button"
            onClick={handleDraftWithAi}
            disabled={isDrafting || isSending}
            title="Draft with AI"
            className="p-3 border border-slate-200 hover:border-[#261CC1] text-slate-500 hover:text-[#261CC1] rounded-xl transition-all cursor-pointer disabled:opacity-50 bg-white shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isDrafting ? "animate-pulse" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || isDrafting || !composerText.trim()}
            className="p-3 bg-[#261CC1] hover:bg-[#1C0770] text-white rounded-xl shadow transition-all cursor-pointer disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
