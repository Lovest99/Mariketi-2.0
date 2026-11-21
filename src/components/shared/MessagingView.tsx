import React, { useEffect, useMemo, useState } from 'react';
import { Paperclip, Search, Send, CheckCheck } from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { cn, formatDateTime } from '../../lib/utils';
import { Button, EmptyState } from '../ui/DesignSystem';

export const MessagingView: React.FC = () => {
  const { conversations, currentUser, sendMessage, markConversationRead } = useMariketi();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id || '');
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        !q ||
        c.subject.toLowerCase().includes(q) ||
        c.contextRef.toLowerCase().includes(q) ||
        c.participants.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const active = filtered.find((c) => c.id === selectedId) || filtered[0];

  useEffect(() => {
    if (!active) return;
    const hasUnread = active.messages.some(
      (m) => !m.read && m.senderId !== currentUser?.id
    );
    if (hasUnread) {
      markConversationRead(active.id);
    }
  }, [active?.id, active?.messages.length, currentUser?.id, markConversationRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    sendMessage(active.id, draft.trim(), attachment || undefined);
    setDraft('');
    setAttachment('');
  };

  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Messages linked to livestock inquiries, offers, transactions, and field verifications will appear here."
      />
    );
  }

  return (
    <div className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:h-[580px]">
      {/* Thread list */}
      <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E5E9ED] flex flex-col min-h-0 max-h-56 lg:max-h-none">
        <div className="p-3 border-b border-[#E5E9ED] shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#697784] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations or references"
              className="w-full h-9 pl-9 pr-3 text-sm bg-[#F4F6F7] border border-[#E5E9ED] rounded-md focus:outline-none focus:border-[#10243A]"
            />
          </div>
        </div>
        <div className="divide-y divide-[#E5E9ED] overflow-y-auto flex-1 min-h-0">
          {filtered.map((conv) => {
            const last = conv.messages[conv.messages.length - 1];
            const unread = conv.messages.filter(
              (m) => !m.read && m.senderId !== currentUser?.id
            ).length;
            const isSelected = active?.id === conv.id;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  'w-full text-left p-3.5 transition-colors hover:bg-[#F4F6F7]/80',
                  isSelected && 'bg-[#F4F6F7]'
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[#697784]">
                  <span className="font-mono text-[#10243A] font-medium truncate">{conv.contextRef}</span>
                  <span className="shrink-0">{conv.contextType}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-sm font-semibold text-[#10243A] truncate">{conv.subject}</p>
                  {unread > 0 && (
                    <span className="text-xs font-mono font-bold text-[#C96A0F] shrink-0">
                      {unread} new
                    </span>
                  )}
                </div>
                {last && (
                  <p className="text-xs text-[#697784] mt-0.5 line-clamp-1">
                    {last.senderName}: {last.text}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active thread */}
      <div className="lg:col-span-8 flex flex-col min-h-0">
        {active ? (
          <>
            <div className="px-4 py-3 border-b border-[#E5E9ED] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-mono text-[#697784]">
                  {active.contextType} · {active.contextRef}
                </p>
                <h3 className="text-[15px] font-bold text-[#10243A] mt-0.5 truncate">
                  {active.subject}
                </h3>
              </div>
              <p className="text-xs text-[#697784] truncate max-w-full">
                Participants: {active.participants.map((p) => p.name).join(', ')}
              </p>
            </div>

            <div className="flex-1 min-h-[260px] max-h-[420px] lg:max-h-none p-4 space-y-3.5 overflow-y-auto bg-[#FAFAF7]">
              {active.messages.map((msg) => {
                const mine = msg.senderId === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col max-w-[88%] sm:max-w-[80%]',
                      mine ? 'ml-auto items-end' : 'items-start'
                    )}
                  >
                    <div className="text-[11px] text-[#697784] mb-1">
                      {msg.senderName} ({msg.senderRole}) · {formatDateTime(msg.timestamp)}
                    </div>
                    <div
                      className={cn(
                        'rounded-lg px-3.5 py-2.5 text-sm leading-relaxed border',
                        mine
                          ? 'bg-[#10243A] text-white border-[#10243A]'
                          : 'bg-white text-[#17212B] border-[#E5E9ED]'
                      )}
                    >
                      <p>{msg.text}</p>
                      {msg.attachmentName && (
                        <div
                          className={cn(
                            'mt-2 pt-2 border-t text-xs inline-flex items-center gap-1.5 font-mono break-all',
                            mine ? 'border-white/15 text-white/90' : 'border-[#E5E9ED] text-[#245B83]'
                          )}
                        >
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          {msg.attachmentName}
                        </div>
                      )}
                    </div>
                    {mine && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#697784]">
                        <CheckCheck className="w-3.5 h-3.5 text-[#21865B]" />
                        Delivered
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSend}
              className="p-3 bg-white border-t border-[#E5E9ED] space-y-2 shrink-0"
            >
              {attachment && (
                <div className="flex items-center justify-between gap-2 text-xs bg-[#F4F6F7] px-3 py-1.5 rounded border border-[#E5E9ED]">
                  <span className="font-mono text-[#10243A] truncate">Attachment: {attachment}</span>
                  <button
                    type="button"
                    onClick={() => setAttachment('')}
                    className="text-[#D64B4B] font-medium shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <label className="h-10 px-2.5 sm:px-3 rounded-md border border-[#E5E9ED] bg-white hover:bg-[#F4F6F7] inline-flex items-center gap-1.5 text-xs font-medium text-[#17212B] cursor-pointer shrink-0">
                  <Paperclip className="w-4 h-4 text-[#697784]" />
                  <span className="hidden sm:inline">Attach</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAttachment(file.name);
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 min-w-0 h-10 rounded-md border border-[#E5E9ED] px-3 text-sm focus:outline-none focus:border-[#10243A]"
                />
                <Button type="submit" variant="primary" size="md" className="px-3 sm:px-4">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#697784]">
            Select a conversation to view messages.
          </div>
        )}
      </div>
    </div>
  );
};
