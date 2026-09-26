/**
 * Tabletop Nexus - Chat & Action Log Drawer
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { ChatMessage } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  localPlayerId: string;
}

export const ChatDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  localPlayerId,
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-40 w-80 sm:w-96 h-96 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">Table Chat & Action Log</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-center px-4">
            No activity yet. Roll dice, deal cards, or chat with room players!
          </div>
        ) : (
          messages.map((m) => {
            const isSelf = m.senderId === localPlayerId;
            const isSystem = m.isSystem;

            if (isSystem) {
              return (
                <div
                  key={m.id}
                  className="py-1 px-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-1.5"
                >
                  <span>{m.text}</span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="font-bold text-[10px]"
                    style={{ color: m.senderColor || '#38bdf8' }}
                  >
                    {m.senderName}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                    isSelf
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-slate-800 bg-slate-950/80 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something to the table..."
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition flex items-center justify-center shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
